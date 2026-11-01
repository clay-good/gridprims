// grid.large-load.take-or-pay: a large customer's minimum billing demand,
// unused-capacity payments, minimum bills, and exit fee by contract year under
// a minimum-bill tariff (add-large-load-screen: take-or-pay).

import { exitFee, parseComponent, parseExit, parseList, schedule } from '../../lib/take-or-pay.mjs';

const kw = (x) => `${Math.round(x).toLocaleString('en-US')} kW`;
const usd = (x) => `$${Math.round(x).toLocaleString('en-US')}`;

/** @param {{contractMw: number, components: string, ramp: string, actual: string, years: number, ratchetPct: number, exitRule: string, exitYear: number, reportYear: number}} v */
export function compute(v) {
  const components = v.components.split('\n').filter((l) => l.trim()).map(parseComponent);
  const bad = components.find((c) => c.error);
  if (bad || !components.length) return { status: 'invalid', errors: [{ field: 'components', message: bad?.error ?? 'Enter at least one charge, such as "generation: 60% at $10/kW-month".' }] };
  const ramp = parseList(v.ramp);
  if (!ramp) return { status: 'invalid', errors: [{ field: 'ramp', message: 'Enter percents of contract demand by year, such as 50, 65, 80, 90, 100.' }] };
  const actual = parseList(v.actual);
  if (!actual) return { status: 'invalid', errors: [{ field: 'actual', message: 'Enter MW by year, such as 40, 80, 100.' }] };
  const rule = parseExit(v.exitRule);
  if (!rule) return { status: 'invalid', errors: [{ field: 'exitRule', message: 'Enter none, remaining term, or a number of months, such as 36 months.' }] };
  if (v.reportYear > v.years) return { status: 'invalid', errors: [{ field: 'reportYear', message: `Choose a year from 1 to ${v.years}.` }] };
  if (v.exitYear > v.years) return { status: 'invalid', errors: [{ field: 'exitYear', message: `Choose a year from 0 to ${v.years}.` }] };
  const years = schedule({ contractMw: v.contractMw, years: v.years, ramp, actual, components, ratchetPct: v.ratchetPct / 100 });
  const shown = years[v.reportYear - 1];
  const first = shown.components[0];
  const fee = v.exitYear ? exitFee(years, v.exitYear, rule) : 0;
  const unusedTotal = years.reduce((a, y) => a + y.unusedPayment, 0);
  const minimumTotal = years.reduce((a, y) => a + y.minimumBill, 0);
  const steps = [
    ...years.map((y) => `Year ${y.year}: capacity in force ${kw(y.capacityKw)}, expected ${kw(y.actualKw)}. ${y.components.map((c) => `${c.name}: minimum ${kw(c.minimumKw)}${c.ratchetKw > c.formulaKw ? ` (the ratchet, over the formula's ${kw(c.formulaKw)})` : ''}, billed ${kw(c.billedKw)}; minimum bill ${kw(c.minimumKw)} × $${c.rate}/kW-month × 12 = ${usd(c.minimumBill)}${c.unusedKw > 0 ? `; unused ${kw(c.unusedKw)} × $${c.rate} × 12 = ${usd(c.unusedPayment)}` : ''}`).join('. ')}.`),
    ...(v.exitYear ? [rule.kind === 'remaining' ? `Exit at the end of year ${v.exitYear}: the minimum bills for years ${v.exitYear + 1} to ${v.years} = ${usd(fee)}.` : rule.kind === 'months' ? `Exit at the end of year ${v.exitYear}: ${rule.months} months of year ${v.exitYear}'s minimum bill = ${usd(years[v.exitYear - 1].minimumBill)} ÷ 12 × ${rule.months} = ${usd(fee)}.` : 'No exit fee is set.'] : []),
  ];
  return {
    status: 'ok',
    outputs: { minimumKw: first.minimumKw, unusedYear: shown.unusedPayment, unusedTotal, minimumTotal, exitFee: fee },
    sentence: (out) => `In year ${v.reportYear} you pay for at least ${out.minimumKw.display} kW${components.length > 1 ? ` of ${first.name}` : ''}. Unused capacity costs $${out.unusedYear.display} that year.`,
    steps,
  };
}
