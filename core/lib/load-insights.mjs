// What an interval file says about a load (add-load-and-bill-analyzer:
// interval-insights, tasks 2.1 to 2.4): minimum demand and baseload, demand
// over a chosen window, the load duration curve, the day-by-time heatmap,
// the weekday and weekend profiles, plain-language flags, the data-quality
// report, and several meters with their aggregate. The headline quantities
// (energy, peak, load factor, monthly peaks) stay in load-stats.mjs.

import { utcToLocal } from '../../parsers/time.mjs';
import { intervalKw, loadStats } from './load-stats.mjs';

const pct = (sorted, p) => (sorted.length ? sorted[Math.min(sorted.length - 1, Math.max(0, Math.ceil((p / 100) * sorted.length) - 1))] : NaN);
const sortUp = (a) => Float64Array.from(a).sort();

/** Local fields for each interval, looked up once per UTC hour. */
function localOf(zone) {
  const byHour = new Map();
  return (ms) => {
    const h = Math.floor(ms / 3_600_000);
    let l = byHour.get(h);
    if (!l) byHour.set(h, (l = utcToLocal(zone, h * 3_600_000)));
    return { ...l, minute: Math.floor((ms % 3_600_000) / 60_000) };
  };
}
const weekdayOf = (l) => new Date(Date.UTC(l.year, l.month - 1, l.day)).getUTCDay();

/** Minimum demand and baseload, the 5th percentile of interval demand, labeled as such. */
export function baseload(s) {
  const kw = sortUp(intervalKw(s));
  return { minKw: kw[0] ?? 0, baseloadKw: pct(kw, 5), label: 'baseload (the 5th percentile of demand)' };
}

/**
 * Demand over a chosen window: block (clock-aligned) or rolling averages. A window shorter than the file's
 * interval is refused, because finer demand cannot be recovered from coarser data.
 * @param {{startMs: Float64Array, kwh: Float64Array, intervalMinutes: number}} s
 * @param {{minutes: number, mode: 'block' | 'rolling'}} w
 */
export function demandOver(s, w) {
  if (w.minutes < s.intervalMinutes) return { status: 'refused', reason: `${w.minutes}-minute demand cannot be recovered from ${s.intervalMinutes === 60 ? 'hourly' : `${s.intervalMinutes}-minute`} data.` };
  if (w.minutes % s.intervalMinutes) return { status: 'refused', reason: `A ${w.minutes}-minute window is not a whole number of the file's ${s.intervalMinutes}-minute intervals.` };
  const n = w.minutes / s.intervalMinutes;
  const hours = w.minutes / 60;
  const startMs = [];
  const kw = [];
  if (w.mode === 'rolling') {
    let sum = 0;
    for (let i = 0; i < s.kwh.length; i++) {
      sum += s.kwh[i];
      if (i >= n) sum -= s.kwh[i - n];
      if (i >= n - 1 && s.startMs[i] - s.startMs[i - n + 1] === (n - 1) * s.intervalMinutes * 60_000) { startMs.push(s.startMs[i - n + 1]); kw.push(sum / hours); }
    }
  } else {
    const winMs = w.minutes * 60_000;
    const blocks = new Map();
    for (let i = 0; i < s.kwh.length; i++) {
      const b = Math.floor(s.startMs[i] / winMs) * winMs;
      const e = blocks.get(b) ?? blocks.set(b, { kwh: 0, count: 0 }).get(b);
      e.kwh += s.kwh[i];
      e.count++;
    }
    for (const [b, e] of [...blocks].sort((a, c) => a[0] - c[0])) if (e.count === n) { startMs.push(b); kw.push(e.kwh / hours); }
  }
  let peak = -Infinity;
  let peakStartMs = NaN;
  kw.forEach((x, i) => { if (x > peak) { peak = x; peakStartMs = startMs[i]; } });
  return { status: 'ok', mode: w.mode, minutes: w.minutes, startMs: Float64Array.from(startMs), kw: Float64Array.from(kw), peakKw: peak, peakStartMs };
}

/** The load duration curve: demand sorted from highest to lowest, sampled at `points` evenly spaced shares of time. */
export function durationCurve(s, points = 101) {
  const kw = sortUp(intervalKw(s)).reverse();
  return Array.from({ length: points }, (_, i) => {
    const share = i / (points - 1);
    return { share, kw: kw[Math.min(kw.length - 1, Math.round(share * (kw.length - 1)))] };
  });
}

/** Average kW for each local day and hour: the calendar heatmap. */
export function heatmap(s, zone) {
  const local = localOf(zone);
  const kw = intervalKw(s);
  const days = new Map();
  for (let i = 0; i < kw.length; i++) {
    const l = local(s.startMs[i]);
    const key = `${l.year}-${String(l.month).padStart(2, '0')}-${String(l.day).padStart(2, '0')}`;
    const d = days.get(key) ?? days.set(key, { sum: Array(24).fill(0), n: Array(24).fill(0) }).get(key);
    d.sum[l.hour] += kw[i];
    d.n[l.hour]++;
  }
  return [...days].sort((a, b) => a[0].localeCompare(b[0])).map(([day, d]) => ({ day, kw: d.sum.map((x, h) => (d.n[h] ? x / d.n[h] : null)) }));
}

/** The average weekday and weekend day, hour by hour. */
export function profiles(s, zone) {
  const local = localOf(zone);
  const kw = intervalKw(s);
  const acc = { weekday: { sum: Array(24).fill(0), n: Array(24).fill(0) }, weekend: { sum: Array(24).fill(0), n: Array(24).fill(0) } };
  for (let i = 0; i < kw.length; i++) {
    const l = local(s.startMs[i]);
    const a = [0, 6].includes(weekdayOf(l)) ? acc.weekend : acc.weekday;
    a.sum[l.hour] += kw[i];
    a.n[l.hour]++;
  }
  const avg = (a) => a.sum.map((x, h) => (a.n[h] ? x / a.n[h] : null));
  return { weekday: avg(acc.weekday), weekend: avg(acc.weekend) };
}

/**
 * Plain-language flags, each with the evidence it points to on the chart.
 * @param {{startMs: Float64Array, kwh: Float64Array, intervalMinutes: number}} s
 * @param {string} zone
 * @param {{businessHours?: [number, number]}} [opts] business hours on weekdays, local, end exclusive; default 7 am to 7 pm
 */
export function flags(s, zone, { businessHours = [7, 19] } = {}) {
  const local = localOf(zone);
  const kw = intervalKw(s);
  const out = [];
  const byMonth = new Map();
  const ls = new Array(kw.length);
  let after = 0;
  let total = 0;
  for (let i = 0; i < kw.length; i++) {
    const l = (ls[i] = local(s.startMs[i]));
    const key = `${l.year}-${String(l.month).padStart(2, '0')}`;
    (byMonth.get(key) ?? byMonth.set(key, []).get(key)).push(i);
    const open = ![0, 6].includes(weekdayOf(l)) && l.hour >= businessHours[0] && l.hour < businessHours[1];
    total += s.kwh[i];
    if (!open) after += s.kwh[i];
  }
  // A needle peak: one short spike sets the month's peak, more than 25% above the month's 95th percentile.
  for (const [month, idx] of byMonth) {
    const sorted = sortUp(idx.map((i) => kw[i]));
    const p95 = pct(sorted, 95);
    const top = idx.reduce((a, b) => (kw[b] > kw[a] ? b : a));
    if (kw[top] > 1.25 * p95) out.push({ kind: 'needle-peak', month, startMs: s.startMs[top], kw: kw[top], p95, text: `In ${month}, one short spike set the month's peak: ${kw[top].toFixed(1)} kW, ${Math.round((kw[top] / p95 - 1) * 100)}% above the month's 95th percentile of ${p95.toFixed(1)} kW.` });
    // A recurring weekly spike: above the month's 95th percentile at the same weekday and hour in 3 or more consecutive weeks.
    const slots = new Map();
    for (const i of idx) {
      if (kw[i] <= p95) continue;
      const l = ls[i];
      const slot = `${weekdayOf(l)}|${l.hour}`;
      const week = Math.floor(Date.UTC(l.year, l.month - 1, l.day) / (7 * 86_400_000));
      (slots.get(slot) ?? slots.set(slot, new Map()).get(slot)).set(week, i);
    }
    for (const [slot, weeks] of slots) {
      const w = [...weeks.keys()].sort((a, b) => a - b);
      let run = 1;
      for (let k = 1; k < w.length; k++) {
        run = w[k] === w[k - 1] + 1 ? run + 1 : 1;
        if (run === 3) {
          const [wd, hour] = slot.split('|').map(Number);
          const days = ['Sundays', 'Mondays', 'Tuesdays', 'Wednesdays', 'Thursdays', 'Fridays', 'Saturdays'];
          out.push({ kind: 'weekly-spike', month, startMs: s.startMs[weeks.get(w[k])], text: `In ${month}, demand on ${days[wd]} at ${hour % 12 || 12} ${hour < 12 ? 'am' : 'pm'} ran above the month's 95th percentile for 3 or more weeks in a row: something scheduled may be worth checking.` });
          break;
        }
      }
    }
  }
  if (total > 0 && after / total > 0.4) out.push({ kind: 'after-hours', share: after / total, text: `${Math.round((after / total) * 100)}% of the energy is used outside business hours (weekdays ${businessHours[0]} am to ${businessHours[1] - 12} pm), above the 40% that usually points to equipment left running.` });
  // A step change in baseload: daily baseload (5th percentile) shifting more than 15% and staying for 14 days or more.
  const daily = new Map();
  for (let i = 0; i < kw.length; i++) {
    const l = ls[i];
    const key = Date.UTC(l.year, l.month - 1, l.day);
    (daily.get(key) ?? daily.set(key, []).get(key)).push(kw[i]);
  }
  const days = [...daily].sort((a, b) => a[0] - b[0]).map(([d, v]) => ({ d, base: pct(sortUp(v), 5) }));
  const median = (arr) => { const v = arr.map((x) => x.base).sort((a, b) => a - b); return v[Math.floor(v.length / 2)]; };
  for (let k = 14; k + 14 <= days.length; k++) {
    const before = median(days.slice(k - 14, k));
    const afterM = median(days.slice(k, k + 14));
    if (before > 0 && Math.abs(afterM / before - 1) > 0.15 && days.slice(k, k + 14).every((x) => Math.abs(x.base / before - 1) > 0.15)) {
      const when = new Date(days[k].d).toISOString().slice(0, 10);
      out.push({ kind: 'baseload-step', startMs: days[k].d, text: `Baseload ${afterM > before ? 'rose' : 'fell'} ${Math.round(Math.abs(afterM / before - 1) * 100)}% on ${when}, from about ${before.toFixed(1)} kW to ${afterM.toFixed(1)} kW, and stayed there at least 14 days.` });
      break;
    }
  }
  return out;
}

/**
 * Coverage, zero runs, negatives, and what each affects. Gaps and duplicates come from the parse receipt.
 * @param {{startMs: Float64Array, kwh: Float64Array, intervalMinutes: number}} s
 * @param {string} zone
 */
export function quality(s, zone) {
  const step = s.intervalMinutes * 60_000;
  const n = s.startMs.length;
  const expected = n ? Math.round((s.startMs[n - 1] - s.startMs[0]) / step) + 1 : 0;
  let negatives = 0;
  const zeroRuns = [];
  let runStart = -1;
  for (let i = 0; i <= n; i++) {
    const zero = i < n && s.kwh[i] === 0 && (runStart < 0 || s.startMs[i] - s.startMs[i - 1] === step);
    if (i < n && s.kwh[i] < 0) negatives++;
    if (zero && runStart < 0) runStart = i;
    if (!zero && runStart >= 0) {
      const hours = ((i - runStart) * s.intervalMinutes) / 60;
      if (hours > 4) zeroRuns.push({ startMs: s.startMs[runStart], hours });
      runStart = i < n && s.kwh[i] === 0 ? i : -1;
    }
  }
  const months = loadStats(s, zone).monthly.length;
  return {
    coverage: expected ? n / expected : 0, expected, present: n, negatives, zeroRuns,
    months, label: months < 12 ? `${months} month${months === 1 ? '' : 's'} of data` : null,
    affects: [
      ...(n < expected ? ['Energy totals and load factor cover only the intervals present; peaks may be missed in the gaps.'] : []),
      ...(zeroRuns.length ? ['Zero runs longer than 4 hours lower the average and the baseload; they may be outages or a meter fault.'] : []),
      ...(negatives ? ['Negative readings (often exported energy) lower the energy total.'] : []),
    ],
  };
}

/**
 * Several meters and their aggregate, summed interval by interval; the diversity benefit is the sum of the
 * meters' own peaks less the aggregate peak.
 * @param {Array<{meter: string, startMs: Float64Array, kwh: Float64Array, intervalMinutes: number}>} meters same interval length
 */
export function aggregate(meters) {
  const sums = new Map();
  for (const m of meters) for (let i = 0; i < m.startMs.length; i++) sums.set(m.startMs[i], (sums.get(m.startMs[i]) ?? 0) + m.kwh[i]);
  const keys = [...sums.keys()].sort((a, b) => a - b);
  const agg = { meter: 'aggregate', channel: 'delivered', intervalMinutes: meters[0].intervalMinutes, startMs: Float64Array.from(keys), kwh: Float64Array.from(keys, (k) => sums.get(k)) };
  const peakOf = (s) => Math.max(...intervalKw(s));
  const each = meters.map((m) => ({ meter: m.meter, peakKw: peakOf(m) }));
  const aggPeak = peakOf(agg);
  return { series: agg, meters: each, peakKw: aggPeak, diversityKw: each.reduce((n, m) => n + m.peakKw, 0) - aggPeak };
}
