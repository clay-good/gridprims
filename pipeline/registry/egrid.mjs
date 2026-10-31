// EPA eGRID: emissions and generation for every US power plant and the
// subregion emission rates built from them, plus EPA Power Profiler's
// ZIP-to-subregion lookup published with the same edition. Two workbooks,
// three tables.

const EDITION = 'eGRID2023 (revision 2)';

export default {
  id: 'egrid',
  title: 'Emissions & Generation Resource Integrated Database (eGRID)',
  publisher: 'U.S. Environmental Protection Agency',
  sourceUrl: 'https://www.epa.gov/egrid',
  terms: {
    url: 'https://www.epa.gov/egrid/egrid-questions-and-answers',
    section: '25) Can I use eGRID data commercially and how do I cite it?',
    // Captured 2026-10-31 from that answer on the page above.
    text: 'eGRID data is produced by the United States Environmental Protection Agency (EPA) under the public domain and is available for use both non-commercially and commercially. The following citations for eGRID Data are suggested: APA: United States Environmental Protection Agency (EPA). (2025). Emissions & Generation Resource Integrated Database (eGRID), 2023. Washington DC: Office of Atmospheric Protection, Clean Air and Power Division. https://www.epa.gov/egrid.',
    captured: '2026-10-31',
  },
  redistributionBasis: { kind: 'public domain', note: 'U.S. federal government work (17 U.S.C. 105); EPA states eGRID is in the public domain' },
  inputLicense: 'public-domain',
  posture: 'mirror',
  factual: true,
  attribution: `United States Environmental Protection Agency (EPA). Emissions & Generation Resource Integrated Database (eGRID), ${EDITION}, {asOfMonth}. https://www.epa.gov/egrid`,
  // EPA planned eGRID2024 for January 2026; as of 2026-10-27 its download page still lists only eGRID2023.
  cadence: { every: 'annual', nextRelease: { date: '2026-01-31', posted: true, note: 'EPA planned eGRID2024 for January 2026; it has not appeared' } },
  ceii: {
    infrastructure: true,
    note: 'Plant emissions, generation, and capacity EPA publishes; subregion rates; ZIP-to-subregion lookup. Latitude and longitude are left out of our tables.',
    checklist: { publicSourceOnly: true, noPlanningModels: true, noSubstationPoints: true, noOneLineDiagrams: true, noBusImpedances: true, noNdaData: true },
  },
  owner: 'add-public-grid-data',
  // EPA posts each edition under an upload-month path no pattern predicts, so a new edition is a hand-made bump.
  vintages: {
    2023: {
      release: EDITION, asOf: '2025-06-16',
      files: {
        data: { url: 'https://www.epa.gov/system/files/documents/2025-06/egrid2023_data_rev2.xlsx', sha256: '895cd81dd8662406189ad8adf5a2578dcb362cdb5cff7cca81b10ee6bd2447c6' },
        zips: { url: 'https://www.epa.gov/system/files/documents/2025-06/power_profiler_zipcode_tool_v14.3.xlsx', sha256: '457b0191916debb12802138a1ffbfc39953eca83b035aeaeeffca2b38076fe01' },
      },
    },
  },
  recipe: [
    { step: 'fetch', url: '{vintage.files.*.url}' },
  ],
  tables: [
    {
      name: 'plants',
      title: 'Plant emissions, generation, fuel, and subregion',
      recipe: [
        { step: 'read-xlsx', file: 'data', sheet: 'PLNT23', headerRows: 2 },
        { step: 'normalize', module: 'egrid-plants' },
        { step: 'validate', key: ['plant_id'], rows: { min: 11000, max: 15000, maxDropPct: 10, maxRisePct: 25, from: 'eGRID2023 rev 2 (12,612 plants); editions grow a few percent a year' } },
        { step: 'partition', by: 'state' },
        { step: 'write-shards' },
        { step: 'write-csv-gz' },
      ],
    },
    {
      name: 'subregions',
      title: 'Subregion total output and non-baseload emission rates',
      recipe: [
        { step: 'read-xlsx', file: 'data', sheet: 'SRL23', headerRows: 2 },
        { step: 'normalize', module: 'egrid-subregions' },
        { step: 'validate', key: ['subregion'], rows: { min: 26, max: 30, maxDropPct: 10, maxRisePct: 15, from: 'eGRID2023 rev 2 (27 subregions)' } },
        { step: 'partition', by: null },
        { step: 'write-shards' },
        { step: 'write-csv-gz' },
      ],
    },
    {
      name: 'zip_subregions',
      title: 'ZIP codes and the eGRID subregions they fall in (EPA Power Profiler)',
      recipe: [
        { step: 'read-xlsx', file: 'zips', sheet: 'Zip-subregion', headerRows: 1 },
        { step: 'normalize', module: 'egrid-zip-subregions' },
        { step: 'validate', key: ['zip'], rows: { min: 40000, max: 45000, maxDropPct: 5, maxRisePct: 10, from: 'Power Profiler v14.3 (41,588 ZIPs: 38,633 in one subregion, 2,882 in two, 73 in three)' } },
        { step: 'partition', by: null },
        { step: 'write-shards' },
        { step: 'write-csv-gz' },
      ],
    },
  ],
};
