// Census 2020 Gazetteer ZCTA file: each ZIP Code Tabulation Area's internal
// point, so a ZIP can find its nearest weather stations on the device
// (add-weather-normalization: degree-day data, "Station lookup without a
// request that names the user").

export default {
  id: 'census-zcta-points',
  title: '2020 Gazetteer ZCTA internal points (U.S. Census Bureau)',
  shortTitle: 'Census ZCTA internal points, 2020',
  description: { contains: 'Each 2020 Census ZIP Code Tabulation Area\'s internal point (latitude and longitude) and its land area.', excludes: 'ZCTAs approximate postal ZIP codes; PO-box-only ZIPs have none. An internal point is inside the area, not its population center.' },
  publisher: 'U.S. Census Bureau',
  sourceUrl: 'https://www.census.gov/geographies/reference-files/time-series/geo/gazetteer-files.2020.html',
  terms: {
    url: 'https://www.census.gov/about/policies/citation.html',
    section: 'Public-Use Statement',
    // Captured 2026-10-31 from that section of the page above. It names no license; the basis is the statute below.
    text: 'Proper citation ensures that Census Bureau statistical products and research can be discovered, reused, replicated for verification, and credited for recognition to measure usage and impact. Data users who create their own estimates using data from disseminated tables and other data should cite the Census Bureau as the source of the original data only. Conclusions drawn from any analysis of these data are the sole responsibility of the performing party.',
    captured: '2026-10-31',
  },
  redistributionBasis: { kind: 'public domain', note: 'U.S. federal government work (17 U.S.C. 105); the Census page above states no license, so the matcher\'s advisory reads derive' },
  inputLicense: 'public-domain',
  posture: 'mirror', // set by hand on the statute, as for the ZCTA-to-county file
  factual: true,
  attribution: 'Source: U.S. Census Bureau, 2020 Gazetteer Files, ZIP Code Tabulation Areas.',
  cadence: { every: 'annual', nextRelease: { date: '2031-12-31', posted: false, note: 'ZCTAs are redrawn for each decennial census; the 2030 file is not expected before late 2031' } },
  ceii: {
    infrastructure: false,
    note: 'Census statistical areas; no facility or network data.',
    locationColumns: { columns: ['points.lat', 'points.lon'], why: 'The internal point Census publishes for each ZIP Code Tabulation Area, for the on-device nearest-station search; no grid facility is located.' },
  },
  owner: 'add-weather-normalization',
  vintages: {
    2020: { url: 'https://www2.census.gov/geo/docs/maps-data/data/gazetteer/2020_Gazetteer/2020_Gaz_zcta_national.zip', asOf: '2021-01-22', sha256: '335402fb16b41303a3760f8956d2af005bbd6919b8dc6f4a96048af0005957a6' },
  },
  recipe: [
    { step: 'fetch', url: '{vintage.url}' },
  ],
  tables: [
    {
      name: 'points',
      title: 'Each ZCTA\'s internal point and land area',
      recipe: [
        { step: 'unzip', entry: '2020_Gaz_zcta_national.txt' },
        { step: 'read-csv', delimiter: '\t' },
        { step: 'normalize', module: 'census-zcta-points' },
        { step: 'validate', key: ['zcta'], rows: { min: 33000, max: 34000, maxDropPct: 1, maxRisePct: 1, from: 'the 2020 file lists 33,144 ZCTAs' } },
        { step: 'partition', by: null },
        { step: 'write-shards' },
        { step: 'write-csv-gz' },
      ],
    },
  ],
};
