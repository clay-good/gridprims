// Small workbooks shaped exactly like EIA-860's Schedule 2 "Plant" sheet and
// Schedule 3's "Operable", "Proposed", and "Retired and Canceled" sheets (a
// title row, the header, " " placeholders, EIA's note rows), zipped the way
// EIA ships them, for offline pipeline tests.

import { writeXlsx, writeZip } from '../../../lib/zip-writer.mjs';
import { EXPECTED_HEADER as PLANT_HEADER } from '../../../../pipeline/normalize/eia-860-plants.mjs';
import { EXPECTED_HEADERS } from '../../../../pipeline/normalize/eia-860-generators.mjs';

/** A plant row in EIA's column order, with the street address and coordinates EIA publishes. */
const plant = (utility, uname, code, name, state, county, ba) => {
  const r = Array(PLANT_HEADER.length).fill('');
  Object.assign(r, { 0: utility, 1: uname, 2: code, 3: name, 4: '100 Power Plant Way', 5: 'Springfield', 6: state, 7: 62701, 8: county, 9: 39.8017, 10: -89.6436, 11: 'SERC', 12: ba, 13: `${ba} authority`, 15: 22, 16: 'RE', 17: 1, 18: 'Electric Utility', 31: 138 });
  return r;
};
export const plantRows = () => [
  plant(5701, 'El Paso Electric Co', 9, 'Copper', 'TX', 'El Paso', 'EPE'),
  plant(5701, 'El Paso Electric Co', 10, 'Newman', 'TX', 'El Paso', 'EPE'),
  plant(189, 'PowerSouth Energy Cooperative', 56, 'Lowman Energy Center', 'AL', 'Washington', 'PS'),
];

/** A generator row for one sheet, filled by header name. */
const gen = (sheet, fields) => {
  const h = EXPECTED_HEADERS[sheet];
  const r = Array(h.length + 10).fill(' ');
  for (const [k, v] of Object.entries(fields)) r[h.indexOf(k)] = v;
  return r;
};
const base = (code, id, mw) => ({ 'Utility ID': 5701, 'Utility Name': 'El Paso Electric Co', 'Plant Code': code, 'Plant Name': code === 9 ? 'Copper' : 'Newman', State: 'TX', County: 'El Paso', 'Generator ID': id,
  Technology: 'Natural Gas Fired Combustion Turbine', 'Prime Mover': 'GT', Ownership: 'S', 'Nameplate Capacity (MW)': mw, 'Summer Capacity (MW)': mw - 10, 'Winter Capacity (MW)': mw - 8,
  'Sector Name': 'Electric Utility', Sector: 1, 'Energy Source 1': 'NG' });
export const generatorRows = () => ({
  Operable: [
    gen('Operable', { ...base(9, '1', 86.9), Status: 'OP', 'Operating Month': 7, 'Operating Year': 1980, 'Planned Retirement Month': 12, 'Planned Retirement Year': 2028 }),
    gen('Operable', { ...base(10, 'GT5', 70), Status: 'OP', 'Operating Month': 5, 'Operating Year': 2009 }),
    gen('Operable', { ...base(10, '6', 228), Status: 'SB', 'Operating Month': 1, 'Operating Year': 1975, 'Energy Source 2': 'DFO' }),
  ],
  Proposed: [gen('Proposed', { ...base(10, 'GT7', 92), 'Utility ID': 189, State: 'AL', County: 'Washington', 'Plant Code': 56, 'Plant Name': 'Lowman Energy Center', Status: 'L', 'Current Month': 11, 'Current Year': 2029 })],
  'Retired and Canceled': [gen('Retired and Canceled', { ...base(9, '2', 20), Status: 'RE', 'Operating Month': 6, 'Operating Year': 1955, 'Retirement Month': 2, 'Retirement Year': 2023 })],
});

const NOTE = ['NOTE: Information on planned capacity changes are data reported to EIA.'];

/** @param {{year?: number, plants?: any[][], generators?: Record<string, any[][]>, plantHeader?: string[]}} [o] */
export function eia860Zip(o = {}) {
  const year = o.year ?? 2025;
  const g = o.generators ?? generatorRows();
  const sheet = (name, title) => [[title], EXPECTED_HEADERS[name], ...g[name], NOTE];
  return writeZip([
    { name: `LayoutY${year}.xlsx`, data: 'x' },
    { name: `2___Plant_Y${year}.xlsx`, data: writeXlsx({ Plant: [[`${year} Form EIA-860 Data - Schedule 2, 'Plant Data'`], o.plantHeader ?? PLANT_HEADER, ...(o.plants ?? plantRows())] }) },
    { name: `3_1_Generator_Y${year}.xlsx`, data: writeXlsx({ Operable: sheet('Operable', 'Operable Units Only'), Proposed: sheet('Proposed', 'Proposed Units Only'), 'Retired and Canceled': sheet('Retired and Canceled', 'Retired & Canceled Units Only') }) },
  ]);
}

/** The real table recipes with row bounds that suit these small workbooks. */
export const smallTables = (entry) => entry.tables.map((t) => ({ ...t, recipe: t.recipe.map((s) => (s.step === 'validate' ? { ...s, rows: { ...s.rows, min: 3, max: 100 } } : s)) }));
