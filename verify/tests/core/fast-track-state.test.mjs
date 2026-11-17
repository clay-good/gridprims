// A state screen on the fast-track page (add-interconnection-screens 3.3, scenario "Service transformer
// backfeed"): California Rule 21 Screen D reports not met with its comparison and cited threshold, kept apart
// from the federal counts; without a state the federal answer is unchanged.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { runTool } from '../../../core/contract/run.mjs';
import { getTool } from '../../../core/tools/index.mjs';

const { manifest, impl } = getTool('interconnect.fast-track.screens');
const base = manifest.examples.find((e) => e.id === 'mixed').inputs;

test('service transformer backfeed: 75 kVA behind a 50 kVA transformer is not met, with the comparison and the rule', () => {
  const r = runTool(manifest, impl, { ...base, state: 'CA', aggregateKva: 75, transformerKva: 50 });
  assert.equal(r.outputs.transformerShare.display, '150.0');
  const step = r.work.steps.at(-1);
  assert.match(step, /^California Rule 21 Screen D, a state screen the federal procedures do not have: 75 kVA of gross ratings on a 50 kVA service transformer is 150\.0% of its rating\./);
  assert.match(step, /exceed the transformer or secondary conductor rating, as the utility's practice modifies it: not met\./);
  assert.match(step, /Sheet 143; Southern California Edison Company, Rule 21 § G, Screen D, Sheet 123\)$/);
  // Within the rating, it is met.
  assert.match(runTool(manifest, impl, { ...base, state: 'CA', aggregateKva: 40, transformerKva: 50 }).work.steps.at(-1), /: met\./);
});

test('the federal counts and steps do not change, with no state or no transformer figures', () => {
  const plain = runTool(manifest, impl, base);
  assert.deepEqual(runTool(manifest, impl, { ...base, state: 'CA' }).work.steps, plain.work.steps);
  const ca = runTool(manifest, impl, { ...base, state: 'CA', aggregateKva: 75 });
  assert.deepEqual([ca.outputs.met, ca.outputs.notMet, ca.outputs.open], [plain.outputs.met, plain.outputs.notMet, plain.outputs.open]);
});
