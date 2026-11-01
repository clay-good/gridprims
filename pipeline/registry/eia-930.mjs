// EIA's Hourly Electric Grid Monitor (Form EIA-930): hourly demand, net
// generation by fuel, CO2 emissions, and consumption-based CO2 intensity for
// every balancing authority (add-hourly-carbon task 1.1). The intensity is
// published only in the per-region workbooks (38 to 115 MB each), not in the
// API or the six-month CSVs, and EIA rebuilds every one of them daily, so the
// files are read one at a time and a version is cut at most once a month.

/**
 * Every balancing authority EIA publishes a workbook for, from the "BA Full Names" sheet (checked 2026-10-31).
 * WAUE is listed there but has no workbook (its address answers with a web page): it joined SPP in 2015.
 */
export const REGIONS = ['AEC', 'AECI', 'AVA', 'AVRN', 'AZPS', 'BANC', 'BPAT', 'CHPD', 'CISO', 'CPLE', 'CPLW', 'DEAA', 'DOPD', 'DUK', 'EEI', 'EPE', 'ERCO', 'FMPP', 'FPC', 'FPL',
  'GCPD', 'GLHB', 'GRID', 'GRIF', 'GRMA', 'GVL', 'GWA', 'HGMA', 'HST', 'IID', 'IPCO', 'ISNE', 'JEA', 'LDWP', 'LGEE', 'MISO', 'NEVP', 'NSB', 'NWMT', 'NYIS',
  'OVEC', 'PACE', 'PACW', 'PGE', 'PJM', 'PNM', 'PSCO', 'PSEI', 'SC', 'SCEG', 'SCL', 'SEC', 'SEPA', 'SOCO', 'SPA', 'SRP', 'SWPP', 'TAL', 'TEC', 'TEPC',
  'TIDC', 'TPWR', 'TVA', 'WACM', 'WALC', 'WAUW', 'WWA', 'YAD'];

/**
 * Each region's name from the "BA Full Names" sheet, and whether EIA's "Generation only?" column says it
 * serves no retail customers (it then reports no demand, and no consumption-based intensity of its own load).
 */
export const NAMES = {
  AEC: { name: 'PowerSouth Energy Cooperative' },
  AECI: { name: 'Associated Electric Cooperative, Inc.' },
  AVA: { name: 'Avista Corporation' },
  AVRN: { name: 'Avangrid Renewables, LLC', generationOnly: true },
  AZPS: { name: 'Arizona Public Service Company' },
  BANC: { name: 'Balancing Authority of Northern California' },
  BPAT: { name: 'Bonneville Power Administration' },
  CHPD: { name: 'Public Utility District No. 1 of Chelan County' },
  CISO: { name: 'California Independent System Operator' },
  CPLE: { name: 'Duke Energy Progress East' },
  CPLW: { name: 'Duke Energy Progress West' },
  DEAA: { name: 'Arlington Valley, LLC', generationOnly: true },
  DOPD: { name: 'PUD No. 1 of Douglas County' },
  DUK: { name: 'Duke Energy Carolinas' },
  EEI: { name: 'Electric Energy, Inc.', generationOnly: true },
  EPE: { name: 'El Paso Electric Company' },
  ERCO: { name: 'Electric Reliability Council of Texas, Inc.' },
  FMPP: { name: 'Florida Municipal Power Pool' },
  FPC: { name: 'Duke Energy Florida, Inc.' },
  FPL: { name: 'Florida Power & Light Co.' },
  GCPD: { name: 'Public Utility District No. 2 of Grant County, Washington' },
  GLHB: { name: 'GridLiance', generationOnly: true },
  GRID: { name: 'Gridforce Energy Management, LLC', generationOnly: true },
  GRIF: { name: 'Griffith Energy, LLC', generationOnly: true },
  GRMA: { name: 'Gila River Power, LLC', generationOnly: true },
  GVL: { name: 'Gainesville Regional Utilities' },
  GWA: { name: 'NaturEner Power Watch, LLC', generationOnly: true },
  HGMA: { name: 'New Harquahala Generating Company, LLC', generationOnly: true },
  HST: { name: 'City of Homestead' },
  IID: { name: 'Imperial Irrigation District' },
  IPCO: { name: 'Idaho Power Company' },
  ISNE: { name: 'ISO New England' },
  JEA: { name: 'Jacksonville Electric Authority' },
  LDWP: { name: 'Los Angeles Department of Water and Power' },
  LGEE: { name: 'Louisville Gas & Electric Company and Kentucky Utilities Company' },
  MISO: { name: 'Midcontinent Independent System Operator, Inc.' },
  NEVP: { name: 'Nevada Power Company' },
  NSB: { name: 'Utilities Commission of New Smyrna Beach' },
  NWMT: { name: 'NorthWestern Corporation' },
  NYIS: { name: 'New York Independent System Operator' },
  OVEC: { name: 'Ohio Valley Electric Corporation' },
  PACE: { name: 'PacifiCorp East' },
  PACW: { name: 'PacifiCorp West' },
  PGE: { name: 'Portland General Electric Company' },
  PJM: { name: 'PJM Interconnection, LLC' },
  PNM: { name: 'Public Service Company of New Mexico' },
  PSCO: { name: 'Public Service Company of Colorado' },
  PSEI: { name: 'Puget Sound Energy, Inc.' },
  SC: { name: 'South Carolina Public Service Authority' },
  SCEG: { name: 'Dominion Energy South Carolina, Inc.' },
  SCL: { name: 'Seattle City Light' },
  SEC: { name: 'Seminole Electric Cooperative' },
  SEPA: { name: 'Southeastern Power Administration', generationOnly: true },
  SOCO: { name: 'Southern Company Services, Inc. - Trans' },
  SPA: { name: 'Southwestern Power Administration' },
  SRP: { name: 'Salt River Project Agricultural Improvement and Power District' },
  SWPP: { name: 'Southwest Power Pool' },
  TAL: { name: 'City of Tallahassee' },
  TEC: { name: 'Tampa Electric Company' },
  TEPC: { name: 'Tucson Electric Power' },
  TIDC: { name: 'Turlock Irrigation District' },
  TPWR: { name: 'City of Tacoma, Department of Public Utilities, Light Division' },
  TVA: { name: 'Tennessee Valley Authority' },
  WACM: { name: 'Western Area Power Administration - Rocky Mountain Region' },
  WALC: { name: 'Western Area Power Administration - Desert Southwest Region' },
  WAUW: { name: 'Western Area Power Administration - Upper Great Plains West' },
  WWA: { name: 'NaturEner Wind Watch, LLC', generationOnly: true },
  YAD: { name: 'Alcoa Power Generating, Inc. - Yadkin Division', generationOnly: true },
};

/**
 * The zone each region reports in, from the workbooks' "Time zone" column (checked 2026-10-31): EIA's daily
 * values are by local date in this zone. "Arizona" is Mountain standard time all year, and "Eastern Standard"
 * is Eastern standard time all year (Etc/GMT+5, which is UTC−5 despite its sign).
 */
export const REPORT_ZONES = { AEC: 'America/Chicago', AECI: 'America/Chicago', AVA: 'America/Los_Angeles', AVRN: 'America/Los_Angeles', AZPS: 'America/Phoenix', BANC: 'America/Los_Angeles', BPAT: 'America/Los_Angeles', CHPD: 'America/Los_Angeles', CISO: 'America/Los_Angeles', CPLE: 'America/New_York', CPLW: 'America/New_York', DEAA: 'America/Phoenix', DOPD: 'America/Los_Angeles', DUK: 'America/New_York', EEI: 'America/Chicago', EPE: 'America/Phoenix', ERCO: 'America/Chicago', FMPP: 'America/New_York', FPC: 'America/New_York', FPL: 'America/New_York', GCPD: 'America/Los_Angeles', GLHB: 'America/Chicago', GRID: 'America/Los_Angeles', GRIF: 'America/Phoenix', GRMA: 'America/Phoenix', GVL: 'America/New_York', GWA: 'America/Denver', HGMA: 'America/Phoenix', HST: 'America/New_York', IID: 'America/Los_Angeles', IPCO: 'America/Los_Angeles', ISNE: 'America/New_York', JEA: 'America/New_York', LDWP: 'America/Los_Angeles', LGEE: 'Etc/GMT+5', MISO: 'Etc/GMT+5', NEVP: 'America/Los_Angeles', NSB: 'America/New_York', NWMT: 'America/Denver', NYIS: 'America/New_York', OVEC: 'America/New_York', PACE: 'America/Denver', PACW: 'America/Los_Angeles', PGE: 'America/Los_Angeles', PJM: 'America/New_York', PNM: 'America/Phoenix', PSCO: 'America/Denver', PSEI: 'America/Los_Angeles', SC: 'America/New_York', SCEG: 'America/New_York', SCL: 'America/Los_Angeles', SEC: 'America/New_York', SEPA: 'America/Chicago', SOCO: 'America/Chicago', SPA: 'America/Chicago', SRP: 'America/Phoenix', SWPP: 'America/Chicago', TAL: 'America/New_York', TEC: 'America/New_York', TEPC: 'America/Phoenix', TIDC: 'America/Los_Angeles', TPWR: 'America/Los_Angeles', TVA: 'America/Chicago', WACM: 'America/Phoenix', WALC: 'America/Phoenix', WAUW: 'America/Denver', WWA: 'America/Denver', YAD: 'America/New_York' };

const URL = (ba) => `https://www.eia.gov/electricity/gridmonitor/knownissues/xls/${ba}.xlsx`;
/** Each region's workbook, read lazily; the files change daily, so no checksum is pinned (the manifest records each one's). */
export const FILES = Object.fromEntries(REGIONS.map((ba) => [ba, { url: URL(ba), name: `${ba}.xlsx`, sha256: null, stream: true }]));

export default {
  id: 'eia-930',
  title: 'Hourly Electric Grid Monitor (Form EIA-930): demand, generation by fuel, and CO₂ by balancing authority',
  shortTitle: 'EIA-930: hourly grid and CO₂',
  description: {
    contains: 'For each of 68 balancing authorities and each UTC hour from July 1, 2018: demand, net generation, total interchange, net generation by fuel, CO₂ emitted by generation inside the region, and CO₂ intensity of generated and of consumed electricity (lb/kWh). Hours are labeled by their UTC start.',
    excludes: 'No demand forecasts, subregions, or interchange with each neighbor, and no hours before July 2018. Intensity is EIA\'s average, consumption-based estimate from annual emission factors, not a measured or marginal rate.',
  },
  publisher: 'U.S. Energy Information Administration',
  sourceUrl: 'https://www.eia.gov/electricity/gridmonitor/',
  terms: {
    url: 'https://www.eia.gov/about/copyrights_reuse.php',
    section: 'Public domain and use of EIA content',
    text: 'U.S. government publications are in the public domain and are not subject to copyright protection. You may use and/or distribute any of our data, files, databases, reports, graphs, charts, and other information products that are on our website or that you receive through our email distribution service. However, if you use or reproduce any of our information products, you should use an acknowledgment, which includes the publication date, such as: "Source: U.S. Energy Information Administration (Oct 2008)."',
    captured: '2026-10-31',
  },
  redistributionBasis: { kind: 'public domain', note: 'U.S. federal government work (17 U.S.C. 105)' },
  inputLicense: 'public-domain',
  posture: 'mirror',
  factual: true,
  attribution: 'Source: U.S. Energy Information Administration, Hourly Electric Grid Monitor (Form EIA-930) ({asOfMonth}).',
  cadence: { every: 'monthly', nextRelease: { date: '2026-11-30', posted: false, note: 'EIA rebuilds every region\'s file daily, by about 4 pm Eastern for the day before; gridprims cuts a version once a month' } },
  ceii: { infrastructure: false, note: 'Hourly totals for whole balancing authorities; no facility, line, or network detail.' },
  owner: 'add-hourly-carbon',
  // The same addresses, rewritten daily: taken at most once a month.
  releaseWatch: { period: 'rolling', urls: [URL('PJM')], files: true },
  vintages: {
    '2026-10': { asOf: '2026-10-31', files: FILES },
  },
  recipe: [
    { step: 'fetch', url: '{vintage.files.*.url}' },
  ],
  tables: [
    {
      name: 'hourly',
      title: 'Hourly demand, generation by fuel, and CO₂ by balancing authority, from July 2018',
      // EIA rebuilds every year's file daily, so each version compares every year with the one before
      // and counts the hours revised in each, with their range (spec carbon/hourly-intensity-data).
      changelog: { by: 'year', span: 'hour', spanFormat: 'hour' },
      recipe: [
        { step: 'read-xlsx', files: REGIONS, sheet: 'Published Hourly Data' },
        { step: 'normalize', module: 'eia-930-hourly' },
        { step: 'validate', key: ['ba', 'hour'], rows: { min: 3_500_000, max: 7_000_000, maxDropPct: 2, maxRisePct: 5, from: 'set from the first build' } },
        // One shard per region and year, without the version in its header, so a year EIA did not revise keeps its bytes.
        { step: 'partition', by: ['ba', 'year'], stable: true },
        { step: 'write-shards' },
      ],
    },
  ],
};
