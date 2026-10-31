// The load and bill analyzer's fixtures (task 1.1): each committed file
// matches its generator, reads through the real intake with the receipt it
// should have, and gives the results worked out by hand in
// verify/fixtures/bill/analyzer.mjs.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { FIXTURES } from '../../fixtures/bill/analyzer.mjs';
import { intakeFile } from '../../../core/intake/index.mjs';
import { intervalBills } from '../../../core/lib/interval-bill.mjs';
import { exposure, peakCost, PROGRAMS } from '../../../core/lib/coincident-peak.mjs';
import { fromManual } from '../../../core/lib/tariff-record.mjs';
import { formatLocalIso } from '../../../parsers/time.mjs';

const DIR = join(import.meta.dirname, '../../fixtures/bill/files');
const fx = (c) => FIXTURES.find((f) => f.case === c);
const read = async (f) => {
  const r = await intakeFile(new Uint8Array(readFileSync(join(DIR, f.file))), { name: f.file }, { zone: f.zone, stampsMark: 'auto', quantity: 'auto' });
  assert.ok(r.ok, `${f.file}: ${r.message}`);
  return r;
};
const sum = (a) => a.reduce((x, y) => x + y, 0);
const schedule = (fn) => Array.from({ length: 12 }, (_, m) => Array.from({ length: 24 }, (_, h) => fn(m + 1, h)));
const touRecord = () => {
  const r = fromManual({ energyRate: 0.1 });
  r.energy = { periods: [{ tiers: [{ rate: 0.1, basis: 'kWh' }] }, { tiers: [{ rate: 0.3, basis: 'kWh' }] }], weekday: schedule((m, h) => (h >= 14 && h < 19 ? 1 : 0)), weekend: schedule(() => 0) };
  return r;
};

test('every committed fixture matches its generator', () => {
  for (const f of FIXTURES) assert.equal(readFileSync(join(DIR, f.file), 'utf8'), f.body(), `${f.file}: run node verify/fixtures/bill/analyzer.mjs`);
});

test('the time-of-use bill: 29,733.75 kWh, 95 kW set at 4:15 pm March 10, and $4,996.13 line by line', async () => {
  const f = fx('bill');
  const r = await read(f);
  const s = r.series[0];
  assert.equal(s.startMs.length, f.expect.intervals);
  assert.ok(Math.abs(sum(s.kwh) - f.expect.kwh) < 1e-6);
  const rec = touRecord();
  rec.demand = { unit: 'kW', daily: false, periods: [{ tiers: [{ rate: 0 }] }, { tiers: [{ rate: 12 }] }], weekday: rec.energy.weekday, weekend: rec.energy.weekend };
  const [mar] = intervalBills(s, rec, { zone: f.zone }).months;
  const line = (label) => mar.lines.find((l) => l.label === label);
  assert.ok(Math.abs(line('Energy, period 2').quantity - f.expect.peakKwh) < 1e-6);
  assert.ok(Math.abs(line('Energy, period 1').quantity - f.expect.offKwh) < 1e-6);
  for (const [label, amount] of Object.entries(f.expect.lines)) assert.equal(line(label).amount, amount, label);
  const d = line('Time-of-use demand, period 2');
  assert.deepEqual([d.quantity, formatLocalIso(f.zone, d.setting.startMs).slice(0, 16).replace('T', ' ')], [f.expect.demandKw, f.expect.setting]);
  assert.equal(mar.total, f.expect.total);
});

test('the ratchet: July bills 500 kW with "lookback incomplete"; August bills 400 kW, 80% of July', async () => {
  const f = fx('ratchet');
  const r = await read(f);
  const rec = fromManual({ energyRate: 0, demandRate: 10 });
  rec.ratchet = { percentByMonth: Array(12).fill(0.8), lookbackPercent: 0, lookbackMonths: null, lookbackRange: 11 };
  const months = intervalBills(r.series[0], rec, { zone: f.zone }).months;
  for (const m of months) {
    const e = f.expect.months[m.month];
    const d = m.lines.find((l) => l.label === 'Monthly demand');
    assert.deepEqual([m.billingDemand.metered, d.quantity], [e.metered, e.billing], m.month);
    assert.ok(d.note.includes(e.note), `${m.month}: ${d.note}`);
  }
});

test('the holiday: 115 on-peak kWh as weekdays, 110 with July 4 on the weekend schedule, and the bill names it', async () => {
  const f = fx('holiday');
  const s = (await read(f)).series[0];
  const peak = (opts) => intervalBills(s, touRecord(), { zone: f.zone, ...opts }).months[0];
  assert.equal(peak({}).lines.find((l) => l.label === 'Energy, period 2').quantity, f.expect.peakKwh);
  const withH = peak({ holidays: true });
  assert.equal(withH.lines.find((l) => l.label === 'Energy, period 2').quantity, f.expect.peakKwhWithHolidays);
  assert.deepEqual(withH.holidays, f.expect.holidays);
});

test('solar export: two channels, 2,400 kWh priced, 900 kWh listed as not credited', async () => {
  const f = fx('export');
  const r = await read(f);
  const delivered = r.series.find((s) => s.channel === 'delivered');
  const received = r.series.find((s) => s.channel === 'received');
  assert.ok(Math.abs(sum(delivered.kwh) - f.expect.deliveredKwh) < 0.01);
  assert.ok(Math.abs(sum(received.kwh) - f.expect.receivedKwh) < 0.01);
  const [apr] = intervalBills(delivered, fromManual({ energyRate: 0.1 }), { zone: f.zone, received }).months;
  assert.equal(apr.total, 240);
  assert.deepEqual(apr.excluded, [f.expect.excluded]);
});

test('ERCOT 4CP: the four 2025 intervals read 900, 950, 880, and 970 kW, average 925 kW, and cost $44,400 a year at $4.00/kW-month', async () => {
  const f = fx('cp');
  const s = (await read(f)).series[0];
  const ercot = JSON.parse(readFileSync(join(import.meta.dirname, '../../../data/curated/ercot-4cp.json'), 'utf8'));
  const p = PROGRAMS.find((x) => x.id === 'ercot-4cp');
  const e = exposure(s, p, ercot.years[2025].intervals.map((i) => ({ date: i.date, time: i.ends })));
  assert.deepEqual(e.intervals.map((i) => i.kw), f.expect.loads);
  assert.equal(e.averageKw, f.expect.averageKw);
  assert.equal(peakCost(p, e.averageKw, { ratePerKwMonth: 4 }).annual, f.expect.annualAt4);
});
