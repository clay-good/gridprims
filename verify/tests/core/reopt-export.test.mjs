// The REopt-ready export (load and bill analyzer task 7.1), each scenario as
// the handoff-and-report spec states it.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { exportForReopt } from '../../../core/lib/reopt-export.mjs';
import { localToUtc } from '../../../parsers/time.mjs';

/** A series from a local start in a zone, stepping in UTC, with kW from the interval's UTC start. */
function series(zone, start, count, minutes, kwOf = () => 10) {
  const t0 = localToUtc(zone, { ...start, hour: 0, minute: 0 }).utcMs;
  const startMs = Float64Array.from({ length: count }, (_, i) => t0 + i * minutes * 60_000);
  return { startMs, kwh: Float64Array.from(startMs, (ms) => (kwOf(ms) * minutes) / 60), intervalMinutes: minutes };
}
const hoursIn = (y) => ((Date.UTC(y + 1, 0, 1) - Date.UTC(y, 0, 1)) / 3_600_000);
const lines = (r) => r.csv.trim().split('\n');

test('a file covering fewer than 12 months is refused, suggesting more history from the utility', () => {
  const r = exportForReopt(series('UTC', { year: 2026, month: 1, day: 1 }, 200 * 24, 60), 'UTC');
  assert.equal(r.status, 'refused');
  assert.match(r.reason, /^REopt needs a full year of load, and this file covers 7 months\. Ask your utility for more history/);
});

test('resolution: 5-minute data averages to 15-minute steps (35,040 rows), and 15, 30, and 60-minute files keep theirs', () => {
  const five = exportForReopt(series('UTC', { year: 2025, month: 1, day: 1 }, 365 * 288, 5, (ms) => (Math.floor(ms / 300_000) % 3) * 3), 'UTC');
  assert.deepEqual([five.rows, five.minutes, lines(five).length], [35040, 15, 35040]);
  assert.equal(lines(five)[0], '3.0000', 'the average of 0, 3, and 6 kW');
  assert.match(five.notes.join(' '), /5-minute intervals are averaged into 15-minute steps/);
  for (const [m, rows] of [[15, 35040], [30, 17520], [60, 8760]]) {
    const r = exportForReopt(series('UTC', { year: 2025, month: 1, day: 1 }, (365 * 1440) / m, m), 'UTC');
    assert.deepEqual([r.rows, lines(r).length, r.minutes], [rows, rows, m], `${m}-minute`);
  }
});

test('a messy file with two gaps and a DST repeat exports exactly 8,760 rows, and the notes list both gaps and the DST handling', () => {
  const zone = 'America/Chicago';
  const s = series(zone, { year: 2025, month: 1, day: 1 }, hoursIn(2025), 60, (ms) => 10 + (new Date(ms).getUTCHours() % 5));
  // Two gaps: 6 hours on March 3 and 3 hours on August 20. The file steps in UTC, so its local fall-back hour repeats on November 2.
  const drop = (y, m, d, h0, h1) => { const a = localToUtc(zone, { year: y, month: m, day: d, hour: h0, minute: 0 }).utcMs; const b = localToUtc(zone, { year: y, month: m, day: d, hour: h1, minute: 0 }).utcMs; return (ms) => ms >= a && ms < b; };
  const gaps = [drop(2025, 3, 3, 8, 14), drop(2025, 8, 20, 1, 4)];
  const keep = Array.from(s.startMs, (ms) => !gaps.some((g) => g(ms)));
  const messy = { ...s, startMs: s.startMs.filter((_, i) => keep[i]), kwh: s.kwh.filter((_, i) => keep[i]) };
  const r = exportForReopt(messy, zone);
  assert.equal(r.status, 'ok');
  assert.deepEqual([r.year, r.rows, lines(r).length], [2025, 8760, 8760]);
  const notes = r.notes.join('\n');
  assert.match(notes, /Gaps: 9 missing steps on 2 days \(2025-03-03, 2025-08-20\) are filled with the average of the same weekday and time/);
  assert.match(notes, /Filled values appear only in this export/);
  assert.match(notes, /Daylight saving: 1 repeated fall-back step is averaged into one/);
  assert.match(notes, /Daylight saving: 1 spring-forward step, which no clock shows, is filled/);
  // The original series is untouched: gaps stay gaps for every other tool.
  assert.equal(messy.startMs.length, hoursIn(2025) - 9);
});

test('July 2025 to June 2026 is re-stitched into calendar year 2026 by weekday, with the mapping and every filled day in the notes', () => {
  const r = exportForReopt(series('UTC', { year: 2025, month: 7, day: 1 }, 365 * 24, 60, (ms) => new Date(ms).getUTCDay() + 1), 'UTC');
  assert.equal(r.status, 'ok');
  assert.deepEqual([r.year, r.rows], [2026, 8760]);
  const notes = r.notes.join('\n');
  assert.match(notes, /re-stitched into calendar year 2026, month by month, keeping weekdays aligned/);
  assert.match(notes, /2026-01-01 to 2026-06-30 come from the same days\./);
  assert.match(notes, /2026-07-01 to 2026-12-30 come from 2025-07-02 to 2025-12-31, 52 weeks earlier, so weekdays match\./);
  assert.match(notes, /2026-12-31 has no matching day in the file and is filled from 2026-12-24, the nearest day with the same weekday\./);
  const filled = r.notes.filter((n) => /has no matching day in the file and is filled from/.test(n));
  assert.ok(filled.length >= 1 && filled.length <= 2, `${filled.length} filled days`);
  // Weekdays line up: each row's value is its source day's weekday + 1, which must equal the target day's.
  const vals = lines(r).map(Number);
  for (let d = 0; d < 365; d++) assert.equal(vals[d * 24], new Date(Date.UTC(2026, 0, 1 + d)).getUTCDay() + 1, `day ${d + 1}`);
});

test('a leap year: 2024 drops December 31, as REopt does, keeping 8,760 hourly rows, and says so', () => {
  const r = exportForReopt(series('UTC', { year: 2024, month: 1, day: 1 }, hoursIn(2024), 60), 'UTC');
  assert.deepEqual([r.year, r.rows], [2024, 8760]);
  assert.match(r.notes.join(' '), /2024 is a leap year, so December 31 is left out, as REopt does/);
  assert.match(r.notes[0], /^REopt custom load profile for calendar year 2024: 8,760 rows of average kW, 60-minute steps \(1 per hour\), no header, starting January 1 at midnight\. Set ElectricLoad\.year to 2024\./);
  assert.equal(r.fileName, 'gridprims-reopt-load-2024-1-per-hour.csv');
  assert.ok(!r.csv.includes(','), 'one column, no header');
});
