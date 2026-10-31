import { test } from 'node:test';
import assert from 'node:assert/strict';
import { runTool } from '../../../core/contract/run.mjs';
import { getTool } from '../../../core/tools/index.mjs';
import { runExamples } from '../../lib/examples.mjs';

const tool = getTool('calc.energy-units.convert');
const run = (inputs) => runTool(tool.manifest, tool.impl, inputs);

test('every worked example passes', () => {
  assert.deepEqual(runExamples(tool), []);
});

test('12 MWh is 40.95 MMBtu, with 3.41214 attributed to the SI derivation', () => {
  const r = run({ value: 12, from: 'MWh', to: 'MMBtu' });
  assert.equal(r.outputs.value.display, '40.95');
  assert.equal(r.outputs.value.unit, 'MMBtu');
  assert.equal(r.sentence, '12 MWh is 40.95 MMBtu.');
  const factor = r.work.constants[0];
  assert.equal(factor.text, '1 MWh = 3.41214 MMBtu');
  assert.match(factor.source, /SI definitions \(NIST/);
  assert.doesNotMatch(factor.source, /EIA/);
});

test('the kWh-to-Btu constant reads 3,412.14 and is never attributed to EIA', () => {
  const r = run({ value: 1, from: 'kWh', to: 'Btu' });
  const factor = r.work.constants[0];
  assert.equal(factor.text, '1 kWh = 3,412.14 Btu');
  assert.doesNotMatch(factor.source, /EIA/);
});

test('fuel heat content is an average, names its year, and says gas varies', () => {
  const r = run({ value: 1000, from: 'ft3-natural-gas', to: 'Btu' });
  assert.equal(r.outputs.value.display, '1,036,000');
  assert.equal(r.sentence, '1,000 ft³ of natural gas is about 1,036,000 Btu.');
  const gas = r.work.constants.find((c) => /Btu \(US average\)/.test(c.text));
  assert.equal(gas.year, '2025');
  assert.equal(gas.exact, false);
  assert.ok(r.work.steps.some((s) => /real fuel varies/.test(s)));
});

test('SI conversions match NIST SP 811 factors to 6 significant figures', () => {
  // NIST SP 811 Appendix B.8: Btu (IT) to joule 1.055 056 E+03; kilowatt hour to joule 3.6 E+06 (exact).
  const btu = run({ value: 1, from: 'Btu', to: 'J' });
  assert.equal(Number(btu.outputs.value.value.toPrecision(4)), 1055);
  const { compute } = tool.impl;
  assert.equal(Number(compute({ value: 1, from: 'Btu', to: 'J' }).outputs.value.toPrecision(7)), 1055.056);
  assert.equal(compute({ value: 1, from: 'kWh', to: 'J' }).outputs.value, 3.6e6);
});

test('a conversion and its reverse round-trip', () => {
  const { compute } = tool.impl;
  for (const [a, b] of [['MWh', 'MMBtu'], ['therm', 'kWh'], ['bbl-propane', 'GJ'], ['short-ton-coal', 'MWh']]) {
    const there = compute({ value: 7.5, from: a, to: b }).outputs.value;
    const back = compute({ value: there, from: b, to: a }).outputs.value;
    assert.ok(Math.abs(back - 7.5) < 1e-9, `${a} ↔ ${b}`);
  }
});

test('singular unit names for exactly 1, plural otherwise', () => {
  assert.equal(run({ value: 1, from: 'therm', to: 'kWh' }).sentence, '1 therm is 29.31 kWh.');
  assert.equal(run({ value: 2, from: 'therm', to: 'kWh' }).sentence, '2 therms is 58.61 kWh.');
});

test('a word typed as the amount returns a field message, not a number', () => {
  const r = run({ value: 'twelve', from: 'MWh', to: 'MMBtu' });
  assert.equal(r.status, 'invalid');
  assert.equal(r.errors[0].field, 'value');
});

test('the result says how well checked it is: cross-checked against NIST, stable', () => {
  const r = run({ value: 12, from: 'MWh', to: 'MMBtu' });
  assert.equal(r.validationLevel, 2);
  assert.match(r.validationMeaning, /independent implementation or a published worked example/);
  assert.equal(r.stability, 'stable');
});

test('stored NIST SP 811 vectors pass, and a drifted constant fails naming the vector', async () => {
  const { runReferenceVectors, readPrinted } = await import('../../lib/reference-vectors.mjs');
  const root = new URL('../../..', import.meta.url).pathname;
  assert.deepEqual(runReferenceVectors(tool, root), []);
  assert.deepEqual(readPrinted('1.055 056 E+03'), { value: 1055.056, sigFigs: 7 });
  const drifted = { ...tool, impl: { compute: (v) => { const r = tool.impl.compute(v); return { ...r, outputs: { value: r.outputs.value * 1.0001 } }; } } };
  assert.match(runReferenceVectors(drifted, root).join('\n'), /calc\.energy-units\.convert reference nist-btu-j \(NIST Special Publication 811 \(2008\)\): expected 1055\.056, got 1055\.16/);
});
