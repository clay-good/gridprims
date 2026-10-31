// ratepayer.revenue-requirement.explain: where a utility's requested revenue
// comes from, by the standard cost-of-service formula, and what one point of
// return on equity is worth to an average residential customer.

const M = (x) => `$${Math.round(x).toLocaleString('en-US')}`;
const pct = (x) => `${(x * 100).toLocaleString('en-US', { maximumFractionDigits: 3 })}%`;

/** The revenue requirement's parts for a return on equity. */
export function parts({ om, depreciation, otherTaxes, rateBase, equityRatio, roe, costOfDebt, taxRate }) {
  const wacc = equityRatio * roe + (1 - equityRatio) * costOfDebt;
  const ret = rateBase * wacc;
  const equityReturn = rateBase * equityRatio * roe;
  const incomeTax = (equityReturn * taxRate) / (1 - taxRate);
  return { wacc, ret, equityReturn, incomeTax, total: om + depreciation + otherTaxes + incomeTax + ret };
}

/**
 * @param {{om: number, depreciation: number, otherTaxes: number, rateBase: number, equityRatio: number, roe: number, costOfDebt: number, taxRate: number, residentialShare: number, residentialCustomers: number}} v ratios and rates in percent
 */
export function compute(v) {
  const n = { ...v, equityRatio: v.equityRatio / 100, roe: v.roe / 100, costOfDebt: v.costOfDebt / 100, taxRate: v.taxRate / 100 };
  if (n.taxRate >= 1) return { status: 'invalid', errors: [{ field: 'taxRate', message: 'The tax rate must be below 100%.' }] };
  const p = parts(n);
  const lower = parts({ ...n, roe: n.roe - 0.01 });
  const perPoint = p.total - lower.total;
  const perCustomerMonth = v.residentialCustomers > 0 ? (perPoint * (v.residentialShare / 100)) / v.residentialCustomers / 12 : null;
  return {
    status: 'ok',
    outputs: { total: p.total, ret: p.ret, incomeTax: p.incomeTax, wacc: p.wacc * 100, perPoint, ...(perCustomerMonth !== null ? { perCustomerMonth } : {}) },
    sentence: (out) => `The revenue requirement is $${out.total.display}. Each point of return on equity is worth $${out.perPoint.display} a year${perCustomerMonth !== null ? `, about $${out.perCustomerMonth.display} a month per home` : ''}.`,
    steps: [
      `Weighted cost of capital: ${pct(n.equityRatio)} equity × ${pct(n.roe)} + ${pct(1 - n.equityRatio)} debt × ${pct(n.costOfDebt)} = ${pct(p.wacc)}.`,
      `Return on rate base: ${M(v.rateBase)} × ${pct(p.wacc)} = ${M(p.ret)}.`,
      `Income tax on the equity return: ${M(p.equityReturn)} × ${pct(n.taxRate)} ÷ (1 − ${pct(n.taxRate)}) = ${M(p.incomeTax)}.`,
      `Revenue requirement: O&M ${M(v.om)} + depreciation ${M(v.depreciation)} + other taxes ${M(v.otherTaxes)} + income tax ${M(p.incomeTax)} + return ${M(p.ret)} = ${M(p.total)}.`,
      `One point less return on equity (${pct(n.roe)} to ${pct(n.roe - 0.01)}) lowers it by ${M(perPoint)}: ${M(p.ret - lower.ret)} of return and ${M(p.incomeTax - lower.incomeTax)} of income tax.`,
      ...(perCustomerMonth !== null ? [`Per home: ${M(perPoint)} × ${v.residentialShare}% residential share ÷ ${v.residentialCustomers.toLocaleString('en-US')} residential customers ÷ 12 = $${perCustomerMonth.toFixed(2)} a month. This is an approximation: rates are not set by revenue share alone.`] : []),
    ],
  };
}
