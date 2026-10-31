// Reliability indices and major event days (add-reliability-tools): the
// spec's annual indices, the sustained threshold, the bases, and the 2.5 beta
// threshold with the verified published vector.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { bases, classify, dailyMinutes, flagged, indices, mergePartial, minutesOf, momentaryIndex, review, threshold, UNAVAILABLE } from '../../../core/lib/reliability.mjs';

const ZONE = 'America/Chicago';
const DAY = 86_400_000;
const YEAR = { fromMs: Date.UTC(2025, 0, 1, 6), toMs: Date.UTC(2026, 0, 1, 6) };
const MINUTES_IN_2025 = (YEAR.toMs - YEAR.fromMs) / 60_000;
/** An event: `customers` out for `minutes`, starting `dayOffset` days into 2025 at `hour`. */
const ev = (customers, minutes, dayOffset = 0, hour = 12, extra = {}) => ({ startMs: YEAR.fromMs + dayOffset * DAY + hour * 3_600_000, minutes, customers, ...extra });

test('annual indices: 18,000 customer interruptions and 2,400,000 customer minutes against 12,000 customers served', () => {
  // One event carrying the spec's totals: 18,000 customers out for 400/3 minutes each.
  const r = indices([ev(18_000, 2_400_000 / 18_000)], { customersServed: 12_000, periodMinutes: 525_600 });
  assert.equal(r.perCustomer, 1.5);
  assert.equal(r.minutesPerCustomer, 200);
  assert.equal(r.minutesPerInterrupted, 133.33);
  assert.equal(r.availability, 99.9619);
  assert.match(r.formulas.perCustomer, /^18,000 customers interrupted ÷ 12,000 customers served = 1.5 interruptions per customer$/);
  assert.match(r.formulas.availability, /525,600 minutes in the period/);
});

test('each index cites its own source: availability names the free source, never the federal form', () => {
  const r = indices([ev(10, 60)], { customersServed: 100, periodMinutes: 525_600 });
  assert.match(r.sources.perCustomer, /Form EIA-861 instructions/);
  assert.match(r.sources.minutesPerCustomer, /Form EIA-861 instructions/);
  assert.doesNotMatch(r.sources.availability, /EIA-861/);
  assert.match(r.sources.availability, /NMAC.*The federal form does not collect it\./s);
  assert.doesNotMatch(r.sources.minutesPerInterrupted, /EIA-861/);
});

test('declared rounding: interruptions to 0.01, minutes to 0.1, availability to 4 decimal places', () => {
  const r = indices([ev(1234, 7.77)], { customersServed: 9871, periodMinutes: 525_600 });
  assert.equal(String(r.perCustomer), '0.13');
  assert.equal(String(r.minutesPerCustomer), '1');
  assert.equal(String(r.availability), '99.9998');
});

test('the five-minute threshold is stated: events of five minutes or less are momentary, and are counted', () => {
  const log = [...Array(340)].map((_, i) => ev(5, 5, i % 300)).concat([ev(100, 5.1), ev(50, 120)]);
  const c = classify(log);
  assert.equal(c.momentary.length, 340, 'exactly five minutes is momentary');
  assert.equal(c.sustained.length, 2, 'more than five minutes is sustained');
  assert.equal(c.custom, false);
  // A state rule can move the threshold, and the result says which was used.
  const custom = classify(log, 1);
  assert.equal(custom.momentary.length, 0);
  assert.equal(custom.custom, true);
  assert.equal(custom.threshold, 1);
});

test('momentary index: computed where momentaries are logged, and not a zero where they are not', () => {
  assert.equal(momentaryIndex([ev(1200, 2)], 10_000).perCustomer, 0.12);
  const none = momentaryIndex([], 10_000);
  assert.equal(none.status, 'not-computed');
  assert.match(none.reason, /^not computed: no momentary interruptions in this log\./);
  assert.match(none.reason, /Many utilities do not log them/);
});

test('indices needing per-customer records are unavailable with what they would need, never estimated', () => {
  assert.equal(UNAVAILABLE.length, 2);
  for (const u of UNAVAILABLE) assert.match(u.needs, /per-customer|each customer/);
});

test('restore before start: reported as invalid, excluded from every index, and listed', () => {
  const bad = { startMs: YEAR.fromMs + 5 * DAY, endMs: YEAR.fromMs + 4 * DAY, customers: 100 };
  const r = review([ev(10, 60), bad], YEAR);
  assert.equal(r.ok.length, 1);
  assert.deepEqual(r.invalid.map((x) => [x.row, x.reason]), [[2, 'restored before it started']]);
});

test('a log with no customer count computes no index and names the missing field', () => {
  const r = review([{ startMs: YEAR.fromMs, minutes: 60 }], YEAR);
  assert.equal(r.ok.length, 0);
  assert.match(r.invalid[0].reason, /no number of customers interrupted/);
});

test('events outside the period: 12 are reported and excluded', () => {
  const before = [...Array(12)].map((_, i) => ({ startMs: YEAR.fromMs - (i + 1) * DAY, minutes: 60, customers: 10 }));
  const r = review([...before, ev(10, 60)], YEAR);
  assert.equal(r.ok.length, 1);
  assert.equal(r.outside.length, 12);
  assert.match(r.outside[0].reason, /outside the reporting period/);
});

test('partial restorations: 300, 200, and 100 restored at different times are 600 customers interrupted once', () => {
  const rows = [ev(300, 60), ev(200, 120), ev(100, 180)];
  const one = mergePartial(rows);
  assert.equal(one.customers, 600);
  assert.equal(one.customerMinutes, 300 * 60 + 200 * 120 + 100 * 180);
  assert.equal(one.parts, 3);
  const r = indices([one], { customersServed: 10_000, periodMinutes: 525_600 });
  assert.equal(r.events, 1, 'one interruption, not three');
  assert.equal(r.customersInterrupted, 600);
  assert.equal(r.customerMinutes, 60_000);
});

test('crossing midnight: 23:30 to 01:15 is 105 minutes', () => {
  const e = { startMs: Date.UTC(2025, 5, 1, 4, 30), endMs: Date.UTC(2025, 5, 1, 6, 15), customers: 400 };
  assert.equal(minutesOf(e), 105);
});

test('an interruption spanning two days counts toward the day it began, or splits when asked', () => {
  // 23:30 to 01:15 local, 400 customers: 42,000 customer minutes, 30,000 of them after midnight.
  const e = { startMs: Date.UTC(2025, 5, 2, 4, 30), endMs: Date.UTC(2025, 5, 2, 6, 15), customers: 400 };
  const whole = dailyMinutes([e], { customersServed: 10_000, zone: ZONE });
  assert.deepEqual(whole.map((d) => [d.day, d.customerMinutes]), [['2025-06-01', 42_000]]);
  const split = dailyMinutes([e], { customersServed: 10_000, zone: ZONE, split: true });
  assert.deepEqual(split.map((d) => [d.day, d.customerMinutes]), [['2025-06-01', 12_000], ['2025-06-02', 30_000]]);
});

test('the published vector: a mean of −2.86 and a standard deviation of 1.31 in log space give 1.51 minutes', () => {
  // The source publishes the mean, the standard deviation, and the threshold; these daily values
  // are built to reproduce that mean and sample standard deviation exactly.
  const [alpha, beta] = [-2.86, 1.31];
  const daily = [...Array(40)].map((_, i) => ({ day: `2025-01-${String(i + 1).padStart(2, '0')}`, minutesPerCustomer: Math.exp(alpha + beta * (i % 2 ? 1 : -1) * Math.sqrt(39 / 40)) }));
  const t = threshold(daily, { calendarDays: 365 * 5 });
  assert.ok(Math.abs(t.alpha - alpha) < 1e-9, `alpha ${t.alpha}`);
  assert.ok(Math.abs(t.beta.sample - beta) < 1e-9, `beta ${t.beta.sample}`);
  assert.equal(Number(t.value.toFixed(2)), 1.51, `threshold ${t.value}`);
  assert.equal(t.used, 'sample');
});

test('both standard deviations are shown, and the sample one is named as ours', () => {
  const daily = [...Array(40)].map((_, i) => ({ day: `d${i}`, minutesPerCustomer: 1 + (i % 7) }));
  const t = threshold(daily, { calendarDays: 365 * 5 });
  assert.ok(t.beta.population < t.beta.sample);
  assert.ok(t.minutes.population < t.minutes.sample);
  assert.equal(t.value, t.minutes.sample);
  assert.match(t.choice, /That is our choice/);
  assert.match(t.formula, /2\.5 ×/);
});

test('days without interruptions are left out before the logarithm, and the count is named', () => {
  const daily = [...Array(365)].map((_, i) => ({ day: `2025-${i}`, minutesPerCustomer: i < 210 ? 0 : 1 + (i % 5) }));
  const t = threshold(daily, { calendarDays: 365 });
  assert.equal(t.activeDays, 155);
  assert.equal(t.quietDays, 210);
  assert.match(t.formula, /from 155 days with interruptions \(210 quiet days left out before the logarithm\)/);
});

test('our own minimum: 22 active days get no threshold, and the floor is named as ours', () => {
  const t = threshold([...Array(22)].map((_, i) => ({ day: `d${i}`, minutesPerCustomer: 2 })));
  assert.equal(t.status, 'refused');
  assert.equal(t.activeDays, 22);
  assert.equal(t.minActiveDays, 30);
  assert.match(t.reason, /22 days with interruptions and we require at least 30/);
  assert.match(t.reason, /That floor is ours, not the method's/);
});

test('two years of daily values: the threshold is computed and labeled as two years', () => {
  const daily = [...Array(80)].map((_, i) => ({ day: `d${i}`, minutesPerCustomer: 1 + (i % 9) }));
  const t = threshold(daily, { calendarDays: 730 });
  assert.equal(t.status, 'ok');
  assert.equal(t.years, 2);
  assert.match(t.short, /Based on 2 years of daily values, not the 5 the method assumes/);
  assert.equal(threshold(daily, { calendarDays: Math.ceil(365.25 * 5) }).short, null, 'five years carries no label');
});

test('flagged days: two above the threshold are listed, one equal to it is not', () => {
  const daily = [{ day: 'a', minutesPerCustomer: 10 }, { day: 'b', minutesPerCustomer: 1.5 }, { day: 'c', minutesPerCustomer: 20 }, { day: 'd', minutesPerCustomer: 0.1 }];
  assert.deepEqual(flagged(daily, 1.5).map((d) => d.day), ['a', 'c']);
});

test('three bases: every event, without planned work, and without major event days, each labeled with its count', () => {
  const sustained = [ev(100, 60, 0), ev(200, 60, 1, 12, { planned: true }), ev(5000, 300, 2), ev(50, 60, 3)];
  const medDays = new Set(['2025-01-03']);
  const r = bases(sustained, { customersServed: 10_000, periodMinutes: 525_600, medDays, zone: ZONE });
  assert.deepEqual(r.map((b) => [b.id, b.indices.events, b.excluded]), [['all', 4, 0], ['without-planned', 3, 1], ['without-major', 3, 1]]);
  assert.match(r[1].note, /^1 planned interruptions left out\.$/);
  assert.match(r[2].note, /^1 interruptions on 1 major event days left out\.$/);
  assert.ok(r[2].indices.minutesPerCustomer < r[0].indices.minutesPerCustomer, 'dropping the storm day lowers the minutes');
  assert.notEqual(r[0].label, r[2].label);
});

test('a feeder breakdown hides a row covering 60 customers and says why', async () => {
  const { breakdown } = await import('../../../core/lib/reliability.mjs');
  const sustained = [
    ev(600, 120, 0, 12, { feeder: 'F-12' }), ev(400, 90, 1, 12, { feeder: 'F-12' }),
    ev(150, 60, 2, 12, { feeder: 'F-07' }),
    ev(60, 240, 3, 12, { feeder: 'F-31' }),
  ];
  const b = breakdown(sustained, 'feeder', { customersServed: 10_000 });
  assert.deepEqual(b.rows.map((r) => r.key), ['F-12', 'F-07'], 'the small feeder is not a row');
  assert.equal(b.rows[0].events, 2);
  assert.equal(b.rows[0].customers, 1000);
  assert.equal(b.suppressed, 1);
  assert.equal(b.suppressedEvents, 1);
  assert.match(b.note, /^1 feeders are not shown: each covers fewer than 100 customers, which is close to naming them\.$/);
  assert.equal(b.shareable, false, 'a breakdown never travels in a link or a copied card');
});

test('a cause breakdown ranks by customer minutes, and an unlabeled row groups under null', async () => {
  const { breakdown } = await import('../../../core/lib/reliability.mjs');
  const b = breakdown([ev(500, 60, 0, 12, { cause: 'tree' }), ev(900, 300, 1, 12, { cause: 'equipment' }), ev(200, 30, 2)], 'cause', { customersServed: 10_000 });
  assert.deepEqual(b.rows.map((r) => r.key), ['equipment', 'tree', null]);
  assert.equal(b.rows[0].minutesPerCustomer, 27);
});

test('major event days: the flagged days are listed and the indices are reported on both bases', () => {
  // A quiet year with one storm day: 400 customers out for 6 hours on day 40.
  const daily = [...Array(120)].map((_, i) => ({ day: `2025-${String(i).padStart(3, '0')}`, minutesPerCustomer: 0.4 + (i % 7) * 0.05 }));
  daily[40].minutesPerCustomer = 14.4;
  const t = threshold(daily, { calendarDays: 365 });
  assert.equal(t.status, 'ok');
  const days = flagged(daily, t.value);
  assert.deepEqual(days.map((d) => d.day), ['2025-040'], 'the storm day alone is flagged');
  assert.ok(t.value < 14.4 && t.value > 0.7, `threshold ${t.value} sits between the quiet days and the storm`);
  // The same log on both bases: dropping the flagged day lowers the minutes but never the other way.
  const sustained = [ev(100, 60, 0), ev(400, 360, 40)];
  const r = bases(sustained, { customersServed: 10_000, periodMinutes: 525_600, medDays: new Set(['2025-02-10']), zone: ZONE });
  const all = r.find((b) => b.id === 'all');
  const without = r.find((b) => b.id === 'without-major');
  assert.ok(without.indices.minutesPerCustomer <= all.indices.minutesPerCustomer);
  assert.equal(without.excluded, 1);
  assert.match(without.label, /major event days/i);
});
