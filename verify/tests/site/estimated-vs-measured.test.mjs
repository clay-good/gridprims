// The published difference between our estimate and EPA's measurements
// (add-measured-plant-emissions 3.1 to 3.4): the overview page with its method
// and downloads, the per-region section on a balancing-authority page with the
// hours named, the coverage floor stated as ours, and the figure beside the
// method caveat on an hourly carbon result.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT } from '../../../pipeline/run.mjs';
import { COMPARISON_PATH, comparisonCsv, comparisonJson, comparisonSummary, forRegion, loadComparison, worstHours } from '../../../site/entities/estimated-vs-measured.mjs';
import { estimatedVsMeasuredPage } from '../../../site/templates/estimated-vs-measured.mjs';
import { balancingPage } from '../../../site/templates/balancing.mjs';
import { balancingPages } from '../../../site/entities/balancing.mjs';
import { renderCarbon } from '../../../site/ui/workbench-carbon.mjs';
import { createI18n } from '../../../site/lib/i18n.mjs';
import strings from '../../../site/strings/en-US.mjs';
import { COVERAGE_FLOOR } from '../../../core/lib/estimated-vs-measured.mjs';

const i18n = createI18n(strings, 'en-US');
const comparison = loadComparison(join(ROOT, 'data'));
const text = (html) => String(html).replace(/<[^>]+>/g, ' ').replace(/&#39;/g, "'").replace(/&amp;/g, '&').replace(/\s+/g, ' ');
const skip = !comparison && 'epa-camd or eia-930 is not built';

test('every region-year both datasets cover is compared, and each says whether it can carry the comparison', { skip }, () => {
  assert.ok(comparison.rows.length > 50, `${comparison.rows.length} region-years`);
  assert.equal(comparison.floor, COVERAGE_FLOOR);
  for (const r of comparison.rows) {
    assert.ok(r.hours > 0, `${r.region} ${r.year} has hours`);
    assert.equal(r.informative, r.uninformativeBecause.length === 0);
    // A published difference is like for like: it priced the monitored units' own load.
    if (r.informative) assert.ok(r.monitoredMwh > 0 && r.coverage >= comparison.floor && r.fit.r2 >= r.minR2 && !r.fuelMismatch.length);
  }
});

test('the overview page states the scope, the floor as ours, the method, and the downloads', { skip }, () => {
  const page = text(estimatedVsMeasuredPage({ comparison, i18n }));
  assert.match(page, /This compares only what is comparable/);
  assert.match(page, /Nothing is scaled up to generation no monitor covers/);
  assert.match(page, /The floor, the fit bar, and the regional-agreement test are ours, not EPA's and not EIA's/);
  assert.match(page, /less than 40% of a region's generation/);
  assert.match(page, /Download the comparison \(CSV\)/);
  // Each informative region-year reads as a direction, not a bare number.
  const one = comparison.rows.find((r) => r.informative);
  assert.match(page, new RegExp(`The estimate puts [\\d.]+% ${one.difference > 0 ? 'more' : 'less'} carbon`));
  // An uninformative one says why instead of showing a difference.
  const no = comparison.rows.find((r) => !r.informative);
  assert.ok(no, 'some region-year cannot carry the comparison');
  assert.match(page, /cannot speak about|under our 40% floor|do not place these units in the same region|cannot be explained by its reported fuels/);
});

test('the downloads carry the method, the fitted factors, and both inputs\' versions', { skip }, () => {
  const j = comparisonJson(comparison);
  assert.equal(j.regions.length, comparison.rows.length);
  assert.deepEqual(j.sources.map((s) => s.dataset).sort(), ['eia-930', 'epa-camd']);
  const one = j.regions.find((r) => r.informative);
  assert.ok(one.fit.factorsTonnesPerMwh.gen_ng > 0.2 && one.fit.factorsTonnesPerMwh.gen_ng < 0.7, 'natural gas lands where EIA\'s factor does');
  assert.equal(one.byHourOfDay.length, 24);
  assert.ok(one.byMonth.length >= 11);
  assert.match(j.method.floor, /gridprims' own choice/);
  const csv = comparisonCsv(comparison).trim().split('\n');
  assert.equal(csv[0], 'region,year,coverage,informative,measured_tonnes,estimated_tonnes,difference_tonnes,difference,hours,unmatched_hours,fit_r2');
  assert.equal(csv.length, comparison.rows.length + 1);
});

test('the summary the carbon tools read is small and says the same thing', { skip }, () => {
  const s = comparisonSummary(comparison);
  assert.ok(JSON.stringify(s).length < 60_000, 'small enough to fetch beside a result');
  const key = Object.keys(s.regions)[0];
  const row = s.regions[key];
  const full = comparison.rows.find((r) => r.region === row.region && r.year === row.year);
  assert.equal(row.informative, full.informative);
  assert.equal(row.difference, Math.round(full.difference * 1e6) / 1e6);
});

test('a region page carries its own comparison, with the hours where the estimate runs furthest off', { skip }, () => {
  const balancing = balancingPages(join(ROOT, 'data'));
  // A region whose newest year carries the comparison: that is the year the page details.
  const region = balancing.regions.find((r) => forRegion(comparison, r.ba)[0]?.informative);
  const mine = forRegion(comparison, region.ba);
  const page = text(balancingPage({ region, manifest: balancing.manifest, utilities: [], plants: [], i18n, comparison: mine, comparisonSource: comparison.sources.camd }));
  assert.match(page, /Our estimate against the monitors/);
  assert.match(page, /Monitors covered \d+% of the region's generation/);
  const hours = worstHours(mine[0]);
  assert.ok(hours.length === 3);
  for (const h of hours) assert.match(page, new RegExp(`${String(h.key).padStart(2, '0')}:00`));
  assert.match(page, /The method, every region, and the downloads/);
});

test('an hourly carbon result carries the figure beside its caveat', { skip }, () => {
  const row = Object.values(comparisonSummary(comparison).regions).find((r) => r.informative);
  const e = {
    ba: row.region, t: 10, lb: 22046, flat: { t: 11 }, timing: { pct: -5, drivers: [] }, evening: null, egrid: null,
    excluded: { hours: 0, share: 0 }, whyFactor: 'why', caveat: 'EIA computes hourly CO₂ from hourly generation by fuel', months: [],
  };
  const out = text(renderCarbon({ status: 'ok', e, m: null, steps: [], notes: [], evm: { ...row, floor: comparison.floor } }, i18n));
  assert.match(out, new RegExp(`How good is this estimate\\? For ${row.region} in ${row.year}, it put [\\d.]+%`));
  assert.match(out, /See the comparison, its method, and every region/);
  // A region the comparison cannot speak about says that instead of a number.
  const none = Object.values(comparisonSummary(comparison).regions).find((r) => !r.informative);
  const outNone = text(renderCarbon({ status: 'ok', e: { ...e, ba: none.region }, m: null, steps: [], notes: [], evm: { ...none, floor: comparison.floor } }, i18n));
  assert.match(outNone, new RegExp(`For ${none.region} in ${none.year} we cannot say`));
});

test('the published summary is on the built site, beside the page and the downloads', { skip }, () => {
  const dist = process.env.GRIDPRIMS_DIST;
  if (!dist || !existsSync(join(dist, COMPARISON_PATH, 'summary.json'))) return;
  const s = JSON.parse(readFileSync(join(dist, COMPARISON_PATH, 'summary.json'), 'utf8'));
  assert.ok(Object.keys(s.regions).length > 50);
  assert.ok(existsSync(join(dist, COMPARISON_PATH, 'comparison.csv')));
  assert.ok(existsSync(join(dist, COMPARISON_PATH, 'comparison.json')));
});
