// The grid scenario model (add-grid-scenario-model): fleet assembly with its
// sources and gaps, merit-order dispatch against recorded hours, the
// backtest's metrics, and scenario changes read against the model's own bias.
// Every expected number is computed by hand in the comment beside it.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { assembleFleet, fuelPrices, groupHeatRates, plantHeatRates } from '../../../core/lib/fleet.mjs';
import { applyEdits, belowFloor, categoryChanges, dispatch, OMISSIONS, scaleOf } from '../../../core/lib/dispatch.mjs';
import { againstBias, backtest, candidateCauses, recordedMarginal, scenarioRun } from '../../../core/lib/backtest.mjs';

const H = 3_600_000;
const JAN = Date.parse('2025-01-15T00:00Z') / H;
const month = (v) => Object.fromEntries(Array.from({ length: 12 }, (_, i) => [String(i + 1).padStart(2, '0'), v]));
const flat = (cost) => Array.from({ length: 12 }, () => ({ value: cost, low: cost, high: cost }));
const unit = (id, mw, cost, cls = 'gas') => ({ id, plant_name: id, capacity_mw: mw, class: cls, from_month: 0, to_month: 11, cost: flat(cost) });
const hour = (h, demand, fuels = {}) => ({ hour: JAN + h, demand, interchange: 0, net_generation: demand, gen_col: 0, gen_ng: 0, gen_oil: 0, gen_nuc: 0, gen_wnd: 0, gen_sun: 0, ...fuels });

test('residual met: the two cheapest run fully and the third is marginal at 500 MW', () => {
  // Residual 4,000 MW; offers 1,500 + 2,000 + 1,200 in cost order: 1,500 + 2,000 = 3,500, so the third runs 500.
  const units = [unit('c', 1200, 30), unit('a', 1500, 10, 'coal'), unit('b', 2000, 20), unit('d', 900, 80, 'oil')];
  const run = dispatch({ units, rows: [hour(0, 4000)] });
  assert.equal(run.marginalUnit(0).id, 'c');
  assert.deepEqual(run.marginalCost(0), { value: 30, low: 30, high: 30 });
  assert.deepEqual([run.unit.get('a'), run.unit.get('b'), run.unit.get('c'), run.unit.get('d')], [1500, 2000, 500, 0]);
  assert.deepEqual([run.hourly.coal[0], run.hourly.gas[0], run.hourly.oil[0]], [1500, 2500, 0]);
});

test('a residual above the placed fleet is an unmet modeling residual with its size, never unserved energy', () => {
  const run = dispatch({ units: [unit('a', 1000, 10)], rows: [hour(0, 1600), hour(1, 900)] });
  // Hour 0 needs 1,600 against 1,000 placed: 600 MWh the model could not place; hour 1 is met.
  assert.deepEqual(run.unmet, { hours: 1, mwh: 600, max: 600 });
  assert.equal(run.marginalUnit(0), null);
  assert.equal(run.unit.get('a'), 1000 + 900);
  assert.ok(!('unserved' in run));
});

test('recorded sources, interchange, and storage are taken as given and only the rest is dispatched', () => {
  // Demand 5,000 plus 500 exported, less 1,000 nuclear, 800 wind, 200 battery discharge: 3,500 for the fleet.
  const rows = [hour(0, 5000, { interchange: 500, gen_nuc: 1000, gen_wnd: 800, gen_bat: 200 })];
  const run = dispatch({ units: [unit('a', 3000, 10), unit('b', 3000, 20)], rows });
  assert.equal(run.residual[0], 3500);
  assert.deepEqual([run.unit.get('a'), run.unit.get('b')], [3000, 500]);
  // Doubling recorded wind takes another 800 MW from the fleet.
  assert.equal(dispatch({ units: [unit('a', 3000, 10)], rows, scale: { gen_wnd: 2 } }).residual[0], 2700);
});

test('hours EIA did not report are excluded and counted; surplus hours run nothing', () => {
  const rows = [hour(0, null), hour(1, 1000, { gen_wnd: 1500 }), hour(2, 1000)];
  const run = dispatch({ units: [unit('a', 2000, 10)], rows });
  assert.deepEqual([run.hours, run.excluded, run.surplus, run.unit.get('a')], [2, 1, 1, 1000]);
});

test('a unit retired mid-year is available only before its retirement month', () => {
  const july = Date.parse('2025-07-15T00:00Z') / H;
  const units = [{ ...unit('old', 1000, 5, 'coal'), to_month: 5 }, unit('new', 1000, 50)];
  const run = dispatch({ units, rows: [hour(0, 800), { ...hour(0, 800), hour: july }] });
  assert.equal(run.marginalUnit(0).id, 'old');
  assert.equal(run.marginalUnit(1).id, 'new');
});

test('a full year for 1,500 units dispatches in well under a second', () => {
  const units = Array.from({ length: 1500 }, (_, i) => unit(`u${i}`, 50 + (i % 7) * 10, 10 + (i * 37) % 90, i % 3 ? 'gas' : 'coal'));
  const rows = Array.from({ length: 8760 }, (_, h) => ({ ...hour(h - 14 * 24, 30000 + 20000 * Math.sin(h / 24)) }));
  const t = performance.now();
  const run = dispatch({ units, rows });
  const edited = dispatch({ units: applyEdits(units, [{ kind: 'retire', id: 'u3' }]).units, rows });
  const ms = performance.now() - t;
  assert.ok(ms < 1000, `two full-year runs took ${ms.toFixed(0)} ms`);
  assert.equal(run.hours, 8760);
  assert.ok(edited.totals.coal <= run.totals.coal);
});

test('edits are applied as a diff from the recorded fleet and listed with their original values', () => {
  const units = [unit('a', 600, 10, 'coal'), unit('b', 400, 20), unit('c', 300, 30)];
  const { units: out, edits } = applyEdits(units, [
    { kind: 'retire', id: 'a' }, { kind: 'retire', id: 'b' },
    { kind: 'add', unit: { id: 'new', name: 'New gas', capacity_mw: 500, class: 'gas', cost: 25 } },
  ]);
  assert.deepEqual(out.map((u) => u.id), ['c', 'new']);
  assert.deepEqual(edits.map((e) => [e.kind, e.id, e.was]), [['retire', 'a', 600], ['retire', 'b', 400], ['add', 'new', null]]);
  assert.equal(units.length, 3, 'the recorded fleet is untouched');
});

test('an added unit priced above every hour\'s marginal cost does not run', () => {
  const rows = [hour(0, 500), hour(1, 900)];
  const { units } = applyEdits([unit('a', 1000, 10)], [{ kind: 'add', unit: { id: 'pricey', name: 'Pricey', capacity_mw: 300, class: 'gas', cost: 400 } }]);
  assert.equal(dispatch({ units, rows }).unit.get('pricey'), 0);
});

// A two-plant region: plant 1 (coal steam) reports its own prices; plant 2 (combined cycle) is withheld.
const generators = [
  { plant_id: 1, generator_id: '1', plant_name: 'Coal One', category: 'operable', status: 'OP', technology: 'Conventional Steam Coal', prime_mover: 'ST', energy_source_1: 'BIT', nameplate_mw: 650, summer_mw: 600, operating_year: 1975, operating_month: 6 },
  { plant_id: 2, generator_id: 'CT1', plant_name: 'Gas Two', category: 'operable', status: 'OP', technology: 'Natural Gas Fired Combined Cycle', prime_mover: 'CT', energy_source_1: 'NG', nameplate_mw: 200, summer_mw: 180, operating_year: 2005, operating_month: 1 },
  { plant_id: 2, generator_id: 'ST1', plant_name: 'Gas Two', category: 'operable', status: 'OP', technology: 'Natural Gas Fired Combined Cycle', prime_mover: 'CA', energy_source_1: 'NG', nameplate_mw: 100, summer_mw: 90, operating_year: 2005, operating_month: 1 },
  { plant_id: 3, generator_id: 'GT', plant_name: 'Peaker', category: 'retired_or_canceled', status: 'RE', technology: 'Natural Gas Fired Combustion Turbine', prime_mover: 'GT', energy_source_1: 'NG', nameplate_mw: 50, summer_mw: 50, operating_year: 1990, operating_month: 1, retirement_year: 2025, retirement_month: 6 },
  { plant_id: 4, generator_id: 'W', plant_name: 'Wind', category: 'operable', status: 'OP', technology: 'Onshore Wind Turbine', prime_mover: 'WT', energy_source_1: 'WND', nameplate_mw: 100, summer_mw: 100, operating_year: 2015, operating_month: 1 },
];
const plants = [1, 2, 3, 4].map((id) => ({ plant_id: id, ba_code: 'TEST' }));
const generation = [
  // Coal: 10,000 MMBtu per 1,000 MWh each month (10.0); one month 11,000 (11.0).
  { plant_id: 1, prime_mover: 'ST', fuel_type: 'BIT', fuel_electric_mmbtu: 121000, net_generation_mwh: 12000, ...Object.fromEntries(Object.entries(month(10000)).map(([m, v]) => [`fuel_electric_mmbtu_${m}`, m === '07' ? 11000 : v])), ...Object.fromEntries(Object.entries(month(1000)).map(([m, v]) => [`net_generation_mwh_${m}`, v])) },
  // Combined cycle: the turbine burns 70,000 MMBtu for 7,000 MWh and the steam part adds 3,000 MWh with no fuel: 7.0 combined.
  { plant_id: 2, prime_mover: 'CT', fuel_type: 'NG', fuel_electric_mmbtu: 70000, net_generation_mwh: 7000, ...Object.fromEntries(Object.entries(month(70000 / 12)).map(([m, v]) => [`fuel_electric_mmbtu_${m}`, v])), ...Object.fromEntries(Object.entries(month(7000 / 12)).map(([m, v]) => [`net_generation_mwh_${m}`, v])) },
  { plant_id: 2, prime_mover: 'CA', fuel_type: 'NG', fuel_electric_mmbtu: 0, net_generation_mwh: 3000, ...Object.fromEntries(Object.entries(month(0)).map(([m, v]) => [`fuel_electric_mmbtu_${m}`, v])), ...Object.fromEntries(Object.entries(month(250)).map(([m, v]) => [`net_generation_mwh_${m}`, v])) },
];
const receipts = [
  ...Array.from({ length: 12 }, (_, i) => ({ month: i + 1, plant_id: 1, ba_code: 'TEST', energy_source: 'BIT', quantity: 1000, heat_content: 20, fuel_cost: 200 })),
  ...Array.from({ length: 12 }, (_, i) => ({ month: i + 1, plant_id: 2, ba_code: 'TEST', energy_source: 'NG', quantity: 1000, heat_content: 1, fuel_cost: null })),
  // A regulated gas plant elsewhere in the region sets the regional gas price: $3.00 per MMBtu.
  ...Array.from({ length: 12 }, (_, i) => ({ month: i + 1, plant_id: 9, ba_code: 'TEST', energy_source: 'NG', quantity: 1000, heat_content: 1, fuel_cost: 300 })),
];

const build = (extra = {}) => {
  const rates = plantHeatRates(generation);
  return assembleFleet({ ba: 'TEST', year: 2025, generators, plants, rates, groups: groupHeatRates(generators, rates), prices: fuelPrices(receipts), versions: { 'eia-860': '2026-10', 'eia-923': '2026-11' }, ...extra });
};

test('each unit names its sources; combined-cycle parts share one configuration heat rate', () => {
  const f = build();
  const coal = f.units.find((u) => u.id === '1-1');
  // 121,000 MMBtu over 12,000 MWh = 10.083; monthly 10.0 eleven times and 11.0 once: 10th percentile 10.0, 90th 10.0, so the range is 10.0 to the annual.
  assert.equal(coal.heat_rate.method, 'plant');
  assert.ok(Math.abs(coal.heat_rate.value - 10.0833) < 1e-3);
  assert.deepEqual([coal.heat_rate.low, coal.heat_rate.months, coal.heat_rate.missing_months], [10, 12, 0]);
  assert.deepEqual(coal.sources.capacity_mw, { dataset: 'eia-860', version: '2026-10', field: 'summer_mw' });
  assert.equal(coal.heat_rate.source.version, '2026-11');
  for (const id of ['2-CT1', '2-ST1']) {
    const u = f.units.find((x) => x.id === id);
    assert.equal(u.heat_rate.method, 'plant-combined-cycle');
    assert.equal(u.heat_rate.value, 7);
  }
});

test('a withheld fuel cost uses the regional monthly price, is marked substituted, and counts toward the share', () => {
  const f = build();
  const coal = f.units.find((u) => u.id === '1-1');
  const ct = f.units.find((u) => u.id === '2-CT1');
  // Coal: 200 cents per MMBtu is $2.00; cost 10.083 x 2.00 = $20.17 per MWh.
  assert.deepEqual([coal.fuel_price[0].source, coal.fuel_price[0].value, coal.substituted], ['plant', 2, false]);
  assert.ok(Math.abs(coal.cost[0].value - 20.1667) < 1e-3);
  // CO2: 10.083 MMBtu per MWh x 93.24 kg per MMBtu (bituminous) = 0.9402 t per MWh.
  assert.ok(Math.abs(coal.co2_t_per_mwh - 0.94017) < 1e-4);
  // Gas: plant 2 withheld, so the region's $3.00; 7.0 x 3.00 = $21.00 per MWh.
  assert.deepEqual([ct.fuel_price[0].source, ct.fuel_price[0].value, ct.substituted, ct.cost[0].value], ['region', 3, true, 21]);
  // Placed: coal 600, combined cycle 180 + 90; substituted 270 of the 870 placed (the peaker has no rate of its own).
  assert.equal(f.summary.placed_mw + f.summary.unplaceable_mw, 600 + 180 + 90 + 50);
});

test('a unit with no usable heat rate and no large enough group is listed as unplaceable with the missing field', () => {
  const f = build();
  const peaker = f.unplaceable.find((u) => u.id === '3-GT');
  assert.deepEqual(peaker.missing, ['heat rate']);
  assert.equal(f.summary.unplaceable_mw, 50);
  // It retired in June, so it was available January through May.
  assert.deepEqual([peaker.retired, peaker.from_month, peaker.to_month], ['2025-06', 0, 4]);
  assert.deepEqual(f.recorded.map((u) => u.id), ['4-W']);
  assert.equal(f.summary.measured_share, 0, 'no unit is measured until monitored data is held');
});

test('a blank month is excluded as missing, not counted as zero fuel', () => {
  const blank = [{ ...generation[0], fuel_electric_mmbtu_03: null }];
  const r = plantHeatRates(blank).get('1|ST');
  assert.equal(r.missingMonths, 1);
  assert.equal(r.months, 11);
});

test('the backtest reports bias, mean absolute error, and the marginal-fuel match against recorded output', () => {
  // The model runs coal first; the record ran gas in hour 1. Coal 100 modeled vs 50 actual; gas 0 vs 50.
  const rows = [hour(0, 100, { gen_col: 100 }), hour(1, 100, { gen_col: 50, gen_ng: 50 }), hour(2, 150, { gen_col: 50, gen_ng: 100 })];
  const run = dispatch({ units: [unit('c', 120, 10, 'coal'), unit('g', 200, 20)], rows });
  const bt = backtest({ rows, run });
  // Coal modeled 100 + 100 + 120 = 320, actual 200: bias +60%; |0| + |50| + |70| = 120 over 200: MAE 60%.
  assert.deepEqual([bt.fuels.coal.modeled_mwh, bt.fuels.coal.actual_mwh, bt.fuels.coal.bias, bt.fuels.coal.mae], [320, 200, 0.6, 0.6]);
  // Gas modeled 0 + 0 + 30, actual 150: bias -80%.
  assert.ok(Math.abs(bt.fuels.gas.bias + 0.8) < 1e-9);
  assert.equal(bt.fuels.oil.bias, null, 'a fuel with no actual output has no percent error');
  // Hour 1 total unchanged: not compared. Hour 2: total rose by 50, all gas; modeled marginal is gas. 1 of 1.
  assert.equal(recordedMarginal(rows[1], rows[2]), 'gas');
  assert.deepEqual([bt.marginalMatch, bt.marginalCompared], [1, 1]);
});

test('a scenario change smaller than the backtest bias is not a finding; a larger one is, with the bias beside it', () => {
  const bt = { fuels: { coal: { actual_mwh: 100, bias: 0.08 }, gas: { actual_mwh: 100, bias: 0.08 }, oil: { actual_mwh: 0, bias: null } } };
  const base = { totals: { coal: 100, gas: 100, oil: 0 } };
  const r = againstBias(base, { totals: { coal: 81, gas: 103, oil: 0 } }, bt);
  assert.deepEqual([r.gas.share, r.gas.finding], [0.03, false]);
  assert.deepEqual([r.coal.share, r.coal.finding, r.coal.bias], [-0.19, true, 0.08]);
  assert.equal(r.oil.finding, false);
});

test('candidate causes are listed with their shares, in a fixed order, and none is chosen', () => {
  const f = build();
  const rows = [hour(0, 100, { interchange: -20 }), hour(1, null)];
  const causes = candidateCauses({ fleet: f, rows, categories: categoryChanges(rows) });
  assert.deepEqual(causes.map((c) => c.cause), ['derivedHeatRates', 'substitutedPrices', 'commitment', 'fixedInterchange', 'unplaceable', 'referenceData']);
  assert.equal(causes.find((c) => c.cause === 'referenceData').missing, 1);
  assert.ok(causes.every((c) => !('dominant' in c)));
  assert.deepEqual(OMISSIONS, ['commitment', 'reserves', 'transmission', 'interchange', 'storage', 'outages', 'market', 'vom']);
});

test('a column blank for the first day and then reported is a category change; scattered blanks are gaps', () => {
  const rows = Array.from({ length: 48 }, (_, h) => hour(h, 100, { gen_bat: h < 30 ? null : 5, gen_sun: h === 40 ? null : 1 }));
  const c = categoryChanges(rows);
  assert.deepEqual(c.changed, [{ column: 'gen_bat', from: JAN + 30 }]);
  assert.deepEqual(c.gaps, [{ column: 'gen_sun', hours: 1 }]);
});

test('retiring a 600 MW coal unit: gas replaces it hour by hour, and CO2 falls by the rates of each', () => {
  // Need 1,000 MW in each of 2 hours. Coal 600 MW at $20 (1.0 t/MWh) runs first, then gas 800 MW at $30 (0.4 t/MWh) runs 400.
  // Retiring coal: gas runs 800, and 200 MW is an unmet modeling residual. Coal -1,200 MWh, gas +800 MWh.
  // CO2: before 2 x (600 x 1.0 + 400 x 0.4) = 1,520 t; after 2 x 800 x 0.4 = 640 t.
  const units = [{ ...unit('coal', 600, 20, 'coal'), co2_t_per_mwh: 1 }, { ...unit('gas', 800, 30), co2_t_per_mwh: 0.4 }];
  const rows = [hour(0, 1000, { gen_col: 600, gen_ng: 400 }), hour(1, 1000, { gen_col: 600, gen_ng: 400 })];
  const base = dispatch({ units, rows });
  const bt = backtest({ rows, run: base });
  const s = scenarioRun({ units, rows, base, bt, edits: [{ kind: 'retire', id: 'coal' }] });
  assert.deepEqual([s.changes.coal.change_mwh, s.changes.gas.change_mwh], [-1200, 800]);
  assert.deepEqual([s.co2.base_t, s.co2.now_t], [1520, 640]);
  assert.deepEqual(s.unmet, { base_hours: 0, now_hours: 2 });
  // The backtest fits exactly here (bias 0), so both changes are findings.
  assert.deepEqual([s.changes.coal.finding, s.changes.gas.finding], [true, true]);
});

test('doubled solar: net load falls below the floor and the energy above what the grid can take is counted', () => {
  // Need before solar: 1,000 and 600 MW; solar 300 and 500 MW. Doubled: residuals 1,000 - 600 = 400 and 600 - 1,000 = -400.
  // Floor 500 MW: both hours below it, by 100 and 900 MW: 1,000 MWh.
  const rows = [hour(0, 1000, { gen_sun: 300 }), hour(1, 600, { gen_sun: 500 })];
  const run = dispatch({ units: [unit('g', 2000, 30)], rows, scale: scaleOf({ solar: 2 }) });
  assert.deepEqual([run.residual[0], run.residual[1]], [400, -400]);
  assert.deepEqual(belowFloor(run, rows, 500), { hours: 2, mwh: 1000 });
  assert.deepEqual(belowFloor(dispatch({ units: [unit('g', 2000, 30)], rows }), rows, 500), { hours: 1, mwh: 400 });
});
