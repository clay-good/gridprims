// Bills from interval data (add-load-and-bill-analyzer: bill-explainer,
// tasks 3.2 and 3.3). Calendar billing months (design D3), each charge line
// with its quantity, unit, rate, and amount, and each demand line with the
// window that set it. Billing determinants: energy by time-of-use period and
// tier, demand over the tariff's window, ratchets with lookbacks, power
// factor, minimums, holidays, and the export channel kept apart. Money is
// kept in micro-dollars and each line rounds to the cent.

import { utcToLocal } from '../../parsers/time.mjs';
import { fixedFor, minimumFor } from './tariff-record.mjs';

const MICRO = 1_000_000;
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const cents = (dollars) => Math.round(Math.round(dollars * MICRO) / 10_000) / 100;
const pad = (n) => String(n).padStart(2, '0');
const daysInMonth = (y, m) => new Date(Date.UTC(y, m, 0)).getUTCDate();

/** The six NERC off-peak holidays in a year; one on a Sunday moves to Monday. */
export function nercHolidays(year) {
  const nth = (month, weekday, n) => { const first = new Date(Date.UTC(year, month - 1, 1)).getUTCDay(); return 1 + ((weekday - first + 7) % 7) + (n - 1) * 7; };
  const last = (month, weekday) => { const d = daysInMonth(year, month); const wd = new Date(Date.UTC(year, month - 1, d)).getUTCDay(); return d - ((wd - weekday + 7) % 7); };
  const fixed = (month, day) => { const wd = new Date(Date.UTC(year, month - 1, day)).getUTCDay(); return wd === 0 ? [month, day + 1] : [month, day]; };
  const list = [
    ["New Year's Day", ...fixed(1, 1)], ['Memorial Day', 5, last(5, 1)], ['Independence Day', ...fixed(7, 4)],
    ['Labor Day', 9, nth(9, 1, 1)], ['Thanksgiving Day', 11, nth(11, 4, 4)], ['Christmas Day', ...fixed(12, 25)],
  ];
  return list.map(([name, m, d]) => ({ name, date: `${year}-${pad(m)}-${pad(d)}` }));
}

/** Local calendar fields for each interval start, looked up once per UTC hour. */
function localizer(zone) {
  const byHour = new Map();
  return (ms) => {
    const h = Math.floor(ms / 3_600_000);
    let l = byHour.get(h);
    if (!l) byHour.set(h, (l = utcToLocal(zone, h * 3_600_000)));
    return l;
  };
}

/** Allowance of a tier for a month: kWh, kWh per day times days, or kWh per kW times billing demand. */
function allowance(t, days, billingKw) {
  if (t.upTo === undefined) return Infinity;
  if (t.basis === 'kWh per day') return t.upTo * days;
  if (t.basis === 'kWh per kW') return t.upTo * (billingKw ?? 0);
  return t.upTo;
}

/** Split an amount across tiers (each {upTo?, rate}) by their allowances. */
function tierSplit(amount, tiers, allow) {
  const out = [];
  let rest = amount;
  tiers.forEach((t, i) => {
    if (rest <= 0 && i > 0) return;
    const cap = allow(t);
    const used = Math.min(rest, cap);
    out.push({ tier: i + 1, quantity: used, rate: t.rate });
    rest -= used;
  });
  return out;
}

/**
 * @param {{startMs: Float64Array, kwh: Float64Array, intervalMinutes: number}} delivered
 * @param {any} rec a tariff record (core/lib/tariff-record.mjs)
 * @param {{zone: string, received?: {kwh: Float64Array}, holidays?: boolean, priorBillingKw?: Record<string, number>, powerFactor?: {target: number, actual: number | Record<string, number>}}} opts
 *   priorBillingKw: billing demand of months before the file ('YYYY-MM'), to complete a ratchet lookback
 * @returns {{months: any[], notes: string[], unmodeled: string[]}}
 */
export function intervalBills(delivered, rec, opts) {
  const local = localizer(opts.zone);
  const notes = [];
  const holidays = new Map();
  const isHoliday = (y, date) => {
    if (!opts.holidays) return null;
    if (!holidays.has(y)) for (const h of nercHolidays(y)) holidays.set(h.date, h.name), holidays.set(y, true);
    return holidays.get(date) ?? null;
  };
  const touEnergy = rec.energy && (rec.energy.weekday.some((m) => new Set(m).size > 1) || rec.energy.weekday.some((m, i) => JSON.stringify(m) !== JSON.stringify(rec.energy.weekend[i])));
  if (touEnergy || rec.demand) notes.push(opts.holidays ? 'The six NERC off-peak holidays are priced on the weekend schedule.' : 'Holidays priced as weekdays.');

  // Demand windows on the clock: 15, 30, or 60 minutes. Data coarser than the window cannot show its peak.
  const win = rec.demandWindowMinutes || 15;
  const coarse = delivered.intervalMinutes > win;
  if ((rec.demand || rec.flatDemand) && coarse) notes.push(`The file has ${delivered.intervalMinutes}-minute intervals, longer than the ${win}-minute demand window, so demand is the average over each ${delivered.intervalMinutes} minutes and may be understated.`);
  const winMs = Math.max(win, delivered.intervalMinutes) * 60_000;

  /** @type {Map<string, any>} */
  const months = new Map();
  const month = (y, m) => {
    const key = `${y}-${pad(m)}`;
    return months.get(key) ?? months.set(key, { key, y, m, kwh: 0, byPeriod: new Map(), windows: new Map(), dailyMax: new Map(), holidays: new Set(), received: 0 }).get(key);
  };
  const { startMs, kwh } = delivered;
  for (let i = 0; i < startMs.length; i++) {
    const l = local(startMs[i]);
    const date = `${l.year}-${pad(l.month)}-${pad(l.day)}`;
    const holiday = isHoliday(l.year, date);
    const weekend = holiday !== null || [0, 6].includes(new Date(Date.UTC(l.year, l.month - 1, l.day)).getUTCDay());
    const mo = month(l.year, l.month);
    if (holiday) mo.holidays.add(`${holiday} (${MONTHS[l.month - 1]} ${l.day})`);
    mo.kwh += kwh[i];
    if (rec.energy) {
      const p = (weekend ? rec.energy.weekend : rec.energy.weekday)[l.month - 1][l.hour];
      mo.byPeriod.set(p, (mo.byPeriod.get(p) ?? 0) + kwh[i]);
    }
    // The demand window this interval falls in, keyed by its start; it carries the demand period of its start.
    const w = Math.floor(startMs[i] / winMs) * winMs;
    let slot = mo.windows.get(w);
    if (!slot) {
      // A window never crosses midnight, so it shares the interval's day type.
      const wl = w === startMs[i] ? l : local(w);
      slot = { kwh: 0, startMs: w, period: rec.demand ? (weekend ? rec.demand.weekend : rec.demand.weekday)[wl.month - 1][wl.hour] : 0, date };
      mo.windows.set(w, slot);
    }
    slot.kwh += kwh[i];
  }
  if (opts.received) {
    const r = opts.received;
    for (let i = 0; i < r.kwh.length; i++) {
      const l = local(r.startMs[i]);
      month(l.year, l.month).received += r.kwh[i];
    }
  }

  const keys = [...months.keys()].sort();
  const firstKey = keys[0];
  const billingKw = new Map(Object.entries(opts.priorBillingKw ?? {}));
  const out = [];
  for (const key of keys) {
    const mo = months.get(key);
    const days = daysInMonth(mo.y, mo.m);
    const lines = [];
    const add = (l) => { lines.push({ ...l, amount: cents(l.amount) }); };
    const winHours = winMs / 3_600_000;
    const windows = [...mo.windows.values()].map((w) => ({ ...w, kw: w.kwh / winHours }));
    const peakOf = (list) => list.reduce((a, b) => (b.kw > a.kw ? b : a), { kw: 0, startMs: NaN });
    const pf = typeof opts.powerFactor?.actual === 'object' ? opts.powerFactor.actual[key] : opts.powerFactor?.actual;
    const pfAdjust = (kw) => (opts.powerFactor && pf && pf < opts.powerFactor.target ? (kw * opts.powerFactor.target) / pf : kw);

    // Monthly (flat) demand, the ratchet, and power factor: the billing demand.
    let billing = null;
    if (rec.flatDemand) {
      const peak = peakOf(windows);
      let kw = peak.kw;
      let ratchetText = null;
      let incomplete = false;
      if (rec.ratchet) {
        const pct = rec.ratchet.percentByMonth[mo.m - 1] || rec.ratchet.lookbackPercent;
        const range = rec.ratchet.lookbackRange || 11;
        let best = null;
        for (let k = 1; k <= range; k++) {
          const d = new Date(Date.UTC(mo.y, mo.m - 1 - k, 1));
          const prior = `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}`;
          if (rec.ratchet.lookbackMonths && !rec.ratchet.lookbackMonths[d.getUTCMonth()]) continue;
          if (!billingKw.has(prior)) { if (prior < firstKey) incomplete = true; continue; }
          if (!best || billingKw.get(prior) > best.kw) best = { kw: billingKw.get(prior), month: prior };
        }
        if (best && pct * best.kw > kw) {
          kw = pct * best.kw;
          ratchetText = `ratchet applied: ${Math.round(pct * 100)}% of ${+best.kw.toFixed(1)} kW billing demand (${MONTHS[+best.month.slice(5) - 1]})`;
        }
      }
      const adjusted = pfAdjust(kw);
      billingKw.set(key, adjusted);
      billing = { kw: adjusted, metered: peak.kw, setting: peak.startMs, ratchetText, incomplete };
      const tiers = rec.flatDemand.periods[rec.flatDemand.months[mo.m - 1] ?? 0]?.tiers ?? [];
      const unitKw = rec.flatDemand.unit;
      if (unitKw === 'kVA' && !pf) {
        lines.push({ kind: 'excluded', label: 'Monthly demand (kVA)', amount: 0, note: 'Not modeled: kVA demand needs the power factor; enter it to price this charge.' });
      } else if (rec.flatDemand.daily) {
        const daily = new Map();
        for (const w of windows) if (!daily.has(w.date) || w.kw > daily.get(w.date)) daily.set(w.date, w.kw);
        const sum = [...daily.values()].reduce((n, x) => n + x, 0);
        for (const t of tierSplit(sum, tiers, (t) => t.upTo ?? Infinity)) add({ kind: 'demand', label: `Daily demand${tiers.length > 1 ? `, tier ${t.tier}` : ''}`, quantity: t.quantity, unit: `${unitKw}-days`, rate: t.rate, amount: t.quantity * t.rate, note: `the sum of ${daily.size} days' highest demand` });
      } else {
        const qty = unitKw === 'kVA' ? adjusted / pf : adjusted;
        for (const t of tierSplit(qty, tiers, (t) => t.upTo ?? Infinity)) {
          const parts = [];
          if (ratchetText) parts.push(ratchetText);
          if (adjusted !== kw) parts.push(`power factor: ${+kw.toFixed(2)} kW × ${opts.powerFactor.target} ÷ ${pf} = ${+adjusted.toFixed(2)} kW, ${+(adjusted - kw).toFixed(2)} kW added by low power factor`);
          if (incomplete) parts.push('lookback incomplete');
          add({ kind: 'demand', label: `Monthly demand${tiers.length > 1 ? `, tier ${t.tier}` : ''}`, quantity: t.quantity, unit: unitKw, rate: t.rate, amount: t.quantity * t.rate, setting: { startMs: peak.startMs, kw: peak.kw }, ...(parts.length ? { note: parts.join('; ') } : {}) });
        }
      }
    }

    // Energy by period and tier. Tier limits apply to the month's total; each period's kWh shares them in proportion.
    if (rec.energy) {
      const total = mo.kwh;
      for (const [p, k] of [...mo.byPeriod].sort((a, b) => a[0] - b[0])) {
        const tiers = rec.energy.periods[p]?.tiers ?? [];
        const share = total > 0 ? k / total : 0;
        const split = tiers.length > 1 ? tierSplit(total, tiers, (t) => allowance(t, days, billing?.kw)).map((s) => ({ ...s, quantity: s.quantity * share })) : [{ tier: 1, quantity: k, rate: tiers[0]?.rate ?? 0 }];
        for (const s of split) add({ kind: 'energy', label: `Energy${rec.energy.periods.length > 1 ? `, period ${p + 1}` : ''}${tiers.length > 1 ? `, tier ${s.tier}` : ''}`, quantity: s.quantity, unit: 'kWh', rate: s.rate, amount: s.quantity * s.rate });
      }
    }

    // Time-of-use demand: the highest window in each demand period.
    if (rec.demand) {
      const byPeriod = new Map();
      for (const w of windows) if (!byPeriod.has(w.period) || w.kw > byPeriod.get(w.period).kw) byPeriod.set(w.period, w);
      for (const [p, w] of [...byPeriod].sort((a, b) => a[0] - b[0])) {
        const tiers = rec.demand.periods[p]?.tiers ?? [];
        if (!tiers.some((t) => t.rate)) continue;
        const kw = pfAdjust(w.kw);
        for (const t of tierSplit(kw, tiers, (t) => t.upTo ?? Infinity)) add({ kind: 'demand', label: `Time-of-use demand, period ${p + 1}${tiers.length > 1 ? `, tier ${t.tier}` : ''}`, quantity: t.quantity, unit: rec.demand.unit, rate: t.rate, amount: t.quantity * t.rate, setting: { startMs: w.startMs, kw: w.kw } });
      }
    }

    const fixed = fixedFor(rec, days);
    if (fixed) add({ kind: 'fixed', label: 'Fixed charge', quantity: 1, unit: rec.fixed.per === 'day' ? `${days} days` : 'month', rate: fixed.amount, amount: fixed.amount, note: fixed.text });
    let total = lines.reduce((n, l) => n + l.amount, 0);
    const min = minimumFor(rec, days);
    if (min && total < min.amount) {
      add({ kind: 'minimum', label: 'Minimum bill', quantity: 1, unit: 'month', rate: cents(min.amount - total), amount: min.amount - total, note: min.text });
      total = min.amount;
    }
    const excluded = rec.unmodeled.map((u) => `Not modeled: ${u}`);
    if (mo.received > 0) excluded.push(`Export credits not modeled: ${+mo.received.toFixed(3)} kWh exported, not credited`);
    out.push({
      month: key, days, kwh: mo.kwh, received: mo.received, lines,
      total: Math.round(lines.reduce((n, l) => n + l.amount, 0) * 100) / 100,
      billingDemand: billing, holidays: [...mo.holidays], excluded,
    });
  }
  return { months: out, notes, unmodeled: rec.unmodeled };
}
