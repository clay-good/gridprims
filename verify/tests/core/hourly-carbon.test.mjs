// Hourly carbon (add-hourly-carbon 2.2 to 2.5): intervals summed to UTC
// clock hours, partial hours counted, missing intensity excluded and never
// filled, the timing and eGRID gaps, hourly against annual matching with
// hand-computed cases, the grid's clean share, typical hours, and the shift
// estimate from the spec's EV example.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CAVEAT, DRAFT_LABEL, alignSupply, assignRegion, cleanShare, readSupply, flatBlock, hourlyEmissions, matchShares, quantile, shiftEstimate, toHours, typicalHours, windows, yearMeans, yearWindowMean } from '../../../core/lib/hourly-carbon.mjs';

const H = 3_600_000;
const ZONE = 'America/Chicago';
/** A meter series of `n` intervals of `minutes` from `from`, `kwh(i)` each. */
const meter = (from, n, minutes, kwh = () => 1) => ({ startMs: Float64Array.from({ length: n }, (_, i) => from + i * minutes * 60_000), kwh: Float64Array.from({ length: n }, (_, i) => kwh(i)), intervalMinutes: minutes });
/** Grid hours from `from` (an hour index), `n` long, with intensity(i) in lb/kWh. */
const grid = (from, n, intensity, extra = () => ({})) => new Map(Array.from({ length: n }, (_, i) => [from + i, { hour: from + i, intensity_consumed: intensity(i), ...extra(i) }]));

test('15-minute data in Central time: four intervals make each clock hour, matched on its UTC start', () => {
  // Midnight Central on July 1, 2025 is 05:00 UTC.
  const from = Date.UTC(2025, 6, 1, 5);
  const r = toHours(meter(from, 8, 15, (i) => i + 1));
  assert.equal(r.status, 'ok');
  assert.deepEqual([...r.hours], [[from / H, 1 + 2 + 3 + 4], [from / H + 1, 5 + 6 + 7 + 8]]);
  assert.equal(r.partial, 0);
  assert.match(r.steps[0], /4 intervals of each clock hour are summed and matched to the EIA hour with the same UTC start/);
});

test('three of four intervals: the hour uses the three and is counted partial', () => {
  const from = Date.UTC(2025, 6, 1, 5);
  const m = meter(from, 8, 15);
  const keep = [0, 1, 2, 4, 5, 6, 7];
  const r = toHours({ ...m, startMs: Float64Array.from(keep, (i) => m.startMs[i]), kwh: Float64Array.from(keep, (i) => m.kwh[i]) });
  assert.equal(r.hours.get(from / H), 3);
  assert.equal(r.partial, 1);
  assert.match(r.steps.at(-1), /1 partial hour /);
});

test('intervals longer than an hour are refused', () => {
  assert.equal(toHours(meter(0, 3, 1440)).status, 'refused');
});

test('missing intensity: 30 hours excluded with their share of energy, never filled', () => {
  const h0 = Date.UTC(2025, 0, 1) / H;
  const load = new Map(Array.from({ length: 100 }, (_, i) => [h0 + i, 2]));
  const g = grid(h0, 100, (i) => (i < 30 ? null : 0.8));
  const r = hourlyEmissions({ load, grid: g, zone: ZONE, ba: 'MISO' });
  assert.deepEqual([r.excluded.hours, r.excluded.kwh], [30, 60]);
  assert.equal(r.excluded.share, 0.3);
  assert.ok(Math.abs(r.lb - 70 * 2 * 0.8) < 1e-9);
  assert.equal(r.caveat, CAVEAT);
  assert.match(r.whyFactor, /most detailed public hourly, consumption-based factor available for MISO.*a draft, not final/);
});

test('a peaky evening load: the timing gap against the year\'s flat average names the evening hours, and eGRID is a different basis', () => {
  // A day repeated: intensity 0.5 lb/kWh overnight and 1.0 from 5 pm to 9 pm Central (22:00 to 02:00 UTC in January).
  const h0 = Date.UTC(2025, 0, 1, 6) / H; // midnight Central
  const n = 24 * 31;
  const local = (i) => i % 24;
  const g = grid(h0, n, (i) => (local(i) >= 17 && local(i) < 21 ? 1.0 : 0.5));
  const load = new Map(Array.from({ length: n }, (_, i) => [h0 + i, local(i) >= 17 && local(i) < 21 ? 10 : 1]));
  const r = hourlyEmissions({ load, grid: g, zone: ZONE, ba: 'MISO', egrid: { subregion: 'MROW', lbPerMwh: 920.13, edition: 'eGRID2023' } });
  const mean = (20 * 0.5 + 4 * 1.0) / 24;
  assert.ok(Math.abs(r.flat.lb - [...load.values()].reduce((a, b) => a + b, 0) * mean) < 1e-6);
  assert.ok(r.timing.pct > 0);
  assert.deepEqual(r.timing.drivers, [17, 18, 19]);
  assert.ok(r.evening.pct > 0, 'evening hours were dirtier than the average hour of this load');
  assert.equal(r.egrid.label, 'eGRID2023');
  assert.ok(Math.abs(r.egrid.lb - (r.kwh / 1000) * 920.13) < 1e-9);
});

test('an unofficial eGRID edition is labeled as a third-party build', () => {
  const h0 = Date.UTC(2025, 0, 1) / H;
  const r = hourlyEmissions({ load: new Map([[h0, 1]]), grid: grid(h0, 1, () => 1), zone: ZONE, ba: 'PJM', egrid: { subregion: 'RFCE', lbPerMwh: 600, edition: 'eGRID2024', unofficial: true } });
  assert.equal(r.egrid.label, 'unofficial, third-party build');
});

test('the flat average is each calendar year\'s own, over the hours EIA published', () => {
  const h0 = Date.UTC(2024, 11, 31, 22) / H;
  const m = yearMeans(grid(h0, 4, (i) => [1, 3, 0.5, null][i]));
  assert.deepEqual([...m], [[2024, 2], [2025, 0.5]]);
});

test('matching numbers: 10 kWh in 24 hours against 20 kWh of solar in 12 is 100% annual and 50% hourly', () => {
  const h0 = Date.UTC(2025, 5, 1, 5) / H;
  const load = new Map(Array.from({ length: 24 }, (_, i) => [h0 + i, 10]));
  const supply = new Map(Array.from({ length: 24 }, (_, i) => [h0 + i, i >= 6 && i < 18 ? 20 : 0]));
  const r = matchShares({ load, supply, zone: ZONE });
  assert.equal(r.annualShare, 1);
  assert.equal(r.hourlyShare, 0.5);
  assert.deepEqual([r.surplus, r.shortfall], [120, 120]);
  assert.equal(r.shortByHour.reduce((a, b) => a + b, 0), 120);
  assert.equal(r.label, DRAFT_LABEL);
});

test('hand-computed pairs: surplus-only hours, shortfall-only hours, and a mix', () => {
  const h0 = 500_000;
  const at = (vals) => new Map(vals.map((v, i) => [h0 + i, v]));
  const cases = [
    // [load, supply, annual, hourly]
    [[5, 5, 5, 5], [8, 8, 8, 8], 1, 1],
    [[5, 5, 5, 5], [1, 2, 0, 3], 6 / 20, 6 / 20],
    [[4, 0, 6, 10], [10, 5, 0, 5], 1, 9 / 20],
  ];
  for (const [l, s, annual, hourly] of cases) {
    const r = matchShares({ load: at(l), supply: at(s), zone: 'UTC' });
    assert.ok(Math.abs(r.annualShare - annual) < 1e-4, `annual ${r.annualShare} against ${annual}`);
    assert.ok(Math.abs(r.hourlyShare - hourly) < 1e-4, `hourly ${r.hourlyShare} against ${hourly}`);
  }
});

test('a 2 MW flat block supplies 2 MWh in every hour', () => {
  const hours = Array.from({ length: 48 }, (_, i) => 480_000 + i);
  const b = flatBlock(hours, 2, { zone: ZONE });
  assert.ok([...b.values()].every((v) => v === 2000));
});

test('grid clean share over a 24-hour fixture: nuclear, hydro, wind, and solar over positive generation, storage and Other left out', () => {
  const h0 = 480_000;
  // Each hour: 400 nuclear, 100 hydro, wind 50 + i, solar 0 at night and 200 by day, 300 gas, 50 Other, battery 80 out or 40 in.
  const g = grid(h0, 24, () => 1, (i) => ({ gen_nuc: 400, gen_wat: 100, gen_wnd: 50 + i, gen_sun: i >= 8 && i < 18 ? 200 : 0, gen_ng: 300, gen_oth: 50, gen_bat: i % 2 ? 80 : -40 }));
  const load = new Map(Array.from({ length: 24 }, (_, i) => [h0 + i, 100]));
  const r = matchShares({ load, supply: new Map(), grid: g, zone: 'UTC' });
  let want = 0;
  for (let i = 0; i < 24; i++) {
    const clean = 400 + 100 + (50 + i) + (i >= 8 && i < 18 ? 200 : 0);
    want += clean / (clean + 300 + 50);
  }
  want /= 24;
  assert.ok(Math.abs(r.grid.cleanShare - want) * 100 < 0.01, `${r.grid.cleanShare} against ${want}`);
  assert.ok(Math.abs(r.grid.combined - want) < 1e-12, 'nothing matched, so the combined score is the grid share');
  assert.equal(cleanShare({ gen_bat: 50 }), null, 'storage alone is no generation');
});

test('quantiles interpolate linearly, as numpy does by default', () => {
  assert.equal(quantile([1, 2, 3, 4], 0.5), 2.5);
  assert.equal(quantile([1, 2, 3, 4], 0.25), 1.75);
  assert.equal(quantile([7], 0.75), 7);
});

test('typical hours by local clock hour, and the cleanest and dirtiest two-hour windows', () => {
  // July 2025 in Central time, intensity rising through the day to 6 pm and falling after.
  const from = Date.UTC(2025, 6, 1, 5) / H;
  const away = (hr) => Math.min(Math.abs(hr - 18), 24 - Math.abs(hr - 18)); // hours from 6 pm, around the clock
  const rows = Array.from({ length: 31 * 24 }, (_, i) => ({ hour: from + i, intensity_consumed: (500 + 40 * (12 - away(i % 24))) / 1000 }));
  const t = typicalHours(rows, { zone: ZONE, years: [2025] });
  const july = t[6];
  assert.equal(july.hours[18].n, 31);
  assert.equal(july.hours[18].median, 980);
  const w = windows(july);
  assert.deepEqual([w.dirtiest.from, w.dirtiest.to], [17, 19]);
  assert.deepEqual([w.cleanest.from, w.cleanest.to], [5, 7]);
});

test('the fall-back hour counts twice toward its clock hour; the spring-forward hour adds nothing', () => {
  // November 2, 2025: 1 am Central happens twice (06:00 and 07:00 UTC). March 9: 2 am never happens.
  const nov = Date.UTC(2025, 10, 2, 5) / H;
  const mar = Date.UTC(2025, 2, 9, 6) / H;
  const rows = [...Array.from({ length: 4 }, (_, i) => ({ hour: nov + i, intensity_consumed: 1 })), ...Array.from({ length: 4 }, (_, i) => ({ hour: mar + i, intensity_consumed: 1 }))];
  const t = typicalHours(rows, { zone: ZONE, years: [2025] });
  assert.equal(t[10].hours[1].n, 2);
  assert.equal(t[2].hours[2].n, 0);
});

test('moving 200 kWh a day of EV charging from 6–10 pm to 11 am–3 pm at 1,000 and 700 lb/MWh saves 21,900 lb, 9.9 metric tons a year', () => {
  const typical = Array.from({ length: 12 }, (_, m) => ({ month: m + 1, hours: Array.from({ length: 24 }, (_, hour) => ({ hour, median: hour >= 18 && hour < 22 ? 1000 : hour >= 11 && hour < 15 ? 700 : 850 })) }));
  const r = shiftEstimate(typical, { kwhPerDay: 200, current: [18, 22], proposed: [11, 15] });
  assert.ok(Math.abs(r.lb - 21_900) < 1e-6);
  assert.equal(r.t.toFixed(1), '9.9');
  assert.equal(r.days, 365);
  assert.match(r.label, /attributional/);
  // The picker fills the calculator with each window's year-round figure; priced at those, the shift is the same.
  assert.equal(yearWindowMean(typical, [18, 22]), 1000);
  assert.equal(yearWindowMean(typical, [11, 15]), 700);
});

test('a supply file in MWh, local standard time, for 8,760 hours of another year, on a 2024 load', () => {
  // 2023 in Central standard time (UTC-6 all year): the value is the month × 100 plus the hour, in MWh.
  const lines = ['time,Output (MWh)'];
  for (let i = 0; i < 8760; i++) {
    const d = new Date(Date.UTC(2023, 0, 1) + i * H);
    lines.push(`${d.toISOString().slice(0, 13).replace('T', ' ')}:00,${(d.getUTCMonth() + 1) * 100 + d.getUTCHours()}`);
  }
  const s = readSupply(lines.join('\n'), { zone: ZONE, basis: 'standard' });
  assert.equal(s.status, 'ok');
  // The load: all of 2024 in UTC hours.
  const hours = Array.from({ length: 8784 }, (_, i) => Date.UTC(2024, 0, 1, 6) / H + i);
  const { supply, steps } = alignSupply(hours, s, ZONE);
  // 1 pm daylight time on July 1, 2024 (18:00 UTC) is noon standard time: 712 MWh.
  assert.equal(supply.get(Date.UTC(2024, 6, 1, 18) / H), 712_000);
  // Noon standard on February 29, 2024 (18:00 UTC) takes February 28's noon.
  assert.equal(supply.get(Date.UTC(2024, 1, 29, 18) / H), 212_000);
  assert.deepEqual(steps, [
    'Read 8,760 values in MWh (from the header), stamped in local standard time.',
    'Converted MWh to kWh: each value × 1,000.',
    'The profile is from 2023, not the load\'s dates, so each load hour takes the profile\'s value for the same month, day, and standard-time hour.',
    'Summer hours are shifted to daylight-saving time to match the meter.',
    'February 28 is repeated for February 29.',
  ]);
});

test('a supply file covering the load\'s own hours is matched hour for hour', () => {
  const h0 = Date.UTC(2025, 0, 1) / H;
  const text = ['time,kWh', ...Array.from({ length: 4 }, (_, i) => `${new Date((h0 + i) * H).toISOString()},${i + 1}`)].join('\n');
  const { supply, steps } = alignSupply([h0, h0 + 1, h0 + 2, h0 + 3], readSupply(text, { zone: ZONE, basis: 'utc' }), ZONE);
  assert.deepEqual([...supply.values()], [1, 2, 3, 4]);
  assert.match(steps.at(-1), /same UTC hour/);
});

test('region assignment: one region assigned, two listed for the user to pick, Hawaii without hourly data', () => {
  const withData = new Set(['MISO', 'SWPP', 'ERCO']);
  assert.deepEqual(assignRegion({ bas: ['ERCO'], state: 'TX' }, withData), { status: 'assigned', ba: 'ERCO' });
  assert.deepEqual(assignRegion({ bas: ['SWPP', 'MISO', 'NA'], state: 'LA' }, withData), { status: 'choose', choices: ['MISO', 'SWPP'] });
  assert.deepEqual(assignRegion({ bas: ['HECO'], state: 'HI' }, withData), { status: 'none', noHourly: true });
});
