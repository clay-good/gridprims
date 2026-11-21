// The bill check reproduces Texas EFL average prices (add-household-bill-check 2.4; household/bill-totals,
// "EFL average price"): each stored EFL, priced as supply plus the TDU charges it passes through, gives the
// printed average price per kWh to 0.1 cent at 1,000 kWh, and within half of 0.1 cent at 500 and 2,000 kWh.
// The rule rounds an average of unrounded charges, while a bill rounds each line to the cent first, so at a
// rounding edge (Reliant's 2,000 kWh, 12.9499 cents unrounded) the bill's average sits on the half.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { runTool } from '../../../core/contract/run.mjs';
import { getTool } from '../../../core/tools/index.mjs';
import { EFLS, EFL_RULE } from '../../fixtures/bill/efls.mjs';

const tool = getTool('household.bill-totals.check');
const tariffOf = (e) => ({
  fixedMonthly: e.baseMonthly || undefined,
  seasons: [{ name: 'energy charge', from: '01-01', tiers: [{ rate: e.energyPerKwh }] }],
  charges: [{ label: `${e.tduArea} delivery, per month`, monthly: e.tdu.monthly }, { label: `${e.tduArea} delivery, per kWh`, perKwh: e.tdu.perKwh }],
});
/** The bill's average in cents per kWh, from the tool's computed total. */
function average(e, kwh) {
  const r = runTool(tool.manifest, tool.impl, { periods: `2026-12-01 to 2026-12-31, ${kwh} kWh`, tariff: JSON.stringify(tariffOf(e)), prorate: 'yes' });
  assert.equal(r.status, 'ok', JSON.stringify(r.errors ?? r));
  return (r.outputs.total.value * 100) / kwh;
}

test('three EFLs, three providers, three TDU areas, each citing what it passes through', () => {
  assert.equal(new Set(EFLS.map((e) => e.provider)).size, 3);
  assert.equal(new Set(EFLS.map((e) => e.tduArea)).size, 3);
  for (const e of EFLS) {
    assert.match(e.sha256, /^[0-9a-f]{64}$/);
    assert.match(e.tdu.says, /pass(ed)? through/i);
    assert.deepEqual(Object.keys(e.printed).map(Number), EFL_RULE.levels);
  }
});

for (const e of EFLS) {
  test(`${e.id}: the printed average at 1,000 kWh to 0.1 cent, and within 0.05 cent at 500 and 2,000`, () => {
    assert.equal(Math.round(average(e, 1000) * 10) / 10, e.printed[1000]);
    for (const kwh of [500, 2000]) assert.ok(Math.abs(average(e, kwh) - e.printed[kwh]) <= 0.05 + 1e-9, `${kwh} kWh: ${average(e, kwh)} against ${e.printed[kwh]}`);
  });
}
