// Datasets gridprims computes and publishes itself (add-data-continuity-ledger
// 1.7), held to the same ledger terms as the publishers': each names the page
// that serves it, its cadence, and the dataset whose served version dates it,
// or, for hand-maintained records, the folder whose latest check dates it.

import largeLoad from './large-load-tariffs/_index.mjs';
import glossary, { CHECKED as GLOSSARY_CHECKED } from './glossary.mjs';
import go95 from './go95/clearances.mjs';

/** A hand-maintained folder is as old as its most recently checked record. */
const checked = (records) => ({ asOf: records.map((r) => r.lastChecked).sort().at(-1), vintage: `${records.length} records` });

export default [
  { id: 'gridprims-carbon-typical', title: 'Typical hourly CO₂ intensity by region, month, and clock hour', sourceUrl: 'https://gridprims.com/tools/carbon/load-shift/estimate/', cadence: { every: 'monthly' }, from: 'eia-930' },
  { id: 'gridprims-grid-rollups', title: 'Daily and monthly balancing authority rollups and the grid pulse', sourceUrl: 'https://gridprims.com/balancing-authorities/pjm/', cadence: { every: 'monthly' }, from: 'eia-930' },
  { id: 'gridprims-outage-history', title: 'County outage history (the backup power size\'s durations)', sourceUrl: 'https://gridprims.com/tools/electrify/backup-power/size/', cadence: { every: 'annual' }, from: 'eaglei' },
  { id: 'gridprims-glossary', title: 'Glossary of power and billing terms, cited', sourceUrl: 'https://gridprims.com/learn/glossary/', cadence: { every: 'annual' }, curated: 'glossary', asOf: GLOSSARY_CHECKED, vintage: `${glossary.length} entries` },
  { id: 'go95-clearances', title: 'California GO 95 clearances the overhead line checks use, with footnotes', sourceUrl: 'https://gridprims.com/tools/lines/midspan-clearance/check/', cadence: { every: 'annual' }, curated: 'go95', asOf: go95.lastChecked, vintage: `Table 1 (${go95.lastRevised.table1}), Table 2 (${go95.lastRevised.table2})` },
  { id: 'gridprims-large-load-terms', title: 'Large-load tariff terms, cited to primary orders and tariff sheets', sourceUrl: 'https://gridprims.com/large-load/terms/', cadence: { every: 'annual' }, curated: 'large-load-tariffs', ...checked(largeLoad) },
  { id: 'gridprims-reliability-cohorts', title: 'Reliability cohorts: SAIDI and SAIFI quartiles by ownership, size, and census division', sourceUrl: 'https://gridprims.com/reliability/cohorts.csv', cadence: { every: 'annual' }, from: 'eia-861' },
  { id: 'gridprims-weather-stations', title: 'Weather station index and nearest-station search', sourceUrl: 'https://gridprims.com/tools/weather/change/explain/', cadence: { every: 'monthly' }, from: 'ghcn-daily' },
];
