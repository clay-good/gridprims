// Supply plus delivery (household bill check task 3.4): a Texas plan from its
// Electricity Facts Label plus the TDU's delivery charges, and a California
// CCA home priced as the utility's delivery plus the CCA generation rate and
// the PCIA, each line shown.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { priceTotals } from '../../../core/lib/bill-totals.mjs';
import { runTool } from '../../../core/contract/run.mjs';
import { getTool } from '../../../core/tools/index.mjs';

test('a Texas plan: 9.5 cents and $9.95 base, delivery $4.39 a month and 5.4 cents, at 1,000 kWh is $163.34, each line shown', () => {
  const plan = {
    fixedMonthly: 9.95,
    seasons: [{ name: 'energy charge', from: '01-01', tiers: [{ rate: 0.095 }] }],
    charges: [{ label: 'TDU delivery, per month', monthly: 4.39 }, { label: 'TDU delivery, per kWh', perKwh: 0.054 }],
  };
  const r = priceTotals({ start: '2026-07-01', end: '2026-07-31', kwh: 1000 }, plan);
  assert.equal(r.totalCents, 16334);
  assert.deepEqual(r.lines.map((l) => [l.label, l.cents]), [['fixed', 995], ['energy charge tier 1', 9500], ['TDU delivery, per month', 439], ['TDU delivery, per kWh', 5400]]);
});

test('an EFL usage credit applies only in its kWh range', () => {
  const plan = { seasons: [{ name: 'energy charge', from: '01-01', tiers: [{ rate: 0.12 }] }], credits: [{ label: 'usage credit, 1,000 to 2,000 kWh', atLeastKwh: 1000, atMostKwh: 2000, amount: 30 }] };
  const at = (kwh) => priceTotals({ start: '2026-07-01', end: '2026-07-31', kwh }, plan).totalCents;
  assert.deepEqual([at(999), at(1000), at(2000), at(2001)], [11988, 12000 - 3000, 24000 - 3000, 24012]);
});

test('a CCA home on PG&E: each TOU period priced as delivery plus CCA generation plus PCIA, and no bundled price', () => {
  // Delivery rates by period, as the utility's delivery tariff gives them; generation and PCIA entered from the bill.
  const cca = {
    seasons: [{ name: 'summer', from: '06-01', periods: [{ name: 'peak', rate: 0.21 }, { name: 'off-peak', rate: 0.17 }] }, { name: 'winter', from: '10-01', periods: [{ name: 'peak', rate: 0.19 }, { name: 'off-peak', rate: 0.16 }] }],
    charges: [{ label: 'CCA generation', perKwh: 0.142 }, { label: 'PCIA (2019 vintage)', perKwh: 0.0153 }],
  };
  const r = priceTotals({ start: '2026-07-01', end: '2026-07-31', kwh: 500, tou: { peak: 150, 'off-peak': 350 } }, cca);
  // 150 × 21¢ + 350 × 17¢ = $31.50 + $59.50 delivery; 500 × 14.2¢ = $71.00 generation; 500 × 1.53¢ = $7.65 PCIA.
  assert.deepEqual(r.lines.map((l) => [l.label, l.cents]), [['summer peak', 3150], ['summer off-peak', 5950], ['CCA generation', 7100], ['PCIA (2019 vintage)', 765]]);
  assert.equal(r.totalCents, 3150 + 5950 + 7100 + 765);
  assert.ok(!r.lines.some((l) => /bundled|generation \(PG&E\)/i.test(l.label)), 'the bundled generation price is not shown as theirs');
});

test('the bill check tool takes the same plan: its tariff JSON may carry charges and credits', () => {
  const { manifest, impl } = getTool('household.bill-totals.check');
  const tariff = JSON.stringify({ fixedMonthly: 9.95, seasons: [{ name: 'energy charge', from: '01-01', tiers: [{ rate: 0.095 }] }], charges: [{ label: 'TDU delivery, per month', monthly: 4.39 }, { label: 'TDU delivery, per kWh', perKwh: 0.054 }] });
  const r = runTool(manifest, impl, { periods: '2026-07-01 to 2026-07-31, 1,000 kWh', tariff, prorate: 'yes' });
  assert.equal(r.outputs.total.display, '163.34');
  assert.ok(r.work.steps[0].includes('TDU delivery, per kWh, 1,000 kWh × 5.4¢ = $54.00'));
  const bad = runTool(manifest, impl, { periods: '2026-07, 1,000 kWh', tariff: JSON.stringify({ seasons: [{ name: 'a', from: '01-01', tiers: [{ rate: 0.1 }] }], charges: [{ label: 'x' }] }), prorate: 'yes' });
  assert.equal(bad.status, 'invalid');
  assert.match(bad.errors[0].message, /Charge 1 needs a label and either perKwh/);
});
