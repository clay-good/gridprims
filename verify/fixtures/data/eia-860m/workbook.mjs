// A small workbook shaped exactly like EIA-860M (two title rows, the header,
// status text with its code in parentheses, coordinates and map links, the
// notes row, and the Puerto Rico sheets), for offline pipeline tests.

import { writeXlsx } from '../../../lib/zip-writer.mjs';
import { EXPECTED_HEADERS } from '../../../../pipeline/normalize/eia-860m-generators.mjs';

const gen = (sheet, f) => {
  const h = EXPECTED_HEADERS[sheet];
  const r = Array(h.length).fill(' ');
  const base = { 'Entity ID': 5701, 'Entity Name': 'El Paso Electric Co', 'Plant ID': 9, 'Plant Name': 'Copper', 'Google Map': 'Map', 'Bing Map': 'Map', 'Plant State': 'TX', County: 'El Paso',
    'Balancing Authority Code': 'EPE', Sector: 'Electric Utility', 'Unit Code': '', Technology: 'Natural Gas Fired Combustion Turbine', 'Energy Source Code': 'NG', 'Prime Mover Code': 'GT', Latitude: 31.7569, Longitude: -106.375 };
  for (const [k, v] of Object.entries({ ...base, ...f })) if (h.includes(k)) r[h.indexOf(k)] = v;
  return r;
};
export const sheets = () => ({
  Operating: [
    gen('Operating', { 'Generator ID': '1', 'Nameplate Capacity (MW)': 86.9, 'Net Summer Capacity (MW)': 63, 'Net Winter Capacity (MW)': 65, 'Operating Month': 7, 'Operating Year': 1980, 'Planned Retirement Month': 12, 'Planned Retirement Year': 2028, Status: '(OP) Operating' }),
    gen('Operating', { 'Generator ID': 'BAT1', 'Nameplate Capacity (MW)': 50, 'Net Summer Capacity (MW)': 50, 'Net Winter Capacity (MW)': 50, Technology: 'Batteries', 'Energy Source Code': 'MWH', 'Prime Mover Code': 'BA', 'Operating Month': 3, 'Operating Year': 2024, Status: '(SB) Standby/Backup: available for service but not normally used', 'Nameplate Energy Capacity (MWh)': 200 }),
  ],
  Planned: [gen('Planned', { 'Plant ID': 63798, 'Plant Name': 'Atlas', 'Plant State': 'AZ', County: 'La Paz', 'Generator ID': 'ATL01', 'Nameplate Capacity (MW)': 300, 'Net Summer Capacity (MW)': 300, 'Net Winter Capacity (MW)': 300, Technology: 'Solar Photovoltaic', 'Planned Operation Month': 9, 'Planned Operation Year': 2026, Status: '(V) Under construction, more than 50 percent complete' })],
  Retired: [gen('Retired', { 'Generator ID': '2', 'Nameplate Capacity (MW)': 20, 'Net Summer Capacity (MW)': 18, 'Net Winter Capacity (MW)': 19, 'Operating Month': 6, 'Operating Year': 1955, 'Retirement Month': 9, 'Retirement Year': 2026 })],
  'Canceled or Postponed': [gen('Canceled or Postponed', { 'Plant ID': 54, 'Plant Name': 'J K Smith', 'Plant State': 'KY', County: 'Clark', 'Generator ID': 'GT11', 'Nameplate Capacity (MW)': 98, 'Net Summer Capacity (MW)': 74, 'Net Winter Capacity (MW)': 98 })],
});

const NOTE = ['NOTES:\r\nCapacity from facilities with a total generator nameplate capacity less than 1 MW are excluded from this report.'];

/** @param {{sheets?: ReturnType<typeof sheets>, header?: Record<string, string[]>}} [o] */
export function eia860mXlsx(o = {}) {
  const s = o.sheets ?? sheets();
  const page = (name) => [['U.S. Energy Information Administration'], ['Preliminary Monthly Electric Generator Inventory'], o.header?.[name] ?? EXPECTED_HEADERS[name], ...s[name], NOTE];
  return writeXlsx({ Operating: page('Operating'), Planned: page('Planned'), Retired: page('Retired'), 'Canceled or Postponed': page('Canceled or Postponed'), Operating_PR: [[]], Planned_PR: [[]], Retired_PR: [[]] });
}
