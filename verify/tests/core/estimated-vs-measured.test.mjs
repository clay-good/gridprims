// The published difference between our estimated hourly carbon and what the
// monitors measured (add-measured-plant-emissions 3.1 to 3.3): the per-fuel
// factors recovered from EIA's own series, the local-standard-time alignment,
// the like-for-like comparison, its distributions, and the coverage floor.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { COVERAGE_FLOOR, MIN_FIT_R2, compareRegionYear, impliedFactors, leastSquares, localHourOf, localMonthOf, standardOffsetHours } from '../../../core/lib/estimated-vs-measured.mjs';

/** A region-year of EIA-930 hours built from known factors, so the fit has a right answer. */
const FACTORS = { gen_col: 1.0, gen_ng: 0.45, gen_oil: 0.8, gen_oth: 0.2 };
function gridYear({ hours = 48, start = Date.UTC(2025, 0, 1) / 3_600_000, net = 1000 } = {}) {
  return Array.from({ length: hours }, (_, i) => {
    const gen = { gen_col: 100 + (i % 7) * 10, gen_ng: 200 + (i % 5) * 20, gen_oil: i % 3, gen_oth: 5, gen_nuc: 300, gen_wnd: 50 + (i % 11) };
    const co2 = Object.entries(FACTORS).reduce((n, [k, f]) => n + gen[k] * f, 0);
    return { ba: 'TEST', year: 2025, hour: start + i, net_generation: net, co2_generated: co2, ...gen, gen_wat: 0, gen_ps: 0, gen_sun: 0, gen_snb: 0, gen_wnb: 0, gen_geo: 0, gen_bat: 0, gen_oes: 0, gen_ues: 0, gen_unk: 0 };
  });
}

test('least squares recovers the coefficients, and drops a column that is always zero', () => {
  const x = [[1, 0, 2], [2, 0, 1], [3, 0, 5], [4, 0, 1]];
  const y = x.map((r) => 3 * r[0] + 7 * r[2]);
  const { beta, r2 } = leastSquares(x, y);
  assert.ok(Math.abs(beta[0] - 3) < 1e-9 && Math.abs(beta[2] - 7) < 1e-9);
  assert.equal(beta[1], null);
  assert.ok(r2 > 0.999999);
});

test('EIA\'s own hourly carbon gives back the factors it was computed from', () => {
  const { factors, r2, rmse, hours } = impliedFactors(gridYear({ hours: 200 }));
  for (const [k, want] of Object.entries(FACTORS)) assert.ok(Math.abs(factors[k] - want) < 1e-6, `${k}: ${factors[k]}`);
  assert.ok(r2 > 0.999999 && rmse < 1e-6);
  assert.equal(hours, 200);
});

test('a UTC hour reads back as the local clock hour and month, in standard time all year', () => {
  assert.equal(standardOffsetHours('America/New_York'), -5);
  assert.equal(standardOffsetHours('America/Phoenix'), -7);
  // 17:00 UTC on a July day is noon on an Eastern standard clock, even though the clocks outside say 13:00.
  assert.equal(localHourOf(Date.UTC(2025, 6, 4, 17) / 3_600_000, -5), 12);
  assert.equal(localMonthOf(Date.UTC(2025, 6, 4, 17) / 3_600_000, -5), 7);
  // Just past midnight UTC on New Year's Day is still the last evening of December in the East.
  assert.equal(localHourOf(Date.UTC(2025, 0, 1, 2) / 3_600_000, -5), 21);
  assert.equal(localMonthOf(Date.UTC(2025, 0, 1, 2) / 3_600_000, -5), 12);
});

test('like for like: the monitored units\' own load, priced with EIA\'s factors, against what they measured', () => {
  const grid = gridYear({ hours: 24 });
  // Monitored units: 50 MWh of coal and 100 MWh of gas an hour, measuring 10% more than the estimate prices.
  const estimatedPerHour = 50 * FACTORS.gen_col + 100 * FACTORS.gen_ng;
  const measured = Array.from({ length: 24 }, (_, h) => ({
    region: 'TEST', year: 2025, hour: Date.UTC(2025, 0, 1) / 3_600_000 + h,
    co2_tonnes: estimatedPerHour * 1.1, gross_load_mwh: 150, load_col_mwh: 50, load_ng_mwh: 100, load_oil_mwh: 0, load_oth_mwh: 0, units_reporting: 3,
  }));
  const r = compareRegionYear({ region: 'TEST', year: 2025, zone: 'UTC', grid, measured });
  assert.equal(r.hours, 24);
  assert.equal(r.unmatchedHours, 0);
  assert.ok(Math.abs(r.estimatedTonnes - estimatedPerHour * 24) < 1e-6);
  // The estimate runs about 9.1% below the measurement.
  assert.ok(Math.abs(r.difference + 0.1 / 1.1) < 1e-9, String(r.difference));
  assert.ok(r.differenceTonnes < 0);
  // Coverage: 150 MWh an hour of a region generating 1,000.
  assert.ok(Math.abs(r.coverage - 0.15) < 1e-9);
  assert.equal(r.informative, false, 'under the floor, the difference is not the estimate\'s error');
  assert.deepEqual(r.uninformativeBecause, ['coverage']);
  assert.equal(r.floor, COVERAGE_FLOOR);
  assert.equal(r.byMonth.length, 1);
  assert.equal(r.byHourOfDay.length, 24);
  assert.ok(r.byHourOfDay.every((g) => Math.abs(g.difference + 0.1 / 1.1) < 1e-9));
});

test('a region the monitors mostly cover is informative, and the hours where the estimate runs low are named', () => {
  const grid = gridYear({ hours: 24, net: 200, start: Date.UTC(2025, 6, 15) / 3_600_000 });
  const measured = Array.from({ length: 24 }, (_, h) => {
    const estimate = 100 * FACTORS.gen_ng;
    // Evening hours measure 30% above the estimate; the rest match it.
    const evening = h >= 18 && h <= 21;
    return { hour: Date.UTC(2025, 6, 15) / 3_600_000 + h, co2_tonnes: estimate * (evening ? 1.3 : 1), gross_load_mwh: 100, load_col_mwh: 0, load_ng_mwh: 100, load_oil_mwh: 0, load_oth_mwh: 0 };
  });
  const r = compareRegionYear({ region: 'TEST', year: 2025, zone: 'UTC', grid, measured });
  assert.equal(r.informative, true);
  const low = r.byHourOfDay.filter((g) => g.difference < -0.01).map((g) => g.key);
  assert.deepEqual(low, [18, 19, 20, 21]);
  assert.ok(r.byHourOfDay.filter((g) => Math.abs(g.difference) < 1e-9).length === 20);
});

test('a region whose factors the fit cannot recover is not published as an error either', () => {
  // EIA's carbon dioxide here has nothing to do with the fuel columns, so the fit fails.
  const grid = gridYear({ hours: 48, net: 50 }).map((r, i) => ({ ...r, co2_generated: 500 + (i % 13) * 97 }));
  const measured = Array.from({ length: 24 }, (_, h) => ({ hour: Date.UTC(2025, 0, 1) / 3_600_000 + h, co2_tonnes: 40, gross_load_mwh: 80, load_ng_mwh: 80, load_col_mwh: 0, load_oil_mwh: 0, load_oth_mwh: 0 }));
  const r = compareRegionYear({ region: 'TEST', year: 2025, zone: 'UTC', grid, measured });
  assert.ok(r.coverage > COVERAGE_FLOOR, 'coverage alone would have passed');
  assert.ok(r.fit.r2 < MIN_FIT_R2);
  assert.equal(r.fitOk, false);
  assert.equal(r.informative, false);
  assert.deepEqual(r.uninformativeBecause, ['fit']);
});

test('hours EIA has no record for are counted, not quietly dropped', () => {
  const grid = gridYear({ hours: 2 });
  const measured = Array.from({ length: 5 }, (_, h) => ({ hour: Date.UTC(2025, 0, 1) / 3_600_000 + h, co2_tonnes: 10, gross_load_mwh: 20, load_ng_mwh: 20, load_col_mwh: 0, load_oil_mwh: 0, load_oth_mwh: 0 }));
  const r = compareRegionYear({ region: 'TEST', year: 2025, zone: 'UTC', grid, measured });
  assert.equal(r.hours, 2);
  assert.equal(r.unmatchedHours, 3);
});
