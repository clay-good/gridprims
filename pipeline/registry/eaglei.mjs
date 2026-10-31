// EAGLE-I recorded electricity outages, 2014 to 2025 (ORNL, figshare
// version 4): 15-minute customers-out counts by county, gathered from
// utilities' public outage maps (add-electrification-tools: backup-power).
// The yearly files total about 11.6 GB, so they are streamed a line at a
// time; only the derived county events ship.

const file = (id, name, sha256, stream = true) => ({ url: `https://ndownloader.figshare.com/files/${id}`, name, sha256, ...(stream ? { stream: true } : {}) });
const YEARS = { 2014: 42547717, 2015: 42547822, 2016: 42547825, 2017: 42547828, 2018: 42547879, 2019: 42547885, 2020: 42547894, 2021: 42547891, 2022: 42547897, 2023: 44574907, 2024: 53581661, 2025: 62164877 };
// SHA-256 of each file as downloaded 2026-10-31.
const SHA = {
  2014: 'f292a9f99066ac686df69767c535b218e70b4d4e748840ec620eda3340f914c9',
  2015: '49de89b3427d564efbd9c80183caf4e9777966f7e319d4b30d682c1c0d064505',
  2016: '2c1b364a3b06aee56326174c4644750ea86ba9be4585c5e40eeb7835431bfc9c',
  2017: '47479c4fd645ec69685447f90baa51f08a85e776cedf612279b3e41c13147c8d',
  2018: '85e0a864aa272e75892e181f1da4754ed78f7bf0bef75a279d8ab381baa7db70',
  2019: '4cc277a138b326bd0e1f203558539a9422b40dacdf439e3d5b58ee71d7462d27',
  2020: '2a20b62e5245b1b9d4fcedc1bdbaf691bb1e17f75094975c8c6cb854f52e721a',
  2021: 'e3e7ac40a40d92d92488501881ab381b8931833e486941424ac55ea20ffde319',
  2022: 'ff8b58ae30fcbaf290f820bcd4f1420e536994bc9f0a87bb80991130478461b0',
  2023: 'c028f42dae8522ecfb787ad0b6461cfc809bb04856eef20cb389e486d5657f7e',
  2024: 'd5d75ea4ef3943446aaf0623e9b451cb4e7796d20cc379de9cf497106ebab2e6',
  2025: '4148a4a3b26e58024403cef98ccb324d1656f476613d6afff4451e33faf468c9',
  mcc: 'd7fbe0d60ea71273f68bd744408059491fbc7f85b6254882d17783d7762bf65e',
  coverage: 'a5f102ee31d7c8ea5676679ec8a89a1e786bbe482d48f85c9a058a388a593267',
};

export default {
  id: 'eaglei',
  title: 'County outage events from EAGLE-I (ORNL)',
  shortTitle: 'EAGLE-I county outages',
  description: { contains: 'For each county, every run of 15-minute intervals from 2014 to 2025 in which at least 1% of its modeled customers were out, with its start, length, and highest share out; the modeled customers per county; and the share of each state\'s customers EAGLE-I covered, 2018 to 2022.', excludes: 'No address- or utility-level outages, no cause, and no record of outages below 1% of a county\'s customers. A missing record means none was reported, not a confirmed zero.' },
  publisher: 'Oak Ridge National Laboratory (EAGLE-I)',
  sourceUrl: 'https://doi.org/10.6084/m9.figshare.24237376.v4',
  terms: {
    url: 'https://figshare.com/articles/dataset/The_Environment_for_Analysis_of_Geo-Located_Energy_Information_s_Recorded_Electricity_Outages_2014-2022/24237376',
    section: 'License',
    // Captured 2026-10-31 from the figshare article's license field (api.figshare.com/v2/articles/24237376).
    text: 'CC BY 4.0 (https://creativecommons.org/licenses/by/4.0/). Brelsford, Christa; Tennille, Sarah; Myers, Aaron; et al. (2023). The Environment for Analysis of Geo-Located Energy Information\'s Recorded Electricity Outages 2014-2025. figshare. Dataset. https://doi.org/10.6084/m9.figshare.24237376.v4',
    captured: '2026-10-31',
    license: 'CC-BY-4.0',
  },
  redistributionBasis: { kind: 'named license', note: 'CC BY 4.0' },
  inputLicense: 'CC-BY-4.0',
  posture: 'mirror',
  factual: true,
  attribution: 'Brelsford et al., EAGLE-I Recorded Electricity Outages 2014-2025, Oak Ridge National Laboratory, figshare {release}, CC BY 4.0.',
  cadence: { every: 'annual', nextRelease: { date: '2027-03-01', posted: false, note: 'Version 4, adding 2025, was posted February 25, 2026; the next year is inferred, not posted' } },
  ceii: { infrastructure: false, note: 'County totals of customers out over time; no facility, feeder, or network detail.' },
  owner: 'add-electrification-tools',
  vintages: {
    2025: {
      release: 'version 4', asOf: '2026-02-25',
      files: {
        ...Object.fromEntries(Object.entries(YEARS).map(([y, id]) => [`y${y}`, file(id, `eaglei_outages_${y}.csv`, SHA[y])])),
        mcc: file(42547708, 'MCC.csv', SHA.mcc, false),
        coverage: file(42547714, 'coverage_history.csv', SHA.coverage, false),
      },
    },
  },
  recipe: [
    { step: 'fetch', url: '{vintage.files.*.url}' },
  ],
  tables: [
    {
      name: 'events',
      title: 'County outage events: runs of 15-minute intervals with at least 1% of modeled customers out',
      recipe: [
        { step: 'read-lines', files: ['mcc', ...Object.keys(YEARS).map((y) => `y${y}`)] },
        { step: 'normalize', module: 'eaglei-events' },
        { step: 'validate', key: ['fips', 'start'], rows: { min: 100000, max: 5000000, maxDropPct: 5, maxRisePct: 25, from: 'set from the first build' } },
        { step: 'partition', by: 'state' },
        { step: 'write-shards' },
        { step: 'write-csv-gz' },
      ],
    },
    {
      name: 'counties',
      title: 'Modeled electric customers per county, 2022',
      recipe: [
        { step: 'read-lines', files: ['mcc'] },
        { step: 'normalize', module: 'eaglei-counties' },
        { step: 'validate', key: ['fips'], rows: { min: 3000, max: 3400, maxDropPct: 5, maxRisePct: 5, from: 'MCC.csv lists 3,233 counties' } },
        { step: 'partition', by: 'state' },
        { step: 'write-shards' },
        { step: 'write-csv-gz' },
      ],
    },
    {
      name: 'coverage',
      title: 'Share of each state\'s customers EAGLE-I covered, by year',
      recipe: [
        { step: 'read-lines', files: ['coverage'] },
        { step: 'normalize', module: 'eaglei-coverage' },
        { step: 'validate', key: ['state', 'year'], rows: { min: 250, max: 300, maxDropPct: 5, maxRisePct: 25, from: 'coverage_history.csv: 56 states and territories, 2018 to 2022' } },
        { step: 'partition', by: null },
        { step: 'write-shards' },
        { step: 'write-csv-gz' },
      ],
    },
  ],
};
