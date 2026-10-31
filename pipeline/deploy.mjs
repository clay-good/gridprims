// Deploy dist/ and the Worker to Cloudflare with the direct-upload API, using
// only fetch and crypto (foundation design D4; task 8.6). Uploads only files
// whose content changed: the upload session leaves unchanged hashes out of its
// buckets. Refuses to start with a credential that has an expiry date.
//   CLOUDFLARE_API_TOKEN, CLOUDFLARE_ACCOUNT_ID, CF_WORKER_NAME, CF_D1_ID
//   node pipeline/deploy.mjs [dist]

import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { dirname, extname, join, posix } from 'node:path';
import { fileURLToPath } from 'node:url';
import { importSpecifiers, walk } from '../verify/lib/walk.mjs';
import { TYPES } from '../verify/lib/static-server.mjs';

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const API = 'https://api.cloudflare.com/client/v4';
export const COMPATIBILITY_DATE = '2026-10-01';
export const WORKER_CRON = '29 3 * * *';
const MAX_FILE = 25 * 1024 * 1024;
const MAX_FILES = 80_000;

/** Cloudflare's documented asset hash: SHA-256 of the base64 content plus the extension, first 32 hex characters. */
export function assetHash(bytes, path) {
  return createHash('sha256').update(Buffer.from(bytes).toString('base64') + extname(path).slice(1)).digest('hex').slice(0, 32);
}

/** The asset manifest for a deploy root: every public file (internal files start with "_"). */
export function assetManifest(dist) {
  const files = walk(dist).filter((f) => !f.split('/').some((p) => p.startsWith('_')));
  if (files.length > MAX_FILES) throw new Error(`${files.length} files, over the ${MAX_FILES} budget`);
  const manifest = {};
  for (const f of files) {
    const bytes = readFileSync(join(dist, f));
    if (bytes.length > MAX_FILE) throw new Error(`${f} is ${bytes.length} bytes, over Cloudflare's 25 MiB per-file limit`);
    manifest[`/${f}`] = { hash: assetHash(bytes, f), size: bytes.length };
  }
  return manifest;
}

/** The Worker's own module graph, with module names relative to the repository root. */
export function workerModules(entry = 'worker/index.mjs') {
  const seen = new Map();
  const visit = (name) => {
    if (seen.has(name)) return;
    const src = readFileSync(join(ROOT, name), 'utf8');
    seen.set(name, src);
    for (const spec of importSpecifiers(src)) {
      if (spec.startsWith('.')) visit(posix.normalize(posix.join(posix.dirname(name), spec)));
    }
  };
  visit(entry);
  return seen;
}

/**
 * @param {{token: string, account: string, fetch?: typeof fetch, wait?: (ms: number) => Promise<void>}} o
 */
export function cloudflare(o) {
  const f = o.fetch ?? fetch;
  const wait = o.wait ?? ((ms) => new Promise((r) => setTimeout(r, ms)));
  /** Call the API, honoring rate limits (retry-after) a few times before giving up. */
  async function call(method, path, { body, auth = o.token, raw = false } = {}) {
    for (let attempt = 0; ; attempt++) {
      const res = await f(`${API}${path}`, { method, headers: { authorization: `Bearer ${auth}`, ...(body && !(body instanceof FormData) ? { 'content-type': 'application/json' } : {}) }, body: body instanceof FormData ? body : body ? JSON.stringify(body) : undefined });
      if (res.status === 429 && attempt < 5) { await wait(Number(res.headers.get('retry-after') ?? 5) * 1000); continue; }
      const json = await res.json();
      if (!res.ok || json.success === false) throw new Error(`${method} ${path}: HTTP ${res.status} ${JSON.stringify(json.errors ?? json)}`);
      return raw ? json : json.result;
    }
  }
  return {
    call,
    /** A credential with an expiry date fails before any work (platform/automation). */
    async verifyToken() {
      const r = await call('GET', '/user/tokens/verify');
      if (r.status !== 'active') throw new Error(`the Cloudflare token is ${r.status}`);
      if (r.expires_on) throw new Error(`the Cloudflare token expires on ${r.expires_on}; use one with no expiry, scoped to this one Worker`);
      return r;
    },
  };
}

/**
 * @param {{dist: string, worker: string, d1?: string, token: string, account: string, fetch?: typeof fetch, wait?: (ms: number) => Promise<void>}} o
 * @returns {Promise<{files: number, uploaded: number, versionId?: string}>}
 */
export async function deploy(o) {
  const cf = cloudflare(o);
  await cf.verifyToken();
  const manifest = assetManifest(o.dist);
  const session = await cf.call('POST', `/accounts/${o.account}/workers/scripts/${o.worker}/assets-upload-session`, { body: { manifest } });
  let completion = session.jwt;
  let uploaded = 0;
  const byHash = new Map(Object.entries(manifest).map(([p, m]) => [m.hash, p]));
  for (const bucket of session.buckets ?? []) {
    const form = new FormData();
    for (const hash of bucket) {
      const path = byHash.get(hash);
      const bytes = readFileSync(join(o.dist, path));
      form.append(hash, new File([Buffer.from(bytes).toString('base64')], hash, { type: TYPES[extname(path)] ?? 'application/octet-stream' }));
      uploaded++;
    }
    const r = await cf.call('POST', `/accounts/${o.account}/workers/assets/upload?base64=true`, { body: form, auth: session.jwt, raw: true });
    if (r.result?.jwt) completion = r.result.jwt;
  }

  const modules = workerModules();
  const metadata = {
    main_module: 'worker/index.mjs',
    compatibility_date: COMPATIBILITY_DATE,
    assets: { jwt: completion, config: { html_handling: 'auto-trailing-slash', not_found_handling: 'none' } },
    bindings: [
      { type: 'assets', name: 'ASSETS' },
      ...(o.d1 ? [{ type: 'd1', name: 'DB', id: o.d1 }] : []),
      { type: 'ratelimit', name: 'REPORT_LIMITER', namespace_id: '1001', simple: { limit: 10, period: 60 } },
    ],
  };
  const form = new FormData();
  form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
  for (const [name, src] of modules) form.append(name, new File([src], name, { type: 'application/javascript+module' }));
  const script = await cf.call('PUT', `/accounts/${o.account}/workers/scripts/${o.worker}`, { body: form });
  // The nightly schedule: report retention and the watchdog (foundation design D15).
  await cf.call('PUT', `/accounts/${o.account}/workers/scripts/${o.worker}/schedules`, { body: [{ cron: WORKER_CRON }] });
  return { files: Object.keys(manifest).length, uploaded, versionId: script?.deployment_id ?? script?.id };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const env = process.env;
  for (const k of ['CLOUDFLARE_API_TOKEN', 'CLOUDFLARE_ACCOUNT_ID', 'CF_WORKER_NAME']) if (!env[k]) { console.error(`${k} is not set`); process.exit(1); }
  const r = await deploy({ dist: process.argv[2] ?? join(ROOT, 'dist'), worker: env.CF_WORKER_NAME, d1: env.CF_D1_ID, token: env.CLOUDFLARE_API_TOKEN, account: env.CLOUDFLARE_ACCOUNT_ID });
  console.log(`deployed ${env.CF_WORKER_NAME}: ${r.uploaded} of ${r.files} files uploaded (the rest were unchanged)`);
}

