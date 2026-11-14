// Peer comparison of published reliability (add-reliability-tools tasks 1.3,
// 4.1 to 4.3): cohorts by ownership, size, and division, checked against an
// independent recomputation from EIA's file; widening when a cohort is too
// small; no comparison across bases; method labels; coverage; neutral words.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT } from '../../../pipeline/run.mjs';
import { served } from '../../../site/entities/plants.mjs';
import { MIN_COHORT, OURS, cohortTable, compare, divisionOf, figures, pair, quantile, sizeClassOf } from '../../../core/lib/reliability-peers.mjs';

const rel = served(join(ROOT, 'data'), 'eia-861', 'reliability');
const sales = served(join(ROOT, 'data'), 'eia-861', 'sales');
const figs = figures(rel.rows, sales.rows);
const table = cohortTable(figs);
const check = JSON.parse(readFileSync(join(ROOT, 'verify/reference/reliability/cohorts-check.json'), 'utf8'));

test('cohort quartiles match an independent recomputation from EIA\'s file to 0.1 minute, on the same file', () => {
  const v = JSON.parse(readFileSync(join(ROOT, 'data/eia-861/current.json'), 'utf8')).version;
  assert.equal(check.file, `data/eia-861/${v}/reliability.csv.gz`, 'the check was run on the served version');
  assert.equal(check.cohorts.length, 3);
  for (const c of check.cohorts) {
    const row = table.find((r) => r.method === c.method && r.basis === c.basis && r.ownership === c.ownership && r.size === c.size && r.division === c.division);
    assert.ok(row, JSON.stringify(c));
    assert.equal(row.saidi.n, c.n, row.name);
    for (const k of ['q1', 'median', 'q3']) assert.ok(Math.abs(row.saidi[k] - c[k]) < 0.1, `${row.name} ${k}: ${row.saidi[k]} vs ${c[k]}`);
  }
});

test('co-op compared: a cooperative at 232 minutes gets its percentile, cohort, size, and median', () => {
  const coop = figs.find((f) => f.ownership === 'cooperative' && f.method === 'ieee' && f.basis === 'with-med' && f.division === 'West North Central' && f.size === '10k-100k');
  const r = compare({ ...coop, saidi: 232 }, figs);
  assert.equal(r.status, 'ok');
  assert.equal(r.cohort, 'cooperative utilities with 10,000 to 99,999 customers in the West North Central division, reporting by the IEEE 1366 standard method and including major event days');
  assert.equal(r.n, 48);
  assert.ok(Math.abs(r.median - check.cohorts[0].median) < 0.1);
  assert.ok(r.percentile > 50 && r.percentile < 100);
  assert.match(r.sentence, /^232\.0 min including major event days\. \d+ of the 48 cooperative utilities .* reported less; the median is 150\.5 min, and the middle half runs from 105\.2 to 324\.6\.$/);
  assert.equal(r.widened, null);
});

test('cohort too small: the tool widens one step, says so, and names the wider cohort', () => {
  const lonely = { utilityId: -1, name: 'Test', state: 'RI', year: 2025, ownership: 'investor-owned', division: 'New England', size: '10k-100k', customers: 20_000, method: 'ieee', basis: 'with-med', saidi: 100, saifi: 1, coverage: null };
  const narrow = figs.filter((f) => f.ownership === 'investor-owned' && f.size === '10k-100k' && f.division === 'New England' && f.method === 'ieee' && f.basis === 'with-med');
  assert.ok(narrow.length < MIN_COHORT, 'the fixture really is too small');
  const r = compare(lonely, figs);
  assert.equal(r.status, 'ok');
  assert.ok(r.widened.length >= 1);
  assert.match(r.widenedNote, /^The narrower cohort, investor-owned utilities with 10,000 to 99,999 customers in the New England division, .* has \d+ utilit(y|ies)/);
  assert.match(r.widenedNote, /fewer than 10, so the comparison uses the wider one\.$/);
  assert.doesNotMatch(r.cohort, /New England/);
  assert.ok(r.n >= MIN_COHORT);
});

test('mixed bases refused: a with-major-events figure is never set against a without cohort, and the match is offered', () => {
  const f = figs.find((x) => x.basis === 'with-med' && x.method === 'ieee');
  const r = compare(f, figs, { cohortBasis: 'without-med' });
  assert.equal(r.status, 'refused');
  assert.match(r.reason, /including major event days; the cohort you chose is excluding major event days\. Those measure different things/);
  assert.deepEqual(r.offer, { cohortBasis: 'with-med' });
  const other = figs.find((x) => x.basis === 'without-med');
  assert.equal(pair(f, other).status, 'refused');
});

test('method labels: a self-declared figure is compared only with self-declared ones, and both labels show beside a standard one', () => {
  const own = figs.find((x) => x.method === 'other' && x.basis === 'with-med' && x.ownership === 'cooperative');
  const r = compare(own, figs);
  assert.equal(r.status, 'ok');
  assert.match(r.cohort, /reporting by the utility's own method/);
  assert.match(r.methodNote, /not comparable with standard-method figures/);
  assert.equal(compare(figs.find((x) => x.method === 'ieee' && x.ownership === 'cooperative'), figs).methodNote, null);
  const ieee = figs.find((x) => x.method === 'ieee' && x.basis === 'with-med');
  const p = pair(ieee, own);
  assert.equal(p.status, 'ok');
  assert.deepEqual(p.labels, [`${ieee.name}: the IEEE 1366 standard method`, `${own.name}: the utility's own method`]);
  assert.match(p.note, /Self-declared major events are not comparable/);
});

test('partial coverage: the share of customers the report covers is shown, with why it can pass 100%', () => {
  const f = figs.find((x) => x.coverage !== null && x.coverage < 1 && x.method === 'ieee' && x.basis === 'with-med');
  const r = compare(f, figs);
  assert.match(r.coverageNote, /^The report covers \d+\.\d% of the customers EIA's sales schedule counts for this utility here\. The two schedules count customers differently, so this can exceed 100%\.$/);
  assert.ok(figs.some((x) => x.coverage > 1), 'over 100% occurs in the real file');
});

test('no ranking, no judgement: the words carry numbers and the cohort, never an adjective or a cause', () => {
  for (const f of figs.filter((x) => x.method === 'ieee').slice(0, 300)) {
    const r = compare(f, figs);
    if (r.status !== 'ok') continue;
    for (const text of [r.sentence, r.widenedNote ?? '', r.coverageNote ?? '']) {
      assert.doesNotMatch(text, /\b(best|worst|good|bad|poor|better|worse|excellent|top|bottom|rank|grade|score|because|due to)\b/i, text);
    }
  }
  assert.match(OURS, /are our choices; EIA publishes the figures, not the cohorts\./);
});

test('size classes, divisions, and quartiles are the stated ones', () => {
  assert.equal(sizeClassOf(9_999).id, 'under-10k');
  assert.equal(sizeClassOf(10_000).id, '10k-100k');
  assert.equal(sizeClassOf(1_000_000).id, '1m-plus');
  assert.equal(divisionOf('TX'), 'West South Central');
  assert.equal(divisionOf('DC'), 'South Atlantic');
  assert.equal(quantile([1, 2, 3, 4], 0.25), 1.75);
  assert.equal(quantile([5], 0.5), 5);
});
