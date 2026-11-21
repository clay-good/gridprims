// Montana PSC ground truth (add-tariff-conformance-suite 1.2 and 1.3): both reading methods on a small table, a
// disagreement excluded and counted rather than guessed, and the stored dataset's provenance and figures.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { KWH, readByLines, readByPositions, reconcile } from '../../../pipeline/lib/mt-psc-bills.mjs';
import DATA from '../../../data/curated/conformance/ground-truth/mt-psc-2026-11.json' with { type: 'json' };

const months = ['Sep-25', 'Oct-25', 'Nov-25', 'Dec-25', 'Jan-26', 'Feb-26', 'Mar-26', 'Apr-26', 'May-26', 'Jun-26', 'Jul-26', 'Aug-26'];
const nwe = months.map((_, i) => `$${(100 + i).toFixed(2)}`);
const mdu = months.map((_, i) => (i === 3 ? (90 + i).toFixed(2) : `$${(90 + i).toFixed(2)}`));
const layout = ['Averge Bill - Electric', 'Assume 30 days/750 kwh', `      ${months.join('  ')}`, `  NWE ${nwe.join(' ')}`, `  MDU ${mdu.join(' ')}`, 'NOTES'].join('\n');
const word = (x, y, t) => `<word xMin="${x}" yMin="${y}" xMax="${x + 20}" yMax="${y + 8}">${t}</word>`;
const row = (y, xs) => xs.map((t, i) => word(100 + i * 40, y, t)).join('');
const bbox = `<page>${word(200, 10, 'Averge')}${word(240, 10, 'Bill')}${word(270, 10, '-')}${word(280, 10, 'Electric')}${row(100, months)}${word(40, 112, 'NWE')}${row(112, nwe)}${word(40, 124, 'MDU')}${row(124, mdu)}</page>`;

test('both methods read every month for both utilities, a missing dollar sign included', () => {
  const a = readByLines(layout);
  const b = readByPositions(bbox);
  assert.equal(a.length, 24);
  assert.deepEqual(a.map((r) => [r.utility, r.month, r.bill]), b.map((r) => [r.utility, r.month, r.bill]));
  assert.deepEqual(a.find((r) => r.utility === 'Montana-Dakota Utilities' && r.month === '2025-12').bill, 93);
});

test('a figure the methods disagree on is excluded and counted', () => {
  const b = readByPositions(bbox);
  b[0].bill += 1;
  const r = reconcile(readByLines(layout), b);
  assert.equal(r.extraction.disagreed, 1);
  assert.deepEqual([r.excluded[0].utility, r.excluded[0].month, r.excluded[0].why], ['NorthWestern Energy', '2025-09', 'the two methods disagree']);
});

test('the stored dataset: 30 bills at 750 kWh, both utilities, 15 months, all agreed, with figures read off the report', () => {
  assert.equal(DATA.extraction.figures, 30);
  assert.equal(DATA.extraction.disagreed, 0);
  assert.ok(DATA.rows.every((r) => r.kwh === KWH && r.page === 2 && /^\d{4}-\d{2}$/.test(r.month)));
  assert.equal(new Set(DATA.rows.map((r) => r.month)).size, 15);
  assert.equal(DATA.document.taxes, 'included');
  // Read off the report by eye: NorthWestern in November 2026 and Montana-Dakota in December 2025.
  assert.equal(DATA.rows.find((r) => r.utility === 'NorthWestern Energy' && r.month === '2026-11').bill, 118.7);
  assert.equal(DATA.rows.find((r) => r.utility === 'Montana-Dakota Utilities' && r.month === '2025-12').bill, 88.68);
});

test('a figure only the word positions found is counted as excluded, not dropped', () => {
  const a = readByLines(layout).filter((r) => r.utility !== 'Montana-Dakota Utilities');
  const r = reconcile(a, readByPositions(bbox));
  assert.equal(r.extraction.figures, 24);
  assert.equal(r.excluded.filter((x) => x.why === 'not read from the layout text').length, 12);
});
