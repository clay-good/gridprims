// EIA-860M, Monthly Update to the Annual Electric Generator Report: every
// generator's status as of the latest month (operating, planned, retired,
// canceled or postponed). Plant pages read status changes here between
// EIA-860's annual releases.

export default {
  id: 'eia-860m',
  title: 'Monthly Update to the Annual Electric Generator Report (Form EIA-860M)',
  description: { contains: "Every generator's status as of September 2026: operating, planned, retired, and canceled or postponed, with capacity and planned dates.", excludes: 'No coordinates or map links, and no Puerto Rico sheets.' },
  publisher: 'U.S. Energy Information Administration',
  sourceUrl: 'https://www.eia.gov/electricity/data/eia860m/',
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
  attribution: 'Source: U.S. Energy Information Administration, Form EIA-860M ({asOfMonth}).',
  cadence: { every: 'monthly', nextRelease: { date: '2026-11-24', posted: false, note: 'EIA posts each month\'s inventory near the end of the following month; the date is inferred, not posted' } },
  ceii: {
    infrastructure: true,
    note: 'Generator characteristics and status EIA publishes monthly for plants of 1 MW or more. Coordinates and map links are left out of our table.',
    checklist: { publicSourceOnly: true, noPlanningModels: true, noSubstationPoints: true, noOneLineDiagrams: true, noBusImpedances: true, noNdaData: true },
  },
  owner: 'add-public-grid-data',
  // The newest month sits under xls/; older months move to archive/xls/.
  releaseWatch: {
    period: 'month',
    urls: ['https://www.eia.gov/electricity/data/eia860m/xls/{month}_generator{year}.xlsx', 'https://www.eia.gov/electricity/data/eia860m/archive/xls/{month}_generator{year}.xlsx'],
  },
  vintages: {
    '2026-09': { url: 'https://www.eia.gov/electricity/data/eia860m/xls/september_generator2026.xlsx', asOf: '2026-10-23', sha256: 'bcef74e1af991680731aeecfda967f5950db4ce739bb584edd8b8774c7e6da17' },
  },
  recipe: [
    { step: 'fetch', url: '{vintage.url}' },
  ],
  tables: [
    {
      name: 'generators',
      title: 'Generators by status as of the month: operating, planned, retired, canceled or postponed',
      recipe: [
        { step: 'read-xlsx', sheets: ['Operating', 'Planned', 'Retired', 'Canceled or Postponed'], headerRows: 3 },
        { step: 'normalize', module: 'eia-860m-generators' },
        { step: 'validate', key: ['plant_id', 'generator_id', 'category'], rows: { min: 36000, max: 50000, maxDropPct: 5, maxRisePct: 25, from: 'August 2026 (39,753 rows) and September 2026 (39,908); a month moves well under 1%' } },
        { step: 'partition', by: 'state' },
        { step: 'write-shards' },
        { step: 'write-csv-gz' },
      ],
    },
  ],
};
