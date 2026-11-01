// The load-ratio screens (add-interconnection-screens 4.1 to 4.5): the
// 15%-of-peak screen, the minimum-load screen as a band with its flip point
// and the rule's own comparison, the daytime-only band, a utility value
// overriding the band, and no answer without peak load.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { minLoadBand, peakScreen } from '../../../core/lib/min-load.mjs';
import { runTool } from '../../../core/contract/run.mjs';
import { TOOLS } from '../../../core/tools/index.mjs';

const tool = TOOLS.find((t) => t.manifest.id === 'interconnect.minimum-load.screen');
const run = (over) => runTool(tool.manifest, tool.impl, { ...tool.manifest.examples[0].inputs, ...over });

test('six hand-computed fixtures: ratios and met-or-not-met', () => {
  assert.deepEqual(peakScreen(500, 2000), { ratio: 0.25, threshold: 0.15, met: false });
  assert.equal(peakScreen(300, 2000).met, true, '15% exactly is met: the rule says no more than 15%');
  const flip = minLoadBand(500, 2000);
  assert.deepEqual([flip.low.met, flip.high.met, flip.flip, flip.flipsInside], [false, true, 0.25, true]);
  assert.deepEqual([flip.low.minLoadKw, flip.high.minLoadKw], [300, 800]);
  const settled = minLoadBand(60, 2000);
  assert.deepEqual([settled.low.met, settled.high.met, settled.settled], [true, true, true]);
  assert.equal(minLoadBand(900, 2000).settled, true, 'not met at both ends');
  assert.equal(run({ minLoadKw: 500 }).outputs.minLoadRatio.value, 100);
  assert.match(run({ minLoadKw: 500 }).sentence, /minimum-load screen is not met\. Equal is not less/);
  assert.match(run({ minLoadKw: 600 }).sentence, /On the utility's minimum load, the minimum-load screen is met\.$/);
});

test('the answer that flips names the assumption, and a settled one says the assumption does not matter', () => {
  assert.match(run({}).sentence, /met if minimum load is above 25\.0% of peak and not met below it/);
  assert.match(run({ aggregateKw: 60 }).sentence, /met across the whole 15% to 40% band, so the assumption does not change the answer/);
});

test('storage that can export at night uses absolute minimum load: the daytime band does not apply', () => {
  const r = run({ technology: 'storage' });
  assert.match(r.sentence, /absolute minimum load\. The 15% to 40% band is only for daytime load/);
  assert.equal(r.outputs.flipShare, undefined);
});

test('a utility-provided value is labeled with its source and flag, the band only for comparison', () => {
  const r = run({ minLoadKw: 600, minLoadSource: 'published', measured: 'estimated' });
  assert.ok(r.work.steps.some((s) => /on the utility's published feeder value \(marked estimated\)/.test(s)));
  assert.ok(r.work.steps.some((s) => /^For comparison only, the band would give/.test(s)));
});

test('no peak load, no load-ratio result', () => {
  const r = run({ peakKw: 0 });
  assert.equal(r.status, 'refused');
  assert.match(r.reason, /pre-application report/);
});
