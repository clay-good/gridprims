// Normalize EIA-860 Schedule 2 ("Plant" sheet) into one row per plant. Location
// stops at the county (add-public-grid-data design D2): street address, city,
// ZIP, latitude, and longitude stay in EIA's own file, which the data page links.
// Grid voltages, transmission owners, and gas pipeline names are left out too.

/** The header EIA has used in every vintage checked (2023, 2024, 2025). A change fails the schema check. */
export const EXPECTED_HEADER = ['Utility ID', 'Utility Name', 'Plant Code', 'Plant Name', 'Street Address', 'City', 'State', 'Zip', 'County', 'Latitude', 'Longitude',
  'NERC Region', 'Balancing Authority Code', 'Balancing Authority Name', 'Name of Water Source', 'Primary Purpose (NAICS Code)', 'Regulatory Status', 'Sector', 'Sector Name',
  'FERC Cogeneration Status', 'FERC Cogeneration Docket Number', 'FERC Small Power Producer Status', 'FERC Small Power Producer Docket Number',
  'FERC Exempt Wholesale Generator Status', 'FERC Exempt Wholesale Generator Docket Number', 'Ash Impoundment?', 'Ash Impoundment Lined?', 'Ash Impoundment Status',
  'Transmission or Distribution System Owner', 'Transmission or Distribution System Owner ID', 'Transmission or Distribution System Owner State',
  'Grid Voltage (kV)', 'Grid Voltage 2 (kV)', 'Grid Voltage 3 (kV)', 'Energy Storage', 'Natural Gas LDC Name',
  'Natural Gas Pipeline Name 1', 'Natural Gas Pipeline Name 2', 'Natural Gas Pipeline Name 3', 'Pipeline Notes', 'Natural Gas Storage', 'Liquefied Natural Gas Storage'];

/** Kept columns: [output name, EIA header, type]. */
const KEPT = [
  ['plant_id', 'Plant Code', 'f64'], ['plant_name', 'Plant Name', 'str'], ['utility_id', 'Utility ID', 'f64'], ['utility_name', 'Utility Name', 'str'],
  ['state', 'State', 'str'], ['county', 'County', 'str'], ['nerc_region', 'NERC Region', 'str'],
  ['ba_code', 'Balancing Authority Code', 'str'], ['ba_name', 'Balancing Authority Name', 'str'],
  ['primary_purpose_naics', 'Primary Purpose (NAICS Code)', 'f64'], ['regulatory_status', 'Regulatory Status', 'str'],
  ['sector', 'Sector', 'f64'], ['sector_name', 'Sector Name', 'str'],
];
export const SCHEMA = KEPT.map(([name, , type]) => ({ name, type }));

const value = (c) => (c === null || c === undefined ? null : c.value);
const text = (c) => { const v = value(c); return v === null || String(v).trim() === '' ? null : String(v).trim(); };
const number = (c) => { const v = value(c); return typeof v === 'number' ? v : null; };

/** @param {{Plant: any[][]}} sheets @param {number} headerRows */
export function normalize(sheets, headerRows) {
  const rows = sheets.Plant;
  const header = rows[headerRows - 1].map((c) => text(c) ?? '');
  const problems = [];
  EXPECTED_HEADER.forEach((h, i) => { if (header[i] !== h) problems.push(`column ${i + 1} is "${header[i]}", expected "${h}"`); });
  const at = KEPT.map(([, h]) => EXPECTED_HEADER.indexOf(h));
  const out = rows.slice(headerRows).filter((r) => Number.isInteger(value(r[2]))).map((r) =>
    Object.fromEntries(KEPT.map(([name, , type], k) => [name, type === 'f64' ? number(r[at[k]]) : text(r[at[k]])])));
  return { rows: out, problems };
}
