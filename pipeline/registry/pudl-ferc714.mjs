// FERC Form 714 annual peak demand by planning area, through PUDL's cleaned
// hourly table and its respondent-to-EIA crosswalk (add-public-grid-data
// design: "FERC Form 714 annual peaks"). Two Parquet files from one PUDL release.

const RELEASE = 'v2026.10.0';
const base = `https://s3.us-west-2.amazonaws.com/pudl.catalyst.coop/${RELEASE}`;

export default {
  id: 'pudl-ferc714',
  title: 'Annual peak demand by planning area (FERC Form 714, through PUDL)',
  publisher: 'Catalyst Cooperative (PUDL), from FERC Form 714',
  sourceUrl: 'https://catalyst.coop/pudl/',
  terms: {
    url: 'https://github.com/catalyst-cooperative/pudl/blob/main/README.rst#licensing',
    section: 'Licensing',
    // Captured 2026-10-31 from the Licensing section of PUDL's README.
    text: 'In general, our code, data, and other work are permissively licensed for use by anybody, for any purpose, so long as you give us credit for the work we\'ve done. The PUDL software is released under the MIT License. The PUDL data and documentation are published under the Creative Commons Attribution License v4.0 (CC-BY-4.0).',
    captured: '2026-10-31',
    license: 'CC-BY-4.0',
  },
  redistributionBasis: { kind: 'named license', note: 'CC BY 4.0; the underlying FERC Form 714 filings are U.S. federal government records' },
  inputLicense: 'CC-BY-4.0',
  posture: 'mirror',
  factual: true,
  attribution: 'Catalyst Cooperative, Public Utility Data Liberation (PUDL) {release}, CC BY 4.0, from FERC Form 714.',
  cadence: { every: 'quarterly', nextRelease: { date: '2027-01-31', posted: false, note: 'PUDL cuts a stable release about each quarter; the date is inferred, not posted' } },
  ceii: { infrastructure: false, note: 'Hourly demand totals per planning area, reduced to one peak per year; no facility, location, or network data.' },
  owner: 'add-public-grid-data',
  // A new PUDL release is a new pinned version, bumped by hand after the cross-check passes.
  vintages: {
    2025: {
      release: RELEASE, asOf: '2026-10-14',
      files: {
        hourly: { url: `${base}/out_ferc714__hourly_planning_area_demand.parquet`, sha256: 'fc08777639d9c05de84849cea1f04653cf7ff528719920f7a4d8bb044de1cb15' },
        respondents: { url: `${base}/out_ferc714__summarized_demand.parquet`, sha256: '8e516ccfc410d3f24408a02e7bdec0aa2126610ca080aba15a15b850b30f0bf3' },
      },
    },
  },
  recipe: [
    { step: 'fetch', url: '{vintage.files.*.url}' },
  ],
  tables: [
    {
      name: 'annual_peaks',
      title: 'Annual peak demand per FERC Form 714 respondent, with the EIA ids it maps to',
      recipe: [
        { step: 'read-parquet', files: ['hourly', 'respondents'] },
        { step: 'normalize', module: 'pudl-ferc714-peaks' },
        { step: 'quirk', name: 'flagged-hours', note: 'The peak skips hours PUDL flags as anomalous (outliers, runs, bad years); the unfiltered maximum and the flagged count stay in their own columns.', fixture: 'verify/fixtures/data/pudl-ferc714/peaks.json' },
        { step: 'validate', key: ['respondent_id_ferc714', 'year'], rows: { min: 2000, max: 2800, maxDropPct: 5, maxRisePct: 25, from: 'PUDL v2026.10.0: 2,231 respondent-years with hourly data, 2006 to 2025; a new release adds about 90 a year' } },
        { step: 'partition', by: 'year' },
        { step: 'write-shards' },
        { step: 'write-csv-gz' },
      ],
    },
  ],
};
