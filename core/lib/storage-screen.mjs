// Would a battery or solar pay off here? (add-load-and-bill-analyzer:
// storage-and-solar-screen, tasks 6.1 to 6.4.) Monthly threshold peak shaving
// with perfect foresight (design D4), a PVWatts hourly export aligned to the
// meter's year, net load, savings from the bill engine, and simple payback.
// Every assumption is a parameter and is reported with the result.

import { utcToLocal, offsetMinutes } from '../../parsers/time.mjs';
import { intervalBills } from './interval-bill.mjs';

export const DEFAULTS = { roundTrip: 0.85, socMin: 0.1, socMax: 0.9 };
export const EXCLUDED = ['auxiliary load', 'forecast error (dispatch here sees the future)', 'export rules', 'interconnection limits', 'incentives'];
export const UPPER_BOUND = 'Savings assume perfect foresight, so they are an upper bound: real-world savings are typically lower because dispatch cannot see the future.';

/**
 * Can a battery hold demand at or below a threshold through these intervals? Starts full; discharges above the
 * threshold (up to its power), recharges below it without exceeding it; losses are taken on charging.
 * @returns {{ok: boolean, kwh: Float64Array, discharged: number, charged: number}}
 */
function hold(kw, hours, threshold, b) {
  const usable = b.energyKwh * (b.socMax - b.socMin);
  let soc = usable;
  const out = new Float64Array(kw.length);
  let discharged = 0;
  let charged = 0;
  for (let i = 0; i < kw.length; i++) {
    if (kw[i] > threshold) {
      const need = kw[i] - threshold;
      if (need > b.powerKw + 1e-9 || need * hours > soc + 1e-9) return { ok: false };
      soc -= need * hours;
      discharged += need * hours;
      out[i] = threshold * hours;
    } else {
      // Grid energy into the battery is limited by power, headroom to the threshold, and room in the battery.
      const grid = Math.min(b.powerKw, threshold - kw[i], (usable - soc) / b.roundTrip / hours);
      soc += grid * hours * b.roundTrip;
      charged += grid * hours;
      out[i] = (kw[i] + grid) * hours;
    }
  }
  return { ok: true, kwh: out, discharged, charged };
}

/**
 * Monthly threshold peak shaving: for each month, the lowest threshold the battery can hold (binary search,
 * 40 steps or 0.1 kW), and the new series.
 * @param {{startMs: Float64Array, kwh: Float64Array, intervalMinutes: number}} s
 * @param {{powerKw: number, energyKwh: number, roundTrip?: number, socMin?: number, socMax?: number}} battery
 * @param {string} zone
 */
export function peakShave(s, battery, zone) {
  const b = { ...DEFAULTS, ...battery };
  const hours = s.intervalMinutes / 60;
  const months = new Map();
  for (let i = 0; i < s.startMs.length; i++) {
    const l = utcToLocal(zone, Math.floor(s.startMs[i] / 3_600_000) * 3_600_000);
    const key = `${l.year}-${String(l.month).padStart(2, '0')}`;
    (months.get(key) ?? months.set(key, []).get(key)).push(i);
  }
  const kwh = Float64Array.from(s.kwh);
  const result = [];
  let discharged = 0;
  for (const [month, idx] of [...months].sort()) {
    const kw = Float64Array.from(idx, (i) => s.kwh[i] / hours);
    const peak = Math.max(...kw);
    let lo = Math.max(0, peak - b.powerKw);
    let hi = peak;
    if (hold(kw, hours, lo, b).ok) hi = lo;
    for (let k = 0; k < 40 && hi - lo > 0.1; k++) {
      const mid = (lo + hi) / 2;
      if (hold(kw, hours, mid, b).ok) hi = mid; else lo = mid;
    }
    const r = hold(kw, hours, hi, b);
    idx.forEach((i, k) => { kwh[i] = r.kwh[k]; });
    discharged += r.discharged;
    const cut = peak - hi;
    // What limited it: power when the cut reached the battery's power, otherwise energy.
    const limit = cut >= b.powerKw - 0.1 ? 'power' : 'energy';
    result.push({ month, peakKw: peak, newPeakKw: hi, cutKw: cut, limit, dischargedKwh: r.discharged, chargedKwh: r.charged, lossKwh: r.charged - r.discharged });
  }
  const usable = b.energyKwh * (b.socMax - b.socMin);
  return {
    months: result, series: { ...s, kwh }, assumptions: b,
    cycles: usable ? discharged / usable : 0,
    limitText: result.some((m) => m.limit === 'energy') ? 'Energy, not power, limited savings in at least one month: the battery ran out before the peak ended.' : 'Power limited savings: a larger inverter would cut the peaks further.',
  };
}


/**
 * Read a PVWatts hourly export (the v8 API's CSV, or the calculator's download): 8,760 hours of AC output in
 * local standard time, with the system size when the file states it.
 * @param {string} text
 * @returns {{status: 'ok', kw: Float64Array, systemKw: number | null, tzHours: number | null} | {status: 'refused', reason: string}}
 */
export function readPvwatts(text) {
  const lines = text.split(/\r?\n/);
  const meta = {};
  let header = -1;
  for (let i = 0; i < lines.length; i++) {
    const cells = lines[i].split(',').map((c) => c.replace(/^"|"$/g, '').trim());
    if (/^month$/i.test(cells[0]) && /^day$/i.test(cells[1]) && /^hour$/i.test(cells[2])) { header = i; break; }
    if (cells.length >= 2) meta[cells[0].toLowerCase()] = cells[1];
  }
  if (header < 0) return { status: 'refused', reason: 'This does not look like a PVWatts hourly export: no Month, Day, Hour header.' };
  const cols = lines[header].split(',').map((c) => c.replace(/^"|"$/g, '').trim());
  const ac = cols.findIndex((c) => /^ac system output/i.test(c));
  if (ac < 0) return { status: 'refused', reason: 'The export has no AC system output column.' };
  const watts = /\(w|\(wac/i.test(cols[ac]);
  const kw = [];
  for (const line of lines.slice(header + 1)) {
    if (!line.trim()) continue;
    const c = line.split(',');
    if (c.length <= ac) continue;
    const v = Number(c[ac]);
    if (!Number.isFinite(v)) continue;
    kw.push(Math.max(0, watts ? v / 1000 : v));
  }
  if (kw.length !== 8760) return { status: 'refused', reason: `A PVWatts hourly export has 8,760 hours; this one has ${kw.length.toLocaleString('en-US')}.` };
  const size = Number(meta.system_capacity ?? meta['dc system size (kw)']);
  const tz = Number(meta.tz ?? meta['time zone']);
  return { status: 'ok', kw: Float64Array.from(kw), systemKw: Number.isFinite(size) ? size : null, tzHours: Number.isFinite(tz) ? tz : null };
}

/**
 * Solar on the meter's timeline: each interval takes the typical year's output for the same month, day, and
 * standard-time hour (summer hours shift to prevailing time; February 29 repeats February 28), scaled to
 * the system size the user chose.
 * @param {{startMs: Float64Array, intervalMinutes: number}} s
 * @param {{kw: Float64Array, systemKw: number | null}} pv
 * @param {{zone: string, systemKw?: number}} opts
 */
export function alignSolar(s, pv, { zone, systemKw }) {
  const scale = systemKw && pv.systemKw ? systemKw / pv.systemKw : 1;
  const hours = s.intervalMinutes / 60;
  const start = Date.UTC(2023, 0, 1); // a non-leap year for day-of-year
  const kwh = new Float64Array(s.startMs.length);
  let leapDay = false;
  let dst = false;
  for (let i = 0; i < s.startMs.length; i++) {
    const ms = s.startMs[i];
    // Standard time: prevailing time less any daylight-saving hour.
    const jan = offsetMinutes(zone, Date.UTC(new Date(ms).getUTCFullYear(), 0, 1));
    const shift = offsetMinutes(zone, ms) - jan;
    if (shift) dst = true;
    const l = utcToLocal(zone, Math.floor((ms - shift * 60_000) / 3_600_000) * 3_600_000);
    let { month, day } = l;
    if (month === 2 && day === 29) { day = 28; leapDay = true; }
    const hourOfYear = Math.round((Date.UTC(2023, month - 1, day) - start) / 3_600_000) + l.hour;
    kwh[i] = pv.kw[hourOfYear] * scale * hours;
  }
  const notes = ['Solar hours are matched by month, day, and standard-time hour from the PVWatts typical year.'];
  if (dst) notes.push('Summer hours are shifted to daylight-saving time to match the meter.');
  if (leapDay) notes.push('February 28 is repeated for February 29.');
  if (scale !== 1) notes.push(`Production is scaled from the export's ${pv.systemKw} kW DC to ${systemKw} kW DC.`);
  return { kwh, notes, scale };
}

/** Net load: what the grid delivers, and the solar exported, never netted against each other. */
export function netLoad(s, solarKwh) {
  const delivered = new Float64Array(s.kwh.length);
  const exported = new Float64Array(s.kwh.length);
  for (let i = 0; i < s.kwh.length; i++) {
    const n = s.kwh[i] - solarKwh[i];
    if (n >= 0) delivered[i] = n; else exported[i] = -n;
  }
  return { delivered: { ...s, kwh: delivered }, received: { ...s, channel: 'received', kwh: exported } };
}

/**
 * What the change saves on a tariff record: demand and energy, from the bill engine before and after.
 * @param {any} before series
 * @param {any} after {delivered, received?}
 * @param {any} rec tariff record
 */
export function savings(before, after, rec, { zone }) {
  const a = intervalBills(before, rec, { zone }).months;
  const b = intervalBills(after.delivered, rec, { zone, received: after.received }).months;
  const sum = (months, kind) => months.reduce((n, m) => n + m.lines.filter((l) => !kind || l.kind === kind).reduce((x, l) => x + l.amount, 0), 0);
  const r2 = (x) => Math.round(x * 100) / 100;
  const demand = r2(sum(a, 'demand') - sum(b, 'demand'));
  const energy = r2(sum(a, 'energy') - sum(b, 'energy'));
  const total = r2(a.reduce((n, m) => n + m.total, 0) - b.reduce((n, m) => n + m.total, 0));
  // Peaks after 6 pm: solar cannot reach them, so its demand savings are small.
  const lateMonths = b.filter((m) => m.billingDemand?.setting && utcToLocal(zone, m.billingDemand.setting).hour >= 18).length;
  const limits = [];
  if (rec.demand || rec.ratchet || rec.unmodeled.includes('coincident demand charge')) limits.push('This tariff has time-of-use demand, a ratchet, or a coincident charge, so this result is a screen, not an upper bound. REopt can find an optimized dispatch.');
  return { demand, energy, total, lateMonths, months: a.length, limits };
}

/** Simple payback in years to 0.1, or null with a prompt when no cost is entered. */
export function payback(installedCost, annualSavings) {
  if (!(installedCost > 0)) return { years: null, prompt: 'Enter an installed cost to see the payback. NLR\'s Annual Technology Baseline lists typical cost ranges.', atbUrl: 'https://atb.nlr.gov/' };
  if (!(annualSavings > 0)) return { years: null, prompt: 'With no annual savings, it does not pay back.' };
  return { years: Math.round((installedCost / annualSavings) * 10) / 10 };
}
