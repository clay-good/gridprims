// The continuity ledger (add-data-continuity-ledger 1.1 to 1.10): the fields a
// row needs, posted against inferred lateness, the 30-day grace, a changed
// promise kept with both versions, replies published inline, the on-time count
// first, discontinued and moved datasets, our own lateness, dead citations,
// and the automation rows.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildLedger, ledgerRow, missingFields } from '../../../core/lib/ledger.mjs';

const base = { id: 'x', title: 'X data', publisher: 'Agency', sourceUrl: 'https://example.gov/x', cadence: { every: 'annual' }, asOf: '2025-06-01', vintage: '2024' };
const at = (iso) => Date.parse(`${iso}T00:00:00Z`);

test('a dataset without enough for a row fails the build, naming the field', () => {
  assert.deepEqual(missingFields({ ...base, publisher: '' }), ['publisher']);
  assert.throws(() => ledgerRow({ ...base, cadence: {} }, { now: at('2026-01-01') }), /ledger: x is missing cadence\.every/);
});

test('without a posted date, lateness is inferred from the cadence and says so', () => {
  const r = ledgerRow(base, { now: at('2026-08-01') });
  assert.equal(r.due, '2026-06-01');
  assert.equal(r.basis, 'inferred from an annual cadence');
  assert.equal(r.posted, false);
  assert.equal(r.status, 'late');
});

test('12 days past a posted date is due, not late, with the date and the grace rule', () => {
  const r = ledgerRow({ ...base, cadence: { every: 'annual', nextRelease: { date: '2026-03-01', posted: true } } }, { now: at('2026-03-13') });
  assert.deepEqual([r.status, r.due, r.lateFrom, r.graceDays, r.basis], ['due', '2026-03-01', '2026-03-31', 30, 'posted date']);
});

test('a removed promise keeps both versions with their dates and states no cause', () => {
  const health = { datasets: [{ id: 'x', releasePromises: [{ seen: '2026-01-05', text: 'Next release: March 2026', archive: 'https://gridprims.com/a.txt' }, { seen: '2026-02-05', text: null }] }] };
  const r = ledgerRow(base, { health, now: at('2026-02-10') });
  assert.equal(r.promiseHistory.length, 2);
  assert.equal(r.promiseHistory[1].text, null);
  assert.ok(!JSON.stringify(r).match(/because|due to|blame/i));
});

test('a reply is published beside its row, unedited and attributed', () => {
  const replies = [{ dataset: 'x', date: '2026-03-02', from: 'Agency press office', text: 'The release moved to April because of a system change.' }];
  const r = ledgerRow(base, { replies, now: at('2026-03-05') });
  assert.deepEqual(r.replies, replies);
});

test('the counts come first, our own datasets sit in the same table, and discontinued ones stay', () => {
  const L = buildLedger({
    datasets: [base, { ...base, id: 'y', asOf: '2026-05-01' }, { ...base, id: 'z', discontinued: { date: '2026-01-01', notice: 'https://example.gov/z-retired', successor: 'Z2' } }, { ...base, id: 'ours', publisher: 'gridprims', ours: true, cadence: { every: 'monthly' }, asOf: '2026-01-01' }],
    health: { links: [{ url: 'https://example.gov/dead', state: 'broken', status: 404, usedBy: ['x citation'] }, { url: 'https://example.gov/x', state: 'ok', status: 200 }], workflows: [{ id: 'refresh-data', lastSuccess: '2026-04-01T00:00:00Z', intervalHours: 24, thresholdHours: 72, enabled: true }], deposits: { last: null, restoreTest: null } },
    generatedAt: '2026-06-15T00:00:00Z', contact: 'https://gridprims.com/report/',
  });
  assert.deepEqual(L.counts, { tracked: 4, current: 1, due: 1, late: 1, discontinued: 1 });
  assert.equal(L.rows.at(-1).id, 'ours');
  assert.equal(L.rows.find((r) => r.id === 'ours').status, 'late', 'our own lateness shows on the same terms');
  assert.equal(L.rows.find((r) => r.id === 'z').discontinued.successor, 'Z2');
  assert.deepEqual(L.deadLinks.map((d) => d.url), ['https://example.gov/dead']);
  assert.equal(L.automation[0].thresholdHours, 72, 'the threshold travels so the page and readers can age it');
  assert.equal(L.rows.find((r) => r.id === 'x').urlCheck.status, 200);
});
