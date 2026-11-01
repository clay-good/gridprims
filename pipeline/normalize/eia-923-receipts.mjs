// Normalize EIA-923 Page 5 ("Fuel Receipts and Costs" sheet) into one row per
// fuel delivery a plant reported, in EIA's own order: month, plant, fuel,
// quantity, heat content, and delivered cost. EIA withholds the cost of many
// deliveries (largely to independent power producers) and writes a blank or
// "."; that stays null, never zero. Supplier, mine, and quality fields beyond
// heat content are not kept.

/** The header EIA has used in the 2025 file. A change fails the schema check. */
export const EXPECTED_HEADER = ['YEAR', 'MONTH', 'Plant Id', 'Plant Name', 'Plant State', 'Purchase Type', 'Contract\r\nExpiration Date', 'ENERGY_SOURCE', 'FUEL_GROUP',
  'Coalmine\r\nType', 'Coalmine\r\nState', 'Coalmine\r\nCounty', 'Coalmine\r\nMsha Id', 'Coalmine\r\nName', 'SUPPLIER', 'QUANTITY', 'Average Heat\r\nContent',
  'Average Sulfur\r\nContent', 'Average Ash\r\nContent', 'Average Mercury\r\nContent', 'FUEL_COST', 'Regulated', 'Operator Name', 'Operator Id', 'Reporting\r\nFrequency',
  'Primary Transportation Mode', 'Secondary Transportation Mode', 'Natural Gas Supply Contract Type', 'Natural Gas Delivery Contract Type', 'Moisture\r\nContent',
  'Chlorine\r\nContent', 'Balancing\r\nAuthority Code'];

/** [output name, EIA header, type, unit]. */
const KEPT = [
  ['month', 'MONTH', 'f64'], ['plant_id', 'Plant Id', 'f64'], ['plant_name', 'Plant Name', 'str'], ['state', 'Plant State', 'str'],
  ['ba_code', 'Balancing\r\nAuthority Code', 'str'], ['purchase_type', 'Purchase Type', 'str'], ['energy_source', 'ENERGY_SOURCE', 'str'], ['fuel_group', 'FUEL_GROUP', 'str'],
  ['quantity', 'QUANTITY', 'f64', 'physical units'], ['heat_content', 'Average Heat\r\nContent', 'f64', 'MMBtu per physical unit'],
  ['fuel_cost', 'FUEL_COST', 'f64', 'cents per MMBtu'], ['regulated', 'Regulated', 'str'],
  ['operator_id', 'Operator Id', 'f64'], ['operator_name', 'Operator Name', 'str'], ['reporting_frequency', 'Reporting\r\nFrequency', 'str'], ['data_year', 'YEAR', 'f64'],
];
export const SCHEMA = [{ name: 'line', type: 'f64' }, ...KEPT.map(([name, , type, unit]) => ({ name, type, ...(unit ? { unit } : {}) }))];

const value = (c) => (c === null || c === undefined ? null : c.value);
const text = (c) => { const v = value(c); return v === null || String(v).trim() === '' || String(v).trim() === '.' ? null : String(v).trim(); };
const number = (c) => { const v = value(c); return typeof v === 'number' ? v : null; };

/** @param {any[][]} rows @param {number} headerRows */
export function normalize(rows, headerRows) {
  const header = rows[headerRows - 1].map((c) => (value(c) === null ? '' : String(value(c)).trim()));
  const problems = [];
  EXPECTED_HEADER.forEach((h, i) => { if (header[i] !== h) problems.push(`column ${i + 1} is "${header[i]}", expected "${h}"`); });
  const at = KEPT.map(([, h]) => EXPECTED_HEADER.indexOf(h));
  // line: the delivery's place in EIA's file, the only key (two deliveries can share every other field).
  const out = rows.slice(headerRows).filter((r) => Number.isInteger(value(r[2]))).map((r, i) =>
    ({ line: i + 1, ...Object.fromEntries(KEPT.map(([name, , type], k) => [name, type === 'f64' ? number(r[at[k]]) : text(r[at[k]])])) }));
  return { rows: out, problems };
}
