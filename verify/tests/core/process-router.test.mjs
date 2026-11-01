// The process router (add-interconnection-screens 2.1 to 2.4): Fast Track by
// the § 2.1 table, the study process above the ceiling, the 10 kW, 69 kV, and
// 20 MW boundaries, deadlines with citations, an unsupported state shown as a
// federal reference with its commission, and not an application.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { route } from '../../../core/lib/process-router.mjs';
import { runTool } from '../../../core/contract/run.mjs';
import { TOOLS } from '../../../core/tools/index.mjs';

const tool = TOOLS.find((t) => t.manifest.id === 'interconnect.process.route');
const run = (over) => runTool(tool.manifest, tool.impl, { ...tool.manifest.examples[0].inputs, ...over });

test('the § 2.1 table: every voltage band at any location and on a mainline', () => {
  const cases = [[2.4, 'no', 500], [2.4, 'yes', 500], [12.47, 'no', 2000], [12.47, 'yes', 3000], [25, 'no', 3000], [25, 'yes', 4000], [34.5, 'no', 4000], [69, 'yes', 5000]];
  for (const [kv, mainline, ceiling] of cases) assert.equal(route({ kw: 100, kv, technology: 'inverter-certified', mainline }).ceilingKw, ceiling, `${kv} kV ${mainline}`);
  assert.equal(route({ kw: 100, kv: 69.1, technology: 'inverter-certified', mainline: 'yes' }).process, 'study');
  assert.equal(route({ kw: 10, kv: 0.24, technology: 'inverter-certified', mainline: 'no' }).process, 'inverter-10kw');
  assert.equal(route({ kw: 20001, kv: 34.5, technology: 'inverter-certified', mainline: 'yes' }).process, 'large');
  assert.equal(route({ kw: 2001, kv: 12.47, technology: 'rotating', mainline: 'yes' }).process, 'study');
  assert.equal(route({ kw: 500, kv: 12.47, technology: 'inverter-other', mainline: 'yes' }).process, 'study');
});

test('fast-track eligible names the next process, shows deadlines in business days, and says it is not an application', () => {
  const r = run({});
  assert.equal(r.sentence, 'This project is eligible for Fast Track, up to 3,000 kW.');
  const steps = r.work.steps.join('\n');
  assert.match(steps, /Eligibility is not a pass.*supplemental review or the study process/);
  assert.match(steps, /Initial review of the screens: 15 business days from a complete application \(§ 2\.2\)/);
  assert.match(steps, /pre-application report .* costs \$300 and is due in 20 business days \(§ 1\.2\)/);
  assert.match(steps, /does not file, submit, or track an application: you file with the utility/);
});

test('above the ceiling: the study process, and no Fast Track screens', () => {
  const r = run({ kw: 4000 });
  assert.equal(r.sentence, 'Fast Track does not apply; this project goes to the study process.');
  assert.doesNotMatch(r.work.steps.join(' '), /Initial review of the screens/);
});

test('an unknown mainline that would change the answer says so', () => {
  assert.match(run({ kw: 2500, mainline: 'unknown' }).sentence, /applies only if the project connects on a mainline/);
});

test('a state with no record: the federal procedure labeled as a reference, and the state\'s commission linked', () => {
  const r = run({ jurisdiction: 'oh' });
  assert.match(r.sentence, /^Under the federal reference, /);
  assert.match(r.work.steps[0], /does not hold Ohio's interconnection rules\. This is the federal procedure as a reference, not the rule that applies to you\. .*Public Utilities Commission of Ohio/);
  assert.equal(run({ jurisdiction: 'XX' }).status, 'invalid');
});
