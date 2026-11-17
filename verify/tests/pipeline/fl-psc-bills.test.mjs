// Florida PSC ground truth (add-tariff-conformance-suite 1.2 and 1.3): both reading methods on small inputs,
// a disagreement excluded and counted rather than guessed, and the stored dataset's provenance and checks.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readByLines, readByPositions, readRanking, reconcile } from '../../../pipeline/lib/fl-psc-bills.mjs';
import DATA from '../../../data/curated/conformance/ground-truth/fl-psc-2025-12-31.json' with { type: 'json' };

const layout = [
  'Typical Electric Bill Comparisons* - Residential Service',
  '                       100   250   500   750   1,000   1,500',
  'Example Electric       $25.00   $25.00   $39.89   $70.15   $100.43   $130.68   $201.25',
  'Sample Town**          $9.14    $18.68   $32.99   $56.84   $80.69    $104.54   $157.34',
  '',
  '                                A-1',
  '\f1,000 kWh Residential Monthly Bills for All Florida Electric Utilities',
  '                     December 31, 2025',
  '  1   Sample Town**   M   $ 104.54     2   Example Electric   I   $ 130.68',
  'SECTION B',
].join('\n');

const word = (x, y, t) => `<word xMin="${x}" yMin="${y}" xMax="${x + 20}" yMax="${y + 8}">${t}</word>`;
const header = [100, 250, 500, 750, 1000, 1500].map((k, i) => word(200 + i * 60, 100, k.toLocaleString('en-US'))).join('');
const row = (y, name, figures) => word(20, y, name) + figures.map((f, i) => word(140 + i * 60, y, f)).join('');
const bbox = `<page>${word(10, 20, 'Typical')}${word(40, 20, 'Electric')}${word(70, 20, 'Bill')}${word(90, 20, 'Comparisons*')}${word(130, 20, '-')}${word(140, 20, 'Residential')}${word(180, 20, 'Service')}${header}`
  + row(130, 'Example', ['$25.00', '$25.00', '$39.89', '$70.15', '$100.43', '$130.68', '$201.25'])
  + row(150, 'Sample', ['$9.14', '$18.68', '$32.99', '$56.84', '$80.69', '$104.54', '$157.34'])
  + word(300, 500, 'A-1') + '</page>';

test('method A reads each row from the layout text, with the website-sourced mark', () => {
  const a = readByLines(layout);
  assert.deepEqual(a.map((r) => [r.page, r.utility, r.websiteSourced, r.customerCharge, r.bills[1000]]), [['A-1', 'Example Electric', false, 25, 130.68], ['A-1', 'Sample Town', true, 9.14, 104.54]]);
  assert.deepEqual([...readRanking(layout)], [['Sample Town', { type: 'M', bill: 104.54 }], ['Example Electric', { type: 'I', bill: 130.68 }]]);
});

test('method B places each amount under its column header from word positions', () => {
  const b = readByPositions(bbox);
  assert.deepEqual(b.map((r) => [r.utility, r.customerCharge, r.bills[100], r.bills[1500]]), [['Example', 25, 25, 201.25], ['Sample', 9.14, 18.68, 157.34]]);
});

test('a figure the readings disagree on is excluded and counted, never guessed', () => {
  const a = readByLines(layout);
  const b = a.map((r) => ({ ...r, bills: { ...r.bills } }));
  b[0].bills[500] = 79.89;
  const r = reconcile(a, b, readRanking(layout), { document: 'test' });
  assert.equal(r.extraction.figures, 12);
  assert.equal(r.extraction.disagreed, 1);
  assert.deepEqual(r.excluded, [{ utility: 'Example Electric', page: 'A-1', kwh: 500, lines: 70.15, positions: 79.89 }]);
  assert.ok(!r.rows.some((x) => x.utility === 'Example Electric' && x.kwh === 500));
  // The ranking table disagreeing at 1,000 kWh excludes that figure too.
  const ranking = readRanking(layout); ranking.set('Sample Town', { type: 'M', bill: 104.55 });
  assert.equal(reconcile(a, a, ranking, {}).excluded[0].kwh, 1000);
});

test('the stored Florida dataset: every figure from both readings, with its provenance, and none excluded', () => {
  assert.equal(DATA.document.asOf, '2025-12-31');
  assert.match(DATA.document.sha256, /^[0-9a-f]{64}$/);
  assert.match(DATA.document.assumptions, /Excludes local taxes, franchise fees, and gross receipts taxes/);
  assert.deepEqual([DATA.extraction.figures, DATA.extraction.agreed, DATA.extraction.disagreed], [324, 324, 0]);
  assert.equal(new Set(DATA.rows.map((r) => r.utility)).size, 54);
  for (const r of DATA.rows) assert.ok(r.page && r.utility && r.kwh && r.bill > 0 && r.ownership, JSON.stringify(r));
  assert.equal(DATA.rows.filter((r) => r.checkedAgainst === 'A-10').length, 54);
  // Bills rise with use for every utility.
  for (const u of new Set(DATA.rows.map((r) => r.utility))) {
    const bills = DATA.rows.filter((r) => r.utility === u).sort((a, b) => a.kwh - b.kwh).map((r) => r.bill);
    assert.ok(bills.every((x, i) => i === 0 || x >= bills[i - 1]), u);
  }
  assert.equal(DATA.rows.find((r) => r.utility === 'Duke Energy Florida, LLC' && r.kwh === 1000).bill, 184.96);
});
