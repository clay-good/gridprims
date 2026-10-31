// The quantities more than one tool reports about a loaded file, computed once
// (platform/tool-contract, "One file, one set of numbers"): peak demand and its
// time, total energy, load factor, monthly peaks, and interval count. Tools
// read these; none derives its own.

import { utcToLocal } from '../../parsers/time.mjs';

/**
 * @typedef {{startMs: Float64Array, kwh: Float64Array, intervalMinutes: number}} SeriesLike
 */

/**
 * Average demand in kW over each interval: energy divided by the interval's hours.
 * @param {SeriesLike} s
 */
export function intervalKw(s) {
  const perHour = 60 / s.intervalMinutes;
  return Float64Array.from(s.kwh, (v) => v * perHour);
}

/**
 * Summary quantities for one series. Gaps are excluded rather than filled, so
 * load factor is measured over the hours that have readings.
 * @param {SeriesLike} s
 * @param {string} zone local zone for monthly grouping
 */
export function loadStats(s, zone) {
  const kw = intervalKw(s);
  let total = 0;
  let peak = -Infinity;
  let peakAt = NaN;
  /** @type {Map<string, {month: string, kwh: number, peakKw: number, peakStartMs: number, intervals: number}>} */
  const months = new Map();
  // Month keys change only on whole-hour boundaries in US zones, so look each hour up once.
  const monthOfHour = new Map();
  const monthKey = (ms) => {
    const h = Math.floor(ms / 3_600_000);
    let k = monthOfHour.get(h);
    if (k === undefined) {
      const l = utcToLocal(zone, h * 3_600_000);
      monthOfHour.set(h, (k = `${l.year}-${String(l.month).padStart(2, '0')}`));
    }
    return k;
  };
  for (let i = 0; i < kw.length; i++) {
    total += s.kwh[i];
    if (kw[i] > peak) { peak = kw[i]; peakAt = s.startMs[i]; }
    const key = monthKey(s.startMs[i]);
    let m = months.get(key);
    if (!m) months.set(key, (m = { month: key, kwh: 0, peakKw: -Infinity, peakStartMs: NaN, intervals: 0 }));
    m.kwh += s.kwh[i];
    m.intervals++;
    if (kw[i] > m.peakKw) { m.peakKw = kw[i]; m.peakStartMs = s.startMs[i]; }
  }
  const hours = kw.length * s.intervalMinutes / 60;
  return {
    intervals: kw.length,
    totalKwh: total,
    peakKw: kw.length ? peak : 0,
    peakStartMs: peakAt,
    hoursWithReadings: hours,
    averageKw: hours ? total / hours : 0,
    loadFactor: kw.length && peak > 0 ? total / hours / peak : null,
    monthly: [...months.values()].sort((a, b) => a.month.localeCompare(b.month)),
  };
}
