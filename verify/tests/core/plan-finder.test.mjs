// The plan finder from a meter file (household bill check task 3.2): the
// spec's "$128 less (7.8%)" sentence, the EV plan kept under "Requires" until
// the household says it has one, and the past-use label.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { findPlans, PAST_USE } from '../../../core/lib/plan-finder.mjs';
import { fromManual } from '../../../core/lib/tariff-record.mjs';

// A year of hourly use at 1.8721 kW: 16,400 kWh.
const year = (() => {
  const start = Date.parse('2025-01-01T00:00:00Z');
  const startMs = Float64Array.from({ length: 8760 }, (_, i) => start + i * 3_600_000);
  return { startMs, kwh: Float64Array.from(startMs, () => 16400 / 8760), intervalMinutes: 60 };
})();
const plan = (id, name, rate) => ({ ...fromManual({ energyRate: rate }), id, name });

test('a cheaper plan: the current plan costs $1,640 a year and another $1,512, so it "would have cost $128 less (7.8%)"', () => {
  const plans = [plan('r1', 'Residential Service', 0.1), plan('tou', 'Residential Time-of-Use', 0.0921951)];
  const r = findPlans(year, plans, { zone: 'UTC', currentId: 'r1', asOf: '2026-10-30' });
  assert.deepEqual(r.ranked.map((p) => [p.rec.id, Math.round(p.annual)]), [['tou', 1512], ['r1', 1640]]);
  assert.equal(r.headline, 'Residential Time-of-Use would have cost $128 less (7.8%) on the last 12 months.');
  assert.equal(r.label, PAST_USE);
});

test('an EV plan sits under "Requires an EV" with its cost on this use until "I have an EV" is checked', () => {
  const plans = [plan('r1', 'Residential Service', 0.1), plan('ev', 'Residential Electric Vehicle Rate', 0.08)];
  const without = findPlans(year, plans, { zone: 'UTC', currentId: 'r1', asOf: '2026-10-30' });
  assert.deepEqual(without.ranked.map((p) => p.rec.id), ['r1']);
  assert.deepEqual(without.requires.map((p) => [p.rec.id, p.conditions, Math.round(p.annual)]), [['ev', ['electric-vehicle'], 1312]]);
  assert.equal(without.headline, 'Your current plan cost the least on the last 12 months.');
  const withEv = findPlans(year, plans, { zone: 'UTC', currentId: 'r1', have: ['electric-vehicle'], asOf: '2026-10-30' });
  assert.deepEqual(withEv.ranked.map((p) => p.rec.id), ['ev', 'r1']);
  assert.deepEqual(withEv.requires, []);
});

test('moving 10 kWh a day of EV charging from 6–9 pm to midnight–5 am updates every plan to the hand-computed values and re-sorts', async () => {
  const { readFileSync } = await import('node:fs');
  const { shiftLoad } = await import('../../../core/lib/rate-compare.mjs');
  const fx = JSON.parse(readFileSync(new URL('../../fixtures/bill/ev-shift.json', import.meta.url), 'utf8'));
  const start = Date.parse('2025-01-01T00:00:00Z');
  const startMs = Float64Array.from({ length: 8760 }, (_, i) => start + i * 3_600_000);
  const load = { startMs, kwh: Float64Array.from(startMs, (ms) => { const h = new Date(ms).getUTCHours(); return 1 + (h >= 18 && h < 21 ? 10 / 3 : 0); }), intervalMinutes: 60 };
  const schedule = (p) => Array.from({ length: 12 }, () => Array.from({ length: 24 }, (_, h) => (h >= p.peakHours[0] && h < p.peakHours[1] ? 1 : 0)));
  const plans = fx.plans.map((p) => {
    if (p.flat) return plan(p.id, p.name, p.flat);
    const r = plan(p.id, p.name, p.off);
    r.energy = { periods: [{ tiers: [{ rate: p.off, basis: 'kWh' }] }, { tiers: [{ rate: p.peak, basis: 'kWh' }] }], weekday: schedule(p), weekend: p.weekdaysOnly ? schedule({ peakHours: [0, 0] }) : schedule(p) };
    return r;
  });
  const moved = shiftLoad(load, { ...fx.shift, zone: 'UTC' });
  const before = findPlans(load, plans, { zone: 'UTC', currentId: 'flat', asOf: '2026-10-30' });
  const after = findPlans(moved, plans, { zone: 'UTC', currentId: 'flat', asOf: '2026-10-30' });
  for (const p of fx.plans) {
    assert.ok(Math.abs(before.ranked.find((x) => x.rec.id === p.id).annual - p.before) <= 0.01, `${p.id} before`);
    assert.ok(Math.abs(after.ranked.find((x) => x.rec.id === p.id).annual - p.after) <= 0.01, `${p.id} after`);
  }
  assert.deepEqual(before.ranked.map((x) => x.rec.id), fx.rankingBefore);
  assert.deepEqual(after.ranked.map((x) => x.rec.id), fx.rankingAfter);
});

test('CARE customer: a 30% discount on covered charges reaches every plan it covers, and the ranking uses the discounted costs', async () => {
  const plans = [{ ...plan('r1', 'Residential Service', 0.1), utilityId: 14328 }, { ...plan('tou', 'Residential Time-of-Use', 0.0921951), utilityId: 14328 }, { ...plan('other', 'Other Utility Flat', 0.08), utilityId: 99 }];
  const care = { id: 'care', name: 'CARE', kind: 'percent', percent: 30, utilityIds: [14328] };
  const r = findPlans(year, plans, { zone: 'UTC', currentId: 'r1', asOf: '2026-10-30', programs: [care] });
  // $1,640 and $1,512 at 70%; the other utility's plan is not covered and stays at $1,312.
  assert.deepEqual(r.ranked.map((p) => [p.rec.id, Math.round(p.annual)]), [['tou', 1058], ['r1', 1148], ['other', 1312]]);
  assert.deepEqual(r.ranked.find((p) => p.rec.id === 'other').programs, [{ id: 'care', name: 'CARE', applied: false, why: 'the program does not cover this plan' }]);
  assert.equal(r.ranked.find((p) => p.rec.id === 'tou').programs[0].discount, 453.6);
  assert.equal(r.headline, 'Residential Time-of-Use would have cost $90 less (7.8%) on the last 12 months.');
});

test('a percent program covers only the charges its tariff text names', async () => {
  const { percentDiscount } = await import('../../../core/lib/discount-programs.mjs');
  assert.equal(percentDiscount({ percent: 18, appliesTo: ['energy'] }, { components: { fixed: 120, energy: 1000, demand: 0 } }), 180);
  assert.equal(percentDiscount({ percent: 30 }, { components: { fixed: 120, energy: 1000, demand: 0 } }), 336);
});

test('medical baseline adds its allowance to the first tier of a tiered plan, and leaves a flat plan as it is', () => {
  const tiered = { ...fromManual({ energyRate: 0.1, tierKwh: 500, energyRate2: 0.2 }), id: 't', name: 'Residential Tiered' };
  const flat = plan('f', 'Residential Flat', 0.12);
  const med = { id: 'mb', name: 'Medical Baseline', kind: 'baseline-kwh', kwhPerMonth: 500 };
  const without = findPlans(year, [tiered, flat], { zone: 'UTC', asOf: '2026-10-30' });
  const withMed = findPlans(year, [tiered, flat], { zone: 'UTC', asOf: '2026-10-30', programs: [med] });
  const t0 = without.ranked.find((p) => p.rec.id === 't').annual;
  const t1 = withMed.ranked.find((p) => p.rec.id === 't').annual;
  // 500 more kWh a month at $0.10 instead of $0.20, for 12 months: $600 less.
  assert.equal(Math.round(t0 - t1), 600);
  assert.equal(withMed.ranked.find((p) => p.rec.id === 'f').programs[0].why, 'the plan has no baseline tier to add to');
});

test('a record that is a discount program is never listed as a plan', () => {
  const plans = [plan('r1', 'Residential Service', 0.1), plan('care', 'E-1 CARE Residential', 0.07), plan('fera', 'FERA Residential Service', 0.08)];
  const r = findPlans(year, plans, { zone: 'UTC', currentId: 'r1', have: ['low-income'], asOf: '2026-10-30' });
  assert.deepEqual(r.ranked.map((p) => p.rec.id), ['r1']);
  assert.deepEqual(r.requires, []);
  assert.deepEqual(r.programRecords.map((x) => x.id), ['care', 'fera']);
});
