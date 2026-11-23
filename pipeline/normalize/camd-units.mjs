// The monitored units themselves (add-measured-plant-emissions 1.1), from EPA's
// yearly facility files: one row per unit and year, with the plant it belongs
// to, its type and fuels, the programs it reports under, and whether its
// values are apportioned across a shared stack. Latitude and longitude stay in
// EPA's file; location stops at the county.

import { facilityFilesIn, headerIndex, periodOf, splitCsvLine } from './camd-common.mjs';
import { isCode } from './camd-region-hourly.mjs';

/** [output name, EPA column, type, unit]. A missing column fails the schema check. */
const COLUMNS = [
  ['state', 'State', 'str'], ['plant_id', 'Facility ID', 'i32'], ['plant_name', 'Facility Name', 'str'], ['unit_id', 'Unit ID', 'str'],
  ['year', 'Year', 'i32'], ['county', 'County', 'str'], ['county_code', 'County Code', 'str'],
  ['source_category', 'Source Category', 'str'], ['unit_type', 'Unit Type', 'str'],
  ['primary_fuel', 'Primary Fuel Type', 'str'], ['secondary_fuel', 'Secondary Fuel Type', 'str'],
  ['so2_controls', 'SO2 Controls', 'str'], ['nox_controls', 'NOx Controls', 'str'],
  ['operating_status', 'Operating Status', 'str'], ['commercial_operation_date', 'Commercial Operation Date', 'str'],
  ['programs', 'Program Code', 'str'], ['owner_operator', 'Owner/Operator', 'str'],
  ['max_heat_input_mmbtu_hr', 'Max Hourly HI Rate (mmBtu/hr)', 'f64', 'MMBtu/hr'],
];
const GENERATORS = 'Associated Generators & Nameplate Capacity (MWe)';
const STACKS = 'Associated Stacks';
const NEEDED = [...COLUMNS.map(([, c]) => c), GENERATORS, STACKS];

export const SCHEMA = [
  { name: 'region', type: 'str', unit: 'eGRID balancing-authority code for the plant' },
  { name: 'subregion', type: 'str', unit: 'eGRID subregion for the plant' },
  { name: 'egrid_match', type: 'str', unit: 'yes when eGRID places the plant, by its ORISPL id' },
  ...COLUMNS.map(([name, , type, unit]) => ({ name, type, ...(type === 'i32' ? { scale: 1 } : {}), ...(unit ? { unit } : {}) })),
  { name: 'nameplate_mw', type: 'f64', unit: 'MW, summed over the generators EPA associates with the unit' },
  { name: 'associated_stacks', type: 'str' },
  { name: 'apportioned', type: 'str', unit: 'yes when the unit shares a stack and EPA divides the measured total' },
];

const text = (s) => (s === undefined || s.trim() === '' ? null : s.trim());
const number = (s) => { const v = text(s); return v === null ? null : Number(v); };
/** "1 (153.1)|2 (153.1)" is two generators of 153.1 MW each. */
const nameplate = (s) => {
  const mw = [...(s ?? '').matchAll(/\(([\d.]+)\)/g)].map((m) => Number(m[1]));
  return mw.length ? Math.round(mw.reduce((a, b) => a + b, 0) * 1000) / 1000 : null;
};

/**
 * @param {Record<string, () => AsyncIterable<string>>} input
 * @param {number} _headerRows
 * @param {{joins: Record<string, any[]>}} o
 */
export async function normalize(input, _headerRows, o) {
  const files = facilityFilesIn(input);
  // Plant to region and subregion, by ORISPL id alone: nothing here is matched by name.
  const plants = new Map((o?.joins?.['egrid/plants'] ?? []).map((p) => [p.plant_id, p]));
  const problems = files.length ? [] : ['no facility files to read'];
  const rows = [];
  for (const { key } of files) {
    const lines = input[key];
    if (!lines) { problems.push(`no facility file ${key}`); continue; }
    let at = null;
    for await (const line of lines()) {
      if (!at) {
        const found = headerIndex(line, NEEDED);
        if (found.missing) { problems.push(`${key}: the facility header is missing ${found.missing.join(', ')}`); break; }
        at = found.at;
        continue;
      }
      if (!line) continue;
      const f = splitCsvLine(line);
      if (!text(f[at['Facility ID']])) continue;
      const stacks = text(f[at[STACKS]]);
      const plantId = Number(text(f[at['Facility ID']]));
      const place = plants.get(plantId) ?? null;
      rows.push({
        region: isCode(place?.ba_code) ? place.ba_code : null,
        subregion: place?.subregion ?? null,
        egrid_match: place ? 'yes' : 'no',
        ...Object.fromEntries(COLUMNS.map(([name, col, type]) => [name, type === 'str' ? text(f[at[col]]) : number(f[at[col]])])),
        nameplate_mw: nameplate(f[at[GENERATORS]]),
        associated_stacks: stacks,
        apportioned: stacks ? 'yes' : 'no',
      });
    }
  }
  rows.sort((a, b) => (a.state < b.state ? -1 : a.state > b.state ? 1 : a.plant_id - b.plant_id || (a.unit_id < b.unit_id ? -1 : a.unit_id > b.unit_id ? 1 : a.year - b.year)));
  return { rows, problems, dataPeriod: periodOf(files.map((f) => f.year)) };
}
