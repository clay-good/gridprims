// Bills from their totals (household bill check tasks 2.1, 2.2, 2.3, and
// 2.5), each scenario as the spec states it.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkPeriods, comparePaid, daysIn, effectivePrice, priceTotals, projectPeriod, readNumber } from '../../../core/lib/bill-totals.mjs';

const tiered = { fixedMonthly: 10, seasons: [{ name: 'all year', from: '01-01', tiers: [{ upTo: 500, rate: 0.12 }, { rate: 0.15 }] }] };

test('a tiered bill: $10.00 fixed, 500 kWh at 12 cents, 300 at 15 cents is $115.00, line by line', () => {
  const r = priceTotals({ start: '2026-03-01', end: '2026-03-30', kwh: 800 }, tiered);
  assert.equal(r.totalCents, 11500);
  assert.deepEqual(r.lines.map((l) => [l.label, l.kwh ?? null, l.cents]), [['fixed', null, 1000], ['all year tier 1', 500, 6000], ['all year tier 2', 300, 4500]]);
  assert.equal(r.method, null);
});

test('a period crossing summer start splits kWh by days: 480 kWh over 16 days, 420 over 14, and names the method', () => {
  const seasonal = { seasons: [{ name: 'non-summer', from: '01-01', tiers: [{ rate: 0.10 }] }, { name: 'summer', from: '07-01', tiers: [{ rate: 0.14 }] }, { name: 'non-summer', from: '10-01', tiers: [{ rate: 0.10 }] }] };
  const p = { start: '2026-06-15', end: '2026-07-14', kwh: 900 };
  assert.equal(daysIn(p), 30);
  const r = priceTotals(p, seasonal);
  assert.deepEqual(r.lines.map((l) => [l.label, l.kwh, l.days]), [['non-summer tier 1', 480, 16], ['summer tier 1', 420, 14]]);
  assert.equal(r.method, 'split by days: 16 days at non-summer rates, 14 days at summer rates');
  assert.equal(r.totalCents, 4800 + 5880);
  const off = priceTotals(p, seasonal, { prorate: false });
  assert.equal(off.method, null, 'the user can turn proration off');
  assert.deepEqual(off.lines.map((l) => [l.label, l.kwh]), [['summer tier 1', 900]]);
});

test('tier allowances split with the days too, and a minimum bill tops up', () => {
  const t = { minimumMonthly: 30, seasons: [{ name: 'winter', from: '10-01', tiers: [{ upTo: 600, rate: 0.10 }, { rate: 0.20 }] }, { name: 'summer', from: '06-01', tiers: [{ upTo: 400, rate: 0.10 }, { rate: 0.20 }] }] };
  const r = priceTotals({ start: '2026-05-17', end: '2026-06-15', kwh: 1000 }, t);
  // 15 days of winter (allowance 300 of 600), 15 of summer (200 of 400): 500 kWh each.
  assert.deepEqual(r.lines.map((l) => [l.label, l.kwh]), [['winter tier 1', 300], ['winter tier 2', 200], ['summer tier 1', 200], ['summer tier 2', 300]]);
  assert.equal(priceTotals({ start: '2026-03-01', end: '2026-03-30', kwh: 10 }, t).totalCents, 3000);
});

test('paid $131.40 against a computed $115.00 is +$16.40 (14.3%); $115.00 over 800 kWh is 14.38 cents per kWh', () => {
  assert.deepEqual(comparePaid(11500, 13140), { diffCents: 1640, pct: 14.3 });
  assert.equal(effectivePrice(11500, 800), 14.38);
  assert.equal(effectivePrice(100, 3), 33.33);
  assert.equal(effectivePrice(100, 0), null);
});

test('entry checks: a 5-day overlap, a duplicate March, a 62-day period, 9,400 kWh among 940s, and a net-metered month', () => {
  const flags = checkPeriods([
    { start: '2026-01-01', end: '2026-01-31', kwh: 940 }, { start: '2026-01-27', end: '2026-02-26', kwh: 950 },
    { start: '2026-03-01', end: '2026-03-31', kwh: 930 }, { start: '2026-03-01', end: '2026-03-31', kwh: 930 },
    { start: '2026-04-01', end: '2026-06-01', kwh: 1900 }, { start: '2026-07-01', end: '2026-07-31', kwh: 9400 },
  ]);
  assert.deepEqual(flags.find((f) => f.kind === 'overlap'), { kind: 'overlap', periods: [0, 1], days: 5 });
  assert.deepEqual(flags.find((f) => f.kind === 'duplicate'), { kind: 'duplicate', periods: [2, 3] });
  assert.deepEqual(flags.find((f) => f.kind === 'long'), { kind: 'long', periods: [4], days: 62 });
  assert.deepEqual(flags.find((f) => f.kind === 'typo'), { kind: 'typo', periods: [5], suggestion: 940 });
  assert.deepEqual(checkPeriods([{ start: '2026-08-01', end: '2026-08-31', kwh: -120 }]), [{ kind: 'negative', periods: [0] }]);
  const net = priceTotals({ start: '2026-08-01', end: '2026-08-31', kwh: -120 }, tiered);
  assert.deepEqual(net.excluded, ['export credits (net metering) are not modeled for this tariff']);
  assert.equal(net.totalCents, 1000, 'only the fixed charge is priced');
  assert.equal(readNumber('9,400'), 9400);
  assert.equal(readNumber('1,234.5'), 1234.5);
  assert.equal(readNumber('12,34'), null);
});

test('fourteen days in: weekdays at 30 kWh and weekends at 40 project the period to 990 kWh and $128.80', () => {
  const period = { start: '2026-03-01', end: '2026-03-30' }; // starts on a Sunday
  const days = Array.from({ length: 14 }, (_, i) => {
    const date = `2026-03-${String(i + 1).padStart(2, '0')}`;
    return { date, kwh: [0, 6].includes(new Date(`${date}T00:00:00Z`).getUTCDay()) ? 40 : 30 };
  });
  assert.equal(days.reduce((n, d) => n + d.kwh, 0), 460);
  const r = projectPeriod(days, period);
  assert.deepEqual([r.status, r.method, r.present, r.remaining, r.projectedKwh], ['ok', 'weekdays', 14, 16, 990]);
  const flat = { fixedMonthly: 10, seasons: [{ name: 'all year', from: '01-01', tiers: [{ rate: 0.12 }] }] };
  assert.equal(priceTotals({ ...period, kwh: r.projectedKwh }, flat).totalCents, 12880);
});

test('five days in projects from the daily average; two days in projects nothing', () => {
  const period = { start: '2026-03-01', end: '2026-03-30' };
  const five = Array.from({ length: 5 }, (_, i) => ({ date: `2026-03-0${i + 1}`, kwh: 30 }));
  const r = projectPeriod(five, period);
  assert.deepEqual([r.method, r.projectedKwh], ['daily-average', 900]);
  assert.deepEqual(projectPeriod(five.slice(0, 2), period), { status: 'too-little-data', present: 2 });
});
