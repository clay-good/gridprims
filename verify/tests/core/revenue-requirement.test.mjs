// The revenue requirement explainer (ratepayer tools task 1.3), each scenario
// as the revenue-requirement spec states it.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { runTool } from '../../../core/contract/run.mjs';
import { getTool } from '../../../core/tools/index.mjs';

const { manifest, impl } = getTool('ratepayer.revenue-requirement.explain');
const base = manifest.examples[0].inputs;

test('a $2 billion rate base at a 50% equity ratio, 10% ROE, and 5% debt: 7.5% cost of capital, $150,000,000 return, and $33,333,333 income tax at 25%', () => {
  const r = runTool(manifest, impl, base);
  assert.deepEqual([r.outputs.wacc.display, r.outputs.ret.display, r.outputs.incomeTax.display], ['7.5', '150,000,000', '33,333,333']);
  assert.equal(r.outputs.total.value, Math.round(400e6 + 150e6 + 50e6 + 100e6 / 3 + 150e6));
});

test('ROE from 10% to 9%: $13,333,333 less ($10,000,000 return and $3,333,333 tax), about $0.89 less per home a month, with the method', () => {
  const r = runTool(manifest, impl, base);
  assert.equal(r.outputs.perPoint.display, '13,333,333');
  assert.equal(r.outputs.perCustomerMonth.display, '0.89');
  assert.match(r.work.steps.join(' '), /lowers it by \$13,333,333: \$10,000,000 of return and \$3,333,333 of income tax/);
  assert.match(r.work.steps.at(-1), /This is an approximation/);
});

test('every input is editable: changing one changes the answer', () => {
  const a = runTool(manifest, impl, base).outputs.total.value;
  const b = runTool(manifest, impl, { ...base, om: base.om + 1e6 }).outputs.total.value;
  assert.equal(b - a, 1e6);
});
