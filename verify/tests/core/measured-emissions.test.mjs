// A plant's measured emissions from the monitored units' monthly rows
// (add-measured-plant-emissions 2.1 to 2.3): annual and monthly totals, the
// implied rate, the apportioned flag, and the coverage every figure carries.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { LB_PER_METRIC_TON, measuredRateLbMwh, plantMeasured } from '../../../core/lib/measured-emissions.mjs';

const month = (unit_id, year, month, over = {}) => ({
  unit_id, year, month, apportioned: 'no',
  co2_tonnes: 100, so2_lbs: 20, nox_lbs: 10, heat_input_mmbtu: 1000, gross_load_mwh: 90, operating_hours: 24, hours_reported: 24, ...over,
});
const unit = (unit_id, year, over = {}) => ({ unit_id, year, unit_type: 'Combined cycle', primary_fuel: 'Pipeline Natural Gas', nameplate_mw: 150, apportioned: 'no', operating_status: 'Operating', ...over });

test('no monitored unit reported: there is nothing to show', () => {
  assert.equal(plantMeasured({ units: [unit('1', 2025)], months: [] }), null);
});

test('annual and monthly totals, with the rate the measurement implies', () => {
  const months = [month('1', 2024, 1), month('1', 2025, 1), month('1', 2025, 2, { co2_tonnes: 50, gross_load_mwh: 45 }), month('2', 2025, 1, { co2_tonnes: 10, gross_load_mwh: 5 })];
  const m = plantMeasured({ units: [unit('1', 2025), unit('2', 2025), unit('1', 2024)], months });
  assert.deepEqual(m.years.map((y) => [y.year, y.co2_tonnes, y.units]), [[2024, 100, 1], [2025, 160, 2]]);
  assert.equal(m.latest.year, 2025);
  // 160 metric tons over 140 MWh of gross load.
  assert.equal(m.latest.rate_lb_mwh, (160 * LB_PER_METRIC_TON) / 140);
  assert.deepEqual(m.monthly.map((x) => [x.month, x.co2_tonnes, x.gross_load_mwh]), [[1, 110, 95], [2, 50, 45]]);
  assert.deepEqual(m.units.map((u) => [u.unit_id, u.co2_tonnes]), [['1', 150], ['2', 10]]);
  assert.equal(m.apportioned, false);
});

test('a unit whose values EPA apportions across a shared stack is flagged, and so is its year', () => {
  const m = plantMeasured({ units: [unit('1', 2025), unit('2', 2025, { apportioned: 'yes' })], months: [month('1', 2025, 1), month('2', 2025, 1, { apportioned: 'yes' })] });
  assert.deepEqual(m.units.map((u) => [u.unit_id, u.apportioned]), [['1', false], ['2', true]]);
  assert.equal(m.apportioned, true);
  assert.equal(m.latest.apportioned, true);
});

test('coverage: monitored gross load against the plant\'s reported generation, and monitored capacity against its nameplate', () => {
  const m = plantMeasured({ units: [unit('1', 2025)], months: [month('1', 2025, 1, { gross_load_mwh: 620 })], netMwh: 1000, netYear: 2025, nameplateMw: 300 });
  assert.equal(m.coverage.generationShare, 0.62);
  assert.deepEqual(m.coverage.generationYears, { measured: 2025, reported: 2025 });
  assert.equal(m.coverage.capacityShare, 0.5);
  // Above 100% is reported as it is, not capped: EPA's capacity for the monitored units can exceed EIA's.
  const wide = plantMeasured({ units: [unit('1', 2025, { nameplate_mw: 400 })], months: [month('1', 2025, 1)], nameplateMw: 300 });
  assert.equal(Math.round(wide.coverage.capacityShare * 100) / 100, 1.33);
  assert.equal(m.coverage.monitoredMw, 150);
  // No reported generation to compare with: the share is not invented.
  const none = plantMeasured({ units: [unit('1', 2025)], months: [month('1', 2025, 1)], netMwh: null, nameplateMw: null });
  assert.equal(none.coverage.generationShare, null);
  assert.equal(none.coverage.capacityShare, null);
});

test('a rate over no generation is not a rate', () => {
  assert.equal(measuredRateLbMwh(100, 0), null);
  assert.equal(measuredRateLbMwh(100, null), null);
  assert.equal(measuredRateLbMwh(1, 1), LB_PER_METRIC_TON);
});
