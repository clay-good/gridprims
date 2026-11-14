// Outage logs as utilities export them (add-reliability-tools task 1.2): the
// vendor-shaped fixtures read as their expected receipts, and the column-
// mapping-corrected, missing-field, restore-before-start, partial-restoration,
// and crossing-midnight scenarios hold.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT } from '../../../pipeline/run.mjs';
import { readOutageLog } from '../../../core/lib/outage-log.mjs';
import { classify, indices, mergePartial } from '../../../core/lib/reliability.mjs';

const DIR = join(ROOT, 'verify/fixtures/reliability');
const read = (name, o) => readOutageLog(readFileSync(join(DIR, `${name}.csv`), 'utf8'), { zone: 'America/Chicago', ...o });
const expected = (name) => JSON.parse(readFileSync(join(DIR, `${name}.expected.json`), 'utf8'));

for (const name of ['oracle-nms', 'milsoft-style', 'cust-out-duration']) {
  test(`${name}: the receipt matches the fixture's expected receipt`, () => {
    const r = read(name);
    const e = expected(name);
    assert.equal(r.status, 'ok');
    assert.deepEqual(Object.fromEntries(r.columns.map((c) => [c.name, c.field])), e.columns);
    assert.equal(r.events.length, e.events);
    assert.deepEqual(Object.fromEntries(r.events.map((x) => [String(x.row), x.minutes])), e.minutes);
    assert.deepEqual(r.issues.invalid, e.invalid);
    assert.deepEqual(r.issues.overlaps, e.overlaps);
    assert.deepEqual(r.issues.partial.map(({ event, rows }) => ({ event, rows })), e.partial.map(({ event, rows }) => ({ event, rows })));
    assert.deepEqual(r.issues.crossesMidnight, e.crossesMidnight);
    assert.deepEqual(r.issues.crossesDst, e.crossesDst);
    if (e.planned) assert.deepEqual(r.events.filter((x) => x.planned).map((x) => x.row), e.planned);
  });
}

test('column mapping corrected: "Cust Out" read as cause leaves no customer count; mapped back, the indices compute', () => {
  const wrong = read('cust-out-duration', { mapping: { cause: 'Cust Out' } });
  assert.equal(wrong.status, 'missing');
  assert.deepEqual(wrong.missing.map((m) => m.field), ['customers']);
  const right = read('cust-out-duration', { mapping: { customers: 'Cust Out', cause: 'Cause' } });
  assert.equal(right.status, 'ok');
  const i = indices(classify(right.events).sustained, { customersServed: 1000, periodMinutes: 365 * 1440 });
  // 250 + 90 customers interrupted over 1,000 served; 250 × 40 + 90 × 15 = 11,350 customer minutes.
  assert.equal(i.perCustomer, 0.34);
  assert.equal(i.customerMinutes, 11350);
});

test('required field missing: no customer count, so no index, and the message names the field and why', () => {
  const r = readOutageLog('Outage Start,Duration (min),Cause\n2025-02-10 07:15,40,Squirrel\n', { zone: 'America/Chicago' });
  assert.equal(r.status, 'missing');
  assert.deepEqual(r.missing, [{ field: 'customers', label: 'customers interrupted', why: 'every index divides by customers, and counts them per interruption' }]);
  assert.equal(r.events, undefined, 'no event is read, so no index can be computed');
  const noTime = readOutageLog('Outage Start,Cust Out\n2025-02-10 07:15,40\n');
  assert.equal(noTime.missing[0].label, 'restoration time or duration in minutes');
});

test('restore before start: the event is invalid, kept out of every index, and listed on the receipt', () => {
  const r = read('oracle-nms');
  assert.deepEqual(r.issues.invalid, [{ row: 8, reason: 'restored before it started' }]);
  assert.ok(!r.events.some((e) => e.row === 8));
});

test('partial restorations: three rows of 300, 200, and 100 customers are offered as one event; confirmed, 600 customers once, minutes summed', () => {
  const r = read('oracle-nms');
  const [group] = r.issues.partial;
  assert.deepEqual(group, { event: 'E1003', rows: [4, 5, 6] });
  // Nothing is merged until the user confirms: the three rows are still three events.
  assert.equal(r.events.filter((e) => e.event === 'E1003').length, 3);
  const merged = mergePartial(r.events.filter((e) => group.rows.includes(e.row)));
  assert.equal(merged.customers, 600);
  assert.equal(merged.customerMinutes, 300 * 45 + 200 * 90 + 100 * 130);
  // Overlapping rows of one event are not reported as overlaps; two events on one fuse are.
  assert.deepEqual(r.issues.overlaps, [{ place: 'FUSE-101', rows: [2, 3] }]);
});

test('crossing midnight and a daylight-saving change: 23:30 to 01:15 is 105 minutes; 00:40 CDT to 02:10 CST is 150', () => {
  const r = read('oracle-nms');
  assert.equal(r.events.find((e) => e.row === 7).minutes, 105);
  assert.deepEqual(r.issues.crossesMidnight, [7]);
  // The clocks fell back at 2:00 a.m. on November 2, 2025, so the wall clock shows 90 minutes but 150 passed.
  assert.equal(r.events.find((e) => e.row === 9).minutes, 150);
  assert.deepEqual(r.issues.crossesDst, [9]);
});

test('US dates with 12-hour clocks, and planned work read only from a planned type', () => {
  const r = read('milsoft-style');
  assert.equal(r.events[0].minutes, 95);
  assert.equal(r.events[0].planned, undefined, '"Unplanned" is not planned');
  assert.equal(r.events[1].planned, true);
});
