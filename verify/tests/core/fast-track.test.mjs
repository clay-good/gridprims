// The Fast Track screens (add-interconnection-screens 3.1 to 3.5): every
// screen in rule order with its threshold and who answers it, the three
// answerable screens evaluated with their arithmetic, no verdict on screens
// needing a circuit model, and a status summary with no likelihood.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { runTool } from '../../../core/contract/run.mjs';
import { TOOLS } from '../../../core/tools/index.mjs';

const tool = TOOLS.find((t) => t.manifest.id === 'interconnect.fast-track.screens');
const run = (over = {}) => runTool(tool.manifest, tool.impl, { ...tool.manifest.examples[0].inputs, ...over });

test('every screen appears in rule order, with its section, threshold, and who answers it', () => {
  const screens = run().work.steps.filter((s) => s.startsWith('§ 2.2.1.'));
  assert.deepEqual(screens.map((s) => /^§ (2\.2\.1\.\d+)/.exec(s)[1]), ['2.2.1.1', '2.2.1.2', '2.2.1.3', '2.2.1.4', '2.2.1.5', '2.2.1.6', '2.2.1.7', '2.2.1.8', '2.2.1.9', '2.2.1.10']);
  for (const s of screens) assert.match(s, /Answered by (only the utility|you and your installer)/);
  assert.match(screens[1], /at most 15% of the line section's annual peak load.*Answered by only the utility \(the line section's annual peak load/);
});

test('screens that need a circuit model are never passed or failed', () => {
  for (const sec of ['2.2.1.4', '2.2.1.5', '2.2.1.9']) {
    const s = run({ lineConfig: '3w', connection: '3ph' }).work.steps.find((x) => x.startsWith(`§ ${sec}`));
    assert.match(s, /only the utility, from its circuit model/);
    assert.match(s, /Open\.$/);
  }
});

test('the answerable screens show their arithmetic, and the summary gives counts with no likelihood', () => {
  const r = run({ connection: '1ph-ll', sharedKw: 25, imbalanceKva: 10 });
  assert.equal(r.sentence, '1 screen is met, 2 not met, and 7 still open. The utility runs every screen and decides.');
  assert.ok(r.work.steps.some((s) => /25 kW against at most 20 kW: not met\./.test(s)));
  assert.ok(r.work.steps.some((s) => /10 kVA against 20% of 100 kVA = 20 kVA: met\./.test(s)));
  assert.doesNotMatch([r.sentence, ...r.work.steps].join(' '), /likely|probab|chance|odds/i);
});

test('screens the federal procedures do not have are named with the rules that do', () => {
  assert.ok(run().work.steps.some((s) => /no starting-voltage-drop screen and no screen called a penetration test: those are California Rule 21/.test(s)));
});
