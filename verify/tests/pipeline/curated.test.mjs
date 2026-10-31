// The curated-fact rules (trust-and-continuity tasks 2.1, 2.2, 2.4, 2.5).

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { checkBulk, checkRecord } from '../../../pipeline/lib/curated.mjs';
import { checkCurated } from '../../gates/curated.mjs';
import { fixtureRepo } from '../helpers.mjs';
import { ROOT } from '../../../pipeline/run.mjs';

const order = 'Order 12-345: the minimum bill is 85% of contract demand.';
const sheet = 'Tariff sheet 7: minimum bill, 85 percent of contract demand.';
const sha = (s) => createHash('sha256').update(s).digest('hex');
const root = fixtureRepo({ 'data/curated/captures/order.txt': order, 'data/curated/captures/sheet.txt': sheet, 'data/curated/captures/meter.csv': 'Date,kWh' });
const src = (type, publisher, capture, body) => ({ type, url: `https://example.gov/${capture}`, publisher, retrieved: '2026-10-31', capture: `data/curated/captures/${capture}`, sha256: sha(body) });
const record = (fields, conflict = 'none') => ({ id: 'tx-large-load', kind: 'large-load-terms', contributor: { conflict }, fields });

test('two independent archived primary sources: the field publishes, citations intact', () => {
  const r = checkRecord(record({ minimumBill: { value: '85%', disputable: true, sources: [src('order', 'PUCT', 'order.txt', order), src('tariff', 'Oncor', 'sheet.txt', sheet)] } }), root);
  assert.deepEqual(r, { publishable: { minimumBill: '85%' }, labels: {}, problems: [] });
});

test('only one source: the field is named and left out, and the rest of the record still publishes', () => {
  const r = checkRecord(record({
    minimumBill: { value: '85%', disputable: true, sources: [src('order', 'PUCT', 'order.txt', order)] },
    docket: { value: '55555', sources: [src('regulator', 'PUCT', 'order.txt', order)] },
  }), root);
  assert.deepEqual(r.publishable, { docket: '55555' });
  assert.match(r.problems[0], /tx-large-load\.minimumBill: a disputable field needs two independent archived primary sources; it has 1/);
});

test('an unreachable second source lets the field publish, labeled single-source', () => {
  const r = checkRecord(record({ minimumBill: { value: '85%', disputable: true, sources: [src('order', 'PUCT', 'order.txt', order), { type: 'tariff', url: 'https://utility.example/sheet.pdf', publisher: 'Oncor', retrieved: '2026-10-31', unreachable: { checked: '2026-10-31', reason: 'HTTP 404' } }] } }), root);
  assert.deepEqual(r.publishable, { minimumBill: '85%' });
  assert.equal(r.labels.minimumBill, 'single source: the second (https://utility.example/sheet.pdf) was unreachable on 2026-10-31');
  assert.deepEqual(r.problems, []);
});

test('a trade-press source is refused and the order or tariff sheet is asked for', () => {
  const r = checkRecord(record({ minimumBill: { value: '80%', sources: [{ ...src('news', 'Utility Dive', 'order.txt', order) }] } }), root);
  assert.match(r.problems.join('\n'), /cites a news source.*cite the order, tariff sheet, or regulator's page instead/);
  assert.deepEqual(r.publishable, {});
});

test('a missing or altered capture is named, because regulator URLs move', () => {
  const missing = checkRecord(record({ docket: { value: '1', sources: [{ ...src('regulator', 'PUCT', 'gone.txt', 'x') }] } }), root);
  assert.match(missing.problems[0], /no stored capture is committed for https:\/\/example\.gov\/gone\.txt/);
  const altered = checkRecord(record({ docket: { value: '1', sources: [{ ...src('regulator', 'PUCT', 'order.txt', 'different text') }] } }), root);
  assert.match(altered.problems[0], /does not match its recorded checksum/);
});

test('a disclosed utility affiliation is recorded and changes nothing; a missing answer is flagged', () => {
  const fields = { docket: { value: '1', sources: [src('regulator', 'PUCT', 'order.txt', order)] } };
  assert.deepEqual(checkRecord(record(fields, 'Employed by Oncor Electric Delivery'), root).problems, []);
  assert.match(checkRecord({ id: 'x', fields }, root).problems[0], /conflict-of-interest answer is missing/);
});

test('personal data and meter files are refused, asking for typed values instead', () => {
  const r = checkRecord(record({
    esiid: { value: '10443720000000000', sources: [src('utility', 'Oncor', 'order.txt', order)] },
    evidence: { value: 'peak 412 kW', sources: [src('utility', 'Oncor', 'meter.csv', 'Date,kWh')] },
  }), root);
  assert.match(r.problems.join('\n'), /17-digit meter identifier/);
  assert.match(r.problems.join('\n'), /meter\.csv looks like a meter file or screenshot; type the values by hand instead/);
});

test('bulk: 60 guides at once must be one labeled batch with its verification, and may not mix a refresh with a published edit', () => {
  assert.deepEqual(checkBulk({ records: 60, lines: 2400, touchesData: false, editsPublished: false, batch: { bulk: true, verification: 'Checked each guide against the utility page captured the same day.' } }), []);
  assert.match(checkBulk({ records: 60, lines: 2400, touchesData: false, editsPublished: false }).join('\n'), /label it as a bulk batch/);
  assert.match(checkBulk({ records: 25, lines: 100, touchesData: true, editsPublished: true, batch: { bulk: true, verification: 'x' } }).join('\n'), /may not mix a data refresh with an edit to a published number/);
  assert.deepEqual(checkBulk({ records: 3, lines: 40, touchesData: true, editsPublished: true }), []);
});

test('the gate passes on the repository, which has no curated facts yet', async () => {
  assert.deepEqual(await checkCurated(ROOT), []);
});
