// EIA-923, Power Plant Operations Report: net generation and fuel consumed by
// every plant, by prime mover and fuel, monthly and annual. The final annual
// file only; the monthly year-to-date file at the same address is not served.

export default {
  id: 'eia-923',
  title: 'Power Plant Operations Report (Form EIA-923)',
  shortTitle: 'EIA-923: plant generation and fuel',
  description: { contains: "Net generation by month and year and fuel consumed in 2025, by plant, prime mover, and fuel, including EIA's state-level estimates for small plants.", excludes: 'Only the final annual file, not the monthly year-to-date one; no fuel receipts, costs, or environmental data.' },
  publisher: 'U.S. Energy Information Administration',
  sourceUrl: 'https://www.eia.gov/electricity/data/eia923/',
  terms: {
    url: 'https://www.eia.gov/about/copyrights_reuse.php',
    section: 'Public domain and use of EIA content',
    // Captured 2026-10-31 from that section of the page above (the same page EIA-861 cites).
    text: 'U.S. government publications are in the public domain and are not subject to copyright protection. You may use and/or distribute any of our data, files, databases, reports, graphs, charts, and other information products that are on our website or that you receive through our email distribution service. However, if you use or reproduce any of our information products, you should use an acknowledgment, which includes the publication date, such as: "Source: U.S. Energy Information Administration (Oct 2008)."',
    captured: '2026-10-31',
  },
  redistributionBasis: { kind: 'public domain', note: 'U.S. federal government work (17 U.S.C. 105)' },
  inputLicense: 'public-domain',
  posture: 'mirror',
  factual: true,
  attribution: 'Source: U.S. Energy Information Administration, Form EIA-923 ({asOfMonth}).',
  cadence: { every: 'annual', nextRelease: { date: '2027-09-30', posted: false, note: 'EIA posts each year\'s final data around September of the next year; the date is inferred, not posted' } },
  ceii: { infrastructure: false, note: 'Generation and fuel totals by plant, prime mover, and fuel; no location beyond the state, and no network data.' },
  owner: 'add-public-grid-data',
  // f923_{year}.zip holds year-to-date monthly data all year and becomes the final
  // file the next autumn, so a new year is checked from August of the following
  // year, and a file without the final workbook is waited on, not a failure.
  releaseWatch: {
    urls: ['https://www.eia.gov/electricity/data/eia923/xls/f923_{year}.zip', 'https://www.eia.gov/electricity/data/eia923/archive/xls/f923_{year}.zip'],
    nextYearFrom: '08-01',
    finalOnly: true,
  },
  vintages: {
    2025: { url: 'https://www.eia.gov/electricity/data/eia923/xls/f923_2025.zip', asOf: '2026-09-11', sha256: '1bff7092a86f6678c069c986829da5a23104048fc1aafb65b0776e3c904284de' },
  },
  recipe: [
    { step: 'fetch', url: '{vintage.url}' },
  ],
  tables: [
    {
      name: 'generation',
      title: 'Net generation and fuel consumed by plant, prime mover, and fuel, by month',
      recipe: [
        { step: 'unzip', entry: 'EIA923_Schedules_2_3_4_5_M_12_{year}_Final*.xlsx' },
        { step: 'read-xlsx', sheet: 'Page 1 Generation and Fuel Data', headerRows: 6 },
        { step: 'normalize', module: 'eia-923-generation' },
        { step: 'quirk', name: 'state-fuel-increments', note: 'Plant 99999 rows are EIA\'s state-fuel level increments; they repeat prime mover and fuel across sectors, so sector is part of the key. A plant whose combined heat and power status changed in the year has a row for each status, so that is part of the key too.', fixture: 'verify/fixtures/data/eia-923/increments.json' },
        { step: 'quirk', name: 'blank-frame-row', note: 'A row with no state, no plant name, and every quantity zero is dropped; a stateless row with any value still fails the release.', fixture: 'verify/fixtures/data/eia-923/blank-frame-row.json' },
        { step: 'validate', key: ['plant_id', 'nuclear_unit_id', 'prime_mover', 'fuel_type', 'state', 'sector', 'chp'], rows: { min: 16000, max: 24000, maxDropPct: 5, maxRisePct: 25, from: 'vintages 2023 (17,086 rows), 2024 (17,963), and 2025 (18,888); largest yearly change +5.1%' } },
        { step: 'partition', by: 'state' },
        { step: 'write-shards' },
        { step: 'write-csv-gz' },
      ],
    },
  ],
};
