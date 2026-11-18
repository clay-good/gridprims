// Project stages (projects/stages): each status, both edges of the finished
// window, messy records, and a recount of a pinned release made without our code.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { canceledTotals, projectRows, stageOf, stageTotals, statusWording } from '../../../core/lib/project-stages.mjs';
import { readShard } from '../../../core/lib/shard.mjs';
import { countyKey } from '../../../pipeline/joins.mjs';
import { summarizeProjects } from '../../../site/entities/projects.mjs';

const ROOT = join(import.meta.dirname, '../../..');
const PERIOD = '2026-09';
const planned = (over = {}) => ({ plant_id: 1, generator_id: 'A', category: 'planned', status: 'P', plant_name: 'Alpha', utility_name: 'Owner', state: 'TX', county: 'Travis', ba_code: 'ERCO', technology: 'Batteries', status_description: '(P) Planned for installation, but regulatory approvals not initiated', nameplate_mw: 10, planned_operation_year: 2027, planned_operation_month: 3, ...over });
const online = (year, month, over = {}) => ({ ...planned(), category: 'operating', status: 'OP', status_description: '(OP) Operating', operating_year: year, operating_month: month, planned_operation_year: null, planned_operation_month: null, ...over });

test('each planned status maps to its stage', () => {
  const expected = { P: 'planned', L: 'waiting', T: 'approved', U: 'building', V: 'building', TS: 'building' };
  for (const [status, stage] of Object.entries(expected)) assert.equal(stageOf(planned({ status }), PERIOD), stage, status);
});

test('a planned status with no stage stops the build and names the generator', () => {
  assert.throws(() => stageOf(planned({ status: 'XX', plant_id: 77, generator_id: 'G2' }), PERIOD), /plant 77 generator G2: planned status "XX"/);
});

test('finished reaches back 24 months, the inventory month included', () => {
  assert.equal(stageOf(online(2026, 9), PERIOD), 'finished');
  assert.equal(stageOf(online(2024, 10), PERIOD), 'finished');
  assert.equal(stageOf(online(2024, 9), PERIOD), null);
  assert.equal(stageOf(online(2026, 10), PERIOD), null, 'a month after the inventory is not in its window');
});

test('retired and canceled generators are in no stage', () => {
  assert.equal(stageOf({ ...planned(), category: 'retired' }, PERIOD), null);
  assert.equal(stageOf({ ...planned(), category: 'canceled_or_postponed' }, PERIOD), null);
});

test('a plant in two stages has two rows, and each generator counts once', () => {
  const rows = projectRows([planned({ status: 'T', generator_id: 'A' }), planned({ status: 'V', generator_id: 'B' }), planned({ status: 'U', generator_id: 'C', nameplate_mw: 2.5 })], PERIOD);
  assert.deepEqual(rows.map((r) => [r.stage, r.generators, r.mw]), [['building', 2, 12.5], ['approved', 1, 10]]);
  const totals = stageTotals(rows);
  assert.equal(totals.inProgress.generators, 3);
  assert.equal(totals.inProgress.plants, 1, 'one plant, counted once across stages');
  assert.equal(totals.inProgress.mw, 22.5);
});

test('rows are largest first and keep EIA\'s status wording without its code', () => {
  const rows = projectRows([planned({ plant_id: 1, nameplate_mw: 5 }), planned({ plant_id: 2, plant_name: 'Beta', nameplate_mw: 50 })], PERIOD);
  assert.deepEqual(rows.map((r) => r.plantId), [2, 1]);
  assert.deepEqual(rows[0].status, ['Planned for installation, but regulatory approvals not initiated']);
  assert.equal(statusWording('(TS) Construction complete, but not yet in commercial operation'), 'Construction complete, but not yet in commercial operation');
});

test('dates: a range, a missing date, and a date that has passed', () => {
  const [range] = projectRows([planned({ generator_id: 'A', planned_operation_month: 3 }), planned({ generator_id: 'B', planned_operation_year: 2028, planned_operation_month: 1 })], PERIOD);
  assert.deepEqual([range.dateFrom, range.dateTo, range.datePassed], ['2027-03', '2028-01', false]);
  const [none] = projectRows([planned({ planned_operation_year: null, planned_operation_month: null })], PERIOD);
  assert.deepEqual([none.dateFrom, none.dateTo, none.datePassed], [null, null, false]);
  const [late] = projectRows([planned({ planned_operation_year: 2026, planned_operation_month: 8 })], PERIOD);
  assert.equal(late.datePassed, true);
  const [due] = projectRows([planned({ planned_operation_year: 2026, planned_operation_month: 9 })], PERIOD);
  assert.equal(due.datePassed, false, 'the inventory month itself has not passed');
  const [year] = projectRows([planned({ planned_operation_year: 2026, planned_operation_month: null })], PERIOD);
  assert.deepEqual([year.dateFrom, year.datePassed], ['2026', false], 'a bare year has not passed until it is over');
});

test('a blank or unmatched county stays on its row, unconfirmed, and still counts in the state', () => {
  const counties = new Set(['TX|travis']);
  const s = summarizeProjects([planned({ plant_id: 1 }), planned({ plant_id: 2, county: null, nameplate_mw: 20 }), planned({ plant_id: 3, county: 'Bolivar', nameplate_mw: 30 })], PERIOD, counties);
  const [tx] = s.states;
  assert.equal(tx.summary.inProgress.mw, 60);
  assert.deepEqual(tx.counties.map((c) => [c.county, c.summary.inProgress.mw]), [['Travis', 10], [null, 50]]);
  assert.equal(tx.rows.find((r) => r.plantId === 3).county, 'Bolivar', 'EIA\'s text is kept');
  assert.equal(tx.rows.find((r) => r.plantId === 3).countyConfirmed, false);
});

test('a blank balancing authority is grouped last as not reported', () => {
  const s = summarizeProjects([planned({ plant_id: 1, ba_code: null, nameplate_mw: 99 }), planned({ plant_id: 2 })], PERIOD, new Set(['TX|travis']));
  assert.deepEqual(s.bas.map((b) => b.ba), ['ERCO', null]);
});

test('canceled or postponed generators are counted apart from every stage', () => {
  const gens = [planned(), { ...planned({ nameplate_mw: 7 }), category: 'canceled_or_postponed', status: null }];
  const s = summarizeProjects(gens, PERIOD, new Set(['TX|travis']));
  assert.deepEqual(canceledTotals(gens), { generators: 1, mw: 7 });
  assert.deepEqual(s.canceled, { generators: 1, mw: 7 });
  assert.equal(s.national.inProgress.generators, 1);
});

/** Every row of a table in one pinned dataset version. */
function pinned(dataset, version, table) {
  const dir = join(ROOT, 'data', dataset, version);
  const manifest = JSON.parse(readFileSync(join(dir, 'manifest.json'), 'utf8'));
  return manifest.tables.find((t) => t.name === table).shards.flatMap((s) => readShard(readFileSync(join(dir, s.path))).rows());
}

test('release 2026-10 reconciles with a recount made without our code', () => {
  const ref = JSON.parse(readFileSync(join(ROOT, 'verify/reference/eia-860m-2026-10-project-stages.json'), 'utf8'));
  const counties = new Set(pinned('census-zcta-county', '2026-10', 'zcta_counties').map((r) => `${r.state}|${countyKey(r.county_name)}`));
  const s = summarizeProjects(pinned('eia-860m', '2026-10', 'generators'), ref.inventoryMonth, counties);
  for (const [stage, e] of Object.entries(ref.stages)) {
    assert.equal(s.national.stages[stage].generators, e.generators, `${stage} generators`);
    assert.equal(s.national.stages[stage].plants, e.plants, `${stage} plants`);
    assert.ok(Math.abs(s.national.stages[stage].mw - e.mw) <= 0.1, `${stage}: ${s.national.stages[stage].mw} MW against ${e.mw} MW`);
  }
  assert.equal(s.canceled.generators, ref.canceledOrPostponed.generators);
  assert.ok(Math.abs(s.canceled.mw - ref.canceledOrPostponed.mw) <= 0.1);
  for (const st of s.states) for (const [stage, mw] of Object.entries(ref.stateMw[st.state] ?? {})) assert.ok(Math.abs(st.summary.stages[stage].mw - mw) <= 0.1, `${st.state} ${stage}`);
  // Every place total adds back up to the nation.
  for (const stage of Object.keys(ref.stages)) {
    const add = (list) => list.reduce((n, x) => n + x.summary.stages[stage].mw, 0);
    assert.ok(Math.abs(add(s.states) - s.national.stages[stage].mw) <= 0.1, `states add up in ${stage}`);
    assert.ok(Math.abs(add(s.bas) - s.national.stages[stage].mw) <= 0.1, `balancing authorities add up in ${stage}`);
    for (const st of s.states) assert.ok(Math.abs(add(st.counties) - st.summary.stages[stage].mw) <= 0.1, `${st.state} counties add up in ${stage}`);
  }
  const va = s.states.find((x) => x.state === 'VA').rows.find((r) => r.plantId === 64550);
  assert.deepEqual([va.mw, va.countyConfirmed], [2640, false], 'the offshore project with no county still counts');
});
