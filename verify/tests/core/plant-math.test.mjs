// Plant arithmetic against hand-computed fixtures (add-public-grid-data,
// plant pages: "Verification against published aggregates").

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { METRIC_TONS_PER_SHORT_TON, capacityFactor, hoursInService, poundsToMetric, shortTonsToMetric } from '../../../core/lib/plant-math.mjs';

test('a 100 MW plant making 219,000 MWh in a non-leap year runs at 25.0%', () => {
  const hours = hoursInService(2025, { operatingYear: 1990, operatingMonth: 5 });
  assert.equal(hours, 8760);
  assert.equal((capacityFactor(219_000, [{ nameplateMw: 100, hours }]).value * 100).toFixed(1), '25.0');
});

test('a July 1 start in a non-leap year is 4,416 hours, and 109,500 MWh is 24.8%', () => {
  const hours = hoursInService(2025, { operatingYear: 2025, operatingMonth: 7 });
  assert.equal(hours, 4416); // July through December: 184 days
  assert.equal((capacityFactor(109_500, [{ nameplateMw: 100, hours }]).value * 100).toFixed(1), '24.8');
});

test('a mid-year retirement counts through the end of its month; leap years have 8,784 hours', () => {
  assert.equal(hoursInService(2025, { operatingYear: 1970, operatingMonth: 1, retirementYear: 2025, retirementMonth: 3 }), (31 + 28 + 31) * 24);
  assert.equal(hoursInService(2024, { operatingYear: 1970, operatingMonth: 1 }), 8784);
  assert.equal(hoursInService(2024, { operatingYear: 2024, operatingMonth: 2, retirementYear: 2024, retirementMonth: 2 }), 29 * 24);
  assert.equal(hoursInService(2025, { operatingYear: 2026, operatingMonth: 1 }), 0);
  assert.equal(hoursInService(2025, { operatingYear: 1970, retirementYear: 2024, retirementMonth: 6 }), 0);
});

test('a plant\'s generators prorate one by one', () => {
  // 100 MW all year plus 50 MW from October 1: 100 x 8,760 + 50 x 2,208 = 986,400 MWh possible.
  const gens = [{ nameplateMw: 100, hours: hoursInService(2025, { operatingYear: 2000, operatingMonth: 1 }) }, { nameplateMw: 50, hours: hoursInService(2025, { operatingYear: 2025, operatingMonth: 10 }) }];
  assert.equal(gens[1].hours, 2208);
  assert.equal(capacityFactor(493_200, gens).value, 0.5);
});

test('negative net generation is a net consumer, with no capacity factor; unknown months give none either', () => {
  assert.deepEqual(capacityFactor(-120_000, [{ nameplateMw: 100, hours: 8760 }]), { value: null, reason: 'net-consumer' });
  assert.equal(hoursInService(2025, { operatingYear: 2025, operatingMonth: null }), null);
  assert.deepEqual(capacityFactor(1000, [{ nameplateMw: 10, hours: null }]), { value: null, reason: 'unknown-months' });
  assert.deepEqual(capacityFactor(0, []), { value: null, reason: 'no-capacity' });
});

test('short tons and pounds to metric tons, rounded', () => {
  assert.equal(METRIC_TONS_PER_SHORT_TON, 2000 * 0.45359237 / 1000);
  assert.equal(shortTonsToMetric(14_000_000.5), 12_700_587);
  assert.equal(shortTonsToMetric(1), 1);
  assert.equal(poundsToMetric(2_204.62262), 1);
  assert.equal(poundsToMetric(1_000_000), 454);
});
