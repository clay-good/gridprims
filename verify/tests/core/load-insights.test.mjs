// What an interval file says about a load (load and bill analyzer tasks 2.1
// to 2.4), each scenario as the interval-insights spec states it, and the
// monthly peaks of a year of 15-minute data against independent results.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { aggregate, baseload, demandOver, durationCurve, flags, heatmap, profiles, quality } from '../../../core/lib/load-insights.mjs';
import { intervalKw, loadStats } from '../../../core/lib/load-stats.mjs';
import { downsampleMinMax } from '../../../site/lib/chart.mjs';
import { formatLocalIso } from '../../../parsers/time.mjs';

const ROOT = join(import.meta.dirname, '../../..');
const ref = JSON.parse(readFileSync(join(ROOT, 'verify/reference/office-2025-monthly-peaks.json'), 'utf8'));
const lines = readFileSync(join(ROOT, ref.source), 'utf8').trim().split('\n').slice(1);
const office = { meter: 'office', startMs: Float64Array.from(lines, (l) => Date.parse(l.split(',')[0])), kwh: Float64Array.from(lines, (l) => Number(l.split(',')[1])), intervalMinutes: 15 };
const ZONE = 'America/Chicago';
const series = (startIso, count, minutes, kwOf, meter = 'm') => {
  const start = Date.parse(`${startIso}Z`);
  const startMs = Float64Array.from({ length: count }, (_, i) => start + i * minutes * 60_000);
  return { meter, startMs, kwh: Float64Array.from(startMs, (ms, i) => (kwOf(new Date(ms), i) * minutes) / 60), intervalMinutes: minutes };
};

test('kWh per 15-minute interval becomes demand at kWh × 4', () => {
  assert.deepEqual([...intervalKw({ kwh: Float64Array.from([1, 2.5]), intervalMinutes: 15 })], [4, 10]);
});

test('a year of 15-minute data: 12 monthly peaks, each date, local time, and kW matching independent results exactly, and energy within 0.01%', () => {
  const st = loadStats(office, ZONE);
  assert.equal(st.monthly.length, 12);
  assert.ok(Math.abs(st.totalKwh / Number(ref.totalKwh) - 1) < 1e-4);
  st.monthly.forEach((m, i) => {
    const r = ref.months[i];
    assert.equal(m.month, r.month);
    assert.equal(Math.round(m.peakKw * 1e4) / 1e4, Number(r.peakKw), m.month);
    assert.equal(new Date(m.peakStartMs).toISOString().slice(0, 19) + 'Z', r.peakUtc, m.month);
    assert.equal(formatLocalIso(ZONE, m.peakStartMs).slice(0, 16).replace('T', ' '), r.peakLocal, m.month);
    assert.ok(Math.abs(m.kwh / Number(r.kwh) - 1) < 1e-4, m.month);
  });
});

test('baseload is the 5th percentile of demand, labeled, beside the minimum', () => {
  const b = baseload(office);
  assert.ok(b.minKw <= b.baseloadKw && b.baseloadKw < 35);
  assert.equal(b.label, 'baseload (the 5th percentile of demand)');
});

test('a 15-minute window on an hourly file is refused; 30-minute block and rolling demand over 15-minute data average their intervals', () => {
  const hourly = series('2026-01-01T00:00:00', 48, 60, () => 10);
  assert.deepEqual(demandOver(hourly, { minutes: 15, mode: 'block' }), { status: 'refused', reason: '15-minute demand cannot be recovered from hourly data.' });
  const q = series('2026-01-01T00:00:00', 8, 15, (d, i) => [10, 30, 50, 10, 10, 10, 10, 10][i]);
  const block = demandOver(q, { minutes: 30, mode: 'block' });
  assert.deepEqual([...block.kw], [20, 30, 10, 10]);
  const rolling = demandOver(q, { minutes: 30, mode: 'rolling' });
  assert.deepEqual([...rolling.kw], [20, 40, 30, 10, 10, 10, 10]);
  assert.equal(rolling.peakKw, 40);
});

test('the highest interval survives downsampling a year of 15-minute data into a 600 px chart', () => {
  const kw = intervalKw(office);
  const d = downsampleMinMax(office.startMs, kw, 300);
  assert.ok(d.y.length <= 600);
  assert.equal(Math.max(...d.y), 240);
});

test('views: the duration curve runs from the peak down, the heatmap has a row a day, and weekdays outrun weekends at noon', () => {
  const c = durationCurve(office);
  assert.equal(c[0].kw, 240);
  assert.ok(c.every((p, i) => i === 0 || p.kw <= c[i - 1].kw));
  assert.equal(heatmap(office, ZONE).length, 365);
  const p = profiles(office, ZONE);
  assert.ok(p.weekday[12] > 2 * p.weekend[12]);
});

test('a needle peak: one spike more than 25% above the month\'s 95th percentile sets March\'s peak, and the flag links to it', () => {
  const needle = flags(office, ZONE).filter((f) => f.kind === 'needle-peak');
  assert.deepEqual(needle.map((f) => f.month), ['2025-03']);
  assert.equal(needle[0].startMs, Date.parse(ref.months[2].peakUtc));
  assert.match(needle[0].text, /^In 2025-03, one short spike set the month's peak: 240\.0 kW/);
});

test('after-hours load above 40%, a weekly spike in 3 straight weeks, and a baseload step lasting 14 days each raise a flag; a flat load raises none', () => {
  // A store open 7 am to 7 pm on weekdays at 20 kW with 30 kW running all night, and a 100 kW spike every Monday at 3 am.
  const store = series('2026-02-02T00:00:00', 28 * 24 * 4, 15, (d) => (d.getUTCDay() === 1 && d.getUTCHours() === 3 ? 100 : d.getUTCDay() >= 1 && d.getUTCDay() <= 5 && d.getUTCHours() >= 7 && d.getUTCHours() < 19 ? 20 : 30));
  const kinds = flags(store, 'UTC').map((f) => f.kind);
  assert.ok(kinds.includes('after-hours'));
  assert.ok(kinds.includes('weekly-spike'));
  // Baseload at 10 kW for 20 days, then 13 kW for 20 days: a 30% step.
  const step = series('2026-04-01T00:00:00', 40 * 24, 60, (d, i) => (i < 20 * 24 ? 10 : 13) + (d.getUTCHours() === 12 ? 20 : 0));
  const s = flags(step, 'UTC').find((f) => f.kind === 'baseload-step');
  assert.match(s.text, /^Baseload rose 30% on 2026-04-21, from about 10\.0 kW to 13\.0 kW/);
  assert.deepEqual(flags(series('2026-04-01T00:00:00', 40 * 24, 60, () => 10), 'UTC', { businessHours: [0, 24] }), []);
});

test('a file covering 7 months is labeled "7 months of data", with coverage, zero runs, and negatives reported and what they affect', () => {
  const seven = series('2026-01-01T00:00:00', 212 * 24, 60, (d, i) => (i >= 100 && i < 106 ? 0 : i === 500 ? -2 : 5));
  const q = quality(seven, 'UTC');
  assert.equal(q.label, '7 months of data');
  assert.equal(q.coverage, 1);
  assert.deepEqual(q.zeroRuns.map((z) => z.hours), [6]);
  assert.equal(q.negatives, 1);
  assert.equal(q.affects.length, 2);
  const gappy = { ...seven, startMs: seven.startMs.filter((_, i) => i % 10), kwh: seven.kwh.filter((_, i) => i % 10) };
  assert.ok(quality(gappy, 'UTC').coverage < 0.91);
});

test('two meters: the aggregate peak comes from summed intervals, and the diversity benefit is 180 − 140 = 40 kW', () => {
  const a = series('2026-07-01T00:00:00', 24, 60, (d) => (d.getUTCHours() === 14 ? 100 : d.getUTCHours() === 20 ? 30 : 10), 'A');
  const b = series('2026-07-01T00:00:00', 24, 60, (d) => (d.getUTCHours() === 14 ? 40 : d.getUTCHours() === 20 ? 80 : 10), 'B');
  const agg = aggregate([a, b]);
  assert.deepEqual([agg.peakKw, agg.diversityKw], [140, 40]);
  assert.deepEqual(agg.meters, [{ meter: 'A', peakKw: 100 }, { meter: 'B', peakKw: 80 }]);
});
