// Coincident peaks (load and bill analyzer tasks 1.3 and 5.1 to 5.4), each
// scenario as the coincident-peak spec states it, and ERCOT's snapshot
// against its published values.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ERCOT_NOTE, exposure, intervalOf, peakCost, preselect, programFor, PROGRAMS } from '../../../core/lib/coincident-peak.mjs';

const ROOT = join(import.meta.dirname, '../../..');
const ercot = JSON.parse(readFileSync(join(ROOT, 'data/curated/ercot-4cp.json'), 'utf8'));
const prog = (id) => PROGRAMS.find((p) => p.id === id);

test('the ERCOT snapshot: 2018–2020 and 2022–2025 have four interval-ending stamps matching ERCOT\'s published values; 2021 is dates only', () => {
  // ERCOT's values as docs/research/06 §1 read them from each workbook.
  const published = {
    2018: ['06-27 17:00', '07-19 17:00', '08-23 16:45', '09-19 16:30'], 2019: ['06-19 17:00', '07-30 16:30', '08-12 17:00', '09-06 16:45'],
    2020: ['06-08 17:45', '07-13 16:45', '08-13 16:45', '09-01 14:30'], 2022: ['06-23 17:00', '07-20 16:45', '08-02 17:00', '09-20 17:00'],
    2023: ['06-27 17:00', '07-31 17:00', '08-10 17:00', '09-08 16:45'], 2024: ['06-30 17:45', '07-01 17:00', '08-20 17:00', '09-20 16:00'],
    2025: ['06-19 17:00', '07-30 17:00', '08-18 17:00', '09-04 17:30'],
  };
  for (const [y, list] of Object.entries(published)) assert.deepEqual(ercot.years[y].intervals.map((i) => `${i.date.slice(5)} ${i.ends}`), list, y);
  assert.equal(ercot.years[2021].datesOnly, true);
  assert.equal(ercot.years[2021].flag, 'date only, interval time not published');
  assert.deepEqual(ercot.notYetPosted, [2026]);
  assert.equal(ercot.terms.retained, true);
});

test('ERCOT stamps mark the interval\'s end: 17:00 CPT is 16:45 to 17:00, and a 15-minute shift would fail', () => {
  const p = prog('ercot-4cp');
  const i = intervalOf(p, { date: '2025-06-19', time: '17:00' });
  // June is daylight time in Chicago (UTC−5): 16:45 CDT is 21:45Z.
  assert.equal(new Date(i.startMs).toISOString(), '2025-06-19T21:45:00.000Z');
  assert.equal(new Date(i.endMs).toISOString(), '2025-06-19T22:00:00.000Z');
});

test('hour labels: PJM hour ending 18:00 EPT in July starts at 21:00Z; NYISO hour beginning 18:00 EDT starts at 22:00Z', () => {
  assert.equal(new Date(intervalOf(prog('pjm-5cp'), { date: '2025-07-29', time: '18:00' }).startMs).toISOString(), '2025-07-29T21:00:00.000Z');
  assert.equal(new Date(intervalOf(prog('nyiso-icap'), { date: '2025-06-24', time: '18:00' }).startMs).toISOString(), '2025-06-24T22:00:00.000Z');
});

test('an older year keeps its rule: 2025 ERCOT uses 4CP, named, even with a 12CP version added; 12CP re-averages to 30 minutes and refuses hourly files', () => {
  const p = programFor('ercot-4cp', 2025);
  assert.deepEqual([p.name, p.peaks, p.minutes, p.months], ['ERCOT 4CP', 4, 15, [6, 7, 8, 9]]);
  assert.equal(programFor('ercot-4cp', 2027), null, 'the 4CP version ends with the 2026 measurement year');
  const twelve = programFor('ercot-12cp', 2027);
  assert.deepEqual([twelve.minutes, twelve.status], [30, 'proposed']);
  const hourly = { startMs: Float64Array.from([Date.parse('2025-06-19T21:00:00Z')]), kwh: Float64Array.from([100]), intervalMinutes: 60 };
  assert.deepEqual(exposure(hourly, twelve, [{ date: '2025-06-19', time: '17:00' }]), { status: 'refused', reason: 'ERCOT 12CP (proposed) uses 30-minute intervals, which cannot be recovered from hourly data.' });
  // 15-minute data averages into the 30-minute interval: 16:30 to 17:00 CDT.
  const q = { startMs: Float64Array.from([0, 1, 2, 3], (k) => Date.parse('2025-06-19T21:00:00Z') + k * 900_000), kwh: Float64Array.from([10, 20, 30, 40]), intervalMinutes: 15 };
  const e = exposure(q, twelve, [{ date: '2025-06-19', time: '17:00' }]);
  assert.equal(e.intervals[0].kw, (30 + 40) * 2, 'the 4:30 and 4:45 quarter hours, averaged to kW');
});

test('a 2021 analysis shows the four days flagged "date only" and computes no 15-minute result', () => {
  const e = exposure({ startMs: new Float64Array(), kwh: new Float64Array(), intervalMinutes: 15 }, prog('ercot-4cp'), ercot.years[2021].intervals.map((i) => ({ date: i.date, time: i.ends })));
  assert.deepEqual(e, { status: 'date-only', flag: 'date only, interval time not published', dates: ['2021-06-23', '2021-07-26', '2021-08-24', '2021-09-01'] });
});

test('ERCOT 4CP: 900, 950, 880, and 970 kW average 925 kW; at $4.00/kW-month that is $44,400 a year, $4,800 saved per 100 kW, on the next year\'s bills', () => {
  const p = prog('ercot-4cp');
  const stamps = ercot.years[2025].intervals.map((i) => ({ date: i.date, time: i.ends }));
  const loads = [900, 950, 880, 970];
  const startMs = Float64Array.from(stamps, (st) => intervalOf(p, st).startMs);
  const e = exposure({ startMs, kwh: Float64Array.from(loads, (kw) => kw / 4), intervalMinutes: 15 }, p, stamps);
  assert.deepEqual(e.intervals.map((i) => i.kw), loads);
  assert.equal(e.averageKw, 925);
  assert.equal(e.approximate, null);
  assert.deepEqual(peakCost(p, e.averageKw, { ratePerKwMonth: 4, reductionKw: 100 }), { annual: 44400, savings: 4800, applies: 'the following calendar year\'s bills' });
  assert.match(ERCOT_NOTE, /wires utility's tariff, which sets who qualifies/);
});

test('ERCOT\'s published 4CP averages: the averages of each entity\'s four loads match ERCOT\'s own to 0.1 kW, and the shares sum through', () => {
  for (const [year, y] of Object.entries(ercot.years)) {
    if (y.datesOnly) continue;
    const total = y.examples.find((x) => x.entity === 'Total');
    for (const x of y.examples) {
      const avg = x.loadsMw.reduce((a, b) => a + b, 0) / 4;
      assert.ok(Math.abs(avg - x.averageMw) * 1000 < 0.1, `${year} ${x.entity}`);
      assert.ok(Math.abs(x.averageMw / total.averageMw - x.loadRatioShare) < 1e-6, `${year} ${x.entity} share`);
    }
  }
});

test('PJM capacity: a 1,000 kW PLC at 1.05 scaling and $329.17/MW-day over 365 days is $126,154.40', () => {
  assert.equal(peakCost(prog('pjm-5cp'), 1000, { pricePerMwDay: 329.17, scaling: 1.05, days: 365 }).annual, 126154.4);
});

test('an hourly file in a 15-minute program is labeled approximate and says why; ERCOT is preselected for an ERCOT utility', () => {
  const p = prog('ercot-4cp');
  const st = { date: '2025-06-19', time: '17:00' };
  const hourly = { startMs: Float64Array.from([Date.parse('2025-06-19T21:00:00Z')]), kwh: Float64Array.from([800]), intervalMinutes: 60 };
  const e = exposure(hourly, p, [st]);
  assert.equal(e.intervals[0].kw, 800);
  assert.match(e.approximate, /^approximate: your data is hourly/);
  assert.equal(preselect(['ERCO']), 'ercot-4cp');
  assert.equal(preselect(['PJM']), 'pjm-5cp');
});
