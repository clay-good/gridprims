// The load and bill analyzer's fixtures (add-load-and-bill-analyzer task 1.1):
// meter files for a time-of-use bill with a demand charge, a ratchet, a July 4
// holiday, solar export, and ERCOT 4CP, each with results worked out by hand.
// Stamps are local wall-clock times in the fixture's zone, so daylight saving
// appears as it does in a real export. Run
// `node verify/fixtures/bill/analyzer.mjs` to rewrite the files; the test fails
// if the committed files drift from this generator.

import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { localToUtc, utcToLocal } from '../../../parsers/time.mjs';

const p2 = (n) => String(n).padStart(2, '0');
const CHICAGO = 'America/Chicago';
/** Every 15 minutes (or `minutes`) from local midnight on the first day to local midnight after the last, as [local stamp, UTC ms]. */
function* local(zone, from, to, minutes = 15) {
  const [y0, m0, d0] = from.split('-').map(Number);
  const [y1, m1, d1] = to.split('-').map(Number);
  const start = localToUtc(zone, { year: y0, month: m0, day: d0, hour: 0, minute: 0 }).utcMs;
  const end = localToUtc(zone, { year: y1, month: m1, day: d1 + 1, hour: 0, minute: 0 }).utcMs;
  for (let ms = start; ms < end; ms += minutes * 60_000) {
    const l = utcToLocal(zone, ms);
    yield [`${l.year}-${p2(l.month)}-${p2(l.day)} ${p2(l.hour)}:${p2(l.minute)}`, ms, l];
  }
}
const csv = (rows) => rows.map((r) => r.join(',')).join('\r\n') + '\r\n';
const at = (zone, stamp) => { const [d, t] = stamp.split(' '); const [y, m, dd] = d.split('-').map(Number); const [h, mi] = t.split(':').map(Number); return localToUtc(zone, { year: y, month: m, day: dd, hour: h, minute: mi }).utcMs; };

export const FIXTURES = [
  {
    file: 'tou-demand-march.csv', zone: CHICAGO, case: 'bill',
    note: 'March 2026 at 40 kW, with one 15-minute spike to 95 kW at 4:15 pm on Tuesday, March 10. Time-of-use energy (30 cents from 2 pm to 7 pm on weekdays, 10 cents otherwise) and a $12/kW on-peak demand charge.',
    body: () => { const spike = at(CHICAGO, '2026-03-10 16:15'); return csv([['Timestamp', 'kWh'], ...Array.from(local(CHICAGO, '2026-03-01', '2026-03-31'), ([s, ms]) => [s, ms === spike ? '23.75' : '10'])]); },
    // 743 local hours (2 am on March 8 does not happen) at 40 kW, plus 55 kW × 0.25 h; on-peak is 22 weekdays × 5 h × 40 kW plus the spike's 13.75 kWh.
    expect: { intervals: 2972, kwh: 29733.75, peakKwh: 4413.75, offKwh: 25320, demandKw: 95, setting: '2026-03-10 16:15', lines: { 'Energy, period 1': 2532, 'Energy, period 2': 1324.13, 'Time-of-use demand, period 2': 1140 }, total: 4996.13 },
  },
  {
    file: 'ratchet-july-august.csv', zone: CHICAGO, case: 'ratchet',
    note: 'July and August 2026 at 100 kW, peaking at 500 kW for 15 minutes on July 15 and 300 kW on August 12. A $10/kW monthly demand charge with an 80% ratchet over 11 months.',
    body: () => { const peaks = { [at(CHICAGO, '2026-07-15 15:00')]: 125, [at(CHICAGO, '2026-08-12 15:00')]: 75 }; return csv([['Timestamp', 'kWh'], ...Array.from(local(CHICAGO, '2026-07-01', '2026-08-31'), ([s, ms]) => [s, String(peaks[ms] ?? 25)])]); },
    expect: { months: { '2026-07': { metered: 500, billing: 500, note: 'lookback incomplete' }, '2026-08': { metered: 300, billing: 400, note: 'ratchet applied: 80% of 500 kW billing demand (July)' } } },
  },
  {
    file: 'holiday-july-2025.csv', zone: CHICAGO, case: 'holiday',
    note: 'July 2025 at 1 kW, hourly. On-peak is 2 pm to 7 pm on weekdays; July 4, 2025 is a Friday.',
    body: () => csv([['Timestamp', 'kWh'], ...Array.from(local(CHICAGO, '2025-07-01', '2025-07-31', 60), ([s]) => [s, '1'])]),
    // July 2025 has 23 weekdays: 115 on-peak kWh as weekdays, 110 with July 4 on the weekend schedule.
    expect: { peakKwh: 115, peakKwhWithHolidays: 110, holidays: ['Independence Day (July 4)'] },
  },
  {
    file: 'solar-export-april.csv', zone: CHICAGO, case: 'export',
    note: 'April 2026 in the PG&E-style IMPORT and EXPORT layout: 2,400 kWh delivered and 900 kWh received, spread evenly over the month\'s 720 hours.',
    body: () => {
      const rows = [['Name', 'SAMPLE'], [], ['TYPE', 'DATE', 'START TIME', 'END TIME', 'IMPORT (kWh)', 'EXPORT (kWh)', 'COST', 'NOTES']];
      for (const [s] of local(CHICAGO, '2026-04-01', '2026-04-30', 60)) { const [d, t] = s.split(' '); rows.push(['Electric usage', d, t, `${t.slice(0, 2)}:59`, (2400 / 720).toFixed(6), (900 / 720).toFixed(6), '', '']); }
      return csv(rows);
    },
    expect: { deliveredKwh: 2400, receivedKwh: 900, excluded: 'Export credits not modeled: 900 kWh exported, not credited' },
  },
  {
    file: 'ercot-4cp-2025.csv', zone: CHICAGO, case: 'cp',
    note: 'June to September 2025 at 500 kW, with 900, 950, 880, and 970 kW in ERCOT\'s four 2025 4CP intervals (ending 5:00 pm June 19, 5:00 pm July 30, 5:00 pm August 18, and 5:30 pm September 4).',
    body: () => {
      const peaks = { [at(CHICAGO, '2025-06-19 16:45')]: 900, [at(CHICAGO, '2025-07-30 16:45')]: 950, [at(CHICAGO, '2025-08-18 16:45')]: 880, [at(CHICAGO, '2025-09-04 17:15')]: 970 };
      return csv([['Timestamp', 'kWh'], ...Array.from(local(CHICAGO, '2025-06-01', '2025-09-30'), ([s, ms]) => [s, String((peaks[ms] ?? 500) / 4)])]);
    },
    expect: { loads: [900, 950, 880, 970], averageKw: 925, annualAt4: 44400 },
  },
];

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const dir = join(dirname(fileURLToPath(import.meta.url)), 'files');
  mkdirSync(dir, { recursive: true });
  for (const f of FIXTURES) writeFileSync(join(dir, f.file), f.body());
}
