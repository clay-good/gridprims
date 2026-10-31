// EIA-861, Annual Electric Power Industry Report: utility sales, revenue, and
// customers by state and sector. The one dataset phase 0 builds (task 1.6).

export default {
  id: 'eia-861',
  title: 'Annual Electric Power Industry Report (Form EIA-861)',
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
  ceii: { infrastructure: false, note: 'Sales, revenue, and customer counts by utility and state; no facility, location, or network data.' },
  owner: 'establish-platform-foundation',
  // Where a release appears: EIA posts the newest year under zip/ and moves older years to archive/zip/.
  releaseWatch: {
    urls: ['https://www.eia.gov/electricity/data/eia861/zip/f861{year}.zip', 'https://www.eia.gov/electricity/data/eia861/archive/zip/f861{year}.zip'],
  },
  vintages: {
    2025: { url: 'https://www.eia.gov/electricity/data/eia861/zip/f8612025.zip', asOf: '2026-10-07', sha256: 'f59f6c732bf685fe0a1591b32227f5ce572dc0dfd26bb5caaeed128ac4e3a396' },
  },
  recipe: [
    { step: 'fetch', url: '{vintage.url}' },
    { step: 'unzip', entry: 'Sales_Ult_Cust_{year}.xlsx' },
    { step: 'read-xlsx', sheet: 'States', headerRows: 3 },
    { step: 'normalize', module: 'eia-861-sales' },
    { step: 'quirk', name: 'withheld-respondents', note: 'Utility number 88888 ("Withheld") appears once per withheld respondent group; its rows are kept and keyed by a sequence number.', fixture: 'verify/fixtures/data/eia-861/withheld.json' },
    { step: 'validate', key: ['utility_id', 'part', 'service_type', 'state', 'ba_code', 'seq'], rows: { min: 2600, max: 3200, maxDropPct: 5, maxRisePct: 25, from: 'vintages 2023 (2,822 rows), 2024 (2,815), and 2025 (2,869); largest yearly change +1.9%' } },
    { step: 'partition', by: 'state' },
    { step: 'write-shards', table: 'sales' },
    { step: 'write-csv-gz', table: 'sales' },
  ],
};
