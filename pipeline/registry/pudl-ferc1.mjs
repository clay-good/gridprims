// FERC Form 1 revenue-requirement inputs through PUDL: O&M, depreciation,
// taxes, and rate base for each electric utility that files Form 1
// (add-ratepayer-tools: revenue-requirement). Four Parquet files from one
// PUDL release.

const RELEASE = 'v2026.10.0';
const base = `https://s3.us-west-2.amazonaws.com/pudl.catalyst.coop/${RELEASE}`;

export default {
  id: 'pudl-ferc1',
  title: 'Revenue-requirement inputs from FERC Form 1 (through PUDL)',
  shortTitle: 'FERC Form 1 revenue inputs (PUDL)',
  description: { contains: 'For each electric utility that files FERC Form 1: operation and maintenance expense, depreciation and amortization, taxes other than income, operating revenue, and PUDL\'s rate base by category, total-company, with the EIA utility ids PUDL maps it to.', excludes: 'No gas or common-plant figures, no state jurisdictional split, and no utility that does not file Form 1 (most co-ops and municipal utilities).' },
  publisher: 'Catalyst Cooperative (PUDL), from FERC Form 1',
  sourceUrl: 'https://catalyst.coop/pudl/',
  terms: {
    url: 'https://github.com/catalyst-cooperative/pudl/blob/main/README.rst#licensing',
    section: 'Licensing',
    // Captured 2026-10-31 from the Licensing section of PUDL's README.
    text: 'In general, our code, data, and other work are permissively licensed for use by anybody, for any purpose, so long as you give us credit for the work we\'ve done. The PUDL software is released under the MIT License. The PUDL data and documentation are published under the Creative Commons Attribution License v4.0 (CC-BY-4.0).',
    captured: '2026-10-31',
    license: 'CC-BY-4.0',
  },
  redistributionBasis: { kind: 'named license', note: 'CC BY 4.0; the underlying FERC Form 1 filings are U.S. federal government records' },
  inputLicense: 'CC-BY-4.0',
  posture: 'mirror',
  factual: true,
  attribution: 'Catalyst Cooperative, Public Utility Data Liberation (PUDL) {release}, CC BY 4.0, from FERC Form 1.',
  cadence: { every: 'quarterly', nextRelease: { date: '2027-01-31', posted: false, note: 'PUDL cuts a stable release about each quarter; the date is inferred, not posted' } },
  ceii: { infrastructure: false, note: 'Company-level financial totals; no facility, location, or network data.' },
  owner: 'add-ratepayer-tools',
  vintages: {
    2025: {
      release: RELEASE, asOf: '2026-10-14',
      files: {
        income: { url: `${base}/core_ferc1__yearly_income_statements_sched114.parquet`, sha256: 'fe797e5704ec2c4ead48ecfac5a628a47cd771d9219938b19da4747babf529be' },
        rateBase: { url: `${base}/out_ferc1__yearly_rate_base.parquet`, sha256: 'ccb899408adfc522b322690f70a2e536922a078c9b5c3f86a48bafcccef6e72d' },
        ferc1Pudl: { url: `${base}/core_pudl__assn_ferc1_pudl_utilities.parquet`, sha256: '204d9de4e8a3299eae30e7c58f14e09a2b13597c9d2748dac96df6b274690e76' },
        eiaPudl: { url: `${base}/core_pudl__assn_eia_pudl_utilities.parquet`, sha256: '1907b79291ee2ccf68201e4b8c7ee3d7af5458ff89e6ed1a93cddce13dfbc453' },
      },
    },
  },
  recipe: [
    { step: 'fetch', url: '{vintage.files.*.url}' },
  ],
  tables: [
    {
      name: 'revenue_inputs',
      title: 'Revenue-requirement inputs per electric Form 1 respondent and year, total-company',
      recipe: [
        { step: 'read-parquet', files: ['income', 'rateBase', 'ferc1Pudl', 'eiaPudl'] },
        { step: 'normalize', module: 'pudl-ferc1-revenue' },
        { step: 'validate', key: ['utility_id_ferc1', 'year'], rows: { min: 6000, max: 9000, maxDropPct: 5, maxRisePct: 25, from: 'PUDL v2026.10.0: 6,835 electric respondent-years, with income statements from 1994 and rate base from 2021; a new year adds about 220' } },
        { step: 'partition', by: null },
        { step: 'write-shards' },
        { step: 'write-csv-gz' },
      ],
    },
  ],
};
