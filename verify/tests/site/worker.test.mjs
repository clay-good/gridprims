// The header smoke test on every route template, against the Worker with a
// stand-in for Cloudflare's static-asset binding that reads dist/.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { build } from '../../../site/build.mjs';
import worker from '../../../worker/index.mjs';
import { checkHeaders } from '../../lib/smoke.mjs';
import { TYPES } from '../../lib/static-server.mjs';

const out = mkdtempSync(join(tmpdir(), 'gridprims-dist-'));
await build({ outDir: out });
const ASSETS = {
  async fetch(r) {
    const path = new URL(typeof r === 'string' ? r : r.url).pathname;
    const file = join(out, path.endsWith('/') ? `${path}index.html` : path);
    if (!existsSync(file)) return new Response('nope', { status: 404 });
    return new Response(readFileSync(file), { headers: { 'content-type': TYPES[file.slice(file.lastIndexOf('.'))] ?? 'application/octet-stream', 'set-cookie': 'x=1' } });
  },
};
const get = (path, method = 'GET') => worker.fetch(new Request(`https://gridprims.com${path}`, { method }), { ASSETS });


test('every route template carries the required policy and no cookie', async () => {
  for (const path of ['/', '/limits/', '/changelog/', '/tools/calc/energy-units/convert/', '/404.html', '/site/styles/site.css', '/core/contract/run.mjs', '/command-index.json']) {
    const res = await get(path);
    assert.equal(res.status, 200, path);
    assert.deepEqual(checkHeaders(res), [], path);
  }
});

test('the inline theme script in every page is allowed by its hash and nothing else inline is', async () => {
  const res = await get('/');
  const html = await res.text();
  const inline = [...html.matchAll(/<script>([^<]*)<\/script>/g)].map((m) => m[1]);
  assert.equal(inline.length, 1);
  const hash = JSON.parse(readFileSync(join(out, '_csp-hashes.json'), 'utf8'))['script-src'][0];
  assert.ok(res.headers.get('content-security-policy').includes(`'${hash}'`));
  assert.doesNotMatch(html, /\son[a-z]+=/i, 'no inline event handlers');
});

test('a missing page gets the 404 page with status 404 and the same headers', async () => {
  const res = await get('/utility/oncor/');
  assert.equal(res.status, 404);
  assert.match(await res.text(), /Page not found/);
  assert.deepEqual(checkHeaders(res), []);
});

test('the smoke check fails on a header regression', () => {
  const bad = new Response('x', { headers: { 'content-security-policy': "default-src 'self'; script-src 'self' 'unsafe-inline'", 'set-cookie': 'id=1' } });
  const problems = checkHeaders(bad);
  assert.ok(problems.includes('script-src allows more than its own origin'));
  assert.ok(problems.includes('sets a cookie'));
  assert.ok(problems.includes('missing object-src \'none\''));
});

test('unknown API routes and non-GET methods are refused', async () => {
  assert.equal((await get('/api/anything')).status, 404);
  assert.equal((await get('/', 'POST')).status, 405);
});
