// What EV fleet charging does to a site's peak (add-electrification-tools:
// ev-fleet-charging): each vehicle group's daily dwell windows in local time
// (elapsed hours, so a fall-back night is an hour longer), unmanaged charging
// at full power from plug-in, and managed charging held under the lowest
// monthly threshold that still fills every vehicle, found by the same binary
// search as the storage screen.

import { localToUtc, utcToLocal } from '../../parsers/time.mjs';

const HOUR = 3_600_000;

/** "18:00" as hours and minutes. */
function clock(text) {
  const m = /^(\d{1,2}):(\d{2})$/.exec(String(text).trim());
  return m && +m[1] < 24 && +m[2] < 60 ? { hour: +m[1], minute: +m[2] } : null;
}

/** The UTC instant of a local wall time; in the spring-forward gap, the moment the clock jumps; in the repeat, the first. */
function at(zone, date, c) {
  const r = localToUtc(zone, { ...date, ...c });
  if (r.status === 'ok') return r.utcMs;
  if (r.status === 'repeat') return r.earlier;
  return localToUtc(zone, { ...date, hour: c.hour + 1, minute: 0 }).utcMs;
}

/**
 * Whether each vehicle can be filled in its dwell at full charger power.
 * @param {{count: number, kwhPerDay: number, chargerKw: number, plugIn: string, depart: string}} g
 * @param {number} dwellHours
 */
export function fit(g, dwellHours) {
  const maxKwh = g.chargerKw * dwellHours;
  return { maxKwh, perVehicleKwh: Math.min(g.kwhPerDay, maxKwh), shortfallKwh: Math.max(0, g.kwhPerDay - maxKwh) };
}

/** Clock hours from plug-in to departure, ignoring daylight saving: what the schedule says. */
export function dwellClockHours(g) {
  const a = clock(g.plugIn);
  const b = clock(g.depart);
  const h = (b.hour * 60 + b.minute - a.hour * 60 - a.minute) / 60;
  return h <= 0 ? h + 24 : h;
}

/**
 * Every charging session the series spans: one per group per operating day,
 * with its window in UTC and the energy it delivers.
 * @param {{startMs: Float64Array, intervalMinutes: number}} s
 * @param {Array<{count: number, kwhPerDay: number, chargerKw: number, plugIn: string, depart: string, days?: number[]}>} groups days: 0 Sunday to 6 Saturday; all days when absent
 * @param {string} zone
 */
export function sessions(s, groups, zone) {
  const first = s.startMs[0];
  const last = s.startMs[s.startMs.length - 1] + s.intervalMinutes * 60_000;
  const out = [];
  groups.forEach((g, gi) => {
    const plug = clock(g.plugIn);
    const dep = clock(g.depart);
    const overnight = dep.hour * 60 + dep.minute <= plug.hour * 60 + plug.minute;
    for (let ms = first - 24 * HOUR; ms < last; ms += 24 * HOUR) {
      const l = utcToLocal(zone, ms);
      const date = { year: l.year, month: l.month, day: l.day };
      const weekday = new Date(Date.UTC(l.year, l.month - 1, l.day)).getUTCDay();
      if (g.days && !g.days.includes(weekday)) continue;
      const next = new Date(Date.UTC(l.year, l.month - 1, l.day + (overnight ? 1 : 0)));
      const fromMs = at(zone, date, plug);
      const toMs = at(zone, { year: next.getUTCFullYear(), month: next.getUTCMonth() + 1, day: next.getUTCDate() }, dep);
      if (fromMs < first || toMs > last) continue; // only whole sessions inside the file
      const hours = (toMs - fromMs) / HOUR;
      const f = fit(g, hours);
      out.push({ group: gi, fromMs, toMs, hours, capKw: g.count * g.chargerKw, kwh: g.count * f.perVehicleKwh, shortfallKwh: g.count * f.shortfallKwh, month: `${l.year}-${String(l.month).padStart(2, '0')}` });
    }
  });
  return out.sort((a, b) => a.fromMs - b.fromMs);
}

/** The intervals a session overlaps, with the hours of overlap in each. */
function overlaps(s, ses) {
  const step = s.intervalMinutes * 60_000;
  const res = [];
  // The series is sorted; find the first interval that ends after the window opens.
  let lo = 0;
  let hi = s.startMs.length;
  while (lo < hi) { const mid = (lo + hi) >> 1; if (s.startMs[mid] + step <= ses.fromMs) lo = mid + 1; else hi = mid; }
  for (let i = lo; i < s.startMs.length && s.startMs[i] < ses.toMs; i++) {
    const h = (Math.min(s.startMs[i] + step, ses.toMs) - Math.max(s.startMs[i], ses.fromMs)) / HOUR;
    if (h > 0) res.push([i, h]);
  }
  return res;
}

/** Unmanaged: every vehicle at full power from plug-in until full. Returns added kWh per interval. */
export function unmanaged(s, list) {
  const added = new Float64Array(s.startMs.length);
  for (const ses of list) {
    let left = ses.kwh;
    for (const [i, h] of overlaps(s, ses)) {
      if (left <= 1e-9) break;
      const e = Math.min(left, ses.capKw * h);
      added[i] += e;
      left -= e;
    }
  }
  return added;
}

/** Can these sessions fill under a threshold, given what is already added? Earliest departure first, earliest intervals first. */
function fill(s, list, threshold, base) {
  const hoursOf = s.intervalMinutes / 60;
  const added = Float64Array.from(base);
  for (const ses of [...list].sort((a, b) => a.toMs - b.toMs)) {
    let left = ses.kwh;
    for (const [i, h] of overlaps(s, ses)) {
      if (left <= 1e-9) break;
      const roomKw = threshold - (s.kwh[i] + added[i]) / hoursOf;
      const e = Math.min(left, ses.capKw * h, Math.max(0, roomKw) * hoursOf);
      added[i] += e;
      left -= e;
    }
    if (left > 1e-6) return null;
  }
  return added;
}

/**
 * Managed: for each month in turn, the lowest threshold (binary search, 40
 * steps or 0.1 kW) under which every session starting that month still fills.
 * A session that ends the next morning carries into that month's intervals.
 */
export function managed(s, list) {
  const hoursOf = s.intervalMinutes / 60;
  let added = new Float64Array(s.startMs.length);
  const months = [...new Set(list.map((x) => x.month))].sort();
  for (const m of months) {
    const these = list.filter((x) => x.month === m);
    const idx = new Set(these.flatMap((x) => overlaps(s, x).map(([i]) => i)));
    const floor = Math.max(...[...idx].map((i) => (s.kwh[i] + added[i]) / hoursOf));
    let lo = floor;
    let hi = floor + Math.max(...these.map((x) => x.capKw));
    if (!fill(s, these, hi, added)) hi += Math.max(...these.map((x) => x.capKw)) * these.length;
    if (fill(s, these, lo, added)) hi = lo;
    for (let k = 0; k < 40 && hi - lo > 0.1; k++) {
      const mid = (lo + hi) / 2;
      if (fill(s, these, mid, added)) hi = mid; else lo = mid;
    }
    added = fill(s, these, hi, added) ?? unmanaged(s, these).map((e, i) => e + added[i]);
  }
  return added;
}

/** Monthly peaks of the building alone, with unmanaged charging, and with managed charging. */
export function monthlyPeaks(s, zone, unm, man) {
  const hoursOf = s.intervalMinutes / 60;
  const months = new Map();
  for (let i = 0; i < s.startMs.length; i++) {
    const l = utcToLocal(zone, Math.floor(s.startMs[i] / HOUR) * HOUR);
    const k = `${l.year}-${String(l.month).padStart(2, '0')}`;
    const m = months.get(k) ?? months.set(k, { month: k, buildingKw: 0, unmanagedKw: 0, managedKw: 0 }).get(k);
    m.buildingKw = Math.max(m.buildingKw, s.kwh[i] / hoursOf);
    m.unmanagedKw = Math.max(m.unmanagedKw, (s.kwh[i] + unm[i]) / hoursOf);
    m.managedKw = Math.max(m.managedKw, (s.kwh[i] + man[i]) / hoursOf);
  }
  return [...months.values()].sort((a, b) => a.month.localeCompare(b.month));
}

/**
 * The service check: the charging kW added at the site's maximum-demand time,
 * at 125% as a continuous load, against the service headroom in kVA.
 * @param {{startMs: Float64Array, kwh: Float64Array, intervalMinutes: number}} s
 * @param {Float64Array} added kWh per interval
 * @param {number} headroomKva
 */
export function serviceCheck(s, added, headroomKva) {
  const hoursOf = s.intervalMinutes / 60;
  let peak = -1;
  let at = 0;
  for (let i = 0; i < s.kwh.length; i++) if ((s.kwh[i] + added[i]) / hoursOf > peak) { peak = (s.kwh[i] + added[i]) / hoursOf; at = i; }
  const addedKw = added[at] / hoursOf;
  const continuousKw = addedKw * 1.25;
  return { atMs: s.startMs[at], addedKw, continuousKw, exceeds: continuousKw > headroomKva, flag: continuousKw > headroomKva ? 'likely needs a service upgrade; ask your electrician and utility' : null };
}

const DAY_SETS = { weekdays: [1, 2, 3, 4, 5], weekends: [0, 6], daily: null, 'every day': null };

/**
 * Vehicle groups typed one a line, as "10 vehicles, 120 kWh, 60 kW,
 * 18:00 to 06:00, weekdays". The days are optional (every day by default).
 * @returns {{groups: any[], errors: string[]}}
 */
export function parseGroups(text) {
  const groups = [];
  const errors = [];
  String(text).split('\n').map((l) => l.trim()).filter(Boolean).forEach((line, i) => {
    const count = /(\d+)\s*(?:vehicles?|buses|bus|cars?|trucks?|vans?|×|x\b)/i.exec(line);
    const kwh = /([\d.]+)\s*kwh/i.exec(line);
    const kw = /([\d.]+)\s*kw(?!h)/i.exec(line);
    const times = /(\d{1,2}:\d{2})\s*(?:to|-|–)\s*(\d{1,2}:\d{2})/i.exec(line);
    const days = Object.keys(DAY_SETS).find((d) => line.toLowerCase().includes(d));
    const missing = [!count && 'how many vehicles', !kwh && 'the kWh each needs a day', !kw && 'the charger kW', !times && 'the plug-in and departure times, as 18:00 to 06:00'].filter(Boolean);
    if (missing.length) { errors.push(`Line ${i + 1}: add ${missing.join(', ')}.`); return; }
    if (!clock(times[1]) || !clock(times[2])) { errors.push(`Line ${i + 1}: times are on a 24-hour clock, as 18:00.`); return; }
    groups.push({ count: Number(count[1]), kwhPerDay: Number(kwh[1]), chargerKw: Number(kw[1]), plugIn: times[1], depart: times[2], ...(days && DAY_SETS[days] ? { days: DAY_SETS[days] } : {}), label: line });
  });
  return { groups, errors };
}
