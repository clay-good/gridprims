// What would a proposed rate have cost me? (add-ratepayer-tools:
// proposed-rate-impact.) The current and proposed tariff records, every charge
// that differs between them, and both priced by the bill engine on the
// user's own intervals, or on monthly totals where those are all there is.

import { intervalBills } from './interval-bill.mjs';

const money = (x, d = 2) => `$${x.toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: Math.max(d, 5) })}`;
const r2 = (x) => Math.round(x * 100) / 100;

/** A copy of a tariff record to edit as the proposal. */
export const copyTariff = (rec) => ({ ...structuredClone(rec), id: `${rec.id}-proposed`, name: `${rec.name} (proposed)` });

/** Every charge that differs between two tariff records, in plain words. */
export function tariffDifferences(a, b) {
  const out = [];
  const perText = { month: 'per month', day: 'per day', year: 'per year' };
  const charge = (label, x, y) => {
    if ((x?.amount ?? null) === (y?.amount ?? null) && (x?.per ?? null) === (y?.per ?? null)) return;
    const show = (v) => (v ? `${money(v.amount)} ${perText[v.per]}` : 'none');
    out.push(x?.per === y?.per && x && y ? `${label}: ${money(x.amount)} → ${money(y.amount)} ${perText[x.per]}` : `${label}: ${show(x)} → ${show(y)}`);
  };
  charge('Fixed charge', a.fixed, b.fixed);
  charge('Minimum charge', a.minimum, b.minimum);
  const tiers = (label, unit, pa, pb) => {
    const n = Math.max(pa?.periods.length ?? 0, pb?.periods.length ?? 0);
    for (let p = 0; p < n; p++) {
      const ta = pa?.periods[p]?.tiers ?? [];
      const tb = pb?.periods[p]?.tiers ?? [];
      for (let k = 0; k < Math.max(ta.length, tb.length); k++) {
        const x = ta[k];
        const y = tb[k];
        const where = `${label}${n > 1 ? `, period ${p + 1}` : ''}${Math.max(ta.length, tb.length) > 1 ? `, tier ${k + 1}` : ''}`;
        if (x?.rate !== y?.rate) out.push(`${where}: ${x ? money(x.rate, unit === 'kWh' ? 5 : 2) : 'none'} → ${y ? money(y.rate, unit === 'kWh' ? 5 : 2) : 'none'} per ${unit}`);
        if (x && y && x.upTo !== y.upTo) out.push(`${where} limit: ${x.upTo ?? 'none'} → ${y.upTo ?? 'none'}`);
      }
    }
  };
  tiers('Energy', 'kWh', a.energy, b.energy);
  tiers('Time-of-use demand', 'kW', a.demand, b.demand);
  tiers('Monthly demand', 'kW', a.flatDemand, b.flatDemand);
  return out;
}

const components = (months) => {
  const c = { fixed: 0, energy: 0, demand: 0 };
  for (const m of months) for (const l of m.lines) c[l.kind === 'minimum' ? 'fixed' : l.kind] += l.amount;
  return { fixed: r2(c.fixed), energy: r2(c.energy), demand: r2(c.demand) };
};
const LABEL = { fixed: 'fixed charges', energy: 'energy charges', demand: 'demand charges' };

/** Totals, the difference, and its breakdown, from two sets of monthly bills. */
function compare(curMonths, propMonths, months) {
  const current = r2(curMonths.reduce((n, m) => n + m.total, 0));
  const proposed = r2(propMonths.reduce((n, m) => n + m.total, 0));
  const diff = r2(proposed - current);
  const ca = components(curMonths);
  const cb = components(propMonths);
  const byComponent = Object.fromEntries(Object.keys(ca).map((k) => [k, r2(cb[k] - ca[k])]));
  const largest = Object.entries(byComponent).sort((x, y) => Math.abs(y[1]) - Math.abs(x[1]))[0];
  return {
    months, current, proposed, diff, pct: current ? Math.round((diff / current) * 1000) / 10 : null,
    byComponent, largest: largest && largest[1] !== 0 ? { component: largest[0], label: LABEL[largest[0]], diff: largest[1] } : null,
    monthly: curMonths.map((m, i) => ({ month: m.month, current: m.total, proposed: propMonths[i].total, diff: r2(propMonths[i].total - m.total) })),
    label: months < 12 ? `${months} month${months === 1 ? '' : 's'}` : null,
  };
}

/** Both tariffs on a meter file. */
export function impactOnIntervals(series, current, proposed, { zone, received, holidays } = {}) {
  const a = intervalBills(series, current, { zone, received, holidays }).months;
  const b = intervalBills(series, proposed, { zone, received, holidays }).months;
  return compare(a, b, a.length);
}

/**
 * Both tariffs on monthly totals from bills: fixed, minimum, and tiered energy are priced; time-of-use energy
 * and demand charges need interval data and are named, not estimated.
 * @param {Array<{month: string, kwh: number}>} months 'YYYY-MM'
 */
export function impactOnMonthly(months, current, proposed) {
  const needs = new Set();
  const bill = (rec) => months.map(({ month, kwh }) => {
    const [y, mo] = month.split('-').map(Number);
    const days = new Date(Date.UTC(y, mo, 0)).getUTCDate();
    const lines = [];
    if (rec.fixed) lines.push({ kind: 'fixed', amount: r2(rec.fixed.per === 'day' ? rec.fixed.amount * days : rec.fixed.amount) });
    if (rec.energy) {
      const day = rec.energy.weekday[mo - 1];
      const end = rec.energy.weekend[mo - 1];
      if (new Set([...day, ...end]).size > 1) needs.add('time-of-use energy');
      else {
        let rest = kwh;
        for (const t of rec.energy.periods[day[0]].tiers) {
          if (rest <= 0) break;
          const cap = t.upTo === undefined ? Infinity : t.basis === 'kWh per day' ? t.upTo * days : t.basis === 'kWh per kW' ? (needs.add('energy tiers per kW of demand'), Infinity) : t.upTo;
          const used = Math.min(rest, cap);
          lines.push({ kind: 'energy', amount: r2(used * t.rate) });
          rest -= used;
        }
      }
    }
    if (rec.demand || rec.flatDemand) needs.add('demand charges');
    let total = lines.reduce((n, l) => n + l.amount, 0);
    if (rec.minimum && total < rec.minimum.amount) { lines.push({ kind: 'minimum', amount: r2(rec.minimum.amount - total) }); total = rec.minimum.amount; }
    return { month, total: r2(total), lines };
  });
  return { ...compare(bill(current), bill(proposed), months.length), needsIntervalData: [...needs] };
}

/** Scale a partial year to 12 months by its share, with the method stated, only when asked. */
export function annualize(impact) {
  if (impact.months >= 12) return null;
  const f = 12 / impact.months;
  return { diff: r2(impact.diff * f), method: `${money(impact.diff)} over ${impact.months} months × 12 ÷ ${impact.months}; seasons missing from the file are assumed to look like the months present.` };
}
