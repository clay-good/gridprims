// The unattended pipeline (foundation tasks 10.1, 10.3, 10.5, 10.6, 10.7,
// 10.8, 10.10, 10.13 partly), against stand-ins for EIA and GitHub.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { scheduledRun } from '../../../pipeline/scheduled.mjs';
import { linkCheck, outboundLinks } from '../../../pipeline/link-check.mjs';
import { readHealth } from '../../../pipeline/lib/health.mjs';
import { stalled, WORKFLOWS } from '../../../pipeline/workflows.mjs';
import { checkWorkflows } from '../../gates/workflows.mjs';
import entry from '../../../pipeline/registry/eia-861.mjs';
import { eia861Zip, sampleRows, smallTables } from '../../fixtures/data/eia-861/workbook.mjs';
import { fixtureRepo } from '../helpers.mjs';

const small = { ...entry, tables: smallTables(entry) };

/** A stand-in EIA site: files by URL, answering HEAD and GET. */
function fakeEia(files) {
  const calls = [];
  const f = async (url, init = {}) => {
    calls.push(`${init.method ?? 'GET'} ${url}`);
    const file = files[url];
    if (!file) return new Response('not found', { status: 404 });
    return new Response(init.method === 'HEAD' ? null : file.bytes, { status: 200, headers: { 'content-length': String(file.bytes.length), 'last-modified': file.lastModified } });
  };
  return Object.assign(f, { calls });
}
/** A stand-in GitHub that records what the pipeline asked of it. */
function fakeHost(disabled = []) {
  const issues = [];
  return { available: true, issues, async reenableInactive() { return disabled.splice(0); }, async openIssue(title, body) { issues.push({ title, body }); return { number: issues.length }; } };
}
/** A throwaway root holding data/ and the health record. */
function root() {
  const r = mkdtempSync(join(tmpdir(), 'gridprims-root-'));
  mkdirSync(join(r, 'data/health'), { recursive: true });
  return r;
}
const URL25 = 'https://www.eia.gov/electricity/data/eia861/zip/f8612025.zip';
const URL26 = 'https://www.eia.gov/electricity/data/eia861/zip/f8612026.zip';
const at = (iso) => () => new Date(iso);

test('first run snapshots, a quiet run records only the check, and a new data year refreshes in the same run', async () => {
  const r = root();
  const out = join(r, 'data');
  const site = { [URL25]: { bytes: eia861Zip(), lastModified: 'Wed, 07 Oct 2026 13:48:05 GMT' } };
  const host = fakeHost();
  const opts = { root: r, outDir: out, entries: { 'eia-861': { ...small, vintages: {} , releaseWatch: entry.releaseWatch } }, host };
  // Seed a served 2025 version as the registry-pinned snapshot would.
  opts.entries['eia-861'].vintages = { 2025: { url: URL25, asOf: '2026-10-07', sha256: null } };

  const first = await scheduledRun('refresh-eia', { ...opts, fetch: fakeEia(site), now: at('2026-10-31T09:17:00Z') });
  assert.equal(first.datasets[0].refreshed, true);
  assert.equal(first.datasets[0].version, '2026-10');

  const quiet = await scheduledRun('refresh-eia', { ...opts, fetch: fakeEia(site), now: at('2026-11-01T09:17:00Z') });
  assert.deepEqual([quiet.datasets[0].checked, quiet.datasets[0].refreshed, quiet.datasets[0].failure], [true, false, undefined]);
  let h = readHealth(r);
  const row = h.datasets.find((d) => d.id === 'eia-861');
  assert.equal(row.lastCheck, '2026-11-01T09:17:00.000Z');
  assert.equal(row.lastRefresh, '2026-10-31T09:17:00.000Z', 'a quiet check does not count as a refresh');

  site[URL26] = { bytes: eia861Zip({ year: 2026 }), lastModified: 'Mon, 30 Aug 2027 12:00:00 GMT' };
  const fresh = await scheduledRun('refresh-eia', { ...opts, fetch: fakeEia(site), now: at('2027-09-01T09:17:00Z') });
  assert.equal(fresh.datasets[0].found, 'new data year 2026');
  const m = JSON.parse(readFileSync(join(out, 'eia-861/2027-09/manifest.json'), 'utf8'));
  assert.equal(m.asOf, '2027-08-30', 'as-of is the publisher\'s date, not ours');
  assert.equal(m.tables[0].dataPeriod, '2026');
  assert.equal(host.issues.length, 0, 'a successful refresh opens no issue');
});

test('a failing validator keeps the previous version, publishes the failure with its first date, and opens one issue', async () => {
  const r = root();
  const out = join(r, 'data');
  const site = { [URL25]: { bytes: eia861Zip({ rows: sampleRows(2025, 40) }), lastModified: 'Wed, 07 Oct 2026 13:48:05 GMT' } };
  const host = fakeHost();
  const opts = { root: r, outDir: out, host, entries: { 'eia-861': { ...small, vintages: { 2025: { url: URL25, asOf: '2026-10-07', sha256: null } } } } };
  await scheduledRun('refresh-eia', { ...opts, fetch: fakeEia(site), now: at('2026-10-31T09:17:00Z') });
  // The publisher replaces the file with a truncated one.
  site[URL25] = { bytes: eia861Zip({ rows: sampleRows(2025).slice(0, 3) }), lastModified: 'Thu, 05 Nov 2026 10:00:00 GMT' };
  await scheduledRun('refresh-eia', { ...opts, fetch: fakeEia(site), now: at('2026-11-05T09:17:00Z') });
  await scheduledRun('refresh-eia', { ...opts, fetch: fakeEia(site), now: at('2026-11-06T09:17:00Z') });
  const h = readHealth(r);
  const row = h.datasets.find((d) => d.id === 'eia-861');
  assert.equal(row.version, '2026-10', 'the previous version stays live');
  assert.match(row.failure.reason, /rows dropped/);
  assert.equal(row.failure.since, '2026-11-05T09:17:00.000Z');
  assert.equal(row.failure.last, '2026-11-06T09:17:00.000Z');
  assert.equal(JSON.parse(readFileSync(join(out, 'eia-861/current.json'), 'utf8')).version, '2026-10');
  assert.equal(host.issues.length, 2, 'the host dedupes by title; the pipeline asks each run');
  assert.match(host.issues[0].title, /eia-861 refresh failed/);
});

test('self-heal re-enables workflows the host disabled, and the record says so', async () => {
  const r = root();
  const host = fakeHost(['link-check', 'canary']);
  const run = await scheduledRun('refresh-eia', { root: r, outDir: join(r, 'data'), host, fetch: fakeEia({}), now: at('2026-10-31T09:17:00Z'), entries: { 'eia-861': { ...small, vintages: { 2025: { url: URL25, asOf: '2026-10-07', sha256: null } } } } });
  assert.deepEqual(run.enabledEvents, ['link-check', 'canary']);
  const h = readHealth(r);
  assert.equal(h.workflows.find((w) => w.id === 'canary').reenabledAt, '2026-10-31T09:17:00.000Z');
});

test('every run is recorded with what it checked, refreshed, and how long it took', async () => {
  const r = root();
  const times = ['2026-10-31T09:17:00Z', '2026-10-31T09:17:42Z'];
  await scheduledRun('refresh-eia', { root: r, outDir: join(r, 'data'), host: fakeHost(), fetch: fakeEia({}), now: () => new Date(times.shift() ?? '2026-10-31T09:17:42Z'), entries: { 'eia-861': { ...small, vintages: { 2025: { url: URL25, asOf: '2026-10-07', sha256: null } } } } });
  const h = readHealth(r);
  assert.equal(h.generatedAt, '2026-10-31T09:17:42.000Z');
  assert.equal(h.runs[0].workflow, 'refresh-eia');
  assert.equal(h.runs[0].durationMs, 42_000);
  assert.deepEqual(h.workflows.map((w) => [w.id, w.intervalHours, w.thresholdHours]), [['refresh-eia', 24, 72], ['link-check', 168, 504], ['canary', 168, 504], ['heartbeat', 24, 72]]);
});

test('staleness thresholds: a daily workflow is stalled after 4 days; a weekly one is not after 9', () => {
  const daily = WORKFLOWS.find((w) => w.id === 'refresh-eia');
  const weekly = WORKFLOWS.find((w) => w.id === 'link-check');
  const now = Date.parse('2026-11-10T00:00:00Z');
  assert.equal(stalled(daily, '2026-11-06T00:00:00Z', now), true);
  assert.equal(stalled(daily, '2026-11-08T00:00:00Z', now), false);
  assert.equal(stalled(weekly, '2026-11-01T00:00:00Z', now), false);
  assert.equal(stalled(weekly, null, now), true);
});

test('link check: a moved handoff is recorded with its new target and every page that uses it', async () => {
  const r = root();
  const links = await outboundLinks();
  const moved = 'https://www.eia.gov/energyexplained/units-and-calculators/energy-conversion-calculators.php';
  assert.ok(links.has(moved));
  const f = async (url) => {
    const res = new Response('ok', { status: url.includes('nist.gov') ? 404 : 200 });
    Object.defineProperty(res, 'url', { value: url === moved ? 'https://www.eia.gov/energyexplained/units-and-calculators/' : url });
    return res;
  };
  const host = fakeHost();
  const results = await linkCheck({ fetch: f, host, root: r, now: at('2026-11-03T07:23:00Z') });
  const m = results.find((x) => x.url === moved);
  assert.equal(m.state, 'moved');
  assert.equal(m.finalUrl, 'https://www.eia.gov/energyexplained/units-and-calculators/');
  assert.deepEqual(m.usedBy, ['calc.energy-units.convert citation', 'calc.energy-units.convert handoff']);
  assert.equal(results.find((x) => x.url.includes('nist.gov')).state, 'broken');
  assert.equal(host.issues.length, 1);
  assert.deepEqual(readHealth(r).links, results);
});

test('CI policy: a marketplace action, an unpinned action, pull_request_target, event text in a shell line, and a floating runner all fail', () => {
  const bad = fixtureRepo({ '.github/workflows/bad.yml': `on: [pull_request_target]
jobs:
  x:
    runs-on: ubuntu-latest
    steps:
      - uses: some-org/deploy-action@v2
      - uses: actions/checkout@v4
      - run: echo "\${{ github.event.pull_request.title }}"
` });
  const errors = checkWorkflows(bad).join('\n');
  assert.match(errors, /some-org\/deploy-action@v2 is not a GitHub-published action/);
  assert.match(errors, /actions\/checkout is not pinned to a full commit SHA/);
  assert.match(errors, /pull_request_target/);
  assert.match(errors, /event text interpolated into a shell line/);
  assert.match(errors, /floating label ubuntu-latest/);
});

test('the repository\'s own workflows pass the policy, and only the canary floats', () => {
  assert.deepEqual(checkWorkflows(join(import.meta.dirname, '../../..')), []);
});


test('CI policy: a scheduled workflow at the top of the hour or without a queueing concurrency group fails', () => {
  const bad = fixtureRepo({ '.github/workflows/r.yml': `on:
  schedule:
    - cron: '0 9 * * *'
concurrency:
  group: r
  cancel-in-progress: true
jobs:
  x:
    runs-on: ubuntu-24.04
` });
  const errors = checkWorkflows(bad).join('\n');
  assert.match(errors, /top of the hour/);
  assert.match(errors, /concurrency group that queues runs/);
});

test('secret scan: credential-shaped strings are found; ordinary text is not', async () => {
  const { findSecrets, checkSecrets } = await import('../../gates/secrets.mjs');
  assert.deepEqual(findSecrets(`token ghp_${'a'.repeat(36)}`), ['GitHub token']);
  assert.deepEqual(findSecrets('-----BEGIN PRIVATE KEY-----'), ['private key']);
  assert.deepEqual(findSecrets('authorization: Bearer abcdefghijklmnopqrstuvwxyz123456'), ['bearer header']);
  assert.deepEqual(findSecrets('GITHUB_TOKEN: ${{ github.token }} and sha256 f59f6c732bf685fe0a1591b32227f5ce572dc0dfd26bb5caaeed128ac4e3a396'), []);
  assert.deepEqual(checkSecrets(join(import.meta.dirname, '../../..')), []);
});
