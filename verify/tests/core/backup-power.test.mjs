// Backup power (add-electrification-tools: backup-power): the spec's 9.6 kWh,
// 60 and 75 kWh, and 7.0 kW, a short event, bridging, and nearest-rank
// percentiles.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { battery, eventSummary, generator, nearestRank, outageEvents, parseLoads, profile } from '../../../core/lib/backup-power.mjs';

const Q = 900_000;
const sum = (a) => a.reduce((x, y) => x + y, 0);

test('load list: a refrigerator, a well pump, and lights use 9.6 kWh a day (4.8 + 3.0 + 1.8)', () => {
  const { loads, errors } = parseLoads('refrigerator, 0.2 kW, 24 h\nwell pump, 1.5 kW, 2 h\nlights, 0.3 kW, 6 h, from 18:00');
  assert.deepEqual(errors, []);
  assert.deepEqual(loads.map((l) => l.name), ['refrigerator', 'well pump', 'lights']);
  const kw = profile(loads);
  assert.ok(Math.abs(sum(kw) - 9.6) < 1e-9);
  assert.ok(Math.abs(kw[18] - (0.2 + 0.125 + 0.3)) < 1e-9, 'lights run from 6 pm');
  assert.ok(Math.abs(kw[0] - (0.2 + 0.125)) < 1e-9, 'and are off after midnight');
});

test('a load running past midnight wraps to the morning', () => {
  const kw = profile([{ name: 'heater', kw: 2, hours: 4, from: 22 }]);
  assert.deepEqual([kw[21], kw[22], kw[23], kw[0], kw[1], kw[2]], [0, 2, 2, 2, 2, 0]);
});

test('a line missing its kW or hours says which', () => {
  assert.deepEqual(parseLoads('freezer, 8 h').errors, ['Line 1: add the running kW, as "well pump, 1.5 kW, 2 h".']);
});

test('battery: a constant 5 kW for 12 hours is 60 kWh usable, 75 kWh nameplate at an 80% window', () => {
  const b = battery(new Array(24).fill(5), 12);
  assert.equal(b.usableKwh, 60);
  assert.equal(b.nameplateKwh, 75);
});

test('battery: the outage starts at the hour with the highest critical load, and a part hour counts its share', () => {
  const kw = new Array(24).fill(1);
  kw[19] = 3;
  const b = battery(kw, 1.5);
  assert.equal(b.startHour, 19);
  assert.equal(b.usableKwh, 3 + 0.5);
});

test('generator: 4.0 kW peak with a well pump running 1.5 kW and starting 4.5 kW needs at least 7.0 kW', () => {
  const g = generator(4, { runKw: 1.5, startKw: 4.5 });
  assert.equal(g.kw, 7);
  assert.equal(g.formula, '4 kW − 1.5 kW running + 4.5 kW starting = 7 kW');
});

test('short event: one 15-minute interval at 2% out is one event of 0.25 hours', () => {
  const t0 = Date.UTC(2024, 0, 1);
  const recs = [{ ms: t0, out: 0 }, { ms: t0 + Q, out: 200 }, { ms: t0 + 2 * Q, out: 50 }];
  assert.deepEqual(outageEvents(recs, 10_000), [{ startMs: t0 + Q, hours: 0.25 }]);
});

test('a missing hour inside a run is bridged; a longer gap, or a record under 1%, ends it', () => {
  const t0 = Date.UTC(2024, 0, 1);
  const at = (k, out) => ({ ms: t0 + k * Q, out });
  // Out at 0-1, missing 2-5 (an hour), out at 6: one event of 7 intervals.
  assert.deepEqual(outageEvents([at(0, 500), at(1, 500), at(6, 500)], 10_000).map((e) => e.hours), [1.75]);
  // Missing 2-6 (75 minutes) splits it.
  assert.deepEqual(outageEvents([at(0, 500), at(1, 500), at(7, 500)], 10_000).map((e) => e.hours), [0.5, 0.25]);
  // A record under 1% in between splits it too.
  assert.deepEqual(outageEvents([at(0, 500), at(1, 50), at(2, 500)], 10_000).map((e) => e.hours), [0.25, 0.25]);
});

test('durations use nearest-rank percentiles', () => {
  const hours = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
  assert.equal(nearestRank(hours, 50), 5);
  assert.equal(nearestRank(hours, 90), 9);
  assert.deepEqual(eventSummary(hours.map((h) => ({ hours: h }))), { count: 10, p50: 5, p90: 9, longest: 10 });
});

test('county history: a year under 50% coverage is dropped and named; a year with no published figure is kept and named', async () => {
  const { countyHistory } = await import('../../../core/lib/backup-power.mjs');
  const events = [{ year: 2017, hours: 30 }, { year: 2018, hours: 1 }, { year: 2019, hours: 2 }, { year: 2019, hours: 12 }, { year: 2024, hours: 4 }];
  const h = countyHistory(events, { 2018: 45, 2019: 80 }, { from: 2017, to: 2024 });
  assert.deepEqual(h.dropped, [{ year: 2018, pct: 45 }]);
  assert.deepEqual(h.unpublished, [2017, 2020, 2021, 2022, 2023, 2024]);
  assert.equal(h.count, 4);
  assert.equal(h.longest, 30);
  assert.equal(h.p50, 4);
});
