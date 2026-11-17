// State minimum-load fallbacks (add-interconnection-screens 4.3): scenario "Codified fallback" shows each
// value against its technology as the state's rule with the result at the user's, scenario "Unconfirmed
// fallback withheld" names the state's possible fallback without using it, and without a state nothing changes.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runTool } from '../../../core/contract/run.mjs';
import { getTool } from '../../../core/tools/index.mjs';
import NM from '../../../data/curated/min-load-fallbacks/nm-17.9.568.16.mjs';
import { checkRecord } from '../../../pipeline/lib/curated.mjs';
import { ROOT } from '../../../pipeline/run.mjs';

const { manifest, impl } = getTool('interconnect.minimum-load.screen');
const base = manifest.examples.find((e) => e.id === 'over').inputs;
const run = (over) => runTool(manifest, impl, { ...base, ...over });

test('the New Mexico record passes and its values are in the stored rule text', () => {
  assert.deepEqual(checkRecord(NM, ROOT).problems, []);
  const text = readFileSync(`${ROOT}/data/curated/captures/interconnect/nm-17.9.568.16-screen-9.txt`, 'utf8');
  assert.match(text, /Pass screen for inverter-based generation [^.]*if minimum load data is not available: ≤ 30% feeder or line section peak load/);
  assert.match(text, /Pass screen for rotating generation [^.]*if minimum load data isn t available: ≤ 10% of feeder or line section peak load/);
});

test('codified fallback: both values against their technology, as the state\'s rule, and the result at the user\'s', () => {
  const inverter = run({ state: 'NM', generatorType: 'inverter' });
  assert.equal(inverter.outputs.stateFallbackShare.value, 30);
  assert.ok(inverter.work.steps.some((s) => /^New Mexico's own rule \(17\.9\.568\.16 NMAC, Screen 9\) sets a fallback .*at most 30% of peak for inverter-based generation and at most 10% for rotating generation/.test(s)));
  assert.ok(inverter.work.steps.includes('For inverter-based generation: 500 kW ÷ 2,000 kW = 25.0%, against at most 30%: met.'));
  const rotating = run({ state: 'nm', generatorType: 'rotating' });
  assert.equal(rotating.outputs.stateFallbackShare.value, 10);
  assert.ok(rotating.work.steps.includes('For rotating generation: 500 kW ÷ 2,000 kW = 25.0%, against at most 10%: not met.'));
  // The band is still shown alongside.
  assert.ok(inverter.work.steps.some((s) => /15% to 40% band/.test(s)));
});

test('unconfirmed fallback withheld: Oregon is named as being verified, and no state value is used', () => {
  const r = run({ state: 'OR' });
  assert.equal(r.outputs.stateFallbackShare, undefined);
  assert.ok(r.work.steps.includes('Oregon may set its own fallback (OAR 860-082-0063); it is being verified against the rule\'s own text, so only the band is shown.'));
});

test('without a state, or for a state with no fallback, the answer is the federal one', () => {
  const plain = runTool(manifest, impl, base);
  assert.deepEqual(run({ state: 'none' }).outputs, plain.outputs);
  assert.deepEqual(run({ state: 'TX' }).work.steps, plain.work.steps);
});
