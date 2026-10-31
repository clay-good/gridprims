// Power factor correction (grid calculators task 2.4), each scenario as the
// spec states it, and two published worked examples within 1 kVAR.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { correctionKvar, powerFactorFrom } from '../../../core/tools/calc.power-factor.correct/tool.mjs';
import { runTool } from '../../../core/contract/run.mjs';
import { getTool } from '../../../core/tools/index.mjs';

const { manifest, impl } = getTool('calc.power-factor.correct');
const base = { kw: 500, measured: 'pf', value: 0.78, pfTarget: 0.95, volts: 480, phases: 'three', demandRate: 0, tariffPf: 0 };
const run = (o) => runTool(manifest, impl, { ...base, ...o });

test('500 kW at 0.78 to 0.95 needs 236.8 kVAR; apparent power falls from 641.0 to 526.3 kVA, with the formula shown', () => {
  const r = run({});
  assert.deepEqual([r.outputs.kvar.display, r.outputs.kvaBefore.display, r.outputs.kvaAfter.display], ['236.8', '641.0', '526.3']);
  assert.match(r.work.steps[1], /500 kW × \(tan\(arccos 0\.78\) − tan\(arccos 0\.95\)\)/);
  assert.match(r.work.steps[0], /as entered/, 'with no reactive data, the result says the power factor was entered');
});

test('a tariff billing demand to 0.90: 576.9 kW, a 76.9 kW penalty or $1,385 a month at $18.00/kW, which correcting to 0.95 removes', () => {
  const r = run({ demandRate: 18, tariffPf: 0.9 });
  assert.equal(Math.round(r.outputs.monthlySaving.value), 1385);
  assert.match(r.work.steps.join(' '), /= 576\.9 kW, a power-factor penalty of 76\.9 kW, or \$1,384\.62 a month at \$18\.00\/kW\. Correcting to 0\.95 removes it\./);
  assert.match(r.work.steps.join(' '), /power-factor effect only; it leaves out the cost of the equipment/);
});

test('a target below the measured power factor needs no correction, never a negative kVAR', () => {
  const r = run({ value: 0.97 });
  assert.equal(r.outputs.kvar.value, 0);
  assert.match(r.sentence, /^No correction is needed/);
  assert.equal(correctionKvar(100, 0.97, 0.9), 0);
});

test('the result leaves bank size, steps, placement, and harmonics to an electrical engineer, under the screening label', () => {
  const r = run({});
  assert.match(r.screeningLabel, /electrical engineer's decision/);
  assert.match(r.work.steps.at(-1), /size up to the next rating your supplier offers/);
});

test('two published worked examples within 1 kVAR', () => {
  const ref = JSON.parse(readFileSync(join(import.meta.dirname, '../../reference/pf-correction-examples.json'), 'utf8'));
  assert.equal(ref.examples.length, 2);
  for (const e of ref.examples) {
    const pf = e.kvarBefore !== undefined ? powerFactorFrom(e.kw, 'kvar', e.kvarBefore) : e.pfBefore;
    assert.ok(Math.abs(correctionKvar(e.kw, pf, e.pfTarget) - e.publishedKvar) <= 1, e.source);
  }
});
