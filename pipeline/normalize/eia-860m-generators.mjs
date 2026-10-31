// Normalize EIA-860M, the monthly generator inventory ("Operating", "Planned",
// "Retired", and "Canceled or Postponed" sheets; the Puerto Rico sheets are
// left out, as every other table here is the 50 states and DC). One row per
// generator, its sheet as its category. Location stops at the county: EIA's
// latitude, longitude, and map links stay in its file.

const LEAD = ['Entity ID', 'Entity Name', 'Plant ID', 'Plant Name', 'Google Map', 'Bing Map', 'Plant State', 'County', 'Balancing Authority Code', 'Sector', 'Generator ID', 'Unit Code',
  'Nameplate Capacity (MW)', 'Net Summer Capacity (MW)', 'Net Winter Capacity (MW)', 'Technology', 'Energy Source Code', 'Prime Mover Code'];
const PLANNED_MODS = ['Planned Derate Year', 'Planned Derate Month', 'Planned Derate of Summer Capacity (MW)', 'Planned Uprate Year', 'Planned Uprate Month', 'Planned Uprate of Summer Capacity (MW)',
  'Planned Repower Year', 'Planned Repower Month', 'Other Modification Year', 'Other Modification Month'];

/** Each sheet's header in the files checked (August and September 2026). A change fails the schema check. */
export const EXPECTED_HEADERS = {
  Operating: [...LEAD, 'Operating Month', 'Operating Year', 'Planned Retirement Month', 'Planned Retirement Year', 'Status', 'Nameplate Energy Capacity (MWh)', 'DC Net Capacity (MW)', ...PLANNED_MODS, 'Latitude', 'Longitude'],
  Planned: [...LEAD, 'Planned Operation Month', 'Planned Operation Year', 'Status', 'Latitude', 'Longitude'],
  Retired: [...LEAD, 'Operating Month', 'Operating Year', 'Retirement Month', 'Retirement Year', 'Nameplate Energy Capacity (MWh)', 'DC Net Capacity (MW)', 'Latitude', 'Longitude'],
  'Canceled or Postponed': [...LEAD, 'Latitude', 'Longitude'],
};
const CATEGORY = { Operating: 'operating', Planned: 'planned', Retired: 'retired', 'Canceled or Postponed': 'canceled_or_postponed' };
const HEADER_ROWS = 3; // two title rows, then the header

/** [output name, type, EIA header (one name for every sheet that has it), unit]. */
const COLUMNS = [
  ['plant_id', 'f64', 'Plant ID'], ['generator_id', 'str', 'Generator ID'], ['category', 'str', null],
  ['utility_id', 'f64', 'Entity ID'], ['utility_name', 'str', 'Entity Name'], ['plant_name', 'str', 'Plant Name'], ['state', 'str', 'Plant State'], ['county', 'str', 'County'],
  ['ba_code', 'str', 'Balancing Authority Code'], ['sector_name', 'str', 'Sector'], ['technology', 'str', 'Technology'], ['energy_source', 'str', 'Energy Source Code'],
  ['prime_mover', 'str', 'Prime Mover Code'], ['status', 'str', 'Status'], ['status_description', 'str', 'Status'],
  ['nameplate_mw', 'f64', 'Nameplate Capacity (MW)', 'MW'], ['summer_mw', 'f64', 'Net Summer Capacity (MW)', 'MW'], ['winter_mw', 'f64', 'Net Winter Capacity (MW)', 'MW'],
  ['energy_capacity_mwh', 'f64', 'Nameplate Energy Capacity (MWh)', 'MWh'], ['dc_net_mw', 'f64', 'DC Net Capacity (MW)', 'MW'],
  ['operating_month', 'f64', 'Operating Month'], ['operating_year', 'f64', 'Operating Year'],
  ['planned_retirement_month', 'f64', 'Planned Retirement Month'], ['planned_retirement_year', 'f64', 'Planned Retirement Year'],
  ['planned_operation_month', 'f64', 'Planned Operation Month'], ['planned_operation_year', 'f64', 'Planned Operation Year'],
  ['retirement_month', 'f64', 'Retirement Month'], ['retirement_year', 'f64', 'Retirement Year'],
];
export const SCHEMA = COLUMNS.map(([name, type, , unit]) => ({ name, type, ...(unit ? { unit } : {}) }));

const value = (c) => (c === null || c === undefined ? null : c.value);
const text = (c) => { const v = value(c); return v === null || String(v).trim() === '' ? null : String(v).trim(); };
const number = (c) => { const v = value(c); return typeof v === 'number' ? v : null; };
/** "(SB) Standby/Backup: available for service but not normally used" holds the code SB. */
const statusCode = (s) => s?.match(/^\(([A-Z]{1,3})\)/)?.[1] ?? null;

/** @param {Record<string, any[][]>} sheets */
export function normalize(sheets) {
  const problems = [];
  const out = [];
  for (const [sheet, expected] of Object.entries(EXPECTED_HEADERS)) {
    const rows = sheets[sheet];
    const header = rows[HEADER_ROWS - 1].map((c) => text(c) ?? '');
    expected.forEach((h, i) => { if (header[i] !== h) problems.push(`${sheet} column ${i + 1} is "${header[i]}", expected "${h}"`); });
    const at = COLUMNS.map(([, , h]) => (h ? expected.indexOf(h) : -1));
    for (const r of rows.slice(HEADER_ROWS)) {
      if (!Number.isInteger(value(r[2]))) continue; // EIA's notes
      out.push(Object.fromEntries(COLUMNS.map(([name, type], k) => {
        if (name === 'category') return [name, CATEGORY[sheet]];
        if (at[k] < 0) return [name, null];
        if (name === 'status') return [name, statusCode(text(r[at[k]]))];
        return [name, type === 'f64' ? number(r[at[k]]) : text(r[at[k]])];
      })));
    }
  }
  return { rows: out, problems };
}
