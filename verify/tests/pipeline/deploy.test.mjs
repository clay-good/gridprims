// Deploy, smoke test, and rollback (foundation tasks 8.6, 10.4, 10.8 partly,
// 10.9 partly) against a stand-in for Cloudflare's API.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { join, posix } from 'node:path';
import { build } from '../../../site/build.mjs';
import { assetHash, assetManifest, deploy, workerModules } from '../../../pipeline/deploy.mjs';
import { rollback, smoke } from '../../../pipeline/smoke.mjs';
import { importSpecifiers } from '../../lib/walk.mjs';
import { serveWorker } from '../../lib/worker-server.mjs';
import { tempDir } from '../../lib/temp.mjs';

const dist = tempDir('gridprims-dist-');
await build({ outDir: dist });

/** A stand-in Cloudflare API that records calls and keeps the hashes it already has. */
function fakeCloudflare({ have = new Set(), token = { status: 'active' }, rateLimitOnce = false } = {}) {
  const calls = [];
  let limited = rateLimitOnce;
  const json = (result, status = 200) => new Response(JSON.stringify({ success: true, result }), { status, headers: { 'content-type': 'application/json' } });
  const f = async (url, init) => {
    const path = url.replace('https://api.cloudflare.com/client/v4', '');
    calls.push({ method: init.method, path, auth: init.headers.authorization, body: init.body });
    if (path === '/user/tokens/verify') return json(token);
    if (path.endsWith('/assets-upload-session')) {
      const { manifest } = JSON.parse(init.body);
      const need = Object.values(manifest).map((m) => m.hash).filter((h) => !have.has(h));
      return json({ jwt: need.length ? 'upload-jwt' : 'completion-jwt', buckets: need.length ? [need.slice(0, 20), need.slice(20)].filter((b) => b.length) : [] });
    }
    if (path.startsWith('/accounts/a/workers/assets/upload')) {
      if (limited) { limited = false; return new Response('{}', { status: 429, headers: { 'retry-after': '1' } }); }
      for (const [hash] of init.body.entries()) have.add(hash);
      return new Response(JSON.stringify({ success: true, result: { jwt: 'completion-jwt' } }), { status: 201 });
    }
    if (path === '/accounts/a/workers/scripts/gridprims' && init.method === 'PUT') return json({ id: 'v2' });
    if (path === '/accounts/a/workers/scripts/gridprims/schedules' && init.method === 'PUT') return json({ schedules: JSON.parse(init.body) });
    if (path === '/accounts/a/workers/scripts/gridprims/deployments' && init.method === 'GET') return json({ deployments: [{ versions: [{ version_id: 'v2' }] }, { versions: [{ version_id: 'v1' }] }] });
    if (path === '/accounts/a/workers/scripts/gridprims/deployments' && init.method === 'POST') return json({ id: 'd3' });
    return new Response(JSON.stringify({ success: false, errors: [{ message: `unexpected ${path}` }] }), { status: 404 });
  };
  return Object.assign(f, { calls, have });
}
const opts = (f) => ({ dist, worker: 'gridprims', d1: 'd1-id', token: 't', account: 'a', fetch: f, wait: async () => {} });

test('asset hashes follow Cloudflare\'s documented recipe', () => {
  const bytes = Buffer.from('<p>hi</p>');
  const want = createHash('sha256').update(bytes.toString('base64') + 'html').digest('hex').slice(0, 32);
  assert.equal(assetHash(bytes, 'index.html'), want);
  const m = assetManifest(dist);
  assert.ok(m['/index.html'] && m['/sw.js'] && m['/data/eia-861/2026-10/sales/TX.bin']);
  assert.deepEqual(Object.keys(m).filter((p) => p.includes('/_')), ['/_redirects'], 'internal files are not deployed; _redirects is the one Cloudflare reads');
});

test('a first deploy uploads every file, then deploys the Worker with the completion token and bindings', async () => {
  const cf = fakeCloudflare();
  const r = await deploy(opts(cf));
  assert.equal(r.uploaded, r.files);
  const uploads = cf.calls.filter((c) => c.path.includes('/assets/upload'));
  assert.ok(uploads.every((c) => c.auth === 'Bearer upload-jwt'), 'uploads use the session JWT, not the API token');
  const [hash, file] = [...uploads[0].body.entries()][0];
  assert.equal(file.name, hash);
  const put = cf.calls.find((c) => c.method === 'PUT');
  const meta = JSON.parse(await put.body.get('metadata').text());
  assert.equal(meta.main_module, 'worker/index.mjs');
  assert.equal(meta.assets.jwt, 'completion-jwt');
  assert.deepEqual(meta.bindings.map((b) => b.name), ['ASSETS', 'DB', 'REPORT_LIMITER']);
  assert.deepEqual(JSON.parse(cf.calls.find((c) => c.path.endsWith('/schedules')).body), [{ cron: '29 3 * * *' }], 'the nightly watchdog and cleanup are scheduled');
});

test('unchanged files are not re-uploaded; a one-page change uploads one file', async () => {
  const cf = fakeCloudflare();
  await deploy(opts(cf));
  const again = await deploy(opts(fakeCloudflare({ have: new Set(cf.have) })));
  assert.equal(again.uploaded, 0);
  const have = new Set(cf.have);
  have.delete(assetManifest(dist)['/limits/index.html'].hash);
  assert.equal((await deploy(opts(fakeCloudflare({ have })))).uploaded, 1);
});

test('a rate-limited upload waits and retries instead of failing', async () => {
  const cf = fakeCloudflare({ rateLimitOnce: true });
  const r = await deploy(opts(cf));
  assert.equal(r.uploaded, r.files);
  assert.equal(cf.calls.filter((c) => c.path.includes('/assets/upload')).length, 3, 'two buckets plus one retry of the rate-limited one');
});

test('a token with an expiry date stops the deploy before any upload', async () => {
  const cf = fakeCloudflare({ token: { status: 'active', expires_on: '2027-10-31T00:00:00Z' } });
  await assert.rejects(deploy(opts(cf)), /expires on 2027-10-31/);
  assert.deepEqual(cf.calls.map((c) => c.path), ['/user/tokens/verify']);
});

test('the Worker ships as its whole module graph, every relative import resolvable', () => {
  const modules = workerModules();
  for (const [name, src] of modules) {
    for (const spec of importSpecifiers(src).filter((s) => s.startsWith('.'))) {
      assert.ok(modules.has(posix.normalize(posix.join(posix.dirname(name), spec))), `${name} imports ${spec}`);
    }
  }
  assert.ok(modules.has('worker/reports.mjs') && modules.has('core/lib/sha256.mjs') && modules.has('site/lib/html.mjs'));
  assert.ok(![...modules.keys()].some((n) => n.startsWith('verify/') || n.startsWith('pipeline/')), 'no test or pipeline code in the Worker');
});

test('the smoke test passes on the real Worker, fails on a header regression, and rollback points at the previous version', async () => {
  const server = await serveWorker(dist);
  try {
    assert.deepEqual(await smoke({ base: server.url }), []);
  } finally {
    await server.close();
  }
  const regressed = async () => new Response('x', { status: 200, headers: { 'content-security-policy': "default-src 'self'; script-src 'self' 'unsafe-inline'" } });
  const failures = await smoke({ base: 'https://staging.gridprims.example', fetch: regressed });
  assert.ok(failures.some((f) => /script-src allows more than its own origin/.test(f)));
  const cf = fakeCloudflare();
  assert.equal(await rollback({ token: 't', account: 'a', worker: 'gridprims', fetch: cf }), 'v1');
  const post = cf.calls.find((c) => c.method === 'POST' && c.path.endsWith('/deployments'));
  assert.deepEqual(JSON.parse(post.body).versions, [{ version_id: 'v1', percentage: 100 }]);
});
