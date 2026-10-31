import { test } from 'node:test';
import assert from 'node:assert/strict';
import { runTool } from '../../../core/contract/run.mjs';
import { validateManifest } from '../../../core/contract/manifest.mjs';
import { sample } from '../helpers.mjs';

// A transmission charge: rate ($ per kW-month, a measured value) × billed demand.
const charge = {
  ...sample(),
  id: 'calc.sample.transmission-charge',
  inputs: [
    { name: 'rate', label: 'Rate', type: 'number', unit: '$/kW-month', range: { min: 0, max: 1000 }, precision: 'measured', example: '4.00' },
    { name: 'demand', label: 'Billed demand', type: 'number', unit: 'kW-month', range: { min: 0, max: 1e6 }, precision: 'exact', example: 11_100 },
  ],
  outputs: [{ name: 'charge', label: 'Charge', unit: '$', rounding: { decimals: 2 } }],
  examples: [{ id: 'x', title: 'x', inputs: { rate: '4.00', demand: 11_100 }, expect: { charge: { value: 44_400, tolerance: { abs: 0.01 } } }, source: 'Hand calculation' }],
};
const impl = { compute: ({ rate, demand }) => ({ status: 'ok', outputs: { charge: rate * demand }, sentence: (o) => `The charge is $${o.charge.display}.` }) };

test('the fixture manifest is valid', () => {
  assert.deepEqual(validateManifest(charge), []);
});

test('a coarse rate limits the result to its significant figures, with a note', () => {
  const coarse = runTool(charge, impl, { rate: '$4', demand: 11_100 });
  assert.equal(coarse.status, 'ok');
  assert.equal(coarse.outputs.charge.display, '40,000');
  assert.equal(coarse.outputs.charge.value, 40_000);
  assert.match(coarse.notes[0], /1 significant figure, which limits charge/);

  const precise = runTool(charge, impl, { rate: '$4.00', demand: 11_100 });
  assert.equal(precise.outputs.charge.display, '44,400');
  assert.deepEqual(precise.notes, []);
});

test('the copied sentence uses exactly the displayed rounding', () => {
  const r = runTool(charge, impl, { rate: '4', demand: 11_100 });
  assert.equal(r.sentence, 'The charge is $40,000.');
});

test('bad inputs come back as field messages saying what to type instead', () => {
  const r = runTool(charge, impl, { rate: 'four', demand: -5 });
  assert.equal(r.status, 'invalid');
  assert.deepEqual(r.errors.map((e) => e.field), ['rate', 'demand']);
  assert.match(r.errors[0].message, /Type a number/);
  assert.match(r.errors[1].message, /from 0 to 1,000,000/);
});

test('a refusal is a normal result, not an error, and carries no number', () => {
  const refuse = { compute: () => ({ status: 'refused', reason: 'Public data cannot support a loss-of-load figure.', limitsUrl: '/limits/#adequacy' }) };
  const r = runTool(charge, refuse, { rate: '4', demand: 1 });
  assert.equal(r.status, 'refused');
  assert.equal(r.outputs, undefined);
  assert.equal(r.limitsUrl, '/limits/#adequacy');
});

test('every result carries the validation level and its meaning', () => {
  const r = runTool(charge, impl, { rate: '4.00', demand: 1 });
  assert.equal(r.validationLevel, 1);
  assert.match(r.validationMeaning, /no independent check has been run yet/);
  assert.equal(r.stability, 'experimental');
});
