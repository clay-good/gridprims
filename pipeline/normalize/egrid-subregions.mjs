// Normalize eGRID's subregion sheet (SRL23) into one row per subregion: output
// and emissions, the total output emission rates (for location-based Scope 2
// reporting) and the non-baseload rates (for estimating avoided emissions),
// all in lb/MWh as EPA publishes them. EPA's "--" means not available.

/** [output name, eGRID code, type, unit]. */
export const COLUMNS = [
  ['subregion', 'SUBRGN', 'str'], ['subregion_name', 'SRNAME', 'str'], ['data_year', 'YEAR', 'f64'],
  ['nameplate_mw', 'SRNAMEPCAP', 'f64', 'MW'], ['net_generation_mwh', 'SRNGENAN', 'f64', 'MWh'], ['nonbaseload_generation_mwh', 'SRNGENNB', 'f64', 'MWh'],
  ['co2_tons', 'SRCO2AN', 'f64', 'short tons'], ['co2e_tons', 'SRCO2EQA', 'f64', 'short tons'],
  ['co2_rate_lb_mwh', 'SRCO2RTA', 'f64', 'lb/MWh'], ['co2e_rate_lb_mwh', 'SRC2ERTA', 'f64', 'lb/MWh'], ['ch4_rate_lb_mwh', 'SRCH4RTA', 'f64', 'lb/MWh'], ['n2o_rate_lb_mwh', 'SRN2ORTA', 'f64', 'lb/MWh'],
  ['nox_rate_lb_mwh', 'SRNOXRTA', 'f64', 'lb/MWh'], ['so2_rate_lb_mwh', 'SRSO2RTA', 'f64', 'lb/MWh'],
  ['nonbaseload_co2_rate_lb_mwh', 'SRNBCO2', 'f64', 'lb/MWh'], ['nonbaseload_co2e_rate_lb_mwh', 'SRNBC2E', 'f64', 'lb/MWh'],
  ['nonbaseload_nox_rate_lb_mwh', 'SRNBNOX', 'f64', 'lb/MWh'], ['nonbaseload_so2_rate_lb_mwh', 'SRNBSO2', 'f64', 'lb/MWh'],
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
  const out = rows.slice(headerRows).filter((r) => text(r[at[0]])).map((r) =>
    Object.fromEntries(COLUMNS.map(([name, , type], k) => [name, type === 'f64' ? number(r[at[k]]) : text(r[at[k]])])));
  return { rows: out, problems };
}
