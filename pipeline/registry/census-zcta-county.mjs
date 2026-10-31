// Census 2020 ZCTA-to-county relationship file: which counties each ZIP Code
// Tabulation Area shares land with, and how much. The first link of the ZIP
// to county to utility chain (add-public-grid-data: utility lookup).

export default {
  id: 'census-zcta-county',
  title: '2020 ZCTA to County Relationship File (U.S. Census Bureau)',
  shortTitle: 'Census ZCTA to county, 2020',
  description: { contains: "Each 2020 Census ZIP Code Tabulation Area and the counties it shares land with, with each county's share of its land.", excludes: 'ZCTAs approximate postal ZIP codes; PO-box-only ZIPs have none.' },
  publisher: 'U.S. Census Bureau',
  sourceUrl: 'https://www.census.gov/geographies/reference-files/time-series/geo/relationship-files.2020.html',
  terms: {
    url: 'https://www.census.gov/about/policies/citation.html',
    section: 'Public-Use Statement',
    // Captured 2026-10-31 from that section of the page above. It names no license; the basis is the statute below.
    text: 'Proper citation ensures that Census Bureau statistical products and research can be discovered, reused, replicated for verification, and credited for recognition to measure usage and impact. Data users who create their own estimates using data from disseminated tables and other data should cite the Census Bureau as the source of the original data only. Conclusions drawn from any analysis of these data are the sole responsibility of the performing party.',
    captured: '2026-10-31',
  },
  redistributionBasis: { kind: 'public domain', note: 'U.S. federal government work (17 U.S.C. 105); the Census page above states no license, so the matcher\'s advisory reads derive' },
  inputLicense: 'public-domain',
  posture: 'mirror', // set by hand on the statute; the matcher finds no license words in the captured text
  factual: true,
  attribution: 'Source: U.S. Census Bureau, 2020 ZCTA to County Relationship File.',
  // A decennial file: the next one follows the 2030 census.
  cadence: { every: 'annual', nextRelease: { date: '2031-12-31', posted: false, note: 'Relationship files follow each decennial census; the 2030 file is not expected before late 2031' } },
  ceii: { infrastructure: false, note: 'Census statistical areas and their land overlap; no facility or network data.' },
  owner: 'add-public-grid-data',
  vintages: {
    2020: { url: 'https://www2.census.gov/geo/docs/maps-data/data/rel2020/zcta520/tab20_zcta520_county20_natl.txt', asOf: '2021-12-09', sha256: '3ed41278d637dc249e0323306f68be8a6c234e3090f4de88ef328dee71aeaaaf' },
  },
  recipe: [
    { step: 'fetch', url: '{vintage.url}' },
  ],
  tables: [
    {
      name: 'zcta_counties',
      title: 'ZCTAs and the counties they share land with, with each county\'s share',
      recipe: [
        { step: 'read-csv', delimiter: '|' },
        { step: 'normalize', module: 'census-zcta-county' },
        { step: 'validate', key: ['zcta', 'county_fips'], rows: { min: 46000, max: 48000, maxDropPct: 1, maxRisePct: 1, from: 'the 2020 file: 46,953 land-sharing rows after dropping 903 blank-ZCTA rows and 7 water-only rows' } },
        { step: 'partition', by: 'state' },
        { step: 'write-shards' },
        { step: 'write-csv-gz' },
      ],
    },
  ],
};
