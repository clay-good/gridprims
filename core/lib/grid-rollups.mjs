// Daily and monthly rollups of EIA-930's hourly snapshot (add-public-grid-data
// task 1.2): each local day's peak demand and energy, and each month's energy,
// peak, generation by fuel, and net interchange, for the balancing authority
// pages and the grid pulse. Days are local dates in the zone EIA reports the
// region in, as EIA's own daily values are.

import { utcToLocal } from '../../parsers/time.mjs';

const HOUR = 3_600_000;
export const FUELS = ['col', 'ng', 'nuc', 'oil', 'geo', 'wat', 'ps', 'sun', 'snb', 'wnd', 'wnb', 'bat', 'oes', 'ues', 'oth', 'unk'];
const pad = (n) => String(n).padStart(2, '0');

/** The local date of each UTC hour, looked up once per zone and hour: many regions share a zone. */
const cache = new Map();
function dater(zone) {
  const z = cache.get(zone) ?? cache.set(zone, new Map()).get(zone);
  return (hour) => {
    let d = z.get(hour);
    if (!d) { const l = utcToLocal(zone, hour * HOUR); d = { date: `${l.year}-${pad(l.month)}-${pad(l.day)}`, month: `${l.year}-${pad(l.month)}` }; z.set(hour, d); }
    return d;
  };
}

/** A day with demand in 23 hours or more (a daylight-saving day has 23): partial days are left out of charts and the pulse. */
export const complete = (d) => d.hours >= 23;

/**
 * A single-hour spike, left out of the peaks and kept in the energy as EIA published it. EIA's files hold such
 * hours: PJM at 224,345 MW for one hour on July 13, 2020 between hours near 125,000 MW, and TVA at 44,377 MW on
 * October 20, 2026 between hours near 17,600 MW, its generation spiking with it. An hour (over 50 MW) is a
 * spike when it is more than 1.5 times both neighbors, or more than 1.15 times both and off by more than 10%
 * from EIA's own balance, net generation minus interchange (or with no balance to check). The balance alone
 * cannot decide: some regions (Bonneville) never meet it, and a spike in both demand and generation meets it.
 */
export function isSpike(prev, r, next) {
  if (!(prev?.demand != null && next?.demand != null && r.demand > 50)) return false;
  const ratio = r.demand / Math.max(prev.demand, next.demand);
  if (ratio > 1.5) return true;
  if (ratio <= 1.15) return false;
  if (r.net_generation == null || r.interchange == null) return true;
  return Math.abs(r.demand - (r.net_generation - r.interchange)) > 0.1 * r.demand;
}

/**
 * Each local day's peak hourly demand (MW, as MWh in an hour) and energy (MWh), over the hours with a demand
 * value; single-hour spikes are counted and left out of the peak.
 * @param {Iterable<any>} rows EIA-930 shard rows, any order @param {string} zone
 * @returns {Array<{date: string, peakMw: number, peakHour: number, energyMwh: number, hours: number, spikes: number}>}
 */
export function dailyRollup(rows, zone) {
  const local = dater(zone);
  const days = new Map();
  const byHour = new Map();
  for (const r of rows) if (r.demand !== null && r.demand !== undefined) byHour.set(r.hour, r);
  for (const r of byHour.values()) {
    const { date } = local(r.hour);
    const d = days.get(date) ?? days.set(date, { date, peakMw: -Infinity, peakHour: null, energyMwh: 0, hours: 0, spikes: 0 }).get(date);
    d.energyMwh += r.demand;
    d.hours++;
    if (isSpike(byHour.get(r.hour - 1), r, byHour.get(r.hour + 1))) { d.spikes++; continue; }
    if (r.demand > d.peakMw || (r.demand === d.peakMw && r.hour < d.peakHour)) { d.peakMw = r.demand; d.peakHour = r.hour; }
  }
  return [...days.values()].sort((a, b) => (a.date < b.date ? -1 : 1));
}

/**
 * Each local month's demand energy and peak, net generation by fuel, and net interchange (MWh; positive is a net
 * outflow). A fuel EIA reported no value for in the month is left out, never shown as zero.
 * @param {Iterable<any>} rows @param {string} zone
 */
export function monthlyRollup(rows, zone) {
  const local = dater(zone);
  const months = new Map();
  for (const r of rows) {
    const { month } = local(r.hour);
    const m = months.get(month) ?? months.set(month, { month, energyMwh: 0, peakMw: null, hours: 0, interchangeMwh: 0, generation: {} }).get(month);
    if (r.demand !== null && r.demand !== undefined) {
      m.energyMwh += r.demand;
      m.hours++;
      if (m.peakMw === null || r.demand > m.peakMw) m.peakMw = r.demand;
    }
    if (r.interchange !== null && r.interchange !== undefined) m.interchangeMwh += r.interchange;
    for (const f of FUELS) {
      const v = r[`gen_${f}`];
      if (v !== null && v !== undefined) m.generation[f] = (m.generation[f] ?? 0) + v;
    }
  }
  return [...months.values()].sort((a, b) => (a.month < b.month ? -1 : 1));
}

/** The highest daily peak in a rollup, with the period searched. */
export function recordPeak(days) {
  if (!days.length) return null;
  const top = days.reduce((a, b) => (b.peakMw > a.peakMw ? b : a));
  return { mw: top.peakMw, date: top.date, hour: top.peakHour, from: days[0].date, to: days.at(-1).date };
}

/**
 * Hourly demand summed across regions, for the lower 48 total. Regions join and leave over the years, so an
 * hour counts only when as many regions report demand as in that UTC month's most complete hour: a gap in
 * one region never shows as a dip in the total.
 * @param {Array<Iterable<any>>} regions rows per region
 */
export function sumDemand(regions) {
  const sums = new Map();
  for (const rows of regions) for (const r of rows) {
    if (r.demand === null || r.demand === undefined) continue;
    const s = sums.get(r.hour) ?? sums.set(r.hour, { n: 0, mw: 0 }).get(r.hour);
    s.n++;
    s.mw += r.demand;
  }
  const month = (hour) => new Date(hour * HOUR).toISOString().slice(0, 7);
  const full = new Map();
  for (const [hour, s] of sums) full.set(month(hour), Math.max(full.get(month(hour)) ?? 0, s.n));
  return [...sums].filter(([hour, s]) => s.n === full.get(month(hour))).map(([hour, s]) => ({ hour, demand: s.mw })).sort((a, b) => a.hour - b.hour);
}
