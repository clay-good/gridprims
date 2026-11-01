// Inverter sizing (add-interconnection-screens 5.6): the ratio to 0.01, what
// clipping means, which figure the screens see, no benchmark table of our
// own, an export limit changing the figure screened, and premises wiring
// left to the trades site.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { runTool } from '../../../core/contract/run.mjs';
import { TOOLS } from '../../../core/tools/index.mjs';

const tool = TOOLS.find((t) => t.manifest.id === 'interconnect.inverter.size');
const run = (over = {}) => runTool(tool.manifest, tool.impl, { ...tool.manifest.examples[0].inputs, ...over });

test('a 150 kW array on a 120 kW inverter is 1.25, and the screens see the inverter rating', () => {
  const r = run();
  assert.equal(r.outputs.ratio.display, '1.25');
  assert.equal(r.outputs.screenedKw.value, 120);
  assert.match(r.work.steps.join('\n'), /150 kW of panels ÷ 120 kW of inverter = 1\.25\./);
  assert.match(r.work.steps.join('\n'), /the inverter clips the top of sunny days/);
  assert.match(r.work.steps.join('\n'), /screens generally see the 120 kW alternating-current rating/);
});

test('no benchmark table of our own: the published range is cited with its date', () => {
  const steps = run().work.steps.join('\n');
  assert.match(steps, /gridprims ships no benchmark table of typical ratios/);
  assert.match(steps, /usually between 1\.13 and 1\.30.*end of 2016/s);
  assert.ok(tool.manifest.citations.some((c) => /eia\.gov\/todayinenergy/.test(c.url)));
});

test('an export limit below the inverter rating is the figure a rule testing export would see', () => {
  const r = run({ dcKw: 625, acKw: 500, exportKw: 100, storage: 'yes' });
  assert.equal(r.outputs.screenedKw.value, 100);
  const steps = r.work.steps.join('\n');
  assert.match(steps, /16 TAC § 25\.211\(g\)\(1\)/);
  assert.match(steps, /A rule that tests nameplate instead still sees the full inverter rating/);
  assert.match(steps, /The utility decides whether it accepts your limiting method/);
  assert.match(steps, /a limit held by programming or by an on-site limiting element/);
  // A limit at or above the rating limits nothing.
  const none = run({ exportKw: 200 });
  assert.equal(none.outputs.screenedKw.value, 120);
  assert.match(none.work.steps.join('\n'), /is not below the 120 kW inverter rating, so it limits nothing/);
});

test('an inverter larger than the array does not clip, and busbar questions go to the trades site', () => {
  const r = run({ dcKw: 90 });
  assert.equal(r.outputs.ratio.display, '0.75');
  assert.match(r.work.steps.join('\n'), /nothing clips/);
  assert.match(r.work.steps.join('\n'), /busbar, and conductor questions are electrical-code matters/);
  assert.ok(tool.manifest.handoffs.some((h) => h.url === 'https://roughlogic.com/'));
  assert.equal(run({ acKw: 0 }).status, 'invalid');
});
