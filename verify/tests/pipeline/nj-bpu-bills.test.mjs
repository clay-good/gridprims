// New Jersey BPU ground truth (add-tariff-conformance-suite 1.2 and 1.3): both readings of the release's table,
// a row the readings or the table's own arithmetic dispute excluded with why, and the stored dataset.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readByCells, readByText, reconcile } from '../../../pipeline/lib/nj-bpu-bills.mjs';
import DATA from '../../../data/curated/conformance/ground-truth/nj-bpu-2026-02-12.json' with { type: 'json' };

const tr = (cells) => `<tr>${cells.map((c) => `<td><p>${c}</p></td>`).join('')}</tr>`;
const page = (rows) => `<p>Monthly Impact of BGS Auction on Average Residential Accounts</p><table>${tr(['Utility Company', 'Usage (kWh)', 'Current Bill', 'Increase or Decrease', 'New Bill', 'Percent Change'])}${rows.map(tr).join('')}</table>`;
const dates = { issued: '2026-02-12', from: '2026-06-01' };

test('both methods read each company\'s row, a negative change included', () => {
  const p = page([['ACE', '650', '$201.54', '$0.22', '$201.76', '0.11%'], ['PSE&amp;G', '650', '$183.46', '-$3.23', '$180.23', '-1.8%']]);
  assert.deepEqual(readByCells(p), readByText(p));
  assert.deepEqual(readByCells(p)[1], { code: 'PSE&G', kwh: 650, current: 183.46, change: -3.23, next: 180.23, percent: -1.8, percentText: '-1.8' });
  const r = reconcile(readByCells(p), readByText(p), dates);
  assert.equal(r.extraction.agreed, 4);
  assert.deepEqual(r.rows.slice(0, 2).map((x) => [x.bill, x.ratesAsOf]), [[201.54, '2026-02-12'], [201.76, '2026-06-01']]);
});

test('a row whose bills do not add up, or whose percent is off, is excluded with why', () => {
  const bad = page([['ACE', '650', '$201.54', '$0.22', '$201.86', '0.11%'], ['RECO', '650', '$170.10', '-$1.17', '$168.93', '-0.9%']]);
  const r = reconcile(readByCells(bad), readByText(bad), dates);
  assert.deepEqual(r.excluded.map((x) => x.why), ['the current bill and the change do not add up to the new bill', 'the change does not match the printed percent']);
  assert.equal(r.extraction.disagreed, 4);
});

test('the stored dataset: four companies at 650 kWh, two dates each, all agreed', () => {
  assert.equal(DATA.extraction.figures, 8);
  assert.equal(DATA.extraction.disagreed, 0);
  assert.equal(new Set(DATA.rows.map((r) => r.utility)).size, 4);
  assert.ok(DATA.rows.every((r) => r.kwh === 650 && /^2026-0[26]$/.test(r.month)));
  assert.equal(DATA.rows.find((r) => r.utility === 'Jersey Central Power & Light' && r.ratesAsOf === '2026-06-01').bill, 137.47);
  assert.match(DATA.document.terms, /may view, copy or distribute/);
});
