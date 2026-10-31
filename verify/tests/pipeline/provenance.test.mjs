import { test } from 'node:test';
import assert from 'node:assert/strict';
import { lateness } from '../../../core/lib/lateness.mjs';
import { tableLicense } from '../../../pipeline/lib/licenses.mjs';

const at = (iso) => Date.parse(`${iso}T00:00:00Z`);

test('one lateness rule: an annual dataset as of 2025-10-07 with no posted date is late from 2026-11-06', () => {
  const d = { asOf: '2025-10-07', cadence: { every: 'annual' } };
  const before = lateness(d, at('2026-11-05'));
  assert.deepEqual([before.due, before.posted, before.lateFrom, before.late], ['2026-10-07', false, '2026-11-06', false]);
  assert.equal(lateness(d, at('2026-11-06')).late, true);
});

test('a posted next-release date wins over the cadence, and the row says it was posted', () => {
  const d = { asOf: '2025-10-07', cadence: { every: 'annual', nextRelease: { date: '2026-08-31', posted: true } } };
  const r = lateness(d, at('2026-10-01'));
  assert.deepEqual([r.due, r.posted, r.lateFrom, r.late], ['2026-08-31', true, '2026-09-30', true]);
});

test('a release 90 days late counts its days', () => {
  const r = lateness({ asOf: '2025-10-07', cadence: { every: 'annual' } }, at('2027-01-05'));
  assert.equal(r.daysLate, 90);
  assert.equal(r.late, true);
});

test('a monthly dataset within its window is not late', () => {
  assert.equal(lateness({ asOf: '2026-10-01', cadence: { every: 'monthly' } }, at('2026-11-15')).late, false);
});

test('mixed inputs: EIA (public domain) joined with PUDL Form 714 (CC BY 4.0) is CC BY 4.0 crediting both', () => {
  const r = tableLicense([
    { id: 'eia-861', publisher: 'U.S. Energy Information Administration', license: 'public-domain', attribution: 'Source: EIA, Form EIA-861 (Oct 2026).' },
    { id: 'pudl-714', publisher: 'Catalyst Cooperative', license: 'CC-BY-4.0', attribution: 'PUDL, Catalyst Cooperative, CC BY 4.0' },
  ]);
  assert.equal(r.license, 'CC-BY-4.0');
  assert.deepEqual(r.credits.map((c) => [c.publisher, c.note]), [['U.S. Energy Information Administration', 'Modified by gridprims.'], ['Catalyst Cooperative', 'Modified by gridprims.']]);
});

test('incompatible share-alike inputs: DSIRE (CC BY-SA) and OpenStreetMap (ODbL) must be two files', () => {
  const r = tableLicense([
    { id: 'dsire', publisher: 'NC Clean Energy Technology Center', license: 'CC-BY-SA-4.0', attribution: 'DSIRE' },
    { id: 'osm', publisher: 'OpenStreetMap contributors', license: 'ODbL-1.0', attribution: '© OpenStreetMap contributors' },
  ]);
  assert.equal(r.ok, false);
  assert.match(r.error, /split the table in two/);
});

test('share-alike input makes the table share-alike; ISO data keeps its publisher terms and notice', () => {
  assert.equal(tableLicense([{ id: 'eia', license: 'public-domain', publisher: 'EIA', attribution: 'EIA' }, { id: 'dsire', license: 'CC-BY-SA-4.0', publisher: 'DSIRE', attribution: 'DSIRE' }]).license, 'CC-BY-SA-4.0');
  const ercot = tableLicense([{ id: 'ercot-4cp', license: 'publisher-terms', publisher: 'ERCOT', attribution: 'ERCOT', notice: 'ERCOT terms of use apply.' }]);
  assert.equal(ercot.license, 'publisher-terms');
  assert.deepEqual(ercot.notices, ['ERCOT terms of use apply.']);
});
