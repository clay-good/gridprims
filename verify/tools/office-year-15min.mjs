// Writes the year of 15-minute office load used to check interval insights
// (add-load-and-bill-analyzer task 2.1): 2025 in America/Chicago, from a
// stated formula, so it may be redistributed. 30 kW overnight, 90 kW from
// 7 am to 6 pm on weekdays, a cooling bump on summer afternoons, a slow
// wobble so no two days repeat, and one 15-minute spike to 240 kW at
// 10:15 am on Tuesday, March 18. Times are interval starts in UTC.
//   node verify/tools/office-year-15min.mjs > verify/fixtures/load/office-2025-15min.csv

import { utcToLocal } from '../../parsers/time.mjs';

const start = Date.UTC(2025, 0, 1, 6); // midnight in Chicago
const end = Date.UTC(2026, 0, 1, 6);
const lines = ['interval_start_utc,kwh'];
for (let ms = start, i = 0; ms < end; ms += 900_000, i++) {
  const l = utcToLocal('America/Chicago', ms);
  const wd = new Date(Date.UTC(l.year, l.month - 1, l.day)).getUTCDay();
  const open = wd >= 1 && wd <= 5 && l.hour >= 7 && l.hour < 18;
  let kw = open ? 90 : 30;
  if (open && l.month >= 6 && l.month <= 9 && l.hour >= 13 && l.hour < 17) kw += 35;
  kw += 3 * Math.sin(i / 97) + 2 * Math.sin(i / 1013);
  if (l.year === 2025 && l.month === 3 && l.day === 18 && l.hour === 10 && l.minute === 15) kw = 240;
  lines.push(`${new Date(ms).toISOString().slice(0, 19)}Z,${(kw / 4).toFixed(4)}`);
}
console.log(lines.join('\n'));
