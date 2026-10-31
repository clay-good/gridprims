// EIA-860, Annual Electric Generator Report: every US power plant of 1 MW or
// more and its generators (operable, proposed, and retired), with capacity,
// technology, fuel, and dates. Two tables from one release zip.

export default {
  id: 'eia-860',
  title: 'Annual Electric Generator Report (Form EIA-860)',
  shortTitle: 'EIA-860: power plants and generators',
  description: { contains: 'Every US power plant of 1 MW or more and its generators, operable, proposed, and retired, with capacity, technology, fuel, and dates, as of the end of 2025.', excludes: 'No coordinates, street addresses, grid voltages, or pipeline names; no generation (that is EIA-923).' },
  publisher: 'U.S. Energy Information Administration',
  sourceUrl: 'https://www.eia.gov/electricity/data/eia860/',
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
  attribution: 'Source: U.S. Energy Information Administration, Form EIA-860 ({asOfMonth}).',
  cadence: { every: 'annual', nextRelease: { date: '2027-09-30', posted: false, note: 'EIA posts an early release each June and the final release each September; the date is inferred, not posted' } },
  // Plants are grid infrastructure, so the full screen applies. Pages and shards
  // carry county-level location only (add-public-grid-data design D2).
  ceii: {
    infrastructure: true,
    note: 'Plant and generator characteristics EIA publishes for every plant of 1 MW or more. Coordinates, street addresses, grid voltages, transmission owners, and pipeline names are left out of our tables.',
    checklist: { publicSourceOnly: true, noPlanningModels: true, noSubstationPoints: true, noOneLineDiagrams: true, noBusImpedances: true, noNdaData: true },
  },
  owner: 'add-public-grid-data',
  // EIA posts the newest final year under xls/ and moves older years to archive/xls/.
  releaseWatch: {
    urls: ['https://www.eia.gov/electricity/data/eia860/xls/eia860{year}.zip', 'https://www.eia.gov/electricity/data/eia860/archive/xls/eia860{year}.zip'],
  },
  vintages: {
    2025: { url: 'https://www.eia.gov/electricity/data/eia860/xls/eia8602025.zip', asOf: '2026-09-10', sha256: '2b27929d26cc1da9ad6a530da1cac6718cd8496098ee560c4d47cfffd96d08ba' },
  },
  recipe: [
    { step: 'fetch', url: '{vintage.url}' },
  ],
  tables: [
    {
      name: 'plants',
      title: 'Power plants with operator, county, and balancing authority',
      recipe: [
        { step: 'unzip', entry: '2___Plant_Y{year}.xlsx' },
        { step: 'read-xlsx', sheets: ['Plant'], headerRows: 2 },
        { step: 'normalize', module: 'eia-860-plants' },
        { step: 'validate', key: ['plant_id'], rows: { min: 14000, max: 22000, maxDropPct: 5, maxRisePct: 25, from: 'vintages 2023 (15,068 rows), 2024 (16,132), and 2025 (17,349); largest yearly change +7.5%' } },
        { step: 'partition', by: 'state' },
        { step: 'write-shards' },
        { step: 'write-csv-gz' },
      ],
    },
    {
      name: 'generators',
      title: 'Generators: operable, proposed, and retired or canceled, with capacity, fuel, and dates',
      // The changelog lists the five largest nameplate changes (a revised final release, for one).
      changelog: { column: 'nameplate_mw' },
      recipe: [
        { step: 'unzip', entry: '3_1_Generator_Y{year}.xlsx' },
        { step: 'read-xlsx', sheets: ['Operable', 'Proposed', 'Retired and Canceled'], headerRows: 2 },
        { step: 'normalize', module: 'eia-860-generators' },
        { step: 'validate', key: ['plant_id', 'generator_id', 'category'], rows: { min: 30000, max: 45000, maxDropPct: 5, maxRisePct: 25, from: 'vintages 2023 (33,438 rows), 2024 (34,855), and 2025 (36,573); largest yearly change +4.9%' } },
        { step: 'partition', by: 'state' },
        { step: 'write-shards' },
        { step: 'write-csv-gz' },
      ],
    },
  ],
};
