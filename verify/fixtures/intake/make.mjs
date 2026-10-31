// The intake fixture library (foundation task 6.1): synthetic files shaped
// like real utility exports, seeded from docs/research/03 §1, 07 §3, and 09 §1.
// Layouts the research marks unverified are labeled so here; no customer data
// is used. Run `node verify/fixtures/intake/make.mjs` to rewrite the files;
// the intake test fails if the committed files drift from this generator.

import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const p2 = (n) => String(n).padStart(2, '0');
const iso = (d) => `${d.getUTCFullYear()}-${p2(d.getUTCMonth() + 1)}-${p2(d.getUTCDate())}`;
const us = (d) => `${d.getUTCMonth() + 1}/${d.getUTCDate()}/${d.getUTCFullYear()}`;
const hm = (d) => `${p2(d.getUTCHours())}:${p2(d.getUTCMinutes())}`;
const ampm = (d) => { const h = d.getUTCHours(); return `${h % 12 || 12}:${p2(d.getUTCMinutes())} ${h < 12 ? 'AM' : 'PM'}`; };
/** A deterministic, plausible load value for interval i. */
const kwh = (i, scale = 1) => +((0.5 + ((i * 37) % 23) / 10) * scale).toFixed(3);

/** Wall-clock steps in a month with no DST change (naive arithmetic is exact there). */
function* steps(startIso, count, minutes) {
  const t0 = Date.parse(`${startIso}T00:00:00Z`);
  for (let i = 0; i < count; i++) yield [i, new Date(t0 + i * minutes * 60_000)];
}
const csv = (rows) => rows.map((r) => r.map((c) => (/[",\n]/.test(String(c)) ? `"${String(c).replace(/"/g, '""')}"` : c)).join(',')).join('\r\n') + '\r\n';

/** @type {Array<{file: string, note: string, zone: string, body: () => string | Uint8Array, expect: Record<string, any>}>} */
export const FIXTURES = [
  {
    file: 'pge-green-button.csv', zone: 'America/Los_Angeles',
    note: 'PG&E Green Button CSV: metadata rows, then TYPE,DATE,START TIME,END TIME,USAGE (kWh),COST,NOTES (layout unverified, research 07 §3)',
    body: () => {
      const rows = [['Name', 'SAMPLE CUSTOMER'], ['Address', '1 MAIN ST'], ['Account Number', '0000000000'], ['Service', 'Service 1'], [], ['TYPE', 'DATE', 'START TIME', 'END TIME', 'USAGE (kWh)', 'COST', 'NOTES']];
      for (const [i, d] of steps('2026-01-01', 96 * 2, 15)) rows.push(['Electric usage', iso(d), hm(d), hm(new Date(+d + 14 * 60_000)), kwh(i, 0.25), `$${(kwh(i, 0.25) * 0.3).toFixed(2)}`, '']);
      return csv(rows);
    },
    expect: { intervalMinutes: 15, stampsMark: 'start', rowsRead: 192, series: 1, unitsRead: ['kWh'], headerRow: 6, firstKwh: 0.125 },
  },
  {
    file: 'pge-import-export.csv', zone: 'America/Los_Angeles',
    note: 'PG&E CSV for a solar customer: IMPORT and EXPORT columns become delivered and received channels (unverified layout)',
    body: () => {
      const rows = [['Name', 'SAMPLE'], [], ['TYPE', 'DATE', 'START TIME', 'END TIME', 'IMPORT (kWh)', 'EXPORT (kWh)', 'COST', 'NOTES']];
      for (const [i, d] of steps('2026-01-05', 96, 15)) rows.push(['Electric usage', iso(d), hm(d), hm(new Date(+d + 14 * 60_000)), kwh(i, 0.2), d.getUTCHours() >= 9 && d.getUTCHours() < 16 ? kwh(i, 0.3) : 0, '', '']);
      return csv(rows);
    },
    expect: { intervalMinutes: 15, series: 2, channels: ['delivered', 'received'], rowsRead: 192 },
  },
  {
    file: 'sce-hour-range.csv', zone: 'America/Los_Angeles',
    note: 'Older SCE style: a date plus an hour-range column such as "0-0:59" (unverified, research 07 §3)',
    body: () => {
      const rows = [['Date', 'Hour', 'kWh']];
      for (const [i, d] of steps('2026-01-01', 48, 60)) rows.push([us(d), `${d.getUTCHours()}-${d.getUTCHours()}:59`, kwh(i)]);
      return csv(rows);
    },
    expect: { intervalMinutes: 60, stampsMark: 'start', rowsRead: 48 },
  },
  {
    file: 'smart-meter-texas.csv', zone: 'America/Chicago',
    note: 'Smart Meter Texas 15-minute export: ESIID, date, start and end times, kWh, estimated flag, consumption or surplus generation (column names unverified)',
    body: () => {
      const rows = [['ESIID', 'USAGE_DATE', 'REVISION_DATE', 'USAGE_START_TIME', 'USAGE_END_TIME', 'USAGE_KWH', 'ESTIMATED_ACTUAL', 'CONSUMPTION_SURPLUSGENERATION']];
      for (const [i, d] of steps('2026-01-10', 96, 15)) {
        rows.push(['10443720000000000', us(d), us(d), hm(d), hm(new Date(+d + 15 * 60_000)), kwh(i, 0.25), 'A', 'Consumption']);
        if (d.getUTCHours() === 12) rows.push(['10443720000000000', us(d), us(d), hm(d), hm(new Date(+d + 15 * 60_000)), 0.05, 'A', 'Surplus Generation']);
      }
      return csv(rows);
    },
    expect: { intervalMinutes: 15, series: 2, channels: ['delivered', 'received'], meters: ['10443720000000000'] },
  },
  {
    file: 'iso-timestamp.csv', zone: 'America/New_York',
    note: 'Generic export: one ISO 8601 timestamp column and kWh',
    body: () => csv([['Timestamp', 'kWh'], ...Array.from(steps('2026-01-01', 96 * 3, 15), ([i, d]) => [`${iso(d)}T${hm(d)}:00`, kwh(i, 0.25)])]),
    expect: { intervalMinutes: 15, rowsRead: 288, series: 1 },
  },
  {
    file: 'us-datetime-ampm-kw.csv', zone: 'America/Denver',
    note: 'Demand in kW with US dates and 12-hour times in one column, as some portals write',
    body: () => csv([['Date/Time', 'Demand (kW)'], ...Array.from(steps('2026-01-01', 96, 15), ([i, d]) => [`${us(d)} ${ampm(d)}`, kwh(i, 40)])]),
    expect: { intervalMinutes: 15, quantity: 'demand', unitsRead: ['kW'], firstKwh: 5 },
  },
  {
    file: 'hour-ending-1-24.csv', zone: 'America/Chicago',
    note: 'Hourly file numbering hours 1 to 24 (hour ending), as many CSVs do (research 03)',
    body: () => {
      const rows = [['Read Date', 'Hour', 'Usage kWh']];
      for (let day = 1; day <= 2; day++) for (let h = 1; h <= 24; h++) rows.push([`2026-01-0${day}`, h, kwh(day * 24 + h)]);
      return csv(rows);
    },
    expect: { intervalMinutes: 60, stampsMark: 'end', firstLocal: '2026-01-01T00:00' },
  },
  {
    file: 'time-2400.csv', zone: 'America/Chicago',
    note: 'Hourly file whose last stamp of the day is 24:00, marking interval ends',
    body: () => {
      const rows = [['Date', 'Time', 'kWh']];
      for (let day = 1; day <= 2; day++) for (let h = 1; h <= 24; h++) rows.push([`01/0${day}/2026`, `${h}:00`, kwh(h)]);
      return csv(rows);
    },
    expect: { intervalMinutes: 60, stampsMark: 'end', rowsRead: 48, firstLocal: '2026-01-01T00:00', lastLocal: '2026-01-02T23:00' },
  },
  {
    file: 'wide-hourly-he.csv', zone: 'America/Chicago',
    note: 'One row per day with HE1 to HE24 columns (hour ending)',
    body: () => csv([['Account', 'Date', ...Array.from({ length: 24 }, (_, h) => `HE${h + 1}`)], ...[1, 2, 3].map((day) => ['12345', `2026-01-0${day}`, ...Array.from({ length: 24 }, (_, h) => kwh(day * 24 + h))])]),
    expect: { intervalMinutes: 60, stampsMark: 'end', rowsRead: 72, layout: 'one row per day' },
  },
  {
    file: 'wide-15min.csv', zone: 'America/Chicago',
    note: 'One row per day with 96 interval-start columns and a header that names no unit',
    body: () => csv([['Date', ...Array.from({ length: 96 }, (_, k) => `${Math.floor(k / 4)}:${p2((k % 4) * 15)}`)], ...[1, 2].map((day) => [`2026-01-0${day}`, ...Array.from({ length: 96 }, (_, k) => kwh(k, 0.25))])]),
    expect: { intervalMinutes: 15, stampsMark: 'start', rowsRead: 192, layout: 'one row per day', assumption: true },
  },
  {
    file: 'two-meters-partial-year.csv', zone: 'America/Chicago',
    note: 'Two meters in one file, covering 7 months (one reading per day each, daily kWh)',
    body: () => {
      const rows = [['Meter Number', 'Interval Start', 'kWh']];
      const t0 = Date.parse('2026-01-01T00:00:00Z');
      for (let i = 0; i < 212; i++) {
        const d = new Date(t0 + i * 86_400_000);
        for (const m of ['A', 'B']) rows.push([m, `${iso(d)} 00:00`, kwh(i, m === 'A' ? 20 : 30)]);
      }
      return csv(rows);
    },
    expect: { series: 2, meters: ['A', 'B'], months: 7, intervalMinutes: 1440 },
  },
  {
    file: 'mixed-units.csv', zone: 'America/Chicago',
    note: 'Two meters in one file whose columns say Wh and kWh; each is converted on its own',
    body: () => csv([['Interval Start', 'Meter A (Wh)', 'Meter B (kWh)'], ...Array.from(steps('2026-01-01', 24, 60), ([i, d]) => [`${iso(d)} ${hm(d)}`, kwh(i) * 1000, kwh(i)])]),
    expect: { series: 2, unitsRead: ['Wh', 'kWh'], sameKwh: true },
  },
  {
    file: 'dst-spring-forward.csv', zone: 'America/Chicago',
    note: 'Local-time 15-minute file across March 8, 2026, with no 2:00-2:45 am rows (written out by hand)',
    body: () => {
      const rows = [['Date', 'Start Time', 'kWh']];
      for (const day of ['2026-03-07', '2026-03-08']) {
        for (let h = 0; h < 24; h++) for (const m of [0, 15, 30, 45]) {
          if (day === '2026-03-08' && h === 2) continue;
          rows.push([day, `${p2(h)}:${p2(m)}`, 0.5]);
        }
      }
      return csv(rows);
    },
    expect: { rowsRead: 188, gaps: 0, intervalMinutes: 15 },
  },
  {
    file: 'dst-fall-back.csv', zone: 'America/Chicago',
    note: 'Local-time 15-minute file across November 1, 2026, with the 1:00-1:45 am hour written twice (written out by hand)',
    body: () => {
      const rows = [['Date', 'Start Time', 'kWh']];
      for (let h = 0; h < 24; h++) for (const m of [0, 15, 30, 45]) {
        rows.push(['2026-11-01', `${p2(h)}:${p2(m)}`, h === 1 ? 0.7 : 0.5]);
        if (h === 1) rows.push(['2026-11-01', `${p2(h)}:${p2(m)}`, 0.6]);
      }
      return csv(rows);
    },
    expect: { rowsRead: 100, repeatedKept: 4, gaps: 0, duplicatesConflicting: 0 },
  },
  {
    file: 'conflicting-duplicate.csv', zone: 'America/Chicago',
    note: 'Two rows share a timestamp outside the fall-back hour with 120 kW and 135 kW',
    body: () => csv([['Interval Start', 'kW'], ['2026-01-01 00:00', 100], ['2026-01-01 00:15', 120], ['2026-01-01 00:15', 135], ['2026-01-01 00:30', 110], ['2026-01-01 00:45', 105]]),
    expect: { duplicatesConflicting: 1, keptKw: 135 },
  },
  {
    file: 'gap-24-hours.csv', zone: 'America/Chicago',
    note: 'Three days of 15-minute data with the middle day missing: 96 consecutive intervals',
    body: () => csv([['Interval Start', 'kWh'], ...Array.from(steps('2026-01-01', 96 * 3, 15), ([i, d]) => [`${iso(d)} ${hm(d)}`, kwh(i, 0.25)]).filter((_, i) => i < 96 || i >= 192)]),
    expect: { gaps: 1, gapIntervals: 96, rowsRead: 192 },
  },
  {
    file: 'net-negative.csv', zone: 'America/Phoenix',
    note: 'A net meter whose midday values go negative (export); negatives are kept, not dropped',
    body: () => csv([['Interval Start', 'Net kWh'], ...Array.from(steps('2026-01-01', 24, 60), ([i, d]) => [`${iso(d)} ${hm(d)}`, d.getUTCHours() >= 10 && d.getUTCHours() <= 14 ? -1.5 : kwh(i)])]),
    expect: { channels: ['net'], negatives: 5 },
  },
  {
    file: 'semicolon-bom.csv', zone: 'America/New_York',
    note: 'Semicolon-delimited with a UTF-8 byte-order mark, as some spreadsheet exports write',
    body: () => '﻿' + [['Date', 'Time', 'Consumption (kWh)'], ...Array.from(steps('2026-01-01', 48, 30), ([i, d]) => [iso(d), hm(d), kwh(i, 0.5)])].map((r) => r.join(';')).join('\n') + '\n',
    expect: { intervalMinutes: 30, rowsRead: 48, delimiter: ';' },
  },
  {
    file: 'tab-windows-1252.txt', zone: 'America/Chicago',
    note: 'Tab-separated text in Windows-1252 with a °F temperature column, named .txt',
    body: () => {
      const text = [['Date', 'Time', 'kWh', 'Temp (°F)'], ...Array.from(steps('2026-01-01', 24, 60), ([i, d]) => [us(d), hm(d), kwh(i), 30 + (i % 10)])].map((r) => r.join('\t')).join('\r\n') + '\r\n';
      return Uint8Array.from(text, (c) => (c === '°' ? 0xb0 : c.charCodeAt(0)));
    },
    expect: { intervalMinutes: 60, rowsRead: 24, delimiter: 'tab', encoding: 'windows-1252', values: ['kWh'] },
  },
  {
    file: 'footer-total.csv', zone: 'America/Chicago',
    note: 'An export ending with a total row and a disclaimer line; both are skipped and counted',
    body: () => csv([['Date', 'Start Time', 'kWh'], ...Array.from(steps('2026-01-01', 24, 60), ([i, d]) => [iso(d), hm(d), kwh(i)]), ['Total', '', '50.0'], ['Data is provided as is.', '', '']]),
    expect: { rowsRead: 24, skipped: 2 },
  },
  {
    file: 'usage-ambiguous.csv', zone: 'America/Chicago',
    note: 'A column headed only "Usage": read as kWh, with the assumption stated on the receipt',
    body: () => csv([['Interval Start', 'Usage'], ...Array.from(steps('2026-01-01', 24, 60), ([i, d]) => [`${iso(d)} ${hm(d)}`, kwh(i)])]),
    expect: { assumption: true, quantity: 'energy' },
  },
];

export const DIR = join(dirname(fileURLToPath(import.meta.url)), 'files');

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  mkdirSync(DIR, { recursive: true });
  for (const f of FIXTURES) writeFileSync(join(DIR, f.file), f.body());
  console.log(`wrote ${FIXTURES.length} fixtures to ${DIR}`);
}
