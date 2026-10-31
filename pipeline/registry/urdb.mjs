// OpenEI's U.S. Utility Rate Database: tariffs as structured data (tiers,
// time-of-use schedules, demand charges, fixed and minimum charges), placed by
// state through EIA-861 (add-public-grid-data: URDB, partitioned by state).

export default {
  id: 'urdb',
  title: 'U.S. Utility Rate Database (OpenEI)',
  publisher: 'OpenEI (National Laboratory of the Rockies), with rates entered by contributors',
  sourceUrl: 'https://apps.openei.org/USURDB/',
  terms: {
    url: 'https://apps.openei.org/USURDB/',
    section: 'Page footer',
    // Captured 2026-10-31 from the footer of the page above (the URDB wiki page says the same).
    text: 'Content is available under Creative Commons Zero unless otherwise noted.',
    captured: '2026-10-31',
    license: 'CC0-1.0',
  },
  redistributionBasis: { kind: 'named license', note: 'CC0 1.0; no credit required, given as a courtesy' },
  inputLicense: 'public-domain', // CC0 waives every right, so it combines like public-domain data
  posture: 'mirror',
  factual: true,
  attribution: 'U.S. Utility Rate Database, OpenEI (apps.openei.org/USURDB), CC0, retrieved {asOfMonth}.',
  cadence: { every: 'monthly', nextRelease: { date: '2026-11-30', posted: false, note: 'OpenEI rewrites the bulk file daily; gridprims takes it once a month' } },
  ceii: { infrastructure: false, note: 'Published retail tariffs; no facility, location, or network data.' },
  owner: 'add-public-grid-data',
  // One address, rewritten in place daily: taken at most once a month.
  releaseWatch: { period: 'rolling', urls: ['https://apps.openei.org/USURDB/download/usurdb.json.gz'] },
  vintages: {
    '2026-10': { url: 'https://apps.openei.org/USURDB/download/usurdb.json.gz', asOf: '2026-10-30', sha256: '419b2a89cb81e2f84f66c37b7ceea642d36ffd3bd1b3b0d7469f0455511f82de' },
  },
  recipe: [
    { step: 'fetch', url: '{vintage.url}' },
  ],
  tables: [
    {
      name: 'rates',
      title: 'Rates in effect, by state, with their structures and schedules',
      recipe: [
        { step: 'read-json' },
        { step: 'join', dataset: 'eia-861', table: 'sales', columns: ['utility_id', 'state'] },
        { step: 'join', dataset: 'eia-861', table: 'service_territory', columns: ['utility_id', 'state'] },
        { step: 'normalize', module: 'urdb-rates' },
        { step: 'quirk', name: 'multi-state-utilities', note: 'URDB has no state; a rate is placed in every state its utility sells or serves in, and utility_states says how many.', fixture: 'verify/fixtures/data/urdb/placement.json' },
        { step: 'validate', key: ['label', 'state'], rows: { min: 30000, max: 50000, maxDropPct: 10, maxRisePct: 25, from: 'the 2026-10-30 file: 32,339 rates in effect placed into 38,765 state rows, 707 of them unmatched' } },
        { step: 'partition', by: 'state', unmatched: 'unmatched' },
        { step: 'write-shards' },
        { step: 'write-csv-gz' },
      ],
    },
  ],
};
