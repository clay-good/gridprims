// Louisiana PSC ground truth (add-tariff-conformance-suite 1.2 and 1.3): both reading methods on a small
// block, every way a total is disputed (the methods, the summary table, the block's own line items)
// excluded and counted rather than guessed, and the stored dataset's provenance and checks.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { LEVELS, readByLines, readByPositions, readSummary, reconcile, splitName } from '../../../pipeline/lib/la-psc-bills.mjs';
import DATA from '../../../data/curated/conformance/ground-truth/la-psc-2026-11.json' with { type: 'json' };

const KWH = LEVELS.map((k) => k.toLocaleString('en-US'));
const pad = (xs) => xs.map((x) => String(x).padStart(10)).join('  ');
const energy = LEVELS.map((k) => (k * 0.1).toFixed(2));
const total = LEVELS.map((k) => (k * 0.1 + 15 - 1).toFixed(2));
const layout = [
  `${' '.repeat(60)}${pad(KWH)}`,
  `EXAMPLE-Schedule RS${' '.repeat(41)}${pad(LEVELS.map(() => 'Kwh'))}`,
  `Energy Charge${' '.repeat(30)}0.10000     ${pad(energy)}`,
  `Monthly Service Charge${' '.repeat(23)}15.00     ${pad(LEVELS.map(() => '15.00'))}`,
  `Power Cost Adjustment${' '.repeat(22)}-0.0040     ${pad(LEVELS.map(() => '(1.00)'))}`,
  `Total${' '.repeat(55)}${pad(total)}`,
  '\f',
  `                      Company${' '.repeat(30)}${pad(KWH)}`,
  `EXAMPLE-Schedule FRC${' '.repeat(20)}${total.map((x) => `$${x}`).join('   ')}`,
].join('\n');

const word = (x, y, t) => `<word xMin="${x}" yMin="${y}" xMax="${x + 20}" yMax="${y + 8}">${t}</word>`;
const cols = (y, xs) => xs.map((t, i) => word(400 + i * 60, y, t)).join('');
const bbox = `<page>${word(20, 100, 'EXAMPLE-Schedule')}${word(90, 100, 'RS')}${cols(100, LEVELS.map(() => 'Kwh'))}`
  + `${word(20, 120, 'Energy')}${word(60, 120, 'Charge')}${word(300, 120, '0.10000')}${cols(120, energy)}`
  + `${word(20, 140, 'Monthly')}${word(60, 140, 'Service')}${word(100, 140, 'Charge')}${word(300, 140, '15.00')}${cols(140, LEVELS.map(() => '15.00'))}`
  + `${word(20, 160, 'Power')}${word(50, 160, 'Cost')}${word(80, 160, 'Adjustment')}${word(300, 160, '-0.0040')}${cols(160, LEVELS.map(() => '(1.00)'))}`
  + `${word(20, 180, 'Total')}${cols(180, total)}</page>`;

test('method A reads a block line by line: label, rate, eleven amounts, negatives in parentheses', () => {
  const [b] = readByLines(layout);
  assert.equal(b.name, 'EXAMPLE-Schedule RS');
  assert.equal(b.page, 1);
  assert.deepEqual(b.lines.map((l) => [l.label, l.rate]), [['Energy Charge', '0.10000'], ['Monthly Service Charge', '15.00'], ['Power Cost Adjustment', '-0.0040']]);
  assert.equal(b.lines[2].amounts[0], -1);
  assert.deepEqual(b.total, total.map(Number));
});

test('method B reads the same block from word positions, telling the rate column from the amounts', () => {
  const [b] = readByPositions(bbox);
  assert.equal(b.name, 'EXAMPLE-Schedule RS');
  assert.deepEqual(b.lines.map((l) => [l.label, l.rate]), [['Energy Charge', '0.10000'], ['Monthly Service Charge', '15.00'], ['Power Cost Adjustment', '-0.0040']]);
  assert.deepEqual(b.total, total.map(Number));
});

test('agreed totals become rows with their line items; a summary named differently is matched by utility and noted', () => {
  const r = reconcile(readByLines(layout), readByPositions(bbox), readSummary(layout));
  assert.equal(r.extraction.figures, LEVELS.length);
  assert.equal(r.extraction.disagreed, 0);
  assert.deepEqual(r.notes, ['EXAMPLE-Schedule RS: the summary table names it differently; matched by utility']);
  const row = r.rows.find((x) => x.kwh === 1000);
  assert.deepEqual([row.utility, row.schedule, row.bill], ['EXAMPLE', 'Schedule RS', 114]);
  assert.deepEqual(row.lines.map((l) => l.amount), [100, 15, -1]);
});

test('a disputed total is excluded and counted with why: the methods, the summary, or the line items', () => {
  const a = readByLines(layout);
  const b = readByPositions(bbox);
  const s = readSummary(layout);
  const methods = structuredClone(b); methods[0].total[0] += 1;
  const summary = new Map([...s].map(([k, v]) => [k, v.map((x, i) => (i === 1 ? x + 1 : x))]));
  const items = structuredClone(a); items[0].lines[0].amounts[2] += 0.5;
  const itemsB = structuredClone(b); itemsB[0].lines[0].amounts[2] += 0.5;
  assert.deepEqual(reconcile(a, methods, s).excluded.map((x) => [x.kwh, x.why]), [[250, 'the two methods disagree']]);
  assert.deepEqual(reconcile(a, b, summary).excluded.map((x) => [x.kwh, x.why]), [[500, 'the summary table disagrees']]);
  const r = reconcile(items, itemsB, s);
  assert.deepEqual(r.excluded.map((x) => [x.kwh, x.why]), [[750, 'the line items do not add up to the total']]);
  assert.equal(r.extraction.disagreed, 1);
  assert.equal(r.extraction.disagreementRate, 1 / LEVELS.length);
});

test('line items that round to within half a cent each of the total still agree', () => {
  const a = readByLines(layout); const b = readByPositions(bbox);
  for (const x of [a, b]) x[0].lines[0].amounts[3] += 0.01;
  assert.equal(reconcile(a, b, readSummary(layout)).extraction.disagreed, 0);
});

test('a schedule name splits into the utility and the schedule as printed', () => {
  assert.deepEqual(splitName('Entergy Louisiana-Schedule RS-G (Legacy EGSL)'), { utility: 'Entergy Louisiana', schedule: 'Schedule RS-G (Legacy EGSL)' });
  assert.deepEqual(splitName('NORTHEAST- Schedule A'), { utility: 'NORTHEAST', schedule: 'Schedule A' });
});

test('the stored dataset: every figure agreed and was checked against the summary table and its own items', () => {
  assert.equal(DATA.extraction.figures, 176);
  assert.equal(DATA.extraction.disagreed, 0);
  assert.equal(DATA.rows.length, 16 * LEVELS.length);
  assert.equal(DATA.document.taxes, 'unstated', 'the report never says whether taxes are in the figure');
  assert.match(DATA.document.sha256, /^[0-9a-f]{64}$/);
  for (const r of DATA.rows) {
    assert.ok(r.page >= 1 && r.page <= 8 && r.utility && r.schedule && LEVELS.includes(r.kwh), JSON.stringify(r));
    assert.equal(r.checkedAgainst, 'summary table');
    const items = r.lines.filter((l) => l.label !== 'Subtotal');
    assert.ok(Math.abs(items.reduce((s, l) => s + Math.round(l.amount * 100), 0) - Math.round(r.bill * 100)) <= Math.ceil(items.length / 2), `${r.utility} ${r.schedule} ${r.kwh}`);
  }
  // Spot figures read off the report by eye: Cleco at 1,000 kWh and SLEMCO Schedule 05 at 5,000 kWh.
  assert.equal(DATA.rows.find((r) => r.utility === 'CLECO' && r.kwh === 1000).bill, 145.71);
  assert.equal(DATA.rows.find((r) => r.utility === 'SLEMCO' && r.schedule === 'Schedule 05' && r.kwh === 5000).bill, 590.19);
});
