// Kansas KCC ground truth (add-tariff-conformance-suite 1.2 and 1.3): both readings of the itemized table, a row
// whose charges do not add up excluded with why, and the stored dataset.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CHARGES, KWH, readByLines, readByPositions, reconcile } from '../../../pipeline/lib/ks-kcc-bills.mjs';
import DATA from '../../../data/curated/conformance/ground-truth/ks-kcc-2026.json' with { type: 'json' };

const empire = ['$14.25', '$55.61', '$21.10', '$5.09', '$-', '$22.70', '$1.64', '$-', '$120.39', '$0.135', '80.68%', '90.01%', '8,341'];
const layout = `RESIDENTIAL ELECTRIC BILL COMPARISON | JULY 2024 - JUNE 2025\n                    Empire         ${empire.join('  ')}\n`;
const word = (x, y, t) => `<word xMin="${x}" yMin="${y}" xMax="${x + 20}" yMax="${y + 8}">${t}</word>`;
const bbox = word(60, 100, 'Empire') + empire.map((t, i) => word(100 + i * 30, 100, t)).join('');

test('both methods read the itemized row, a dash as zero, and the total without tax', () => {
  const a = readByLines(layout);
  const b = readByPositions(bbox, 1);
  assert.deepEqual(a[0].lines, [14.25, 55.61, 21.1, 5.09, 0, 22.7, 1.64, 0]);
  assert.equal(a[0].total, 120.39);
  assert.deepEqual(a[0].lines, b[0].lines);
  const r = reconcile(a, b);
  assert.equal(r.rows[0].lines.length, 6, 'zero charges are left out of the lines');
  assert.equal(r.rows[0].kwh, KWH);
});

test('a row whose charges do not add up to its total is excluded with why', () => {
  const a = readByLines(layout); const b = readByPositions(bbox, 1);
  a[0].lines[1] += 1; b[0].lines[1] += 1;
  assert.deepEqual(reconcile(a, b).excluded.map((x) => x.why), ['the charges do not add up to the total']);
});

test('the stored dataset: three utilities at 899 kWh, itemized, every total its charges\' sum', () => {
  assert.equal(DATA.extraction.figures, 3);
  assert.equal(DATA.extraction.disagreed, 0);
  for (const r of DATA.rows) assert.equal(Math.round(r.lines.reduce((t, l) => t + l.amount, 0) * 100), Math.round(r.bill * 100), r.utility);
  assert.equal(DATA.rows.find((r) => r.utility === 'Evergy Central').bill, 139.3);
  assert.equal(CHARGES.length, 8);
});

test('a credit printed in parentheses is read as negative, and a row only the word positions found is counted', () => {
  const credit = empire.map((t, i) => (i === 7 ? '($1.00)' : i === 8 ? '$119.39' : t));
  const lay = `RESIDENTIAL ELECTRIC BILL COMPARISON | JULY 2024 - JUNE 2025\n                    Empire         ${credit.join('  ')}\n`;
  const a = readByLines(lay);
  assert.equal(a[0].lines[7], -1);
  assert.equal(reconcile(a, a).extraction.agreed, 1);
  const r = reconcile([], readByPositions(bbox, 1));
  assert.deepEqual(r.excluded.map((x) => x.why), ['not read from the layout text']);
});
