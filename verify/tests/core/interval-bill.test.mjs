// Bills from interval data (load and bill analyzer tasks 3.2 and 3.3), each
// scenario as the bill-explainer spec states it.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { intervalBills, nercHolidays } from '../../../core/lib/interval-bill.mjs';
import { fromManual } from '../../../core/lib/tariff-record.mjs';
import { localToUtc } from '../../../parsers/time.mjs';

const HOUR = 3_600_000;
/** An interval series from a start instant, a count, and kW as a function of the interval's index and UTC start. */
function series(startMs, count, minutes, kwOf) {
  const startArr = new Float64Array(count);
  const kwh = new Float64Array(count);
  for (let i = 0; i < count; i++) {
    startArr[i] = startMs + i * minutes * 60_000;
    kwh[i] = (kwOf(i, startArr[i]) * minutes) / 60;
  }
  return { startMs: startArr, kwh, intervalMinutes: minutes };
}
const utc = (iso) => Date.parse(`${iso}Z`);
const schedule = (fn) => Array.from({ length: 12 }, (_, m) => Array.from({ length: 24 }, (_, h) => fn(m + 1, h)));
const touRecord = ({ peakHours = [14, 19], peakRate = 0.3, offRate = 0.1 } = {}) => {
  const r = fromManual({ energyRate: offRate });
  r.energy = { periods: [{ tiers: [{ rate: offRate, basis: 'kWh' }] }, { tiers: [{ rate: peakRate, basis: 'kWh' }] }], weekday: schedule((m, h) => (h >= peakHours[0] && h < peakHours[1] ? 1 : 0)), weekend: schedule(() => 0) };
  return r;
};
const line = (month, label) => month.lines.filter((l) => l.label === label);

test('weekend schedule: a weekday-only on-peak period leaves Saturday and Sunday at the off-peak rate', () => {
  // June 1, 2026 is a Monday: one week at 1 kW, hourly, in UTC.
  const s = series(utc('2026-06-01T00:00:00'), 24 * 7, 60, () => 1);
  const { months } = intervalBills(s, touRecord(), { zone: 'UTC' });
  const [jun] = months;
  assert.equal(line(jun, 'Energy, period 2')[0].quantity, 5 * 5, 'five weekdays × five on-peak hours');
  assert.equal(line(jun, 'Energy, period 1')[0].quantity, 24 * 7 - 25);
  assert.equal(jun.total, Math.round((25 * 0.3 + 143 * 0.1) * 100) / 100);
});

test('a ratchet sets billing demand: 300 kW this month against a 500 kW July gives 400 kW, said in the line', () => {
  const rec = fromManual({ energyRate: 0.05, demandRate: 10 });
  rec.ratchet = { percentByMonth: Array(12).fill(0.8), lookbackPercent: 0, lookbackMonths: null, lookbackRange: 11 };
  const july = series(utc('2026-07-01T00:00:00'), 31 * 24 * 4, 15, (i) => (i === 100 ? 500 : 100));
  const aug = series(utc('2026-08-01T00:00:00'), 31 * 24 * 4, 15, (i) => (i === 100 ? 300 : 100));
  const both = { startMs: Float64Array.from([...july.startMs, ...aug.startMs]), kwh: Float64Array.from([...july.kwh, ...aug.kwh]), intervalMinutes: 15 };
  const { months } = intervalBills(both, rec, { zone: 'UTC' });
  const d = line(months[1], 'Monthly demand')[0];
  assert.equal(d.quantity, 400);
  assert.equal(d.amount, 4000);
  assert.match(d.note, /ratchet applied: 80% of 500 kW billing demand \(July\)/);
  assert.equal(months[1].billingDemand.metered, 300);
});

test('a 12-month file from January with an 11-month lookback: January to November say "lookback incomplete", and prior months complete it', () => {
  const rec = fromManual({ energyRate: 0.05, demandRate: 10 });
  rec.ratchet = { percentByMonth: Array(12).fill(0.8), lookbackPercent: 0, lookbackMonths: null, lookbackRange: 11 };
  const s = series(utc('2026-01-01T00:00:00'), 365 * 24, 60, () => 50);
  const flagged = (res) => res.months.filter((m) => /lookback incomplete/.test(line(m, 'Monthly demand')[0].note ?? '')).map((m) => m.month);
  assert.deepEqual(flagged(intervalBills(s, rec, { zone: 'UTC' })), ['2026-01', '2026-02', '2026-03', '2026-04', '2026-05', '2026-06', '2026-07', '2026-08', '2026-09', '2026-10', '2026-11']);
  const prior = Object.fromEntries(Array.from({ length: 11 }, (_, k) => [`2025-${String(k + 2).padStart(2, '0')}`, 60]));
  const done = intervalBills(s, rec, { zone: 'UTC', priorBillingKw: prior });
  assert.deepEqual(flagged(done), []);
  // 80% of the prior 60 kW is 48 kW, below January's metered 50 kW, so 50 kW stands.
  assert.equal(line(done.months[0], 'Monthly demand')[0].quantity, 50);
});

test('July 4 on-peak: with the NERC list on, Independence Day uses the weekend schedule and the bill names it', () => {
  // July 2025 in Chicago; July 4, 2025 is a Friday, and 2 pm to 7 pm is on-peak on weekdays.
  const start = localToUtc('America/Chicago', { year: 2025, month: 7, day: 1, hour: 0, minute: 0 }).utcMs;
  const s = series(start, 31 * 24, 60, () => 1);
  const off = intervalBills(s, touRecord(), { zone: 'America/Chicago' }).months[0];
  const on = intervalBills(s, touRecord(), { zone: 'America/Chicago', holidays: true });
  const jul = on.months[0];
  assert.equal(line(off, 'Energy, period 2')[0].quantity - line(jul, 'Energy, period 2')[0].quantity, 5, 'five on-peak hours move to off-peak');
  assert.deepEqual(jul.holidays, ['Independence Day (July 4)']);
  assert.match(on.notes[0], /NERC off-peak holidays are priced on the weekend schedule/);
  assert.equal(intervalBills(s, touRecord(), { zone: 'America/Chicago' }).notes[0], 'Holidays priced as weekdays.');
  assert.deepEqual(nercHolidays(2022).at(-1), { name: 'Christmas Day', date: '2022-12-26' }, 'a Sunday holiday moves to Monday');
});

test('solar export: 2,400 kWh delivered and 900 received prices 2,400 kWh and lists 900 exported as not credited', () => {
  const start = utc('2026-04-01T00:00:00');
  const delivered = series(start, 30 * 24, 60, () => 2400 / 720);
  const received = series(start, 30 * 24, 60, () => 900 / 720);
  const [apr] = intervalBills(delivered, fromManual({ energyRate: 0.1 }), { zone: 'UTC', received }).months;
  assert.ok(Math.abs(line(apr, 'Energy')[0].quantity - 2400) < 1e-6);
  assert.equal(apr.total, 240);
  assert.deepEqual(apr.excluded, ['Export credits not modeled: 900 kWh exported, not credited']);
});

test('power factor: 200 kW at 0.80 billed to 0.90 is 225 kW, with the formula and the 25 kW added', () => {
  const s = series(utc('2026-05-01T00:00:00'), 31 * 24 * 4, 15, () => 200);
  const [may] = intervalBills(s, fromManual({ energyRate: 0, demandRate: 10 }), { zone: 'UTC', powerFactor: { target: 0.9, actual: 0.8 } }).months;
  const d = line(may, 'Monthly demand')[0];
  assert.equal(d.quantity, 225);
  assert.match(d.note, /power factor: 200 kW × 0\.9 ÷ 0\.8 = 225 kW, 25 kW added by low power factor/);
});

test('Austin Energy\'s published power-factor example: 13.5 kW at 0.87, billed at 0.90, is 14.0 kW to 0.1 kW', () => {
  const s = series(utc('2026-05-01T00:00:00'), 31 * 24 * 4, 15, () => 13.5);
  const [may] = intervalBills(s, fromManual({ energyRate: 0, demandRate: 1 }), { zone: 'UTC', powerFactor: { target: 0.9, actual: 0.87 } }).months;
  assert.equal(Math.round(line(may, 'Monthly demand')[0].quantity * 10) / 10, 14);
});

test('March: the on-peak demand line names the 15 minutes that set it and their kW', () => {
  const rec = touRecord();
  rec.demand = { unit: 'kW', daily: false, periods: [{ tiers: [{ rate: 0 }] }, { tiers: [{ rate: 12 }] }], weekday: rec.energy.weekday, weekend: rec.energy.weekend };
  // March 2026 at 40 kW, with one 15-minute spike to 95 kW on Tuesday, March 10, at 4:15 pm.
  const spike = utc('2026-03-10T16:15:00');
  const s = series(utc('2026-03-01T00:00:00'), 31 * 24 * 4, 15, (i, ms) => (ms === spike ? 95 : 40));
  const [mar] = intervalBills(s, rec, { zone: 'UTC' }).months;
  const d = line(mar, 'Time-of-use demand, period 2')[0];
  assert.deepEqual(d.setting, { startMs: spike, kw: 95 });
  assert.equal(d.amount, 95 * 12);
  assert.equal(line(mar, 'Time-of-use demand, period 1').length, 0, 'a zero-rate period has no line');
});

test('a daily fixed charge, a 30-minute window over 15-minute data, and a minimum bill', () => {
  const rec = fromManual({ energyRate: 0.01, demandRate: 10, demandWindowMinutes: 30 });
  rec.fixed = { amount: 0.5, per: 'day' };
  rec.minimum = { amount: 900, per: 'month' };
  // Two 15-minute intervals of 100 kW and 60 kW in one half hour average to 80 kW.
  const s = series(utc('2026-01-01T00:00:00'), 31 * 24 * 4, 15, (i) => (i === 40 ? 100 : i === 41 ? 60 : 10));
  const [jan] = intervalBills(s, rec, { zone: 'UTC' }).months;
  assert.equal(line(jan, 'Monthly demand')[0].quantity, 80);
  assert.deepEqual(line(jan, 'Fixed charge')[0].note, '31 days × $0.50/day');
  assert.equal(line(jan, 'Fixed charge')[0].amount, 15.5);
  assert.equal(jan.total, 900, 'the minimum bill tops it up');
});
