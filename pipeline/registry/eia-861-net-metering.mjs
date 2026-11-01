// EIA-861's net metering and non-net-metered distributed generation files,
// 2021 to 2025, for the net metering pages (add-program-fact-pages). The same
// yearly zips as the eia-861-history dataset; these two workbooks belong here.

import eia861 from './eia-861.mjs';
import history from './eia-861-history.mjs';

const YEARS = ['2021', '2022', '2023', '2024', '2025'];

const table = (name, title, entry, module, rows) => ({
  name, title,
  recipe: [
    { step: 'unzip', entry, files: YEARS },
    // The first sheet is the utility-level one; EIA renamed it from "States" to "States- Utility Level" in 2023.
    { step: 'read-xlsx', sheet: 0 },
    { step: 'normalize', module },
    { step: 'validate', key: ['data_year', 'state', 'utility_id', 'ba_code', 'type', 'technology', 'measure', 'sector'], rows },
    { step: 'partition', by: 'state' },
    { step: 'write-shards' },
    { step: 'write-csv-gz' },
  ],
});

export default {
  ...eia861,
  id: 'eia-861-net-metering',
  title: 'Net metering and other distributed generation (Form EIA-861), 2021 to 2025',
  shortTitle: 'EIA-861 net metering, 2021 to 2025',
  description: {
    contains: 'For each utility and state, 2021 to 2025: net-metered capacity, installations, and energy sold back by technology (photovoltaic, battery, wind, other) and sector, with virtual net metering, and distributed generation that is not net metered by technology and sector, with generator counts.',
    excludes: 'No third-party-owned breakouts and no territories. EIA writes "." for no value; such cells, and zeros, add no row, so a utility that reported none has no rows. Rules, caps, and compensation are not in the survey.',
  },
  attribution: 'Source: U.S. Energy Information Administration, Form EIA-861, Net Metering and Non-Net Metering Distributed Generation, 2021 to 2025 ({asOfMonth}).',
  owner: 'add-program-fact-pages',
  releaseWatch: undefined,
  vintages: { 2025: { ...history.vintages[2025] } },
  recipe: [{ step: 'fetch', url: '{vintage.files.*.url}' }],
  tables: [
    table('net_metering', 'Net-metered capacity, installations, and energy sold back by utility, technology, and sector', 'Net_Metering_{file}.xlsx', 'eia-861-net-metering', { min: 30000, max: 200000, maxDropPct: 10, maxRisePct: 25, from: 'set from the first build' }),
    table('non_net', 'Distributed generation that is not net metered, by utility, technology, and sector', 'Non_Net_Metering_Distributed_{file}.xlsx', 'eia-861-non-net-dg', { min: 3000, max: 60000, maxDropPct: 10, maxRisePct: 25, from: 'set from the first build' }),
  ],
};
