// Problem reports (foundation tasks 9.1, 9.2): schema, honeypot, proof of
// work, rate limit, storage, and retention, against stand-ins for the host's
// D1 database and rate-limiting binding.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { challenge, POW_BITS, solve, verifyPow } from '../../../core/contract/report.mjs';
import { leadingZeroBits, sha256, toHex } from '../../../core/lib/sha256.mjs';
import { cleanupReports, handleReport } from '../../../worker/reports.mjs';
import worker from '../../../worker/index.mjs';

/** A tiny in-memory D1: just the two statements the Worker runs. */
function fakeD1() {
  const rows = [];
  return {
    rows,
    prepare(sql) {
      return {
        bind(...args) {
          return {
            async run() {
              if (sql.startsWith('INSERT')) rows.push({ id: args[0], received_at: args[1], closed_at: null, payload: args[2] });
              else if (sql.startsWith('DELETE')) {
                const [closedBefore, receivedBefore] = args;
                for (let i = rows.length - 1; i >= 0; i--) {
                  const r = rows[i];
                  if ((r.closed_at && r.closed_at < closedBefore) || r.received_at < receivedBefore) rows.splice(i, 1);
                }
              }
              return { success: true };
            },
          };
        },
      };
    },
  };
}
/** The host's limiter: 10 per window per key at one edge location. */
function fakeLimiter(max = 10) {
  const counts = new Map();
  return { async limit({ key }) { const n = (counts.get(key) ?? 0) + 1; counts.set(key, n); return { success: n <= max }; } };
}

const base = { toolId: 'calc.energy-units.convert', toolVersion: '0.1.0', datasets: [], pageUrl: 'https://gridprims.com/tools/calc/energy-units/convert/', message: 'The coal figure looks low.' };
const signed = (p) => ({ ...p, website: '', pow: solve(challenge(p)) });
const post = (body, env, ip = '1.2.3.4') => handleReport(new Request('https://gridprims.com/api/reports', { method: 'POST', headers: { 'content-type': 'application/json', 'cf-connecting-ip': ip }, body: typeof body === 'string' ? body : JSON.stringify(body) }), env);

test('our SHA-256 matches the platform on every padding boundary', () => {
  for (const n of [0, 1, 55, 56, 63, 64, 65, 119, 120, 1000]) {
    const s = 'x'.repeat(n);
    assert.equal(toHex(sha256(new TextEncoder().encode(s))), createHash('sha256').update(s).digest('hex'), String(n));
  }
  assert.equal(leadingZeroBits(Uint8Array.of(0, 0x10)), 11);
});

test('a valid report is stored without its proof or honeypot, and gets an id', async () => {
  const env = { DB: fakeD1(), REPORT_LIMITER: fakeLimiter() };
  const res = await post(signed(base), env);
  assert.equal(res.status, 201);
  const { id, changelog } = await res.json();
  assert.match(id, /^r_[a-z2-9]{10}$/);
  assert.equal(changelog, '/changelog/');
  assert.equal(env.DB.rows.length, 1);
  assert.deepEqual(JSON.parse(env.DB.rows[0].payload), base);
  assert.equal(res.headers.get('set-cookie'), null);
});

test('honeypot filled: a normal-looking answer, nothing stored', async () => {
  const env = { DB: fakeD1(), REPORT_LIMITER: fakeLimiter() };
  const res = await post({ ...signed(base), website: 'http://spam.example' }, env);
  assert.equal(res.status, 201);
  assert.match((await res.json()).id, /^r_/);
  assert.equal(env.DB.rows.length, 0);
});

test('flood: after 10 reports from one client, the rest are refused with when to try again', async () => {
  const env = { DB: fakeD1(), REPORT_LIMITER: fakeLimiter() };
  const statuses = [];
  for (let i = 0; i < 20; i++) statuses.push((await post(signed({ ...base, message: `report ${i}` }), env)).status);
  assert.deepEqual(statuses, [...Array(10).fill(201), ...Array(10).fill(429)]);
  const refused = await post(signed(base), env);
  assert.match((await refused.json()).error, /try again in 10 minutes/);
  assert.equal(refused.headers.get('retry-after'), '600');
  assert.equal((await post(signed(base), env, '5.6.7.8')).status, 201, 'another client is unaffected');
});

test('missing or wrong proof of work, bad schema, and oversized bodies are refused', async () => {
  const env = { DB: fakeD1(), REPORT_LIMITER: fakeLimiter(1000) };
  assert.equal((await post({ ...base, website: '' }, env)).status, 400);
  const p = signed(base);
  assert.equal((await post({ ...p, message: 'changed after solving' }, env)).status, 400, 'proof is bound to the payload');
  assert.equal((await post({ ...p, extra: 1 }, env)).status, 400);
  assert.equal((await post(signed({ ...base, pageUrl: 'https://gridprims.com/x/#value=12' }), env)).status, 400, 'no fragments');
  assert.equal((await post(signed({ ...base, message: '' }), env)).status, 400);
  assert.equal((await post(signed({ ...base, message: 'x'.repeat(4001) }), env)).status, 400);
  assert.equal((await post('{"a":"' + 'x'.repeat(17_000) + '"}', env)).status, 413);
  assert.equal((await post('not json', env)).status, 400);
  assert.equal(env.DB.rows.length, 0);
});

test('the proof of work costs the browser work and the server one hash', () => {
  const ch = challenge(base);
  const t0 = performance.now();
  const pow = solve(ch);
  const ms = performance.now() - t0;
  console.log(`BUDGET report-pow ${POW_BITS} bits nonce ${pow.nonce} in ${ms.toFixed(0)} ms (Node)`);
  assert.ok(verifyPow(pow, ch));
  assert.ok(!verifyPow({ ...pow, nonce: String(Number(pow.nonce) + 1) }, ch));
});

test('retention: a report closed 181 days ago is deleted; open ones last up to 365 days', async () => {
  const env = { DB: fakeD1() };
  const now = Date.parse('2026-10-30T00:00:00Z');
  const day = 86_400_000;
  const iso = (ms) => new Date(ms).toISOString();
  env.DB.rows.push(
    { id: 'closed181', received_at: iso(now - 200 * day), closed_at: iso(now - 181 * day), payload: '{}' },
    { id: 'closed179', received_at: iso(now - 200 * day), closed_at: iso(now - 179 * day), payload: '{}' },
    { id: 'open300', received_at: iso(now - 300 * day), closed_at: null, payload: '{}' },
    { id: 'open366', received_at: iso(now - 366 * day), closed_at: null, payload: '{}' },
  );
  await cleanupReports(env, () => now);
  assert.deepEqual(env.DB.rows.map((r) => r.id), ['closed179', 'open300']);
});

test('the Worker routes reports and runs the cleanup on its schedule', async () => {
  const env = { DB: fakeD1(), REPORT_LIMITER: fakeLimiter(), ASSETS: { fetch: async () => new Response('x') } };
  const res = await worker.fetch(new Request('https://gridprims.com/api/reports', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(signed(base)) }), env);
  assert.equal(res.status, 201);
  assert.match(res.headers.get('content-security-policy'), /default-src 'self'/);
  let waited;
  await worker.scheduled({}, env, { waitUntil: (p) => { waited = p; } });
  await waited;
});
