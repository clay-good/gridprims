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
