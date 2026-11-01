// Datasets gridprims computes and publishes itself (add-data-continuity-ledger
// 1.7), held to the same ledger terms as the publishers': each names the page
// that serves it, its cadence, and the dataset whose served version dates it.

export default [
  { id: 'gridprims-carbon-typical', title: 'Typical hourly CO₂ intensity by region, month, and clock hour', sourceUrl: 'https://gridprims.com/tools/carbon/load-shift/estimate/', cadence: { every: 'monthly' }, from: 'eia-930' },
  { id: 'gridprims-grid-rollups', title: 'Daily and monthly balancing authority rollups and the grid pulse', sourceUrl: 'https://gridprims.com/balancing-authorities/pjm/', cadence: { every: 'monthly' }, from: 'eia-930' },
  { id: 'gridprims-outage-history', title: 'County outage history (the backup power size\'s durations)', sourceUrl: 'https://gridprims.com/tools/electrify/backup-power/size/', cadence: { every: 'annual' }, from: 'eaglei' },
  { id: 'gridprims-weather-stations', title: 'Weather station index and nearest-station search', sourceUrl: 'https://gridprims.com/tools/weather/change/explain/', cadence: { every: 'monthly' }, from: 'ghcn-daily' },
];
