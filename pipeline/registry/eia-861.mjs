// EIA-861, Annual Electric Power Industry Report: utility sales, revenue, and
// customers by state and sector; Texas wires utilities' delivery-only figures;
// reliability (SAIDI, SAIFI, CAIDI); and the counties each utility serves.
// Four tables from one release zip.

export default {
  id: 'eia-861',
  title: 'Annual Electric Power Industry Report (Form EIA-861)',
  description: { contains: "Every US electric utility's 2025 retail sales, revenue, and customers by state and sector; Texas wires utilities' delivery-only figures; outage duration and frequency; and the counties each utility serves.", excludes: 'No rates or bills, no hourly data, and no net metering or distributed generation files (those belong to the program fact pages).' },
  publisher: 'U.S. Energy Information Administration',
  sourceUrl: 'https://www.eia.gov/electricity/data/eia861/',
  terms: {
    url: 'https://www.eia.gov/about/copyrights_reuse.php',
    section: 'Public domain and use of EIA content',
    // Captured 2026-10-31 from that section of the page above. The page's separate
    // "Protected materials" section covers third-party items EIA hosts, not EIA data.
    text: 'U.S. government publications are in the public domain and are not subject to copyright protection. You may use and/or distribute any of our data, files, databases, reports, graphs, charts, and other information products that are on our website or that you receive through our email distribution service. However, if you use or reproduce any of our information products, you should use an acknowledgment, which includes the publication date, such as: "Source: U.S. Energy Information Administration (Oct 2008)."',
    captured: '2026-10-31',
  },
  redistributionBasis: { kind: 'public domain', note: 'U.S. federal government work (17 U.S.C. 105)' },
  inputLicense: 'public-domain',
  posture: 'mirror', // set by hand while the matcher is young; the matcher's verdict is recorded beside it
  factual: true,
  // EIA asks for an acknowledgment that includes the publication date; {asOfMonth} is filled from the vintage.
  attribution: 'Source: U.S. Energy Information Administration, Form EIA-861 ({asOfMonth}).',
  cadence: { every: 'annual', nextRelease: { date: '2027-08-31', posted: false, note: 'EIA posts an early release each August; the date is inferred, not posted' } },
  ceii: { infrastructure: false, note: 'Sales, revenue, customer counts, reliability indices, and served counties by utility and state; no facility, location, or network data.' },
  owner: 'add-public-grid-data',
  // Where a release appears: EIA posts the newest year under zip/ and moves older years to archive/zip/.
  releaseWatch: {
    urls: ['https://www.eia.gov/electricity/data/eia861/zip/f861{year}.zip', 'https://www.eia.gov/electricity/data/eia861/archive/zip/f861{year}.zip'],
  },
  vintages: {
    2025: { url: 'https://www.eia.gov/electricity/data/eia861/zip/f8612025.zip', asOf: '2026-10-07', sha256: 'f59f6c732bf685fe0a1591b32227f5ce572dc0dfd26bb5caaeed128ac4e3a396' },
  },
  // Steps every table shares, run once per release.
  recipe: [
    { step: 'fetch', url: '{vintage.url}' },
  ],
  // Each table's own steps, run on the fetched zip. One table failing fails the
  // whole release: a dataset version is all or nothing.
  tables: [
    {
      name: 'sales',
      title: 'Sales, revenue, and customers by utility, state, and sector',
      recipe: [
        { step: 'unzip', entry: 'Sales_Ult_Cust_{year}.xlsx' },
        { step: 'read-xlsx', sheet: 'States', headerRows: 3 },
        { step: 'normalize', module: 'eia-861-sales' },
        { step: 'quirk', name: 'withheld-respondents', note: 'Utility number 88888 ("Withheld") appears once per withheld respondent group; its rows are kept and keyed by a sequence number.', fixture: 'verify/fixtures/data/eia-861/withheld.json' },
        { step: 'validate', key: ['utility_id', 'part', 'service_type', 'state', 'ba_code', 'seq'], rows: { min: 2600, max: 3200, maxDropPct: 5, maxRisePct: 25, from: 'vintages 2023 (2,822 rows), 2024 (2,815), and 2025 (2,869); largest yearly change +1.9%' } },
        { step: 'partition', by: 'state' },
        { step: 'write-shards' },
        { step: 'write-csv-gz' },
      ],
    },
    {
      name: 'delivery',
      title: 'Delivery-only revenue, sales, and customers of Texas wires utilities',
      recipe: [
        { step: 'unzip', entry: 'Delivery_Companies_{year}.xlsx' },
        { step: 'read-xlsx', sheet: 'Delivery Companies', headerRows: 3 },
        { step: 'normalize', module: 'eia-861-sales' },
        { step: 'quirk', name: 'not-additive', note: 'EIA: "This data should not be added to the data in sales to ultimate customers, since it is already included by the power marketers on Part D." It is its own table and never enters state totals.', fixture: 'verify/fixtures/data/eia-861/delivery.json' },
        { step: 'validate', key: ['utility_id', 'part', 'service_type', 'state', 'ba_code', 'seq'], rows: { min: 5, max: 15, maxDropPct: 30, maxRisePct: 50, from: 'vintages 2023 (6 rows), 2024 (7), and 2025 (7)' } },
        { step: 'partition', by: 'state' },
        { step: 'write-shards' },
        { step: 'write-csv-gz' },
      ],
    },
    {
      name: 'reliability',
      title: 'Outage duration and frequency (SAIDI, SAIFI, CAIDI) by utility and state',
      recipe: [
        { step: 'unzip', entry: 'Reliability_{year}.xlsx' },
        { step: 'read-xlsx', sheet: 'Reliability_States', headerRows: 3 },
        { step: 'normalize', module: 'eia-861-reliability' },
        { step: 'validate', key: ['utility_id', 'state'], rows: { min: 850, max: 1100, maxDropPct: 5, maxRisePct: 25, from: 'vintages 2023 (967 rows), 2024 (971), and 2025 (976); largest yearly change +0.5%' } },
        { step: 'partition', by: 'state' },
        { step: 'write-shards' },
        { step: 'write-csv-gz' },
      ],
    },
    {
      name: 'service_territory',
      title: 'Counties each utility serves, by state',
      recipe: [
        { step: 'unzip', entry: 'Service_Territory_{year}.xlsx' },
        { step: 'read-xlsx', sheet: 'Counties_States', headerRows: 1 },
        { step: 'normalize', module: 'eia-861-service-territory' },
        { step: 'validate', key: ['utility_id', 'state', 'county'], rows: { min: 10500, max: 13000, maxDropPct: 5, maxRisePct: 25, from: 'vintages 2023 (11,782 rows), 2024 (11,776), and 2025 (11,803); largest yearly change +0.2%' } },
        { step: 'partition', by: 'state' },
        { step: 'write-shards' },
        { step: 'write-csv-gz' },
      ],
    },
  ],
};
