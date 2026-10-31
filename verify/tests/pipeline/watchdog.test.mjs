// The off-host watchdog (foundation tasks 10.7, 10.14).

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { watchdog } from '../../../worker/watchdog.mjs';
import worker from '../../../worker/index.mjs';
import { scheduledRun } from '../../../pipeline/scheduled.mjs';
import { recordRun } from '../../../pipeline/lib/health.mjs';

const NOW = Date.parse('2026-11-10T03:29:00Z');
function fakeGitHub(states) {
  const calls = [];
  const f = async (url, init) => {
    const path = url.replace('https://api.github.com/repos/clay-good/gridprims', '');
    calls.push(`${init.method} ${path}${init.body ? ` ${init.body}` : ''}`);
    if (path.startsWith('/actions/workflows?')) return Response.json({ workflows: Object.entries(states).map(([file, state], i) => ({ id: i + 1, path: `.github/workflows/${file}`, state })) });
    return new Response(null, { status: 204 });
  };
  return Object.assign(f, { calls });
}
const assets = (health) => ({ fetch: async () => Response.json(health) });
const row = (id, lastSuccess, thresholdHours) => ({ id, lastSuccess, thresholdHours });

test('all schedules disabled: the watchdog re-enables them and starts the stale ones', async () => {
  const gh = fakeGitHub({ 'refresh-data.yml': 'disabled_inactivity', 'link-check.yml': 'disabled_inactivity', 'ci.yml': 'active' });
  const health = { workflows: [row('refresh-data', '2026-11-01T09:17:00Z', 72), row('link-check', '2026-11-04T07:23:00Z', 504)] };
  const r = await watchdog({ GITHUB_ACTIONS_TOKEN: 't', GITHUB_REPO: 'clay-good/gridprims', ASSETS: assets(health) }, { fetch: gh, now: () => NOW });
  assert.deepEqual(r.reenabled, ['refresh-data.yml', 'link-check.yml']);
  assert.deepEqual(r.dispatched, ['refresh-data.yml', 'heartbeat.yml'], 'the 9-day-old daily refresh is restarted; the weekly link check is within its threshold');
  assert.ok(gh.calls.includes('PUT /actions/workflows/1/enable'));
  assert.ok(gh.calls.some((c) => c.startsWith('POST /actions/workflows/heartbeat.yml/dispatches') && c.includes('"at":"2026-11-10T03:29:00.000Z"')));
});

test('without its credential the watchdog does nothing and says why', async () => {
  const r = await watchdog({ ASSETS: assets({}) });
  assert.deepEqual(r, { ran: false, reenabled: [], dispatched: [], note: 'no credential configured' });
});

test('the Worker runs the watchdog and the report cleanup independently on its schedule', async () => {
  const waited = [];
  const env = { DB: { prepare: () => ({ bind: () => ({ run: async () => { throw new Error('d1 down'); } }) }) }, ASSETS: assets({}) };
  await worker.scheduled({}, env, { waitUntil: (p) => waited.push(p) });
  assert.equal(waited.length, 2);
  const results = await Promise.allSettled(waited);
  assert.equal(results[1].status, 'fulfilled', 'a failing cleanup does not stop the watchdog');
});

test('the watchdog is watched: a stale heartbeat is reported by the next in-host run', async () => {
  const root = mkdtempSync(join(tmpdir(), 'gridprims-root-'));
  mkdirSync(join(root, 'data/health'), { recursive: true });
  recordRun(root, { workflow: 'heartbeat', started: '2026-11-01T03:29:00Z', finished: '2026-11-01T03:29:00Z', ok: true });
  const issues = [];
  const host = { available: true, async reenableInactive() { return []; }, async openIssue(title) { issues.push(title); } };
  const r = await scheduledRun('link-check', { root, host, now: () => new Date('2026-11-10T07:23:00Z') });
  assert.match(r.notes.join('\n'), /watchdog's heartbeat is stale \(last 2026-11-01/);
  assert.deepEqual(issues, ['Pipeline: the Worker watchdog heartbeat is stale']);
});
