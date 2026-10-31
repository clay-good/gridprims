// Normalize OpenEI's Utility Rate Database bulk JSON into one row per rate in
// effect and state (add-public-grid-data: URDB, partitioned by state). URDB
// has no state field, so each rate is placed in every state its utility sells
// or serves in per EIA-861 (sales and service territory, joined by EIA utility
// id); `utility_states` says how many, so a page can say a multi-state
// utility's rate may apply in only one. A rate whose utility is not in EIA-861
// goes to the "unmatched" shard. Expired rates (an end date on or before the
// retrieval day) stay in OpenEI's file. Rate structures and schedules are kept
// as compact JSON text, exactly as URDB writes them.

const JSON_FIELDS = [
  ['energy_rate_structure', 'energyRateStrux'], ['energy_weekday_schedule', 'energyWeekdaySched'], ['energy_weekend_schedule', 'energyWeekendSched'],
  ['demand_rate_structure', 'demandRateStrux'], ['demand_weekday_schedule', 'demandWeekdaySched'], ['demand_weekend_schedule', 'demandWeekendSched'],
  ['flat_demand_structure', 'flatDemandStrux'], ['flat_demand_months', 'flatDemandMonths'],
  ['coincident_rate_structure', 'coincidentRateStrux'], ['coincident_schedule', 'coincidentSched'],
  ['demand_ratchet_percentage', 'demandRatchetPercentage'], ['lookback_months', 'lookbackMonths'], ['fuel_adjustments_monthly', 'fuelAdjustmentsMonthly'],
];
const TEXT_FIELDS = [
  ['utility_name', 'utilityName'], ['rate_name', 'rateName'], ['sector', 'sector'], ['service_type', 'serviceType'], ['description', 'description'], ['source_reference', 'sourceReference'],
  ['supersedes', 'supercedes'], ['fixed_charge_units', 'fixedChargeUnits'], ['min_charge_units', 'minChargeUnits'], ['demand_rate_units', 'demandRateUnits'],
  ['flat_demand_units', 'flatDemandUnits'], ['coincident_rate_units', 'coincidentRateUnits'], ['voltage_category', 'voltageCategory'], ['phase_wiring', 'phaseWiring'], ['dg_rules', 'dgRules'],
];
const NUMBER_FIELDS = [
  ['fixed_charge', 'fixedChargeFirstMeter', '$ per fixed_charge_units'], ['min_charge', 'minCharge', '$ per min_charge_units'],
  ['demand_min_kw', 'demandMin', 'kW'], ['demand_max_kw', 'demandMax', 'kW'], ['energy_min_kwh', 'energyMin', 'kWh'], ['energy_max_kwh', 'energyMax', 'kWh'],
  ['service_min_v', 'serviceMin', 'V'], ['service_max_v', 'serviceMax', 'V'], ['lookback_percent', 'lookbackPercent', 'fraction'],
];

export const SCHEMA = [
  { name: 'label', type: 'str' }, { name: 'state', type: 'str' }, { name: 'utility_id', type: 'f64' }, { name: 'utility_states', type: 'f64', unit: 'count' },
  ...TEXT_FIELDS.map(([name]) => ({ name, type: 'str' })),
  { name: 'approved', type: 'str' }, { name: 'is_default', type: 'str' },
  { name: 'effective_date', type: 'str' }, { name: 'end_date', type: 'str' }, { name: 'last_revised', type: 'str' },
  ...NUMBER_FIELDS.map(([name, , unit]) => ({ name, type: 'f64', unit })),
  ...JSON_FIELDS.map(([name]) => ({ name, type: 'str', unit: 'JSON' })),
];

/** URDB writes dates as {"$date": ISO string}, {"$date": ms}, or {"$date": {"$numberLong": ms}}. */
export function urdbDate(v) {
  const d = v?.$date;
  if (d === undefined || d === null) return null;
  const iso = typeof d === 'string' ? d : new Date(typeof d === 'number' ? d : Number(d.$numberLong)).toISOString();
  return iso.slice(0, 10);
}
const yn = (b) => (b === true ? 'Y' : b === false ? 'N' : null);
const str = (v) => (v === undefined || v === null || String(v).trim() === '' ? null : String(v).trim());
const num = (v) => (typeof v === 'number' && Number.isFinite(v) ? v : null);

/**
 * @param {any[]} rates the bulk file's array
 * @param {undefined} _headerRows
 * @param {{joins: Record<string, Array<{utility_id: number, state: string}>>, retrieved: string}} ctx
 */
export function normalize(rates, _headerRows, { joins, retrieved }) {
  if (!Array.isArray(rates)) return { rows: [], problems: ['the bulk file is not a JSON array of rates'] };
  const problems = [];
  const states = new Map();
  for (const r of [...(joins['eia-861/sales'] ?? []), ...(joins['eia-861/service_territory'] ?? [])]) {
    if (!states.has(r.utility_id)) states.set(r.utility_id, new Set());
    states.get(r.utility_id).add(r.state);
  }
  const rows = [];
  for (const r of rates) {
    const label = r._id?.$oid;
    if (!label || typeof r.eiaId !== 'number') { problems.push(`a rate has no label or no EIA utility id: ${JSON.stringify(r).slice(0, 80)}`); continue; }
    const end = urdbDate(r.endDate ?? r.enddate);
    if (end && end <= retrieved) continue;
    const base = {
      label, utility_id: r.eiaId,
      ...Object.fromEntries(TEXT_FIELDS.map(([name, key]) => [name, str(r[key])])),
      approved: yn(r.approved), is_default: yn(r.is_default),
      effective_date: urdbDate(r.effectiveDate), end_date: end,
      last_revised: (r.revisions ?? []).map((x) => urdbDate(x.date)).filter(Boolean).sort().at(-1) ?? null,
      ...Object.fromEntries(NUMBER_FIELDS.map(([name, key]) => [name, num(r[key])])),
      ...Object.fromEntries(JSON_FIELDS.map(([name, key]) => [name, r[key] === undefined ? null : JSON.stringify(r[key])])),
    };
    const where = [...(states.get(r.eiaId) ?? [])].sort();
    if (!where.length) rows.push({ ...base, state: null, utility_states: 0 });
    for (const st of where) rows.push({ ...base, state: st, utility_states: where.length });
  }
  return { rows, problems };
}
