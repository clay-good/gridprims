// NLR's Sharing the Sun community solar project list (add-program-fact-pages:
// community solar). The publisher's own license page reserves the
// laboratory's name for endorsement "unless specific written permission is
// obtained", so the matcher derives the posture: we publish only our own state
// counts and capacity, with the credit and a link, never a copy of the list.

const URL = 'https://data.nlr.gov/system/files/244/1793053331-Sharing%20the%20Sun%20Community%20Solar%20Project%20Data%20%28Sep%202026%29.xlsx';

export default {
  id: 'nlr-sharing-the-sun',
  title: 'Sharing the Sun: Community Solar Project Data (National Laboratory of the Rockies)',
  shortTitle: 'NLR Sharing the Sun community solar',
  description: {
    contains: 'Our counts and capacity (MW-AC) of community solar projects by state, from the laboratory\'s project list: projects serving customers by who markets the subscriptions, capacity by year of interconnection, and the capacity the laboratory tracks as in queue in key states.',
    excludes: 'No copy of the project list: its license keeps the laboratory\'s name from any use that could read as endorsement, so only our own computed figures are published. In-queue capacity is market tracking, not a registry, and has no project counts.',
  },
  publisher: 'National Laboratory of the Rockies (NLR), U.S. Department of Energy',
  sourceUrl: 'https://data.nlr.gov/submissions/244',
  terms: {
    url: 'https://data.nlr.gov/node/244/license',
    section: 'Dataset License',
    // Captured 2026-11-01 from the publisher's own license page; the catalog records' CC BY 4.0 is not stated there.
    text: 'The user is granted the right, without any fee or cost, to use or copy the Data, provided that this entire notice appears in all copies of the Data. Further, the user agrees to credit DOE/NLR/ALLIANCE in any publication that results from the use of the Data. The names DOE/NLR/ALLIANCE, however, may not be used in any advertising or publicity to endorse or promote any products or commercial entities unless specific written permission is obtained from DOE/NLR/ ALLIANCE.',
    captured: '2026-11-01',
  },
  redistributionBasis: { kind: 'named license', note: 'NLR data license: use and copy with its notice in every copy, and credit DOE/NLR/Alliance; the matcher reads the endorsement clause as restrictive, so only computed values ship' },
  factual: true,
  attribution: 'Data: Kannan, S., Frey, N., Jayswal, R., Chan, G., and Simmons, I., Sharing the Sun: Community Solar Project Data (September 2026), National Laboratory of the Rockies, doi:10.7799/2438583. Credit: DOE/NLR/Alliance for Energy Innovation.',
  cadence: { every: 'quarterly', nextRelease: { date: '2027-04-30', posted: false, note: 'Updated twice a year since 2024; the September 2026 data was released in October 2026, and the next date is inferred' } },
  ceii: { infrastructure: false, note: 'State totals of community solar projects; no project location or network detail is published.' },
  owner: 'add-program-fact-pages',
  vintages: {
    '2026-09': { url: URL, asOf: '2026-10-15', release: 'September 2026', sha256: '46715d524daea49c35f09f326936241555b52c472ae21c470022c23f2e67d3ef' },
  },
  recipe: [{ step: 'fetch', url: '{vintage.url}' }],
  tables: [
    {
      name: 'state_projects',
      title: 'Community solar projects serving customers by state and subscription marketer: our counts and capacity',
      recipe: [
        { step: 'read-xlsx', sheet: 'Project List' },
        { step: 'normalize', module: 'nlr-sts-projects' },
        { step: 'validate', key: ['state', 'marketer'], rows: { min: 60, max: 200, maxDropPct: 20, maxRisePct: 30, from: 'September 2026: 4,810 projects in about 45 states' } },
        { step: 'partition', by: null },
        { step: 'write-shards' },
        { step: 'write-csv-gz' },
      ],
    },
    {
      name: 'state_years',
      title: 'Community solar capacity serving customers by state and year of interconnection: our sums',
      recipe: [
        { step: 'read-xlsx', sheet: 'Project List' },
        { step: 'normalize', module: 'nlr-sts-years' },
        { step: 'validate', key: ['state', 'year'], rows: { min: 200, max: 800, maxDropPct: 20, maxRisePct: 30, from: 'September 2026' } },
        { step: 'partition', by: null },
        { step: 'write-shards' },
        { step: 'write-csv-gz' },
      ],
    },
    {
      name: 'state_queue',
      title: 'Community solar capacity the laboratory tracks as in queue, by state (market tracking, not a registry)',
      recipe: [
        { step: 'read-xlsx', sheet: 'State Summary' },
        { step: 'normalize', module: 'nlr-sts-queue' },
        { step: 'validate', key: ['state'], rows: { min: 5, max: 60, maxDropPct: 50, maxRisePct: 100, from: 'September 2026: the key states with capacity in queue' } },
        { step: 'partition', by: null },
        { step: 'write-shards' },
        { step: 'write-csv-gz' },
      ],
    },
  ],
};
