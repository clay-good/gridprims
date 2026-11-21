// Three homes with interval data and totals, for the published error of the time-of-use estimate from totals
// (add-household-bill-check 3.3): individual buildings of the NLR End-Use Load Profiles (ResStock AMY2018 release 1
// of 2025, upgrade 0; CC BY 4.0, Wilson et al., DOI 10.25984/1876417), each year of 15-minute total electricity
// summed to hours in the file's own clock (interval-ending stamps, read as the hour the interval falls in).
// Dev-time only; reads each Parquet file with gridprims' own reader:
//   node verify/tools/tou-estimate-homes.mjs > verify/fixtures/bill/resstock-homes-2018.json
import { createHash } from 'node:crypto';
import { readParquet } from '../../parsers/parquet.mjs';

const BASE = 'https://oedi-data-lake.s3.amazonaws.com/nrel-pds-building-stock/end-use-load-profiles-for-us-building-stock/2025/resstock_amy2018_release_1/timeseries_individual_buildings/by_state/upgrade=0';
export const HOMES = [
  { state: 'CO', bldg: '100014', zone: 'Etc/GMT+7' },
  { state: 'TX', bldg: '100', zone: 'Etc/GMT+6' },
  { state: 'CA', bldg: '100004', zone: 'Etc/GMT+8' },
];

if (process.argv[1] === new URL(import.meta.url).pathname) {
  const out = { source: { title: 'End-Use Load Profiles for the U.S. Building Stock, ResStock AMY2018 release 1 (2025), individual buildings, upgrade 0', license: 'CC BY 4.0', citation: 'Wilson, E., et al. End-Use Load Profiles for the U.S. Building Stock. DOI 10.25984/1876417.', retrieved: '2026-11-21' }, homes: [] };
  for (const h of HOMES) {
    const url = `${BASE}/state=${h.state}/${h.bldg}-0.parquet`;
    const bytes = new Uint8Array(await (await fetch(url)).arrayBuffer());
    const t = readParquet(bytes);
    const stamps = t.column('timestamp');
    const kwh = t.column('out.electricity.total.energy_consumption..kwh');
    const hourly = Array(8760).fill(0);
    stamps.forEach((s, i) => {
      const start = Date.parse(s) - 15 * 60_000;
      const hour = Math.floor((start - Date.parse('2018-01-01T00:00:00Z')) / 3_600_000);
      if (hour >= 0 && hour < 8760) hourly[hour] += Number(kwh[i]);
    });
    out.homes.push({ ...h, url, sha256: createHash('sha256').update(bytes).digest('hex'), hourlyKwh: hourly.map((x) => Math.round(x * 1000) / 1000) });
  }
  console.log(JSON.stringify(out));
}
