// Builds data/curated/ercot-4cp.json (add-load-and-bill-analyzer task 1.3)
// from ERCOT's own "Four Coincident Peak Calculations" workbooks (report
// NP9-83-M): each year's four interval stamps, read from the column headers,
// and three load entities' published loads with ERCOT's own average and load
// ratio share, kept as a published worked example of 4CP averaging. ERCOT's
// terms let raw data be redistributed in compilations (ercot.com/help/terms
// §5); they are retained, not relicensed. Dev-time only:
//   node verify/tools/ercot-4cp.mjs <dir with 4cp-<docID>.xlsx and the 1996-2020 zip, unpacked> > data/curated/ercot-4cp.json

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { readXlsx } from '../../parsers/xlsx.mjs';

const dir = process.argv[2];
const FILES = [
  { year: 2018, path: 'hist/1996-2020_FourCoincidentPeakCalculations/2018/ERCOTFourCoincidentPeakLoadCalculation2018.xlsx', url: 'https://www.ercot.com/files/docs/2022/01/13/1996-2020_FourCoincidentPeakCalculations.zip', posted: '2018-11-29' },
  { year: 2019, path: 'hist/1996-2020_FourCoincidentPeakCalculations/2019/ERCOTFourCoincidentPeakLoadCalculation2019.xlsx', url: 'https://www.ercot.com/files/docs/2022/01/13/1996-2020_FourCoincidentPeakCalculations.zip', posted: '2020-01-30', note: 'Revised per PUCT Docket 50333' },
  { year: 2020, path: 'hist/1996-2020_FourCoincidentPeakCalculations/2020/ERCOTFourCoincidentPeakLoadCalculation2020.xlsx', url: 'https://www.ercot.com/files/docs/2022/01/13/1996-2020_FourCoincidentPeakCalculations.zip', posted: '2020-11-18' },
  { year: 2022, path: '4cp-879528147.xlsx', docId: '879528147', posted: '2022-11-28' },
  { year: 2023, path: '4cp-961277079.xlsx', docId: '961277079', posted: '2023-11-27' },
  { year: 2024, path: '4cp-1055377059.xlsx', docId: '1055377059', posted: '2024-11-25' },
  { year: 2025, path: '4cp-1164129560.xlsx', docId: '1164129560', posted: '2025-11-24' },
];
const value = (c) => (c && typeof c === 'object' ? c.value : c);
const years = {};
for (const f of FILES) {
  const bytes = readFileSync(join(dir, f.path));
  const wb = await readXlsx(new Uint8Array(bytes));
  const rows = wb.rows.map((r) => r.map(value));
  const h = rows.findIndex((r) => String(r[3] ?? '').startsWith('June'));
  const intervals = rows[h].slice(3, 7).map((cell) => {
    const [, m, d, y, hh, mm] = /(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{2})/.exec(String(cell));
    return { date: `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`, ends: `${hh.padStart(2, '0')}:${mm}`, minutes: 15 };
  });
  const entity = (name) => rows.find((r) => String(r[1] ?? '').trim() === name);
  const examples = ['AEP TEXAS CENTRAL COMPANY (TDSP)', 'ONCOR ELECTRIC DELIVERY COMPANY LLC (TDSP)', 'Total'].map(entity).filter(Boolean).map((r) => ({ entity: String(r[1]).trim(), loadsMw: r.slice(3, 7), averageMw: r[7], loadRatioShare: r[8] }));
  years[f.year] = {
    intervals, examples,
    source: { report: 'ERCOT Four Coincident Peak Calculations (NP9-83-M)', ...(f.docId ? { docId: f.docId, url: `https://www.ercot.com/misdownload/servlets/mirDownload?doclookupId=${f.docId}` } : { url: f.url, file: f.path.split('/').pop() }), posted: f.posted, sha256: createHash('sha256').update(bytes).digest('hex'), ...(f.note ? { note: f.note } : {}) },
  };
}
years[2021] = {
  intervals: ['2021-06-23', '2021-07-26', '2021-08-24', '2021-09-01'].map((date) => ({ date, ends: null, minutes: 15 })),
  datesOnly: true, flag: 'date only, interval time not published',
  source: { report: 'Trade press citing PUCT Project 51878, item 52; ERCOT no longer serves the 2021 file', url: 'http://www.energychoicematters.com/stories/20211130d.html', posted: '2021-11-30' },
};
console.log(JSON.stringify({
  publisher: 'Electric Reliability Council of Texas (ERCOT)',
  terms: { url: 'https://www.ercot.com/help/terms', section: '§5', text: 'The publicly available contents of this website may be used, reproduced, and redistributed ... raw data may be used, reproduced, and redistributed in compilations, charts, and analyses without maintaining such notices.', retained: true },
  timeLabel: 'Each stamp is the end of a 15-minute interval in Central Prevailing Time, as ERCOT settles; the file headers give a date and time only.',
  asOf: '2025-11-24',
  notYetPosted: [2026],
  years: Object.fromEntries(Object.entries(years).sort()),
}, null, 1));
