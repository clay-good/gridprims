// EPA's Clean Air Markets Program Data (CAMPD): hourly, unit-level measured
// emissions from the continuous monitors on large fossil units in the federal
// trading programs (add-measured-plant-emissions). The national hourly files
// are about 6.5 GB a year, so they are streamed a line at a time and only our
// own aggregates ship: monthly per unit, and hourly per region and year.
//
// The bulk files need no key. EPA's interface key, used only for incremental
// refreshes in the build environment, never reaches a shipped file.

/** The data years we ship, oldest first. */
const YEARS = [2024, 2025];
/** The 49 states, the District of Columbia, and Puerto Rico with monitored units; Hawaii has none. */
const STATES = ['AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'DC', 'FL', 'GA', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD', 'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ', 'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC', 'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY', 'PR'];
/** The key each download gets; the normalizers read the year and state back out of it. */
const HOURLY_FILES = YEARS.flatMap((year) => STATES.map((state) => ({ key: `h${year}-${state.toLowerCase()}`, year, state })));
const FACILITY_FILES = YEARS.map((year) => ({ key: `f${year}`, year }));

// SHA-256 of each file as read 2026-11-23.
const SHA = {
  'f2024': 'b0222264bdb9a58bd38a445efb67159b60fbaa126be6a565c27a73fed9f35dcf',
  'f2025': '4d0970eacd32f092585d928006dda30f89d945f675f0721e832aa85b88443b02',
  'h2024-ak': '73bb36f7e88114eb32c50692fe24e2b9e04ad041c1ed84571925e0dff4ab3d3c',
  'h2024-al': '56d238ec4414a0b9655d3db05ff3bc3b3dceb6ec13ed40016c7472bffd840c8f',
  'h2024-ar': '5b8d907ff2c7437811bcedcafb5c727b4689eb8f2d4c4d9ae729770802c89cae',
  'h2024-az': '5ce287666af38d5a17fe3d28b2c2beb475d95a67b333c5070aa497a081e7f572',
  'h2024-ca': '5e3e89fb27379dd28ffed801b7cc5e9d951b38b2768132bd8c8ea0105b878414',
  'h2024-co': '6853cf4b2f0dd94c6ef5e19bba081911e58580685b402f3b426cc87843c1d289',
  'h2024-ct': 'c1e4adf91b350cd369693a2078a921c4b61f4d03c8f703ff28def1fb4a30756d',
  'h2024-dc': '9f95b92bbd64300b78cc40c3e95275829ac62915436d0ece9f4aadd1321af87a',
  'h2024-de': '34d4d22e50fd455e2e293881d974ceb90f517c75407e3cde61c86189aefdc14e',
  'h2024-fl': '2f659466ec48d0906d0b6fc4edc09e6d7e34ba0ade02ed77e121b872457ac9c3',
  'h2024-ga': '85b62cc30cfb54621e11156ba2ffd68febfc8e9f8e6993621dc77d3775e0f1cd',
  'h2024-ia': 'c44db438d3973304042909544ad0ea92ef86083397a37512bf0ea2db3328bc75',
  'h2024-id': '15dc57375fe85043542b7d590146f2cb7d1ca66e7a5a28eee8dbdf7e13a1eb68',
  'h2024-il': 'f159866cb35892ebdcc2b2aff7c8eb43ed74806f08c9d3463d6f12d2e9a8d0ee',
  'h2024-in': 'c8f3b61a2eee940965cee97fb72fadc80a98a58c85ccb1029f07060f00617d99',
  'h2024-ks': 'cbbfaa361bda6c885f5d1dafa98d7a83d255fd805738bb8223264c0de42bb66e',
  'h2024-ky': 'b3a1789104b722f3abb6f9a5f927fe22f66f7f028b2bc6c68296bfc245609f24',
  'h2024-la': 'be0e324294100d97f28eea4390ec30d8bd9444ca12f00a35234a9c40575cfe08',
  'h2024-ma': 'f7c3621e112b603ada1bd54a2fcae8f86c11c431fe7285570dffdb5637cd589b',
  'h2024-md': '399d27ce1d876b448a5db17ded724d95d4f215eff688ec5a675598ead869135f',
  'h2024-me': '1dd854cd06a036e31f97967eba276cc4be70d3c95cbf75d6826427152f143a11',
  'h2024-mi': '1eb7230a2c1a1738fd6a9b912a13292792f978b14d11f4cdab116e90b16e44f5',
  'h2024-mn': '30495d5f723ba1a269c995e4caab8e2e1951ef4db23aa2bec3c28c221ff690f7',
  'h2024-mo': 'b9707ca96c617da9eb60c0ea02c94f316d9e7da568ccf2138b1ced18fbbc8063',
  'h2024-ms': '3db40e36f2a92493a5df69b2bc0eb5dee7c51875213329cdb931f14779b5275c',
  'h2024-mt': 'd1403cdc2247dbf04e85f5c5acafdd9c1f1c3223b636d0617572caf289000473',
  'h2024-nc': '807fd2fa8f17a78a814915168265a474ea01fc586f2b40d2ce366ae290f76834',
  'h2024-nd': '3be7d2eec48b99ed890e5e8f99e29421dca3578d5041821d797aa9b04d65f1e9',
  'h2024-ne': '3f67fba0af6637002536f383ce3ccce9430acad8d1587afb7a947e0b8c4b2245',
  'h2024-nh': '2c2625b8ec89c01dfe3fcb09fa961b20c004f590a804070d13d7c81c4d8e73b3',
  'h2024-nj': 'e1a838835d6491fa22fadcf5248cb81553176b56b6551c909591541ca36782e0',
  'h2024-nm': '405d1e7dfe5567e50fcd809e5fe0fa6beaaaad245f2999df1027c9c804f43503',
  'h2024-nv': '26c03ee41d910fa7c6a6899bb705833a1e12bba7a85608c58058c0461a7f3737',
  'h2024-ny': 'ef2c20a7f8d5d9d0c6da6eb0880b9c83764c88b0df5831fd6ac69d11ca2a8623',
  'h2024-oh': '5bf30513ca4c060f31c4b7ebf13f9999dc73a452dab212809ff9593d2d109df3',
  'h2024-ok': 'c50b59f89a6c2a7fab3dfd6cf5247c408f8f220fcf1caf5c54739501102afb57',
  'h2024-or': 'fbfc1b0c7662ca0582f6f20336d2e590ffe113e6184398f228f888d3c81399e4',
  'h2024-pa': '9864c0a0f56b263acd0eb70f632edfe38c326d138d4cf7d7d12e6a51466d5663',
  'h2024-pr': '35029b8e7dc8fc6d04310e5ff46a18c5e3dbf9c643286589cd5a25e38abe273f',
  'h2024-ri': 'dc68a0eb3ae23e1d6c1d1414ab9cc36d10fdf8c0dae66c12f37831c48ecbb57b',
  'h2024-sc': '5443eae019439caf81bcc1e506d07ce407c35c68d14bfc824a761bd0651fa602',
  'h2024-sd': 'becffd10af7f2041f8574013f426a0fee31f21d41038e74b2111783a666a2e31',
  'h2024-tn': '2b0ae04a2636c97527bc391edf406f4d723a4b37a076df9641aac5e09ca5e1aa',
  'h2024-tx': '8689e735e5c8e9dc31e949d7189d5432f0a882064c223b1855c1f8b632006ac9',
  'h2024-ut': '8bc3b250c742e61d3a13636c71106e1257f27c0fe29cc7e7fb41bcdf25e98203',
  'h2024-va': '3d5fabc5a97c8ecebc3dd98557324bf533c248da3bc5ce9e3b1252d263ed2d29',
  'h2024-vt': '85df5ae6be3ea7538cc062f4e5a2626cabc52e0e9de5965012fe81926aa3aa67',
  'h2024-wa': '90df9d864da8ab1e072927129d4de0299102196fbb32a26177c319b1a80d45e8',
  'h2024-wi': 'b1a74749669df5674b4480afcfa9bc99518d499cec5834e0601bb136158b6b9f',
  'h2024-wv': 'd23607ece8c76a30f7e425ed4e1788ae354ae464f924524b56b325d374ae6d40',
  'h2024-wy': 'dec5cadcb07bbc8074eb4db3f1eebf33be3a5c097087c61ebb1a0fb19df0871a',
  'h2025-ak': 'e4d6669eac49677cf5edf5b700561b4274a8b7002e395c8122844316b52ec0ee',
  'h2025-al': '68fad26be504a6d709fa6c970142a6686a24d50cf22bb050a75561b759a48587',
  'h2025-ar': '8417aa93b65f8ebee4bf49dd0b9a4c2dc038ae34984bd54731d0ba88a1a0d653',
  'h2025-az': '7050a4b2e453bad8874c08a2c1ed0c9cb2872579c61307212005ce462f996b9a',
  'h2025-ca': '5d003b00538192e127ce02773ba5a78e92d378ac11fef6cb31394a714dcb300f',
  'h2025-co': '2485a7b300bb7e156c6f2994bb78f21134f8ccc2d3fb2156f245a8cb3dc81959',
  'h2025-ct': 'da7f5f2fa3dfa7a8b2cc1dd33a5844e4c655272bef39fd9be6b42afd73ef34c3',
  'h2025-dc': 'c49e3752724edb31bff347ca9a53fab8efb246d96da2db2d60c25b1c0020c99b',
  'h2025-de': 'a65bafe77e47ffb375fc6b22807a2ce5a054cd9862bc8837b282c311ae0c10e4',
  'h2025-fl': '6d617b3d93fa38e6ce0410f002fb81ea8a0a4f674066b242072ffa4fbaef5f3e',
  'h2025-ga': '0fbb1b000c9c826b0e671a02df62e02fd8fa4416fb8db421aa19400915596c1e',
  'h2025-ia': '7f66df5cd4eb213a042ff60075c5932a16a6a7be0d5507110e31a826ff96ddb5',
  'h2025-id': '282a0caec41d53608682b6eeab7d182782dce86dd5741e6387228f2ae88ecdef',
  'h2025-il': '30836d33d1a9d7fcf64a0c85f865c0f4182a3a07f91013a66bd0dd94e46a93ca',
  'h2025-in': '5e2ef0e1dc289fd59301abc5962b3d65613e754ed672544a2eff39380c9f9d75',
  'h2025-ks': '4a599f2fe97d047cd24788089fc69f4225279403765cb11320d3bede8b5ae60f',
  'h2025-ky': '9fd24f363836f3c6a218f9fb3d28b98392b7d381b826ca1bfcb71a80bdf68a03',
  'h2025-la': '57c104eeeb40be787521d54c327bf4171ba1fedeb71ea282a6b4d10ace51455f',
  'h2025-ma': '90543818e73342ec2a8282850237b67a038e3a69d297440b52edf3dbe78a019d',
  'h2025-md': '8c1d1b134df8b23da513c9cd978fa3a8173c15d3460c966d4ebc2afc4d3791ee',
  'h2025-me': '181846b5d1c52576f25bf73c0267c2e7550806b502b4f9476d8a39bf85ee1b7e',
  'h2025-mi': '323b7f3a6e354632fb9549e736189b3c3cc5249be310573daf2df5a81dfa3e34',
  'h2025-mn': '07bd02ed5883d5c7ff01b0f1082efe90e5be7acb935bd47f1cb246ff7f667526',
  'h2025-mo': 'fe96299ef32fd8f33202cdc9f9d34bfba2af3db0bdf1608631597ec69ae64066',
  'h2025-ms': '9a92a9cf33fe42cf046aded0f3481f32274959b29aadeabab7b93669bceb2cb3',
  'h2025-mt': '00fc5da81f590a3da81616beb462a7cfb843fe5c52beadee55822d76740bea31',
  'h2025-nc': 'f05d1aa243a6ae8fc2dd84a0681e8d555ae93e400ba7e9c59478eef0ac705ec1',
  'h2025-nd': '31395cea49aa8196f1b4b7c35c314cc6629e7e807db9c13a427c558e549b984a',
  'h2025-ne': 'f4291372dbfb6b632c0fe0fac8f043d3b9e76f7b096858f07175455f11236f6d',
  'h2025-nh': 'f3cc7adfb04a7d4b2244683258478cd84ca642d0fcff4e1005a5528b82241f20',
  'h2025-nj': 'c0919c8172663843e998c8536c73513a1ea6155426e7cc0a9d702b6933027183',
  'h2025-nm': '5db13d3404af5fd5d03e199fe2ac454dee229ad5920d757034feb3f1e37a92fc',
  'h2025-nv': 'ae3a89d77435161a568d33276401fab483f51d686ec0d7ae5134f79ff531e48e',
  'h2025-ny': 'a2d0cfba9466fc2347fec867fafd9bba8c39d5a1b821664e5e792901e6148f6a',
  'h2025-oh': '28855fd93cbfccddce7cd2aec39ef24fb10c26b0d062d6064d64fb73ec0995d6',
  'h2025-ok': 'e3991bae63187e7f7274d578b34a1948e54b4504f4e414524d6cd7f51812b057',
  'h2025-or': '4027fe537137940de78a3f5346767fb3525f76ccde7733a9a7d9a273297a8915',
  'h2025-pa': '6ac5e7c33085928b9a308d0a2175f6b2be7ee2d950512125b3db3c2f943553b0',
  'h2025-pr': '4c19c56de7957f5b04006d128de0fc9af46e60da067e97f986872db4efa979b6',
  'h2025-ri': '1d8301f1e6ef6739566a63f702d14be9e6dff82efbb8243e72ad48eff63a8bc1',
  'h2025-sc': '4f099e41a6d447fc02ba12bba1367721d18fd8d19f56e249fd4b774af17d24d7',
  'h2025-sd': 'fec134eb147b9a7ab03052e3ce94a8bc445e076189d067a5ca94529c2d626162',
  'h2025-tn': '703c454ab4307ed7793e941e85dd9cf21634236cfe352acae2bbd6f6cc9d0482',
  'h2025-tx': 'e36f03343d8006fb1b80efb5f09d9be3ba1e839ac91335888961f67b1efaa591',
  'h2025-ut': 'd990f5887a42d21da4b13ff5b69025bfc81f3a04f4413e2a8d4c532631d295a2',
  'h2025-va': '95a0a22f9e298bafb951424a97b069f79245f371b5478c89d40366b4a9a58513',
  'h2025-vt': 'b189c0df82aa6bd8330f0629026e25534cf5c9f5e6495bcd116eb47a75c1e644',
  'h2025-wa': 'f3f9217f3d43ad11cea28f7637baf1348752b438c4094d7604130100c03cbbfc',
  'h2025-wi': '9113b8d23f256763e3ca0df366727d274fd004e430b2a1bacaca4466eb5f52ba',
  'h2025-wv': '89d4995e018e2241122caec0df1997f461098a10da054cef253c936fd3a68b59',
  'h2025-wy': '3d6c1418b736515a0877bb3522636c7316fc7b04bc1743583e1436e881fecd55',
};
const BULK = 'https://api.epa.gov/easey/bulk-files';
const hourly = Object.fromEntries(HOURLY_FILES.map(({ key, year, state }) => {
  const name = `emissions-hourly-${year}-${state.toLowerCase()}.csv`;
  return [key, { url: `${BULK}/emissions/hourly/state/${name}`, name, stream: true, sha256: SHA[key] ?? null }];
}));
const facility = Object.fromEntries(FACILITY_FILES.map(({ key, year }) => {
  const name = `facility-${year}.csv`;
  return [key, { url: `${BULK}/facility/${name}`, name, stream: true, sha256: SHA[key] ?? null }];
}));

export default {
  id: 'epa-camd',
  title: 'Measured power plant emissions from continuous monitors (EPA Clean Air Markets Program Data)',
  shortTitle: 'Measured plant emissions (EPA CAMPD)',
  description: {
    contains: `Measured carbon dioxide, sulfur dioxide, nitrogen oxides, heat input, and gross load for every unit with a continuous emission monitor in EPA's trading programs, ${YEARS[0]} to ${YEARS[YEARS.length - 1]}: monthly per unit, and hourly per balancing authority.`,
    excludes: 'No unmonitored generation: monitors cover large fossil units, mostly 25 MW and above, so a region\'s total is not its whole fleet. Gross load is not net generation, hours are local standard time, and units sharing a stack carry values EPA apportions between them rather than direct measurements.',
  },
  publisher: 'United States Environmental Protection Agency, Clean Air Markets Program Data (CAMPD)',
  sourceUrl: 'https://campd.epa.gov/data',
  terms: {
    url: 'https://www.epa.gov/web-policies-and-procedures/epa-disclaimers',
    section: 'Copyright Status',
    // Captured 2026-11-23 from the page above. EPA states a suggested citation for CAMPD
    // and this disclaimer; it does not state that this data is in the public domain.
    text: 'The U.S. Government retains a nonexclusive, royalty-free license to publish or reproduce these documents, or allow others to do so, for U.S. Government purposes. These documents may be freely distributed and used for non-commercial, scientific and educational purposes. Commercial use of the documents available from the EPA websites may be protected under the U.S. and Foreign Copyright Laws. Individual documents on the EPA website may have different copyright conditions, and that will be noted in those documents.',
    captured: '2026-11-23',
  },
  redistributionBasis: {
    kind: 'named license',
    note: 'EPA\'s own stated terms (the Copyright Status disclaimer above), not a public-domain dedication and not an SPDX license: free distribution for non-commercial, scientific, and educational purposes, with commercial use possibly protected by copyright. Only EPA\'s geospatial data is stated public domain, which this is not. The matcher reads the wording as restrictive, so only values we computed ship and EPA\'s own files are linked, not republished.',
  },
  inputLicense: 'publisher-terms',
  // No hand-set posture: the matcher derives "derive" from the captured terms.
  factual: true,
  attribution: 'U.S. Environmental Protection Agency (EPA). Clean Air Markets Program Data. Washington, DC: Office of Atmospheric Protection, Clean Air Markets Division. Available from EPA\'s Air Markets Program Data web site: https://campd.epa.gov. Retrieved {asOfMonth}. Aggregated by gridprims under EPA\'s stated terms.',
  cadence: { every: 'quarterly', nextRelease: { date: '2027-02-28', posted: false, note: 'Facilities report quarterly with about a 30-day lag and EPA rewrites the bulk files in place; the date is inferred, not posted' } },
  openItems: [
    { item: 'EPA states a suggested citation and a disclaimer rather than a license for CAMPD data', since: '2026-11-23', effect: 'The dataset ships under EPA\'s stated terms: only our own computed aggregates are published, and EPA\'s files are linked rather than mirrored.' },
  ],
  ceii: {
    infrastructure: true,
    note: 'Measured emissions and gross load per monitored unit, as EPA publishes them, with the plant\'s county. Latitude and longitude stay in EPA\'s file.',
    checklist: { publicSourceOnly: true, noPlanningModels: true, noSubstationPoints: true, noOneLineDiagrams: true, noBusImpedances: true, noNdaData: true },
  },
  owner: 'add-measured-plant-emissions',
  // EPA rewrites each file in place as facilities report and resubmit, so the watch is on the files themselves.
  releaseWatch: { period: 'rolling', urls: [`${BULK}/facility/facility-${YEARS[YEARS.length - 1]}.csv`, `${BULK}/emissions/hourly/state/emissions-hourly-${YEARS[YEARS.length - 1]}-pa.csv`] },
  vintages: {
    '2026-11': { release: `${YEARS[0]}-${YEARS[YEARS.length - 1]} as reported`, asOf: '2026-11-20', files: { ...facility, ...hourly } },
  },
  recipe: [
    { step: 'fetch', url: '{vintage.files.*.url}' },
  ],
  tables: [
    {
      name: 'units',
      title: 'Monitored units, their plants, regions, types, fuels, and programs, by year',
      uses: ['plant_id', 'unit_id', 'year', 'plant_name', 'state', 'county', 'unit_type', 'primary_fuel', 'nameplate_mw', 'apportioned', 'region', 'subregion', 'egrid_match'],
      recipe: [
        { step: 'read-lines', files: FACILITY_FILES.map((f) => f.key) },
        { step: 'join', dataset: 'egrid', table: 'plants', columns: ['plant_id', 'ba_code', 'subregion'] },
        { step: 'normalize', module: 'camd-units' },
        { step: 'validate', key: ['plant_id', 'unit_id', 'year'], rows: { min: 5000, max: 16000, maxDropPct: 10, maxRisePct: 25, from: 'the 2026-11 build: 8,149 unit-years across two data years' } },
        { step: 'partition', by: 'state' },
        { step: 'write-shards' },
        { step: 'write-csv-gz' },
      ],
    },
    {
      name: 'units_monthly',
      title: 'Measured emissions, heat input, and gross load by monitored unit and month',
      uses: ['plant_id', 'unit_id', 'year', 'month', 'co2_tonnes', 'so2_lbs', 'nox_lbs', 'heat_input_mmbtu', 'gross_load_mwh', 'operating_hours', 'apportioned'],
      changelog: { column: 'co2_tonnes', period: 'year' },
      recipe: [
        { step: 'read-lines', files: HOURLY_FILES.map((f) => f.key) },
        { step: 'normalize', module: 'camd-units-monthly' },
        { step: 'quirk', name: 'gross-load-is-load-times-operating-time', note: 'EPA reports an hourly average gross load in MW and the fraction of the hour the unit operated; megawatt-hours are the two multiplied, as EPA\'s own daily files total them. It is gross load, not net generation.', fixture: 'verify/reference/camd-published-summaries.json' },
        { step: 'validate', key: ['plant_id', 'unit_id', 'year', 'month'], rows: { min: 60000, max: 160000, maxDropPct: 10, maxRisePct: 25, from: 'the 2026-11 build: 93,558 unit-months across two data years' } },
        { step: 'partition', by: 'state' },
        { step: 'write-shards' },
        { step: 'write-csv-gz' },
      ],
    },
    {
      name: 'region_hourly',
      title: 'Measured emissions, heat input, and gross load by balancing authority and UTC hour',
      uses: ['region', 'year', 'hour', 'co2_tonnes', 'heat_input_mmbtu', 'gross_load_mwh', 'units_reporting', 'load_col_mwh', 'load_ng_mwh', 'load_oil_mwh', 'load_oth_mwh'],
      recipe: [
        { step: 'read-lines', files: HOURLY_FILES.map((f) => f.key) },
        { step: 'join', dataset: 'egrid', table: 'plants', columns: ['plant_id', 'ba_code', 'subregion'] },
        { step: 'normalize', module: 'camd-region-hourly' },
        { step: 'quirk', name: 'hours-are-moved-to-utc', note: 'EPA reports each record in the plant\'s own local standard time. Records are moved to UTC by the state\'s standard offset before they are added up, so a region spanning two time zones does not mix hours; a state split between zones takes the zone that holds most of it.', fixture: 'verify/tests/pipeline/epa-camd.test.mjs' },
        { step: 'validate', key: ['region', 'hour'], rows: { min: 600000, max: 1600000, maxDropPct: 10, maxRisePct: 25, from: 'the 2026-11 build: 894,744 region-hours, 50 regions over two years' } },
        { step: 'partition', by: ['region', 'year'], unmatched: 'unmatched' },
        { step: 'write-shards' },
      ],
    },
    {
      name: 'peak_hour_units',
      title: 'What ran in each region\'s ten highest-demand hours, unit by unit',
      uses: ['region', 'year', 'hour', 'rank', 'demand_mwh', 'plant_id', 'unit_id', 'fuel', 'gross_load_mwh', 'co2_tonnes', 'rate_lb_mwh', 'apportioned'],
      recipe: [
        { step: 'read-lines', files: HOURLY_FILES.map((f) => f.key) },
        { step: 'join', dataset: 'egrid', table: 'plants', columns: ['plant_id', 'ba_code'] },
        { step: 'join', dataset: 'eia-930', table: 'hourly', columns: ['ba', 'year', 'hour', 'demand'] },
        { step: 'normalize', module: 'camd-peak-hours' },
        { step: 'validate', key: ['region', 'hour', 'plant_id', 'unit_id'], rows: { min: 30000, max: 120000, maxDropPct: 15, maxRisePct: 25, from: 'the 2026-11 build: 57,864 unit-hours over 90 region-years' } },
        { step: 'partition', by: ['region', 'year'] },
        { step: 'write-shards' },
        { step: 'write-csv-gz' },
      ],
    },
  ],
};
