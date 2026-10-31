// What would last year have cost on a different rate? (add-load-and-bill-
// analyzer: tariff-comparison.) The loaded intervals re-priced on every rate
// the load is eligible for, ranked by annual cost (the sum of the bill
// engine's monthly totals), with the difference from the current rate split
// into fixed, energy, and demand, a one-sentence driver, the rates the load
// is not eligible for and why, a note on how current the rate data is, and a
// load-shift what-if.

import { intervalBills } from './interval-bill.mjs';
import { utcToLocal } from '../../parsers/time.mjs';

const money = (x) => `$${Math.abs(x).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
const kw = (x) => `${Math.round(x).toLocaleString('en-US')} kW`;
const round2 = (x) => Math.round(x * 100) / 100;

/**
 * Why a load is not eligible for a rate, from the limits URDB states; null when it is.
 * @param {any} rec a tariff record
 * @param {{peakKw: number, minMonthPeakKw: number, maxMonthKwh: number, minMonthKwh: number}} load
 */
export function ineligibility(rec, load) {
  const e = rec.eligibility ?? {};
  if (e.demandMinKw && load.peakKw < e.demandMinKw) return `requires peak demand of at least ${kw(e.demandMinKw)}; your load peaks at ${kw(load.peakKw)}`;
  if (e.demandMaxKw && load.peakKw > e.demandMaxKw) return `allows peak demand up to ${kw(e.demandMaxKw)}; your load peaks at ${kw(load.peakKw)}`;
  if (e.energyMinKwh && load.minMonthKwh < e.energyMinKwh) return `requires at least ${Math.round(e.energyMinKwh).toLocaleString('en-US')} kWh a month; your lowest month is ${Math.round(load.minMonthKwh).toLocaleString('en-US')} kWh`;
  if (e.energyMaxKwh && load.maxMonthKwh > e.energyMaxKwh) return `allows up to ${Math.round(e.energyMaxKwh).toLocaleString('en-US')} kWh a month; your highest month is ${Math.round(load.maxMonthKwh).toLocaleString('en-US')} kWh`;
  return null;
}

/** Fixed, energy, and demand totals for a year of monthly bills (minimum-bill top-ups count as fixed). */
function components(months) {
  const c = { fixed: 0, energy: 0, demand: 0 };
  for (const m of months) for (const l of m.lines) c[l.kind === 'minimum' ? 'fixed' : l.kind] = (c[l.kind === 'minimum' ? 'fixed' : l.kind] ?? 0) + l.amount;
  return { fixed: round2(c.fixed), energy: round2(c.energy), demand: round2(c.demand) };
}

/** The share of energy in a rate's cheapest energy periods: its off-peak, when it has more than one period. */
function offPeakShare(rec, months) {
  if (!rec.energy || rec.energy.periods.length < 2) return null;
  const firstRate = (p) => p.tiers[0]?.rate ?? 0;
  const cheapest = Math.min(...rec.energy.periods.map(firstRate));
  const off = new Set(rec.energy.periods.map((p, i) => (firstRate(p) === cheapest ? i + 1 : null)).filter(Boolean));
  let total = 0;
  let offKwh = 0;
  for (const m of months) for (const l of m.lines) {
    if (l.kind !== 'energy') continue;
    total += l.quantity;
    const p = Number(/period (\d+)/.exec(l.label)?.[1] ?? 1);
    if (off.has(p)) offKwh += l.quantity;
  }
  return total ? offKwh / total : null;
}

/** One sentence on what drives a rate's difference from the current one. */
function driver(alt, current, rec) {
  const d = alt.annual - current.annual;
  if (Math.abs(d) < 0.5) return 'about the same cost as your current rate';
  const deltas = ['fixed', 'energy', 'demand'].map((k) => [k, alt.components[k] - current.components[k]]).sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]));
  const [k, v] = deltas[0];
  const word = d < 0 ? 'cheaper' : 'more expensive';
  if (k === 'energy' && alt.offPeakShare !== null && d < 0) return `${word} because ${Math.round(alt.offPeakShare * 100)}% of your energy falls in its off-peak periods`;
  if (k === 'energy') return `${word} mostly on energy: ${money(v)} ${v < 0 ? 'less' : 'more'} a year`;
  if (k === 'demand') return `${word} mostly on demand charges for your ${kw(alt.peakKw)} peak: ${money(v)} ${v < 0 ? 'less' : 'more'} a year`;
  return `${word} mostly on fixed charges: ${money(v)} ${v < 0 ? 'less' : 'more'} a year${rec.minimum ? ', including the minimum bill' : ''}`;
}

/**
 * @param {{startMs: Float64Array, kwh: Float64Array, intervalMinutes: number}} series delivered energy
 * @param {any[]} records the utility's tariff records for one customer class
 * @param {{zone: string, currentId?: string, received?: any, holidays?: boolean, asOf: string}} opts asOf is the rate data's date, YYYY-MM-DD
 */
export function compareRates(series, records, opts) {
  // The load's facts for eligibility, from the current or first rate's monthly bills.
  const probe = intervalBills(series, { ...records[0], flatDemand: { unit: 'kW', daily: false, periods: [{ tiers: [{ rate: 0 }] }], months: Array(12).fill(0) }, demand: null, ratchet: null, energy: null, fixed: null, minimum: null, unmodeled: [] }, { zone: opts.zone });
  const peaks = probe.months.map((m) => m.billingDemand?.metered ?? 0);
  const load = { peakKw: Math.max(...peaks), minMonthPeakKw: Math.min(...peaks), maxMonthKwh: Math.max(...probe.months.map((m) => m.kwh)), minMonthKwh: Math.min(...probe.months.map((m) => m.kwh)) };

  const priced = [];
  const notEligible = [];
  for (const rec of records) {
    const why = ineligibility(rec, load);
    // The current rate is always priced, with a note when the load is outside its stated limits.
    if (why && rec.id !== opts.currentId) { notEligible.push({ rec, reason: why }); continue; }
    const bills = intervalBills(series, rec, { zone: opts.zone, received: opts.received, holidays: opts.holidays });
    priced.push({ rec, months: bills.months, annual: round2(bills.months.reduce((n, m) => n + m.total, 0)), components: components(bills.months), offPeakShare: offPeakShare(rec, bills.months), peakKw: load.peakKw, unmodeled: rec.unmodeled, ...(why ? { outsideLimits: why } : {}) });
  }
  priced.sort((a, b) => a.annual - b.annual || a.rec.name.localeCompare(b.rec.name));
  const current = priced.find((p) => p.rec.id === opts.currentId) ?? null;
  for (const p of priced) {
    if (!current || p === current) continue;
    p.diff = round2(p.annual - current.annual);
    p.pct = current.annual ? Math.round((p.diff / current.annual) * 1000) / 10 : null;
    p.sentence = driver(p, current, p.rec);
  }

  // How current the rate data is: URDB is maintained by hand.
  const revised = records.map((r) => r.lastRevised ?? r.effective).filter(Boolean).sort();
  const newest = revised.at(-1) ?? null;
  const monthsOld = newest ? (Date.parse(opts.asOf) - Date.parse(newest)) / (30.44 * 86_400_000) : Infinity;
  const tariffPage = records.find((r) => (r.lastRevised ?? r.effective) === newest)?.source ?? null;
  return {
    ranked: priced, current, notEligible, load,
    data: {
      count: records.length, oldest: revised[0] ?? null, newest,
      stale: monthsOld > 24, tariffPage,
      note: 'The Utility Rate Database is maintained by hand and may contain errors; report one to OpenEI.',
      reportUrl: 'https://apps.openei.org/USURDB/',
    },
  };
}

/**
 * Move a constant kW from one daily window to another, conserving each day's energy: a load-shift what-if.
 * @param {{startMs: Float64Array, kwh: Float64Array, intervalMinutes: number}} series
 * @param {{kw: number, from: [number, number], to: [number, number], days: 'weekdays' | 'every day', zone: string}} shift hours, local, end exclusive
 */
export function shiftLoad(series, shift) {
  const out = Float64Array.from(series.kwh);
  const hours = series.intervalMinutes / 60;
  const byDay = new Map();
  for (let i = 0; i < series.startMs.length; i++) {
    const l = utcToLocal(shift.zone, series.startMs[i]);
    const wd = new Date(Date.UTC(l.year, l.month - 1, l.day)).getUTCDay();
    if (shift.days === 'weekdays' && (wd === 0 || wd === 6)) continue;
    const key = `${l.year}-${l.month}-${l.day}`;
    const d = byDay.get(key) ?? byDay.set(key, { from: [], to: [] }).get(key);
    const h = l.hour + l.minute / 60;
    if (h >= shift.from[0] && h < shift.from[1]) d.from.push(i);
    if (h >= shift.to[0] && h < shift.to[1]) d.to.push(i);
  }
  for (const d of byDay.values()) {
    if (!d.from.length || !d.to.length) continue;
    let moved = 0;
    for (const i of d.from) {
      const take = Math.min(out[i], shift.kw * hours);
      out[i] -= take;
      moved += take;
    }
    for (const i of d.to) out[i] += moved / d.to.length;
  }
  return { ...series, kwh: out };
}
