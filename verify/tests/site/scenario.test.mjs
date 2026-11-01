// The scenario model's pages and downloads (add-grid-scenario-model 1.7, 2.6,
// 3.5, 3.6, 4.5, 5.2): every region page carries the screening label, the
// omissions, the backtest with its definitions, the candidate causes, and
// links to the national models; the fit table lists every region with its
// data versions; the fleet downloads carry every unit's sources and methods;
// and the limits page refuses commitment and adequacy figures.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT } from '../../../pipeline/run.mjs';
import { scenarioData } from '../../../site/entities/scenario.mjs';
import { OMISSIONS } from '../../../core/lib/dispatch.mjs';
import strings from '../../../site/strings/en-US.mjs';
import { sharedSite } from '../../lib/shared-site.mjs';

const built = existsSync(join(ROOT, 'data/eia-923/current.json')) && existsSync(join(ROOT, 'data/eia-930/current.json'));
const out = await sharedSite();
const read = (p) => readFileSync(join(out, p), 'utf8');
const decode = (s) => s.replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/&amp;/g, '&');

test('every region page carries the label, the omissions, the backtest with definitions, the causes, and the national models', { skip: !built && 'not built' }, () => {
  const fit = JSON.parse(read('scenario/fit.json'));
  assert.ok(fit.regions.length >= 40, `${fit.regions.length} regions`);
  for (const r of fit.regions) {
    const page = decode(read(`scenario/${r.ba.toLowerCase()}/index.html`));
    assert.match(page, /data-scenario-label>This is a screening model/, r.ba);
    for (const k of OMISSIONS) assert.ok(page.includes(strings[`scenario.omit.${k}`]), `${r.ba} omits ${k}`);
    assert.match(page, /<table data-backtest>/, r.ba);
    assert.ok(page.includes(strings['scenario.def.bias']) && page.includes(strings['scenario.def.mae']), r.ba);
    assert.equal((page.match(/data-cause="/g) ?? []).length, 6, r.ba);
    assert.match(page, /pypsa-usa\.readthedocs\.io/, r.ba);
    assert.ok(page.includes(strings['scenario.unverified']), r.ba);
    assert.match(page, /<form data-scenario-form hidden/, r.ba);
  }
});

test('the fit table lists every region with its metrics and the data versions used', { skip: !built && 'not built' }, () => {
  const fit = JSON.parse(read('scenario/fit.json'));
  const index = read('scenario/index.html');
  assert.equal((index.match(/data-fit-row="/g) ?? []).length, fit.regions.length);
  assert.deepEqual(Object.keys(fit.versions), ['eia-860', 'eia-923', 'eia-930']);
  assert.match(index, new RegExp(`EIA-923 ${fit.versions['eia-923']}`));
  for (const r of fit.regions) {
    assert.ok('bias' in r.backtest.fuels.gas && 'mae' in r.backtest.overall && 'marginalMatch' in r.backtest, r.ba);
    assert.ok(r.summary.substituted_share >= 0 && r.summary.substituted_share <= 1, r.ba);
  }
});

test('a downloaded fleet carries every unit, its sources and methods, and the upstream versions', { skip: !built && 'not built' }, () => {
  const f = JSON.parse(read('scenario/erco/fleet.json'));
  assert.equal(f.license, 'CC BY 4.0');
  assert.match(f.attribution, /Energy Information Administration/);
  assert.deepEqual(Object.keys(f.versions), ['eia-860', 'eia-923', 'eia-930']);
  for (const u of f.units) {
    assert.ok(u.heat_rate.value >= 5.5 && u.heat_rate.value <= 25, u.id);
    assert.ok(u.heat_rate.low <= u.heat_rate.value && u.heat_rate.value <= u.heat_rate.high, u.id);
    assert.ok(['plant', 'plant-combined-cycle', 'technology-vintage'].includes(u.heat_rate.method), u.id);
    assert.equal(u.cost.length, 12);
  }
  const csv = read('scenario/erco/fleet.csv').trim().split('\n');
  assert.equal(csv.length - 1, f.units.length + f.unplaceable.length);
  assert.match(csv[0], /heat_rate_method,heat_rate_group,fuel_price_jan_usd_per_mmbtu,fuel_price_jan_source,substituted/);
});

test('the build\'s backtest is the one the page re-runs: same fleet, same hours, same numbers', { skip: !built && 'not built' }, () => {
  const d = scenarioData(join(ROOT, 'data'));
  const fit = JSON.parse(read('scenario/fit.json'));
  const pace = d.regions.find((r) => r.ba === 'PACE');
  assert.deepEqual(fit.regions.find((r) => r.ba === 'PACE').backtest.fuels.coal.bias, pace.backtest.fuels.coal.bias);
  // Every unregulated plant's delivery cost is withheld, so substitution is substantial and shown.
  assert.ok(d.regions.find((r) => r.ba === 'ERCO').fleet.summary.substituted_share > 0.5);
});

test('the limits page refuses commitment, adequacy, nodal prices, and forecasts, each with its reason and sources', () => {
  const limits = JSON.parse(read('limits/limits.json'));
  for (const id of ['unit-commitment', 'adequacy', 'nodal-prices', 'forecasts']) {
    const c = limits.cannotDo.find((x) => x.id === id);
    assert.ok(c?.reason && c.sources.length, id);
  }
});

test('the dispatch reproduces an independent Python rerun for 3 region-years: fuel totals and the marginal unit', { skip: !built && 'not built' }, async () => {
  const { readShard } = await import('../../../core/lib/shard.mjs');
  const { expandUnit } = await import('../../../core/lib/fleet.mjs');
  const { dispatch } = await import('../../../core/lib/dispatch.mjs');
  const ref = JSON.parse(readFileSync(join(ROOT, 'verify/reference/merit-order-2025.json'), 'utf8'));
  const d = scenarioData(join(ROOT, 'data'));
  for (const [ba, want] of Object.entries(ref.regions)) {
    const region = d.regions.find((r) => r.ba === ba);
    const rows = readShard(readFileSync(join(ROOT, 'data/eia-930', d.versions['eia-930'], `hourly/${ba}-2025.bin`))).rows();
    const run = dispatch({ units: region.fleet.units.map(expandUnit), rows });
    // The two read EIA's values from different files (the per-region workbook and the six-month CSV), so totals may differ slightly.
    for (const c of ['coal', 'gas']) {
      const diff = Math.abs(run.totals[c] - want.totals_mwh[c]) / want.totals_mwh[c];
      assert.ok(diff < 0.005, `${ba} ${c}: ${(diff * 100).toFixed(2)}% apart`);
    }
    let same = 0; let compared = 0;
    rows.forEach((r, h) => {
      const k = want.marginal[r.hour - want.first_hour];
      if (k === undefined || k === -2 || r.demand === null) return;
      compared++;
      const u = run.marginalUnit(h);
      if ((u ? u.id : null) === (k >= 0 ? want.ids[k] : null)) same++;
    });
    assert.ok(compared > 8700 && same / compared >= 0.99, `${ba}: the same marginal unit in ${same} of ${compared} hours`);
  }
});

test('a coal retirement\'s replacement by fuel agrees with the independent rerun on 2 region-years, or the difference is documented', { skip: !built && 'not built' }, async () => {
  const { scenarioInputs, scenarioRegion } = await import('../../../site/entities/scenario.mjs');
  const { scenarioRun } = await import('../../../core/lib/backtest.mjs');
  const { expandUnit } = await import('../../../core/lib/fleet.mjs');
  const ref = JSON.parse(readFileSync(join(ROOT, 'verify/reference/merit-order-2025.json'), 'utf8'));
  const inp = scenarioInputs(join(ROOT, 'data'));
  const cases = Object.entries(ref.regions).filter(([, w]) => w.retired);
  assert.ok(cases.length >= 2);
  for (const [ba, w] of cases) {
    const r = scenarioRegion(inp, ba);
    const s = scenarioRun({ units: r.fleet.units.map(expandUnit), rows: r.rows, base: r.run, bt: r.backtest, edits: [{ kind: 'retire', id: w.retired.id }] });
    for (const c of ['coal', 'gas']) {
      const theirs = w.retired.totals_mwh[c] - w.totals_mwh[c];
      const gap = Math.abs(s.changes[c].change_mwh - theirs) / Math.abs(theirs);
      assert.ok(gap <= 0.01 || (w.retired.expected && gap <= 0.02), `${ba} ${c}: ${(gap * 100).toFixed(2)}% apart${w.retired.expected ? '' : ', with no documented cause'}`);
    }
  }
});
