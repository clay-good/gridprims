// A new load added to a meter file (add-electrification-tools: added-load):
// a shape file of kW or kWh, or a schedule of kW by hour, aligned to the
// meter's intervals with every step listed in a receipt, and the combined
// load's monthly peaks before and after.

import { localToUtc, utcToLocal } from '../../parsers/time.mjs';
import { parseDelimited } from '../../parsers/delimited.mjs';

const HOUR = 3_600_000;
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

/** The zone's standard-time offset in minutes in a year: the smaller of January's and July's, as in every US zone. */
function standardOffset(zone, year) {
  return Math.min(utcToLocal(zone, Date.UTC(year, 0, 1)).offsetMinutes, utcToLocal(zone, Date.UTC(year, 6, 1)).offsetMinutes);
}

/** A timestamp as UTC milliseconds, read on the stated basis. */
function stamp(text, zone, basis) {
  const t = String(text).trim();
  if (/[zZ]$|[+-]\d{2}:?\d{2}$/.test(t)) return Date.parse(t);
  const m = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{1,2}):(\d{2})/.exec(t);
  if (!m) return NaN;
  const f = { year: +m[1], month: +m[2], day: +m[3], hour: +m[4], minute: +m[5] };
  if (basis === 'utc') return Date.UTC(f.year, f.month - 1, f.day, f.hour, f.minute);
  if (basis === 'standard') return Date.UTC(f.year, f.month - 1, f.day, f.hour, f.minute) - standardOffset(zone, f.year) * 60_000;
  const r = localToUtc(zone, f);
  return r.status === 'ok' ? r.utcMs : r.status === 'repeat' ? r.earlier : NaN;
}

/**
 * Read a shape file: a timestamp column and a kW or kWh column. The unit comes
 * from the header when it names one, otherwise from `unit`.
 * @param {string} text
 * @param {{zone: string, basis: 'prevailing' | 'standard' | 'utc', unit?: 'kW' | 'kWh'}} o
 */
export function readShape(text, { zone, basis, unit }) {
  const rows = parseDelimited(text).rows.filter((r) => r.some((c) => String(c).trim()));
  if (rows.length < 3) return { status: 'refused', reason: 'The shape file needs a header and at least two rows.' };
  const header = rows[0].map((h) => String(h).toLowerCase());
  const valueCol = header.findIndex((h) => /\bkwh?\b|kw\)|kwh\)/.test(h));
  const col = valueCol >= 0 ? valueCol : 1;
  const named = valueCol >= 0 ? (/kwh/.test(header[valueCol]) ? 'kWh' : 'kW') : null;
  const u = named ?? unit;
  if (!u) return { status: 'refused', reason: 'The header does not say kW or kWh; choose the unit.' };
  const pts = [];
  const bad = [];
  rows.slice(1).forEach((r, i) => {
    const ms = stamp(r[0], zone, basis);
    const v = Number(String(r[col]).replace(/,/g, ''));
    if (Number.isNaN(ms) || !Number.isFinite(v)) bad.push(i + 2); else pts.push({ ms, v });
  });
  if (bad.length) return { status: 'refused', reason: `Rows ${bad.slice(0, 5).join(', ')}${bad.length > 5 ? ', …' : ''} have no readable time or value.` };
  pts.sort((a, b) => a.ms - b.ms);
  const diffs = pts.slice(1).map((p, i) => p.ms - pts[i].ms).sort((a, b) => a - b);
  const step = diffs[Math.floor(diffs.length / 2)];
  const stepMin = step / 60_000;
  const toKw = u === 'kWh' ? 60 / stepMin : 1;
  const gaps = [];
  for (let i = 1; i < pts.length; i++) if (pts[i].ms - pts[i - 1].ms > step) gaps.push({ fromMs: pts[i - 1].ms + step, hours: (pts[i].ms - pts[i - 1].ms - step) / HOUR });
  const steps = [
    `Read ${pts.length.toLocaleString('en-US')} ${stepMin === 60 ? 'hourly' : `${stepMin}-minute`} values in ${u}${named ? ' (from the header)' : ''}, stamped in ${basis === 'utc' ? 'UTC' : basis === 'standard' ? 'local standard time, shifted to prevailing time' : 'local prevailing time'}.`,
    ...(u === 'kWh' ? [`Converted kWh to kW: each value × ${+(60 / stepMin).toFixed(4)}.`] : []),
    ...(gaps.length ? [`${gaps.length} gap${gaps.length > 1 ? 's' : ''} in the shape, ${+gaps.reduce((n, g) => n + g.hours, 0).toFixed(2)} hours in all, treated as no added load.`] : []),
  ];
  // A gap is no added load: zeros fill it, so it counts as zero however the shape is aligned.
  const points = [];
  for (let i = 0; i < pts.length; i++) {
    if (i && pts[i].ms - pts[i - 1].ms > step) for (let ms = pts[i - 1].ms + step; ms < pts[i].ms; ms += step) points.push({ ms, kw: 0 });
    points.push({ ms: pts[i].ms, kw: pts[i].v * toKw });
  }
  return { status: 'ok', points, stepMs: step, steps, gaps };
}

/**
 * A schedule of kW by hour of day: one line of 24 values for every month, or
 * 12 lines, January to December.
 */
export function readSchedule(text) {
  const lines = String(text).split('\n').map((l) => l.trim()).filter(Boolean).map((l) => l.split(/[\s,;]+/).map(Number));
  if (!(lines.length === 1 || lines.length === 12) || lines.some((l) => l.length !== 24 || l.some((v) => !Number.isFinite(v)))) return { status: 'refused', reason: 'Enter 24 kW values, midnight to 11 pm, on one line for every month or on 12 lines, January to December.' };
  return { status: 'ok', byMonth: lines.length === 12 ? lines : Array(12).fill(lines[0]), steps: [lines.length === 12 ? 'A schedule of kW by hour for each month.' : 'A schedule of kW by hour, the same every month.'] };
}

/** kWh a schedule adds in each meter interval, by the interval's local month and hour. */
export function alignSchedule(meter, sched, zone) {
  const h = meter.intervalMinutes / 60;
  const added = Float64Array.from(meter.startMs, (ms) => { const l = utcToLocal(zone, ms); return sched.byMonth[l.month - 1][l.hour] * h; });
  return { added, steps: [...sched.steps, `Applied each hour's kW to the file's ${meter.intervalMinutes}-minute intervals in local prevailing time.`] };
}

/**
 * kWh a shape adds in each meter interval. A shape covering the file's dates
 * is matched by time, integrating its kW over each interval, so energy is
 * preserved at any pair of resolutions. Otherwise, as for a shape from
 * another year, its average kW by month, weekday, and hour is applied.
 */
export function alignShape(meter, shape, zone) {
  const m = meter.intervalMinutes * 60_000;
  const first = meter.startMs[0];
  const end = meter.startMs[meter.startMs.length - 1] + m;
  const p = shape.points;
  const covers = p[0].ms <= first && p[p.length - 1].ms + shape.stepMs >= end;
  const added = new Float64Array(meter.startMs.length);
  const steps = [...shape.steps];
  if (covers) {
    let j = 0;
    for (let i = 0; i < meter.startMs.length; i++) {
      const a = meter.startMs[i];
      const b = a + m;
      while (j > 0 && p[j].ms > a) j--;
      while (j < p.length && p[j].ms + shape.stepMs <= a) j++;
      let kwh = 0;
      for (let k = j; k < p.length && p[k].ms < b; k++) kwh += p[k].kw * (Math.min(b, p[k].ms + shape.stepMs) - Math.max(a, p[k].ms)) / HOUR;
      added[i] = kwh;
    }
    const sMin = shape.stepMs / 60_000;
    steps.push(sMin > meter.intervalMinutes
      ? `Matched by time: each ${sMin === 60 ? 'hour' : `${sMin}-minute value`}'s kW applies to its ${sMin / meter.intervalMinutes} ${meter.intervalMinutes}-minute intervals.`
      : sMin < meter.intervalMinutes ? `Matched by time: the shape's ${sMin}-minute values are averaged into each ${meter.intervalMinutes}-minute interval.` : 'Matched by time, interval for interval.');
    return { added, steps };
  }
  // Average kW by month, weekday, and hour, in local prevailing time.
  const sums = new Map();
  for (const pt of p) {
    const l = utcToLocal(zone, pt.ms);
    const k = `${l.month}|${new Date(Date.UTC(l.year, l.month - 1, l.day)).getUTCDay()}|${l.hour}`;
    const s = sums.get(k) ?? sums.set(k, { kw: 0, n: 0 }).get(k);
    s.kw += pt.kw;
    s.n++;
  }
  let missing = 0;
  for (let i = 0; i < meter.startMs.length; i++) {
    const l = utcToLocal(zone, meter.startMs[i]);
    const s = sums.get(`${l.month}|${new Date(Date.UTC(l.year, l.month - 1, l.day)).getUTCDay()}|${l.hour}`);
    if (!s) { missing++; continue; }
    added[i] = (s.kw / s.n) * (meter.intervalMinutes / 60);
  }
  const years = [...new Set(p.map((pt) => utcToLocal(zone, pt.ms).year))];
  steps.push(`The shape (${years.join(', ')}) does not cover this file's dates, so its average kW for each month, weekday, and hour is applied to the file's ${meter.intervalMinutes}-minute intervals.`);
  if (missing) steps.push(`${missing.toLocaleString('en-US')} intervals fall in a month, weekday, and hour the shape has no value for; they get no added load.`);
  return { added, steps };
}

/** Monthly peaks before and after, and whether the annual peak moved season. */
export function combined(meter, added, zone) {
  const h = meter.intervalMinutes / 60;
  const months = new Map();
  for (let i = 0; i < meter.startMs.length; i++) {
    const l = utcToLocal(zone, Math.floor(meter.startMs[i] / HOUR) * HOUR);
    const k = `${l.year}-${String(l.month).padStart(2, '0')}`;
    const mo = months.get(k) ?? months.set(k, { month: k, beforeKw: 0, afterKw: 0, beforeKwh: 0, afterKwh: 0 }).get(k);
    mo.beforeKw = Math.max(mo.beforeKw, meter.kwh[i] / h);
    mo.afterKw = Math.max(mo.afterKw, (meter.kwh[i] + added[i]) / h);
    mo.beforeKwh += meter.kwh[i];
    mo.afterKwh += meter.kwh[i] + added[i];
  }
  const list = [...months.values()].sort((a, b) => a.month.localeCompare(b.month));
  const top = (k) => list.reduce((a, b) => (b[k] > a[k] ? b : a));
  const season = (k) => ([12, 1, 2].includes(+k.slice(5)) ? 'winter' : [6, 7, 8].includes(+k.slice(5)) ? 'summer' : 'spring or fall');
  const before = top('beforeKw');
  const after = top('afterKw');
  const moved = season(before.month) !== season(after.month);
  return {
    months: list,
    before: { month: before.month, kw: before.beforeKw },
    after: { month: after.month, kw: after.afterKw },
    moved: moved ? `The annual peak moved to ${season(after.month)}: from ${MONTHS[+before.month.slice(5) - 1]} to ${MONTHS[+after.month.slice(5) - 1]}.` : null,
    series: { ...meter, kwh: Float64Array.from(meter.kwh, (k, i) => k + added[i]) },
  };
}
