// EIA-861 sales, revenue, and customers for the last five data years, for
// the price and customer trends on utility pages. The same sheets as the
// eia-861 dataset's current year, one zip a year.

import eia861 from './eia-861.mjs';

const YEARS = ['2021', '2022', '2023', '2024', '2025'];
const archive = (y) => `https://www.eia.gov/electricity/data/eia861/archive/zip/f861${y}.zip`;
const SHA = {
  2021: '6008618e91bc0e70d841ebbc19283b96b66d7ac95e20b3ad553bd31a20cd7bd4',
  2022: 'fe2530295d931c3bc2340918a389745c378e0e6dc960db7c6269b52a616247e0',
  2023: '0acd67ab84cdaef09fd47b4449f2c944f8731c2b3c695ec3a97bb6c0690a4d61',
  2024: '77ce49c60ac5a6bad50c442fc401aad5404a21da875dc5cbaba353af5ede54de',
  2025: 'f59f6c732bf685fe0a1591b32227f5ce572dc0dfd26bb5caaeed128ac4e3a396',
};

const history = (name, title, entry, sheet, rows) => ({
  name, title,
  recipe: [
    { step: 'unzip', entry, files: YEARS },
    { step: 'read-xlsx', sheet, headerRows: 3 },
    { step: 'normalize', module: 'eia-861-sales-history' },
    { step: 'validate', key: ['data_year', 'utility_id', 'part', 'service_type', 'state', 'ba_code', 'seq'], rows },
    { step: 'partition', by: 'state' },
    { step: 'write-shards' },
    { step: 'write-csv-gz' },
  ],
});

export default {
  ...eia861,
  id: 'eia-861-history',
  title: 'Annual Electric Power Industry Report (Form EIA-861), 2021 to 2025',
  attribution: 'Source: U.S. Energy Information Administration, Form EIA-861, 2021 to 2025 ({asOfMonth}).',
  owner: 'add-public-grid-data',
  // A new year's release is added here by hand when the eia-861 dataset takes it, and the oldest year drops.
  releaseWatch: undefined,
  vintages: {
    2025: {
      release: '2021 to 2025', asOf: eia861.vintages[2025].asOf,
      // EIA keeps the newest year under zip/ and moves it to archive/zip/ when the next arrives.
      files: Object.fromEntries(YEARS.map((y) => [y, { url: y === '2025' ? eia861.vintages[2025].url : archive(y), sha256: SHA[y] }])),
    },
  },
  recipe: [{ step: 'fetch', url: '{vintage.files.*.url}' }],
  tables: [
    history('sales', 'Sales, revenue, and customers by utility, state, and sector, 2021 to 2025', 'Sales_Ult_Cust_{file}.xlsx', 'States', { min: 13000, max: 16000, maxDropPct: 5, maxRisePct: 25, from: 'five years of 2,800 to 2,900 rows each' }),
    history('delivery', 'Texas wires utilities\' delivery-only figures, 2021 to 2025', 'Delivery_Companies_{file}.xlsx', 'Delivery Companies', { min: 25, max: 60, maxDropPct: 30, maxRisePct: 50, from: 'five years of 6 or 7 rows each' }),
  ],
};
