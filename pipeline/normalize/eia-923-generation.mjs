// Normalize EIA-923 Page 1 ("Generation and Fuel Data" sheet) into one row per
// plant, nuclear unit, prime mover, fuel, state, and sector: annual and
// monthly net generation (MWh) and fuel consumed. Plant 99999 rows are EIA's
// state-fuel level increments (its estimate for plants that report annually)
// and are kept, so state sums match EIA's totals. EIA's "." becomes null.

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const monthly = (prefix) => MONTHS.map((m) => `${prefix}\r\n${m}`);

/** The header EIA has used in every vintage checked (2023, 2024, 2025). A change fails the schema check. */
export const EXPECTED_HEADER = ['Plant Id', 'Combined Heat And\r\nPower Plant', 'Nuclear Unit Id', 'Plant Name', 'Operator Name', 'Operator Id', 'Plant State', 'Census Region',
  'NERC Region', 'Reserved', 'NAICS Code', 'EIA Sector Number', 'Sector Name', 'Reported\r\nPrime Mover', 'Reported\r\nFuel Type Code', 'MER\r\nFuel Type Code',
  'Balancing\r\nAuthority Code', 'Respondent\r\nFrequency', 'Physical\r\nUnit Label', ...monthly('Quantity'), ...monthly('Elec_Quantity'), ...monthly('MMBtuPer_Unit'),
  ...monthly('Tot_MMBtu'), ...monthly('Elec_MMBtu'), ...monthly('Netgen'), 'Total Fuel Consumption\r\nQuantity', 'Electric Fuel Consumption\r\nQuantity',
  'Total Fuel Consumption\r\nMMBtu', 'Elec Fuel Consumption\r\nMMBtu', 'Net Generation\r\n(Megawatthours)', 'YEAR'];

/** [output name, EIA header, type, unit]. */
const KEPT = [
  ['plant_id', 'Plant Id', 'f64'], ['nuclear_unit_id', 'Nuclear Unit Id', 'str'], ['prime_mover', 'Reported\r\nPrime Mover', 'str'], ['fuel_type', 'Reported\r\nFuel Type Code', 'str'],
  ['state', 'Plant State', 'str'], ['sector', 'EIA Sector Number', 'f64'], ['sector_name', 'Sector Name', 'str'], ['mer_fuel_type', 'MER\r\nFuel Type Code', 'str'],
  ['plant_name', 'Plant Name', 'str'], ['operator_id', 'Operator Id', 'f64'], ['operator_name', 'Operator Name', 'str'], ['chp', 'Combined Heat And\r\nPower Plant', 'str'],
  ['census_region', 'Census Region', 'str'], ['nerc_region', 'NERC Region', 'str'], ['naics', 'NAICS Code', 'f64'], ['ba_code', 'Balancing\r\nAuthority Code', 'str'],
  ['respondent_frequency', 'Respondent\r\nFrequency', 'str'], ['physical_unit', 'Physical\r\nUnit Label', 'str'],
  ['fuel_total_quantity', 'Total Fuel Consumption\r\nQuantity', 'f64', 'physical units'], ['fuel_electric_quantity', 'Electric Fuel Consumption\r\nQuantity', 'f64', 'physical units'],
  ['fuel_total_mmbtu', 'Total Fuel Consumption\r\nMMBtu', 'f64', 'MMBtu'], ['fuel_electric_mmbtu', 'Elec Fuel Consumption\r\nMMBtu', 'f64', 'MMBtu'],
  ['net_generation_mwh', 'Net Generation\r\n(Megawatthours)', 'f64', 'MWh'],
  ...MONTHS.map((m, k) => [`net_generation_mwh_${String(k + 1).padStart(2, '0')}`, `Netgen\r\n${m}`, 'f64', 'MWh']),
  ['data_year', 'YEAR', 'f64'],
];
export const SCHEMA = KEPT.map(([name, , type, unit]) => ({ name, type, ...(unit ? { unit } : {}) }));

const value = (c) => (c === null || c === undefined ? null : c.value);
const text = (c) => { const v = value(c); return v === null || String(v).trim() === '' || String(v).trim() === '.' ? null : String(v).trim(); };
const number = (c) => { const v = value(c); return typeof v === 'number' ? v : null; };

/**
 * A frame row: no state, no name, and every quantity zero. EIA's 2025 file has
 * one (plant 8825, absent from EIA-860); it carries nothing to keep.
 * Pinned by verify/fixtures/data/eia-923/blank-frame-row.json.
 */
export const isBlankFrameRow = (r) => text(r[6]) === null && text(r[3]) === null && r.slice(19, EXPECTED_HEADER.length - 1).every((c) => (number(c) ?? 0) === 0);

/** @param {any[][]} rows @param {number} headerRows */
export function normalize(rows, headerRows) {
  const header = rows[headerRows - 1].map((c) => (value(c) === null ? '' : String(value(c)).trim()));
  const problems = [];
  EXPECTED_HEADER.forEach((h, i) => { if (header[i] !== h) problems.push(`column ${i + 1} is "${header[i]}", expected "${h}"`); });
  const at = KEPT.map(([, h]) => EXPECTED_HEADER.indexOf(h));
  const out = rows.slice(headerRows).filter((r) => Number.isInteger(value(r[0])) && !isBlankFrameRow(r)).map((r) =>
    Object.fromEntries(KEPT.map(([name, , type], k) => [name, type === 'f64' ? number(r[at[k]]) : text(r[at[k]])])));
  return { rows: out, problems };
}
