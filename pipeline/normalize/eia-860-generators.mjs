// Normalize EIA-860 Schedule 3 ("Operable", "Proposed", and "Retired and
// Canceled" sheets) into one row per generator, with the sheet it came from as
// its category. Each sheet's dates mean different things, so each gets its own
// columns: operating and planned retirement dates (operable), the current
// planned operation date (proposed), and the retirement date (retired; EIA's
// third sheet also holds canceled proposals, told apart by status CN).
// EIA's " " placeholders become null.

const COMMON = ['Utility ID', 'Utility Name', 'Plant Code', 'Plant Name', 'State', 'County', 'Generator ID', 'Technology', 'Prime Mover', 'Unit Code', 'Ownership',
  'Duct Burners', 'Can Bypass Heat Recovery Steam Generator?', 'RTO/ISO LMP Node Designation', 'RTO/ISO Location Designation for Reporting Wholesale Sales Data to FERC',
  'Nameplate Capacity (MW)', 'Nameplate Power Factor', 'Summer Capacity (MW)', 'Winter Capacity (MW)'];

/** The leading columns of each sheet in every vintage checked (2023, 2024, 2025), through the last column we read. */
export const EXPECTED_HEADERS = {
  Operable: [...COMMON, 'Minimum Load (MW)', 'Uprate or Derate Completed During Year', 'Month Uprate or Derate Completed', 'Year Uprate or Derate Completed', 'Status',
    'Synchronized to Transmission Grid', 'Operating Month', 'Operating Year', 'Planned Retirement Month', 'Planned Retirement Year', 'Associated with Combined Heat and Power System',
    'Sector Name', 'Sector', 'Topping or Bottoming', 'Energy Source 1', 'Energy Source 2'],
  Proposed: [...COMMON, 'Status', 'Effective Month', 'Effective Year', 'Current Month', 'Current Year', 'Associated with Combined Heat and Power System', 'Sector Name', 'Sector',
    'Previously Canceled', 'Energy Source 1', 'Energy Source 2'],
  'Retired and Canceled': [...COMMON, 'Minimum Load (MW)', 'Uprate or Derate Completed During Year', 'Month Uprate or Derate Completed', 'Year Uprate or Derate Completed', 'Status',
    'Synchronized to Transmission Grid', 'Operating Month', 'Operating Year', 'Retirement Month', 'Retirement Year', 'Associated with Combined Heat and Power System',
    'Sector Name', 'Sector', 'Topping or Bottoming', 'Energy Source 1', 'Energy Source 2'],
};
const CATEGORY = { Operable: 'operable', Proposed: 'proposed', 'Retired and Canceled': 'retired_or_canceled' };

/** [output name, type, EIA header, or per-sheet headers when the sheets differ]. */
const COLUMNS = [
  ['plant_id', 'f64', 'Plant Code'], ['generator_id', 'str', 'Generator ID'], ['category', 'str', null],
  ['utility_id', 'f64', 'Utility ID'], ['utility_name', 'str', 'Utility Name'], ['plant_name', 'str', 'Plant Name'], ['state', 'str', 'State'], ['county', 'str', 'County'],
  ['technology', 'str', 'Technology'], ['prime_mover', 'str', 'Prime Mover'], ['ownership', 'str', 'Ownership'], ['status', 'str', 'Status'],
  ['nameplate_mw', 'f64', 'Nameplate Capacity (MW)', 'MW'], ['summer_mw', 'f64', 'Summer Capacity (MW)', 'MW'], ['winter_mw', 'f64', 'Winter Capacity (MW)', 'MW'],
  ['energy_source_1', 'str', 'Energy Source 1'], ['energy_source_2', 'str', 'Energy Source 2'], ['sector', 'f64', 'Sector'], ['sector_name', 'str', 'Sector Name'],
  ['operating_month', 'f64', { Operable: 'Operating Month', 'Retired and Canceled': 'Operating Month' }],
  ['operating_year', 'f64', { Operable: 'Operating Year', 'Retired and Canceled': 'Operating Year' }],
  ['planned_retirement_month', 'f64', { Operable: 'Planned Retirement Month' }], ['planned_retirement_year', 'f64', { Operable: 'Planned Retirement Year' }],
  ['planned_operation_month', 'f64', { Proposed: 'Current Month' }], ['planned_operation_year', 'f64', { Proposed: 'Current Year' }],
  ['retirement_month', 'f64', { 'Retired and Canceled': 'Retirement Month' }], ['retirement_year', 'f64', { 'Retired and Canceled': 'Retirement Year' }],
];
export const SCHEMA = COLUMNS.map(([name, type, , unit]) => ({ name, type, ...(unit ? { unit } : {}) }));

const value = (c) => (c === null || c === undefined ? null : c.value);
const text = (c) => { const v = value(c); return v === null || String(v).trim() === '' ? null : String(v).trim(); };
const number = (c) => { const v = value(c); return typeof v === 'number' ? v : null; };

/** @param {Record<string, any[][]>} sheets @param {number} headerRows */
export function normalize(sheets, headerRows) {
  const problems = [];
  const out = [];
  for (const [sheet, expected] of Object.entries(EXPECTED_HEADERS)) {
    const rows = sheets[sheet];
    const header = rows[headerRows - 1].map((c) => text(c) ?? '');
    expected.forEach((h, i) => { if (header[i] !== h) problems.push(`${sheet} column ${i + 1} is "${header[i]}", expected "${h}"`); });
    const at = COLUMNS.map(([, , h]) => { const name = typeof h === 'string' ? h : h?.[sheet]; return name ? expected.indexOf(name) : -1; });
    for (const r of rows.slice(headerRows)) {
      if (!Number.isInteger(value(r[2]))) continue; // EIA's note rows
      out.push(Object.fromEntries(COLUMNS.map(([name, type], k) => {
        if (name === 'category') return [name, CATEGORY[sheet]];
        if (at[k] < 0) return [name, null];
        return [name, type === 'f64' ? number(r[at[k]]) : text(r[at[k]])];
      })));
    }
  }
  return { rows: out, problems };
}
