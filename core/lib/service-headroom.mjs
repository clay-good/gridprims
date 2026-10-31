// Room left on an existing electric service by the measured-demand method
// (add-electrification-tools: service-headroom): which data period a file
// qualifies for, its maximum 15-minute demand, and the headroom in amps and
// kVA. The code sections are cited and paraphrased, never quoted; the
// authority having jurisdiction decides whether the method applies.

import { localToUtc, utcToLocal } from '../../parsers/time.mjs';

const Q = 15 * 60_000;
const DAY = 86_400_000;

/** The editions the report can cite. There is no default: the user picks the one adopted locally. */
export const EDITIONS = {
  2023: { edition: '2023 NEC', section: '220.87' },
  2026: { edition: '2026 NEC', section: '120.87', unverified: true },
};

/**
 * Fixed, clock-aligned 15-minute averages. Finer data (1, 3, or 5 minutes) is
 * re-averaged, and a block missing any reading is dropped rather than
 * understated; coarser data is refused, because averaging over an hour hides
 * the 15-minute maximum.
 * @param {{startMs: Float64Array, kwh: Float64Array, intervalMinutes: number}} s
 */
export function fifteenMinute(s) {
  const m = s.intervalMinutes;
  if (m > 15) return { status: 'refused', reason: `${m === 60 ? 'Hourly' : `${m}-minute`} data understates maximum demand, which is the highest 15-minute average. Headroom needs 15-minute or finer data.` };
  if (15 % m) return { status: 'refused', reason: `${m}-minute intervals do not fit evenly into 15 minutes.` };
  if (m === 15) return { status: 'ok', series: s, reaveraged: false };
  const per = 15 / m;
  const blocks = new Map();
  for (let i = 0; i < s.startMs.length; i++) {
    const b = Math.floor(s.startMs[i] / Q) * Q;
    const e = blocks.get(b) ?? blocks.set(b, { kwh: 0, n: 0 }).get(b);
    e.kwh += s.kwh[i];
    e.n++;
  }
  const keep = [...blocks].filter(([, e]) => e.n === per).sort((a, b) => a[0] - b[0]);
  return { status: 'ok', reaveraged: true, dropped: blocks.size - keep.length, series: { startMs: Float64Array.from(keep, ([b]) => b), kwh: Float64Array.from(keep, ([, e]) => e.kwh), intervalMinutes: 15 } };
}

/** The share of each local calendar month's 15-minute intervals the file has. */
function monthCoverage(s, zone) {
  const counts = new Map();
  for (const ms of s.startMs) {
    const l = utcToLocal(zone, ms);
    const k = `${l.year}-${String(l.month).padStart(2, '0')}`;
    counts.set(k, (counts.get(k) ?? 0) + 1);
  }
  return [...counts.keys()].sort().map((k) => {
    const [y, m] = k.split('-').map(Number);
    // Local midnight is never in a US daylight-saving gap or repeat.
    const from = localToUtc(zone, { year: y, month: m, day: 1, hour: 0, minute: 0 }).utcMs;
    const to = localToUtc(zone, { year: m === 12 ? y + 1 : y, month: m === 12 ? 1 : m + 1, day: 1, hour: 0, minute: 0 }).utcMs;
    const expected = Math.round((to - from) / Q);
    return { month: k, share: counts.get(k) / expected, fromMs: from, toMs: to };
  });
}

const nextMonth = (k) => { const [y, m] = k.split('-').map(Number); return m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, '0')}`; };

/**
 * Which data period the file meets: 12 consecutive months, each with at least
 * 95% of its intervals, or at least 30 consecutive days with no gap over an
 * hour. Says which, or why neither.
 * @param {{startMs: Float64Array, kwh: Float64Array, intervalMinutes: number}} s 15-minute series
 * @param {string} zone
 */
export function sufficiency(s, zone) {
  const months = monthCoverage(s, zone);
  const short = months.filter((m) => m.share < 0.95);
  // The latest run of 12 qualifying calendar months in a row.
  let run = [];
  let best = null;
  for (const m of months) {
    run = m.share >= 0.95 && run.length && nextMonth(run.at(-1).month) === m.month ? [...run, m] : m.share >= 0.95 ? [m] : [];
    if (run.length >= 12) best = run.slice(-12);
  }
  if (best) return { status: 'ok', period: '12-month', fromMs: best[0].fromMs, toMs: best[11].toMs, from: best[0].month, to: best[11].month, short: short.map((m) => m.month) };
  // The longest stretch whose gaps are each an hour or less.
  let start = 0;
  let longest = { from: 0, to: -1 };
  for (let i = 1; i <= s.startMs.length; i++) {
    if (i === s.startMs.length || s.startMs[i] - s.startMs[i - 1] - Q > 3_600_000) {
      if (s.startMs[i - 1] - s.startMs[start] > s.startMs[longest.to] - s.startMs[longest.from] || longest.to < 0) longest = { from: start, to: i - 1 };
      start = i;
    }
  }
  const spanDays = longest.to >= 0 ? (s.startMs[longest.to] + Q - s.startMs[longest.from]) / DAY : 0;
  if (spanDays >= 30) return { status: 'ok', period: '30-day', fromMs: s.startMs[longest.from], toMs: s.startMs[longest.to] + Q, days: Math.floor(spanDays), short: short.map((m) => m.month) };
  const why = months.length >= 12
    ? `It covers ${months.length} months, but ${short.map((m) => `${m.month} (${Math.floor(m.share * 100)}%)`).join(', ')} ${short.length === 1 ? 'has' : 'have'} less than 95% of ${short.length === 1 ? 'its' : 'their'} intervals, and it has no 30 days in a row without a gap over an hour.`
    : `It has ${Math.floor(spanDays)} days of 15-minute data in a row without a gap over an hour. At least 30 days of 15-minute data, or 12 months, are needed.`;
  return { status: 'refused', reason: why, short: short.map((m) => m.month) };
}

/** The highest 15-minute demand in [fromMs, toMs), with when it began. */
export function maxDemand(s, fromMs, toMs) {
  let kw = -Infinity;
  let atMs = NaN;
  for (let i = 0; i < s.startMs.length; i++) {
    if (s.startMs[i] < fromMs || s.startMs[i] >= toMs) continue;
    const v = s.kwh[i] * 4;
    if (v > kw) { kw = v; atMs = s.startMs[i]; }
  }
  return { kw, atMs };
}

/**
 * Headroom on the service: demand in kVA at the power factor, times 125%, in
 * amps at the service voltage and phase, subtracted from the rating.
 * @param {{maxKw: number, powerFactor: number, volts: number, phase: 1 | 3, ratingA: number}} p
 */
export function headroom({ maxKw, powerFactor, volts, phase, ratingA }) {
  const k = phase === 3 ? Math.sqrt(3) * volts : volts;
  const kva = maxKw / powerFactor;
  const kva125 = kva * 1.25;
  const amps = (kva125 * 1000) / k;
  const headroomA = ratingA - amps;
  return { kva, kva125, amps, headroomA, headroomKva: (headroomA * k) / 1000, fits: headroomA >= 0 };
}

/** Whether the measured-demand figure may be used at a site with generation or peak shaving. */
export function generationRule(period, hasGeneration) {
  if (!hasGeneration) return { allowed: true };
  return period === '30-day'
    ? { allowed: false, reason: 'The cited section does not allow the 30-day option when the service has solar, wind, or any peak shaving. Ask the authority having jurisdiction how to size the service.' }
    : { allowed: true, note: 'This site has generation or peak shaving, which lowers the demand the meter sees. The cited section limits only the 30-day option, but the inspector may still ask for a calculated load.' };
}
