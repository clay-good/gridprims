// Is my use high? (household bill check task 3.1): the spec's scenarios, state
// averages against EIA's published Table 5A, and three utilities computed by
// hand from their EIA-861 rows.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { annualize, compareWords, percentFrom, residentialAverages, seasonalPattern } from '../../../core/lib/usage-benchmark.mjs';
import { parsePeriods } from '../../../core/lib/bill-entry.mjs';
import { runTool } from '../../../core/contract/run.mjs';
import { getTool } from '../../../core/tools/index.mjs';
import { served } from '../../../site/entities/plants.mjs';

const ROOT = join(import.meta.dirname, '../../..');
const ref = JSON.parse(readFileSync(join(ROOT, 'verify/reference/eia-table-5a-usage.json'), 'utf8'));
const { manifest, impl } = getTool('household.usage-benchmark.compare');
const seven = '2026-01, 1,922 kWh\n2026-02, 1,400 kWh\n2026-03, 1,000 kWh\n2026-04, 800 kWh\n2026-05, 744 kWh\n2026-06, 900 kWh\n2026-07-01 to 2026-08-01, 1,200 kWh';

test('14,400 kWh against a 12,000 kWh utility average is 20% more, with "EIA-861, 2025"', () => {
  assert.equal(percentFrom(14400, 12000), 20);
  assert.equal(compareWords(20), '20% more than');
  const year = Array.from({ length: 12 }, (_, i) => `2025-${String(i + 1).padStart(2, '0')}, 1,200 kWh`).join('\n');
  const r = runTool(manifest, impl, { periods: year, utilityAverage: 12000, stateAverage: 13000, dataYear: 2025 });
  assert.equal(r.outputs.vsUtility.value, 20);
  assert.match(r.sentence, /is 20% more than the utility's average home and 10\.8% more than the state's \(EIA-861, 2025\)\./);
});

test('seven months covering 213 days are labeled "estimated from 213 days" and the method is shown', () => {
  const y = annualize(parsePeriods(seven).periods);
  assert.deepEqual([y.days, y.estimated, y.annualKwh], [213, true, 13651]);
  const r = runTool(manifest, impl, { periods: seven, utilityAverage: 12000, stateAverage: 12000, dataYear: 2025 });
  assert.match(r.sentence, /^From 213 days, we estimate 13,651 kWh a year\. That is 13\.8% more than/);
  assert.ok(r.work.steps.some((s) => s.includes('estimated from 213 days: 7,966 kWh × 365 ÷ 213')));
});

test('January at 62 kWh a day and May at 24 is a 2.6× swing, and the checklist starts with electric heating', () => {
  const p = seasonalPattern(parsePeriods(seven).periods);
  assert.deepEqual([p.high.perDay, p.low.perDay, p.ratio], [62, 24, 2.6]);
  assert.equal(p.checklist[0], 'electric heating');
  // A summer peak puts air conditioning first; a swing of 1.5× or less shows no checklist.
  assert.equal(seasonalPattern(parsePeriods('2026-04, 600 kWh\n2026-07, 1,550 kWh').periods).checklist[0], 'air conditioning');
  assert.deepEqual(seasonalPattern(parsePeriods('2026-04, 900 kWh\n2026-07, 1,300 kWh').periods).checklist, []);
});

test('averages only: no percentile or rank appears, and the averages note is present', () => {
  const r = runTool(manifest, impl, { periods: seven, utilityAverage: 12000, stateAverage: 12000, dataYear: 2025 });
  const text = [r.sentence, ...r.work.steps].join(' ');
  assert.doesNotMatch(text.replace('no percentile or rank', ''), /percentile|rank|homes like yours/i);
  assert.match(text, /averages across homes of every size and heating type/);
  assert.match(text, /These are things to check, not a diagnosis\./);
});

test(`state averages from EIA-861 ${ref.dataYear} match EIA's Table 5A in all ${Object.keys(ref.states).length} states within 1%`, () => {
  const history = served(join(ROOT, 'data'), 'eia-861-history', 'sales');
  const avg = residentialAverages(history.rows.filter((r) => r.data_year === ref.dataYear));
  assert.equal(Object.keys(ref.states).length, 51);
  for (const [st, { averageMonthlyKwh }] of Object.entries(ref.states)) {
    const ours = avg.stateMonthly(st);
    assert.ok(Math.abs(ours / averageMonthlyKwh - 1) < 0.01, `${st}: ${ours} against ${averageMonthlyKwh}`);
  }
});

test('three utilities computed by hand from their EIA-861 rows: every average and percent difference matches', () => {
  const sales = served(join(ROOT, 'data'), 'eia-861', 'sales');
  const delivery = served(join(ROOT, 'data'), 'eia-861', 'delivery');
  const avg = residentialAverages([...sales.rows, ...delivery.rows]);
  assert.equal(ref.utilities.length, 3);
  for (const c of ref.utilities) {
    const rows = [...sales.rows, ...delivery.rows].filter((r) => r.state === c.state && r.utility_id === c.utilityId);
    assert.deepEqual(rows.map((r) => [r.part, r.service_type, r.res_sales, r.res_customers]), c.rows.map((r) => [r.part, r.service_type, r.res_sales_mwh, r.res_customers]), `${c.utility}: the cited rows`);
    assert.equal(avg.utility(c.state, c.utilityId), c.averageKwhPerYear, c.utility);
    assert.equal(percentFrom(c.home14400.annualKwh, c.averageKwhPerYear), c.home14400.percentFromAverage, c.utility);
  }
});
