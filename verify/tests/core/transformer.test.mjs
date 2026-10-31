// Transformer sizing and loading (grid calculators task 2.5): each scenario as
// the spec states it, three hand-computed conversions, and the round trip.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ampsFromKva, kvaFromAmps } from '../../../core/tools/calc.transformer.size/tool.mjs';
import { runTool } from '../../../core/contract/run.mjs';
import { getTool } from '../../../core/tools/index.mjs';

const { manifest, impl } = getTool('calc.transformer.size');
const run = (o) => runTool(manifest, impl, { loadAs: 'amps', load: 600, phases: 'three', volts: 480, rating: 500, pf: 0.95, ...o });

test('600 A at 480 V three-phase needs 498.8 kVA, and the tool names no standard size, asking for the rating and saying why', () => {
  const r = run({});
  assert.equal(r.outputs.kva.display, '498.8');
  assert.match(r.work.steps.join(' '), /names no standard size: the standard distribution transformer ratings are in IEEE C57\.12\.00, a paid standard/);
});

test('a 412 kW peak at 0.95 on 500 kVA is 86.7% loading (433.7 kVA) with 66.3 kVA of headroom', () => {
  const r = run({ loadAs: 'kw', load: 412 });
  assert.deepEqual([r.outputs.kva.display, r.outputs.loading.display, r.outputs.headroom.display], ['433.7', '86.7', '66.3']);
});

test('over the rating: the result says so and leaves sustained overloading to the owner and utility under their loading guide, named by number', () => {
  const r = run({ load: 700 });
  assert.match(r.sentence, /above its nameplate rating/);
  assert.match(r.work.steps.join(' '), /owner's and the utility's decision under their loading guide \(IEEE C57\.91 for liquid-immersed and IEEE C57\.96/);
  assert.match(r.work.steps.join(' '), /does not compute overload time, hot-spot or top-oil temperature, or loss of life/);
});

test('hand computations to 0.1 kVA: single-phase, three-phase, and amps from kVA; 498.8 kVA back to 600 A within 0.1 A', () => {
  const r1 = (x) => Math.round(x * 10) / 10;
  assert.equal(r1(kvaFromAmps(200, 240, 'single')), 48.0);
  assert.equal(r1(kvaFromAmps(600, 480, 'three')), 498.8);
  assert.equal(r1(ampsFromKva(75, 208, 'three')), 208.2);
  assert.ok(Math.abs(ampsFromKva(498.8, 480, 'three') - 600) <= 0.1);
});
