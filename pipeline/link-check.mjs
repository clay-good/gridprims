// The weekly outbound link check (platform/data-operations, "Outbound link
// checks"): every link in manifests, registry entries, and dataset terms is
// fetched, and so is every curated regulator link; broken, moved, and blocked
// links go to the health record and an issue, and nothing is blocked. A 403
// or 429 is "blocked": some state sites refuse automated checks, so a person
// checks those by hand.
//   node pipeline/link-check.mjs

import { spawnSync } from 'node:child_process';
import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { TOOLS } from '../core/tools/index.mjs';
import REGULATORS from '../data/curated/regulators.mjs';
import { recordRun } from './lib/health.mjs';
import { github } from './lib/github.mjs';
import { ROOT } from './run.mjs';

/** Every outbound link and the places that use it. */
export async function outboundLinks(root = ROOT) {
  const links = new Map();
  const add = (url, where) => { if (/^https?:\/\//.test(url ?? '')) links.set(url, [...(links.get(url) ?? []), where]); };
  for (const { manifest: m } of TOOLS) {
    for (const c of m.citations) add(c.url, `${m.id} citation`);
    for (const h of m.handoffs) add(h.url, `${m.id} handoff`);
  }
  const reg = join(root, 'pipeline/registry');
  for (const f of existsSync(reg) ? readdirSync(reg) : []) {
    const e = (await import(pathToFileURL(join(reg, f)).href)).default;
    add(e.sourceUrl, `${e.id} source`);
    add(e.terms.url, `${e.id} terms`);
  }
  for (const r of REGULATORS) for (const k of ['home', 'docket', 'comment']) add(r[k], `${r.state} regulator ${k}`);
  return links;
}

/**
 * @param {{fetch?: typeof fetch, host?: any, root?: string, now?: () => Date}} [o]
 */
export async function linkCheck(o = {}) {
  const f = o.fetch ?? fetch;
  const root = o.root ?? ROOT;
  const now = o.now ?? (() => new Date());
  const host = o.host ?? github();
  const started = now().toISOString();
  const results = [];
  for (const [url, usedBy] of await outboundLinks(root)) {
    let status = 0;
    let finalUrl = url;
    try {
      const res = await f(url, { method: 'GET', redirect: 'follow', headers: { 'user-agent': 'gridprims-link-check (+https://gridprims.com)' } });
      status = res.status;
      finalUrl = res.url || url;
    } catch {
      // Some state servers leave out an intermediate certificate or drop Node's TLS handshake; browsers and curl manage.
      if (!o.fetch) {
        const curl = spawnSync('curl', ['-s', '-o', '/dev/null', '-L', '--max-time', '30', '-w', '%{http_code}\\n%{url_effective}', url], { encoding: 'utf8' });
        const [code, effective] = (curl.stdout ?? '').split('\n');
        status = Number(code) || 0;
        if (effective) finalUrl = effective;
      } else status = 0;
    }
    const state = status === 403 || status === 429 ? 'blocked' : status === 0 || status >= 400 ? 'broken' : finalUrl.replace(/\/$/, '') !== url.replace(/\/$/, '') ? 'moved' : 'ok';
    results.push({ url, state, status, ...(state === 'moved' ? { finalUrl } : {}), usedBy });
  }
  const bad = results.filter((r) => r.state !== 'ok');
  if (bad.length && host.available) {
    try { await host.openIssue('Link check: broken or moved links', bad.map((b) => `- ${b.state}: ${b.url}${b.finalUrl ? ` → ${b.finalUrl}` : ''} (HTTP ${b.status}), used by ${b.usedBy.join(', ')}`).join('\n')); } catch { /* recorded below either way */ }
  }
  recordRun(root, { workflow: 'link-check', started, finished: now().toISOString(), ok: true, links: results, notes: bad.length ? [`${bad.length} broken or moved links`] : [] });
  return results;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  for (const r of await linkCheck()) console.log(`${r.state.padEnd(6)} ${r.status} ${r.url}${r.finalUrl ? ` → ${r.finalUrl}` : ''}`);
}
