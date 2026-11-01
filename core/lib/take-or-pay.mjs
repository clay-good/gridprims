// Large-load minimum bills (add-large-load-screen: take-or-pay): each
// component's minimum billing demand by contract year, as a flat percent or
// a tiered formula with a cap, applied to the capacity in force under the
// ramp, raised by a percent-of-prior-peak ratchet; the payment for capacity
// not used; and the exit fee if the customer leaves at the end of a year.

const NUM = String.raw`(\d[\d,]*(?:\.\d+)?)`;
const n = (s) => Number(s.replace(/,/g, ''));

/**
 * One component line: "generation: 60% at $10/kW-month", or
 * "demand: 57,500 kW + 100% above 75 MW, cap 85% at $12.50/kW-month".
 * @returns {{name: string, formula: {kind: 'flat', pct: number} | {kind: 'tiered', baseKw: number, pct: number, aboveKw: number, capPct: number | null}, rate: number} | {error: string}}
 */
export function parseComponent(line) {
  const m = new RegExp(String.raw`^\s*([^:]+):\s*(.+?)\s+at\s+\$${NUM}\s*/\s*kW-?month\s*$`, 'i').exec(line);
  const noRate = /^\s*([^:]+):.*\bat\s+\$\s*\/\s*kW-?month\s*$/i.exec(line);
  if (noRate) return { error: `Enter the demand rate for ${noRate[1].trim()}, such as "at $10/kW-month".` };
  if (!m) return { error: `Write "${line.trim()}" as a name, a minimum, and a rate, such as "generation: 60% at $10/kW-month".` };
  const [, name, f, rate] = m;
  const flat = new RegExp(String.raw`^${NUM}\s*%$`).exec(f.trim());
  if (flat) return { name: name.trim(), formula: { kind: 'flat', pct: n(flat[1]) / 100 }, rate: n(rate) };
  const tier = new RegExp(String.raw`^${NUM}\s*kW\s*\+\s*${NUM}\s*%\s*above\s*${NUM}\s*(kW|MW)(?:\s*,\s*cap\s*${NUM}\s*%)?$`, 'i').exec(f.trim());
  if (tier) {
    const above = n(tier[3]) * (tier[4].toUpperCase() === 'MW' ? 1000 : 1);
    return { name: name.trim(), formula: { kind: 'tiered', baseKw: n(tier[1]), pct: n(tier[2]) / 100, aboveKw: above, capPct: tier[5] === undefined ? null : n(tier[5]) / 100 }, rate: n(rate) };
  }
  return { error: `The minimum "${f.trim()}" is neither a percent ("60%") nor a tier ("57,500 kW + 100% above 75 MW, cap 85%").` };
}

/** A list of numbers typed as "50, 65, 80, 90" (percent signs and MW allowed); null when any is not a number. */
export function parseList(text) {
  const parts = String(text).split(/[,;\s]+/).map((s) => s.replace(/%|MW/gi, '')).filter(Boolean);
  const v = parts.map(Number);
  return v.length && v.every((x) => Number.isFinite(x) && x >= 0) ? v : null;
}

/** The value for a year from a list whose last value holds for every later year. */
export const yearOf = (list, year) => list[Math.min(year, list.length) - 1];

/**
 * A formula's minimum billing demand (kW) for the capacity in force.
 * @param {any} f @param {number} capacityKw
 */
export function formulaKw(f, capacityKw) {
  if (f.kind === 'flat') return f.pct * capacityKw;
  const raw = f.baseKw + f.pct * Math.max(0, capacityKw - f.aboveKw);
  return f.capPct === null ? raw : Math.min(raw, f.capPct * capacityKw);
}

/**
 * Every component, every contract year.
 * @param {{contractMw: number, years: number, ramp: number[], actual: number[], components: any[], ratchetPct: number}} p
 *   ramp: capacity in force as a percent of contract by year; actual: expected billing demand (MW) by year;
 *   ratchetPct: the minimum is at least this share of the prior year's billing demand (0 for none)
 */
export function schedule({ contractMw, years, ramp, actual, components, ratchetPct }) {
  const out = [];
  let prior = null;
  for (let y = 1; y <= years; y++) {
    const capacityKw = (contractMw * 1000 * Math.min(100, yearOf(ramp, y))) / 100;
    const actualKw = Math.min(yearOf(actual, y) * 1000, contractMw * 1000);
    const rows = components.map((c) => {
      const formula = formulaKw(c.formula, capacityKw);
      // The lookback: demand is taken as flat within a year, so the past 11 months at a year's start are the year before.
      const ratchet = prior === null ? 0 : ratchetPct * prior;
      const minimumKw = Math.max(formula, ratchet);
      const billedKw = Math.max(actualKw, minimumKw);
      return { name: c.name, rate: c.rate, formulaKw: formula, ratchetKw: ratchet, minimumKw, billedKw, minimumBill: minimumKw * c.rate * 12, unusedKw: billedKw - actualKw, unusedPayment: (billedKw - actualKw) * c.rate * 12 };
    });
    out.push({ year: y, capacityKw, actualKw, components: rows, minimumBill: rows.reduce((a, r) => a + r.minimumBill, 0), unusedPayment: rows.reduce((a, r) => a + r.unusedPayment, 0) });
    // The ratchet looks back at billing demand, the greater of actual and the year's minimum.
    prior = Math.max(...rows.map((r) => r.billedKw));
  }
  return out;
}

/**
 * The exit fee if the customer leaves at the end of a year: the minimum bills for the rest of the term, or
 * a stated number of months of the year's minimum bill.
 * @param {ReturnType<typeof schedule>} years @param {number} exitYear @param {{kind: 'remaining'} | {kind: 'months', months: number} | {kind: 'none'}} rule
 */
export function exitFee(years, exitYear, rule) {
  if (rule.kind === 'none' || exitYear >= years.length) return 0;
  if (rule.kind === 'remaining') return years.slice(exitYear).reduce((a, y) => a + y.minimumBill, 0);
  return (years[exitYear - 1].minimumBill / 12) * rule.months;
}

/** "none", "remaining term", or "24 months". */
export function parseExit(text) {
  const t = String(text).trim().toLowerCase();
  if (t === 'none' || t === '') return { kind: 'none' };
  if (/^remaining( term)?$/.test(t)) return { kind: 'remaining' };
  const m = /^(\d+)\s*months?$/.exec(t);
  return m ? { kind: 'months', months: Number(m[1]) } : null;
}
