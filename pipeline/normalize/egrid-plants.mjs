// Normalize eGRID's plant sheet (PLNT23: a row of long names, then a row of
// codes) into one row per plant: subregion, primary fuel, capacity,
// generation, and annual emissions as EPA publishes them (CO2 in short tons;
// pages convert to metric tons). Location stops at the county: latitude and
// longitude stay in EPA's file.

/** [output name, eGRID code, type, unit]. Only these codes are read; a missing one fails the schema check. */
export const COLUMNS = [
  ['plant_id', 'ORISPL', 'f64'], ['plant_name', 'PNAME', 'str'], ['state', 'PSTATABB', 'str'], ['county', 'CNTYNAME', 'str'],
  ['fips_state', 'FIPSST', 'str'], ['fips_county', 'FIPSCNTY', 'str'], ['data_year', 'YEAR', 'f64'],
  ['subregion', 'SUBRGN', 'str'], ['subregion_name', 'SRNAME', 'str'], ['ba_code', 'BACODE', 'str'], ['nerc_region', 'NERC', 'str'], ['iso_rto', 'ISORTO', 'str'],
  ['utility_id', 'UTLSRVID', 'f64'], ['utility_name', 'UTLSRVNM', 'str'], ['sector', 'SECTOR', 'str'],
  ['primary_fuel', 'PLPRMFL', 'str'], ['fuel_category', 'PLFUELCT', 'str'], ['chp', 'CHPFLAG', 'str'], ['pumped_storage', 'PSFLAG', 'str'],
  ['nameplate_mw', 'NAMEPCAP', 'f64', 'MW'], ['capacity_factor', 'CAPFAC', 'f64', 'fraction'],
  ['net_generation_mwh', 'PLNGENAN', 'f64', 'MWh'], ['heat_input_mmbtu', 'PLHTIANT', 'f64', 'MMBtu'],
  ['co2_tons', 'PLCO2AN', 'f64', 'short tons'], ['co2e_tons', 'PLCO2EQA', 'f64', 'short tons'], ['nox_tons', 'PLNOXAN', 'f64', 'short tons'], ['so2_tons', 'PLSO2AN', 'f64', 'short tons'],
  ['ch4_lb', 'PLCH4AN', 'f64', 'lb'], ['n2o_lb', 'PLN2OAN', 'f64', 'lb'],
  ['co2_rate_lb_mwh', 'PLCO2RTA', 'f64', 'lb/MWh'], ['co2e_rate_lb_mwh', 'PLC2ERTA', 'f64', 'lb/MWh'],
];
export const SCHEMA = COLUMNS.map(([name, , type, unit]) => ({ name, type, ...(unit ? { unit } : {}) }));

const value = (c) => (c === null || c === undefined ? null : c.value);
const text = (c) => { const v = value(c); return v === null || String(v).trim() === '' || String(v).trim() === '--' ? null : String(v).trim(); };
const number = (c) => { const v = value(c); return typeof v === 'number' ? v : null; };

/** @param {any[][]} rows @param {number} headerRows */
export function normalize(rows, headerRows) {
  const codes = rows[headerRows - 1].map((c) => text(c) ?? '');
  const problems = COLUMNS.filter(([, code]) => !codes.includes(code)).map(([, code]) => `no column ${code}`);
  const at = COLUMNS.map(([, code]) => codes.indexOf(code));
  const out = rows.slice(headerRows).filter((r) => Number.isInteger(value(r[at[0]]))).map((r) =>
    Object.fromEntries(COLUMNS.map(([name, , type], k) => [name, type === 'f64' ? number(r[at[k]]) : text(r[at[k]])])));
  return { rows: out, problems };
}
