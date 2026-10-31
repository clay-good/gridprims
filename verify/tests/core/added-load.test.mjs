// Added load (add-electrification-tools: added-load): energy preserved
// hourly-on-15-minute and 15-minute-on-hourly, the messy shape file, a
// schedule, and a heat pump moving the annual peak to winter.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { alignSchedule, alignShape, combined, readSchedule, readShape } from '../../../core/lib/added-load.mjs';
import { utcToLocal } from '../../../parsers/time.mjs';

const ZONE = 'America/Chicago';
const sum = (a) => a.reduce((x, y) => x + y, 0);
const iso = (ms) => new Date(ms).toISOString().slice(0, 16).replace('T', ' ');

/** A meter series: `kw(i)` for `n` intervals of `minutes` from `from`. */
function meter(from, n, minutes, kw = () => 10) {
  return { startMs: Float64Array.from({ length: n }, (_, i) => from + i * minutes * 60_000), kwh: Float64Array.from({ length: n }, (_, i) => (kw(i) * minutes) / 60), intervalMinutes: minutes };
}
/** A UTC shape file of `n` rows at `minutes`, in kW. */
function shapeCsv(from, n, minutes, kw) {
  return ['time,kW', ...Array.from({ length: n }, (_, i) => `${new Date(from + i * minutes * 60_000).toISOString()},${kw(i)}`)].join('\n');
}

test('hourly shape on 15-minute data: each hour\'s kW goes to its four intervals, and energy is preserved within 0.01%', () => {
  const from = Date.UTC(2025, 0, 6, 6);
  const m = meter(from, 96 * 7, 15);
  const s = readShape(shapeCsv(from, 24 * 7, 60, (i) => 2 + (i % 5)), { zone: ZONE, basis: 'utc' });
  const { added, steps } = alignShape(m, s, ZONE);
  assert.deepEqual([...added.slice(0, 8)].map((e) => e * 4), [2, 2, 2, 2, 3, 3, 3, 3]);
  assert.match(steps.at(-1), /each hour's kW applies to its 4 15-minute intervals/);
  const shapeKwh = sum(s.points.map((p) => p.kw));
  assert.ok(Math.abs(sum(m.kwh) + sum(added) - (sum(m.kwh) + shapeKwh)) / (sum(m.kwh) + shapeKwh) < 1e-4);
});

test('15-minute shape on hourly data: four values average into each hour, and energy is preserved within 0.01%', () => {
  const from = Date.UTC(2025, 0, 6, 6);
  const m = meter(from, 24 * 7, 60);
  const s = readShape(shapeCsv(from, 96 * 7, 15, (i) => i % 4), { zone: ZONE, basis: 'utc' });
  const { added } = alignShape(m, s, ZONE);
  assert.equal(added[0], (0 + 1 + 2 + 3) / 4);
  assert.ok(Math.abs(sum(added) - sum(s.points.map((p) => p.kw / 4))) / sum(added) < 1e-4);
});

test('messy shape file: kWh, local standard time, another year, a 3-hour gap; converted, mapped, shifted, and the gap reported as no load', () => {
  // A 2019 shape at 1 kWh an hour, stamped in Central Standard Time all year, with 03:00 to 05:59 on July 10 missing.
  const rows = ['Date,Energy (kWh)'];
  for (let d = 0; d < 365; d++) for (let h = 0; h < 24; h++) {
    const t = new Date(Date.UTC(2019, 0, 1 + d, h));
    if (t.getUTCMonth() === 6 && t.getUTCDate() === 10 && h >= 3 && h < 6) continue;
    rows.push(`${iso(t.getTime())},1`);
  }
  const s = readShape(rows.join('\n'), { zone: ZONE, basis: 'standard' });
  assert.equal(s.status, 'ok');
  assert.match(s.steps[0], /hourly values in kWh \(from the header\), stamped in local standard time, shifted to prevailing time/);
  assert.match(s.steps[1], /Converted kWh to kW/);
  assert.match(s.steps[2], /1 gap in the shape, 3 hours in all, treated as no added load/);
  // In July, 00:00 standard is 01:00 prevailing.
  assert.equal(new Date(s.points.find((p) => new Date(p.ms).toISOString().startsWith('2019-07-01T06')).ms).toISOString(), '2019-07-01T06:00:00.000Z');
  const m = meter(Date.UTC(2025, 6, 1, 5), 24 * 31, 60);
  const { added, steps } = alignShape(m, s, ZONE);
  assert.match(steps.at(-1), /The shape \(2019\) does not cover this file's dates, so its average kW for each month, weekday, and hour is applied/);
  // July 10, 2019 was the second of five Wednesdays, so its three missing hours average 4/5 kW on Wednesdays;
  // July 2025 also has five Wednesdays: 744 kWh less 3 hours × 5 days × 0.2 kW.
  assert.ok(Math.abs(sum(added) - 741) < 1e-9, `${sum(added)}`);
});

test('a schedule: one line of 24 kW values applies every month; 12 lines apply by month', () => {
  const s = readSchedule(Array.from({ length: 24 }, (_, h) => (h >= 17 && h < 21 ? 3 : 0.5)).join(' '));
  const m = meter(Date.UTC(2025, 0, 6, 6), 96, 15);
  const { added } = alignSchedule(m, s, ZONE);
  assert.equal(added[17 * 4] * 4, 3, '5 pm local');
  assert.equal(added[0] * 4, 0.5);
  assert.equal(readSchedule('1 2 3').status, 'refused');
});

test('new winter peak: a heat pump raises January above the summer peak, and the result says the peak moved to winter', () => {
  // A year of daily loads: 20 kW, 40 kW in July. A heat pump adds 30 kW in January.
  const from = Date.UTC(2025, 0, 1, 6);
  const m = meter(from, 365 * 24, 60, (i) => (utcToLocal(ZONE, from + i * 3_600_000).month === 7 ? 40 : 20));
  const sched = readSchedule(Array.from({ length: 12 }, (_, mo) => Array(24).fill(mo === 0 ? 30 : 0).join(' ')).join('\n'));
  const r = combined(m, alignSchedule(m, sched, ZONE).added, ZONE);
  assert.equal(r.before.month, '2025-07');
  assert.equal(r.after.month, '2025-01');
  assert.equal(r.after.kw, 50);
  assert.equal(r.moved, 'The annual peak moved to winter: from July to January.');
});
