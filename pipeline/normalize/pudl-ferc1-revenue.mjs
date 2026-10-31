// Revenue-requirement inputs per electric utility and year from FERC Form 1,
// through PUDL (add-ratepayer-tools: revenue-requirement, "Prefill from Form
// 1"): operation and maintenance expense, depreciation and amortization,
// taxes other than income, and PUDL's rate base by its categories, with the
// EIA utility ids PUDL maps each FERC respondent to. Electric rows only;
// every figure is total-company for that respondent.

export const SCHEMA = [
  { name: 'year', type: 'f64' }, { name: 'utility_id_ferc1', type: 'f64' }, { name: 'utility_name_ferc1', type: 'str' },
  { name: 'utility_ids_eia', type: 'str', unit: 'space-separated EIA utility ids' },
  { name: 'operation_expense', type: 'f64', unit: '$' }, { name: 'maintenance_expense', type: 'f64', unit: '$' },
  { name: 'depreciation_expense', type: 'f64', unit: '$' }, { name: 'amortization_expense', type: 'f64', unit: '$' },
  { name: 'taxes_other_than_income', type: 'f64', unit: '$' }, { name: 'operating_revenues', type: 'f64', unit: '$' },
  { name: 'rate_base', type: 'f64', unit: '$' }, { name: 'rate_base_net_adit', type: 'f64', unit: '$' },
  { name: 'rate_base_working_capital', type: 'f64', unit: '$' }, { name: 'rate_base_plant_and_other', type: 'f64', unit: '$' },
];

const INCOME = {
  operation_expense: 'operation_expense', maintenance_expense: 'maintenance_expense', depreciation_expense: 'depreciation_expense',
  amortization_and_depletion_of_utility_plant: 'amortization_expense', taxes_other_than_income_taxes_utility_operating_income: 'taxes_other_than_income',
  operating_revenues: 'operating_revenues',
};

/** @param {{income: any, rateBase: any, ferc1Pudl: any, eiaPudl: any}} files Parquet readers */
export function normalize({ income, rateBase, ferc1Pudl, eiaPudl }) {
  const problems = [];
  const need = { income: ['utility_id_ferc1', 'report_year', 'utility_type', 'income_type', 'dollar_value'], rateBase: ['report_year', 'utility_id_ferc1', 'utility_name_ferc1', 'utility_type', 'ending_balance', 'rate_base_category'], ferc1Pudl: ['utility_id_ferc1', 'utility_id_pudl'], eiaPudl: ['utility_id_eia', 'utility_id_pudl'] };
  const readers = { income, rateBase, ferc1Pudl, eiaPudl };
  for (const [f, cols] of Object.entries(need)) for (const c of cols) if (!readers[f].columns.some((x) => x.name === c)) problems.push(`${f} has no column ${c}`);
  if (problems.length) return { rows: [], problems };

  const rows = new Map();
  const row = (id, year) => {
    const k = `${id}|${year}`;
    return rows.get(k) ?? rows.set(k, { year, utility_id_ferc1: id, utility_name_ferc1: null, utility_ids_eia: null, ...Object.fromEntries(Object.values(INCOME).map((c) => [c, null])), rate_base: null, rate_base_net_adit: null, rate_base_working_capital: null, rate_base_plant_and_other: null }).get(k);
  };
  const add = (r, col, v) => { if (v !== null && v !== undefined) r[col] = (r[col] ?? 0) + v; };
  for (const r of income.rows(need.income)) {
    const col = INCOME[r.income_type];
    if (!col || r.utility_type !== 'electric') continue;
    add(row(r.utility_id_ferc1, r.report_year), col, r.dollar_value);
  }
  for (const r of rateBase.rows(need.rateBase)) {
    if (r.utility_type !== 'electric') continue;
    const o = row(r.utility_id_ferc1, r.report_year);
    o.utility_name_ferc1 ??= r.utility_name_ferc1;
    add(o, 'rate_base', r.ending_balance);
    add(o, r.rate_base_category === 'net_ADIT' ? 'rate_base_net_adit' : r.rate_base_category === 'net_working_capital' ? 'rate_base_working_capital' : 'rate_base_plant_and_other', r.ending_balance);
  }
  // FERC respondent -> PUDL utility -> EIA utility ids.
  const pudlOf = new Map(ferc1Pudl.rows(need.ferc1Pudl).map((r) => [r.utility_id_ferc1, r.utility_id_pudl]));
  const eiaOf = new Map();
  for (const r of eiaPudl.rows(need.eiaPudl)) if (r.utility_id_pudl !== null) (eiaOf.get(r.utility_id_pudl) ?? eiaOf.set(r.utility_id_pudl, []).get(r.utility_id_pudl)).push(r.utility_id_eia);
  const out = [...rows.values()].filter((r) => r.rate_base !== null || r.operation_expense !== null).sort((a, b) => a.year - b.year || a.utility_id_ferc1 - b.utility_id_ferc1);
  for (const r of out) {
    const ids = eiaOf.get(pudlOf.get(r.utility_id_ferc1)) ?? [];
    r.utility_ids_eia = ids.length ? [...new Set(ids)].sort((a, b) => a - b).join(' ') : null;
  }
  const years = out.map((r) => r.year);
  return { rows: out, problems, dataPeriod: `${Math.min(...years)}-${Math.max(...years)}` };
}
