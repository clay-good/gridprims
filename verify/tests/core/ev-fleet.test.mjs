// EV fleet charging (add-electrification-tools: ev-fleet-charging): dwell
// windows in elapsed hours, unmanaged and managed charging on the spec's
// numbers, managed never worse on three fleets, and the service check.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dwellClockHours, fit, managed, monthlyPeaks, serviceCheck, sessions, unmanaged } from '../../../core/lib/ev-fleet.mjs';

const ZONE = 'America/Chicago';
const sum = (a) => a.reduce((x, y) => x + y, 0);

/** A flat building load: `kw` for `days` days of 15-minute intervals from local midnight, January 6, 2025 (a Monday). */
function flat(kw, days, from = Date.UTC(2025, 0, 6, 6)) {
  const n = days * 96;
  return { startMs: Float64Array.from({ length: n }, (_, i) => from + i * 900_000), kwh: new Float64Array(n).fill(kw / 4), intervalMinutes: 15 };
}

test('not enough time: 10 buses needing 300 kWh on 60 kW chargers in a 4-hour dwell get 240 kWh each, 60 kWh short', () => {
  const f = fit({ count: 10, kwhPerDay: 300, chargerKw: 60, plugIn: '20:00', depart: '00:00' }, 4);
  assert.equal(f.maxKwh, 240);
  assert.equal(f.shortfallKwh, 60);
  assert.equal(dwellClockHours({ plugIn: '20:00', depart: '00:00' }), 4);
});

test('the spec\'s numbers: unmanaged adds 600 kW from 6 to 8 pm (peak 800 kW); managed spreads 1,200 kWh at 100 kW (peak 300 kW)', () => {
  const s = flat(200, 4);
  const fleet = [{ count: 10, kwhPerDay: 120, chargerKw: 60, plugIn: '18:00', depart: '06:00' }];
  const list = sessions(s, fleet, ZONE);
  assert.equal(list.length, 3, 'three whole nights in four days');
  assert.equal(list[0].hours, 12);
  assert.equal(list[0].kwh, 1200);
  const u = unmanaged(s, list);
  const m = managed(s, list);
  // The first night: 6 pm local is interval 72.
  assert.deepEqual([...u.slice(72, 80)].map((e) => e * 4), Array(8).fill(600));
  assert.equal(u[80], 0, 'full by 8 pm');
  const peaks = monthlyPeaks(s, ZONE, u, m)[0];
  assert.equal(peaks.unmanagedKw, 800);
  assert.ok(Math.abs(peaks.managedKw - 300) <= 0.1, `managed peak ${peaks.managedKw}`);
  const night = [...m.slice(72, 120)];
  assert.ok(night.every((e) => e * 4 <= 100.1), 'never above about 100 kW');
  assert.ok(Math.abs(sum(night) - 1200) < 1e-6, '1,200 kWh within the 12 hours');
  assert.ok(Math.abs(sum(m) - sum(u)) < 1e-6, 'the same energy either way');
});

test('dwell across midnight and fall-back: 10 pm to 5 am is 7 clock hours but 8 elapsed hours that night', () => {
  const s = flat(50, 3, Date.UTC(2025, 9, 31, 5)); // October 31 to November 2, 2025; clocks fall back early November 2
  const g = { count: 1, kwhPerDay: 100, chargerKw: 10, plugIn: '22:00', depart: '05:00' };
  assert.equal(dwellClockHours(g), 7);
  const list = sessions(s, [g], ZONE);
  const night = list.find((x) => new Date(x.fromMs).toISOString().startsWith('2025-11-02T03'));
  assert.equal(night.hours, 8);
  assert.equal(night.kwh, 80, '8 elapsed hours at 10 kW');
  assert.equal(list.find((x) => x !== night).kwh, 70, 'an ordinary night: 7 hours');
});

test('managed never worse: on three fleets over a year of office load, every managed monthly peak is at or below the unmanaged one', () => {
  const rows = readFileSync(new URL('../../fixtures/bill/office-2018-hourly.csv', import.meta.url), 'utf8').trim().split('\n').slice(1).map((l) => l.split(','));
  const s = { startMs: Float64Array.from(rows, (r) => Date.parse(r[0])), kwh: Float64Array.from(rows, (r) => Number(r[1])), intervalMinutes: 60 };
  const fleets = [
    [{ count: 4, kwhPerDay: 60, chargerKw: 19.2, plugIn: '17:00', depart: '07:00', days: [1, 2, 3, 4, 5] }],
    [{ count: 10, kwhPerDay: 120, chargerKw: 60, plugIn: '18:00', depart: '06:00' }],
    [{ count: 6, kwhPerDay: 40, chargerKw: 11.5, plugIn: '08:00', depart: '17:00', days: [1, 2, 3, 4, 5] }, { count: 3, kwhPerDay: 200, chargerKw: 150, plugIn: '19:00', depart: '23:00' }],
  ];
  for (const fleet of fleets) {
    const list = sessions(s, fleet, ZONE);
    const u = unmanaged(s, list);
    const m = managed(s, list);
    assert.ok(Math.abs(sum(m) - sum(u)) < 1e-6, 'managed delivers the same energy');
    for (const p of monthlyPeaks(s, ZONE, u, m)) assert.ok(p.managedKw <= p.unmanagedKw + 1e-9, `${p.month}: ${p.managedKw} > ${p.unmanagedKw}`);
  }
});

test('the service check: unmanaged charging at 125% over the headroom is flagged; managed under it is not', () => {
  const s = flat(200, 2);
  const list = sessions(s, [{ count: 10, kwhPerDay: 120, chargerKw: 60, plugIn: '18:00', depart: '06:00' }], ZONE);
  const u = serviceCheck(s, unmanaged(s, list), 500);
  assert.equal(u.addedKw, 600);
  assert.equal(u.continuousKw, 750);
  assert.equal(u.flag, 'likely needs a service upgrade; ask your electrician and utility');
  const m = serviceCheck(s, managed(s, list), 500);
  assert.equal(m.exceeds, false);
});

test('vehicle groups are typed one a line; a line missing a part says which', async () => {
  const { parseGroups } = await import('../../../core/lib/ev-fleet.mjs');
  const r = parseGroups('10 buses, 300 kWh, 60 kW, 20:00 to 00:00, weekdays\n4 vans 60 kWh 19.2 kW 17:00-07:00\n3 trucks, 200 kWh');
  assert.deepEqual(r.groups.map((g) => [g.count, g.kwhPerDay, g.chargerKw, g.plugIn, g.depart, g.days]), [[10, 300, 60, '20:00', '00:00', [1, 2, 3, 4, 5]], [4, 60, 19.2, '17:00', '07:00', undefined]]);
  assert.deepEqual(r.errors, ['Line 3: add the charger kW, the plug-in and departure times, as 18:00 to 06:00.']);
});

test('managed charging lowers the peak: on a $10/kW demand rate, every kW of peak it removes is $10 less in demand charges', async () => {
  const { fromManual } = await import('../../../core/lib/tariff-record.mjs');
  const { intervalBills } = await import('../../../core/lib/interval-bill.mjs');
  // A building at 200 kW that peaks at 500 kW from 5 to 6 pm, and buses that plug in at 5 pm.
  const s = flat(200, 4);
  for (let d = 0; d < 4; d++) for (let q = 68; q < 72; q++) s.kwh[d * 96 + q] = 125;
  const list = sessions(s, [{ count: 10, kwhPerDay: 120, chargerKw: 60, plugIn: '17:00', depart: '05:00' }], ZONE);
  const u = unmanaged(s, list);
  const m = managed(s, list);
  const rec = fromManual({ energyRate: 0, demandRate: 10 });
  const demand = (added) => intervalBills({ ...s, kwh: Float64Array.from(s.kwh, (k, i) => k + added[i]) }, rec, { zone: ZONE }).months[0].lines.filter((l) => l.kind === 'demand').reduce((a, l) => a + l.amount, 0);
  const p = monthlyPeaks(s, ZONE, u, m)[0];
  assert.equal(p.unmanagedKw, 1100, '600 kW on top of the 500 kW peak');
  assert.ok(p.managedKw < p.unmanagedKw);
  assert.ok(Math.abs(demand(u) - demand(m) - (p.unmanagedKw - p.managedKw) * 10) < 0.01);
  assert.ok(demand(u) - demand(m) > 5000);
});
