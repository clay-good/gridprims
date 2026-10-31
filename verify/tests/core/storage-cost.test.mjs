// Battery basics and LCOE (grid calculators task 2.3), each scenario as the
// storage-and-cost spec states it.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { runTool } from '../../../core/contract/run.mjs';
import { getTool } from '../../../core/tools/index.mjs';

const run = (id, inputs) => { const { manifest, impl } = getTool(id); return runTool(manifest, impl, inputs); };

test('a 100 MW / 400 MWh battery at 75 MW runs 5.33 h at a 0.1875 C-rate; 90% depth and 85% efficiency give 360 MWh delivered and 423.5 MWh to charge', () => {
  const r = run('calc.storage.basics', { powerMw: 100, energyMwh: 400, dispatchMw: 75, dod: 90, roundTrip: 85 });
  assert.deepEqual(['durationDispatch', 'cRate', 'usable', 'charging', 'durationRated'].map((k) => r.outputs[k].display), ['5.33', '0.1875', '360.0', '423.5', '4.00']);
  assert.match(r.work.steps.at(-1), /losses taken on charging/);
  assert.equal(run('calc.storage.basics', { powerMw: 100, energyMwh: 400, dispatchMw: 120, dod: 90, roundTrip: 85 }).status, 'invalid');
});

test('LCOE: FCR 0.07, $1,000/kW, $20/kW-year, 25% capacity factor is $41.10/MWh (90 ÷ 2.19), and each term is shown', () => {
  const r = run('calc.cost.lcoe', { fcr: 0.07, capex: 1000, fom: 20, cf: 25, vom: 0, fuel: 0 });
  assert.equal(r.outputs.lcoe.display, '41.10');
  assert.match(r.work.steps.join(' '), /Capital: 0\.07 fixed charge rate × \$1,000\/kW ÷ 2\.19 = \$31\.96\/MWh/);
  assert.match(r.work.steps.join(' '), /Fixed O&M: \$20\/kW-year ÷ 2\.19 = \$9\.13\/MWh/);
  // Changing the fixed charge rate changes the answer and the capital term.
  const r2 = run('calc.cost.lcoe', { fcr: 0.08, capex: 1000, fom: 20, cf: 25, vom: 0, fuel: 0 });
  assert.equal(r2.outputs.capital.display, '36.53');
  assert.equal(r2.outputs.lcoe.display, '45.66');
});
