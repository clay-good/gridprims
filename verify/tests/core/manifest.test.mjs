import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isToolId, supportedLevel, validateManifest } from '../../../core/contract/manifest.mjs';
import { sample } from '../helpers.mjs';


test('accepts a sample manifest', () => {
  assert.deepEqual(validateManifest(sample()), []);
});

test('rejects each missing required field, naming the tool and the field', () => {
  const required = ['id', 'version', 'title', 'purpose', 'archetype', 'inputs', 'outputs', 'method', 'assumptions', 'citations', 'datasets', 'examples', 'related', 'handoffs', 'stability', 'validation', 'limitations'];
  for (const field of required) {
    const m = sample();
    delete m[field];
    const errors = validateManifest(m);
    assert.ok(errors.some((e) => e.includes(field)), `missing ${field} not reported: ${errors}`);
    if (field !== 'id') assert.ok(errors.every((e) => e.startsWith('calc.sample.double:')), `tool not named: ${errors}`);
  }
});

test('a missing citation, limitations list, or validation level blocks the build', () => {
  for (const [field, value] of [['citations', []], ['limitations', []], ['validation', { evidence: [] }]]) {
    const m = sample();
    m[field] = value;
    assert.ok(validateManifest(m).some((e) => e.startsWith(`calc.sample.double: ${field}`)), field);
  }
});

test('tool ids have three lowercase kebab segments', () => {
  assert.ok(isToolId('calc.energy-units.convert'));
  for (const bad of ['calc.energy-units', 'Calc.units.convert', 'calc.energy_units.convert', 'a.b.c.d', 'calc..convert']) assert.ok(!isToolId(bad), bad);
});

test('stable claimed at self-checked fails, naming the level stable requires', () => {
  const m = sample();
  m.stability = 'stable';
  const errors = validateManifest(m);
  assert.ok(errors.some((e) => /stable at validation level 1; stable requires level 2/.test(e)), errors.join('\n'));
});

test('a claimed level beyond the committed evidence fails', () => {
  const m = sample();
  m.validation = { level: 2, evidence: [{ kind: 'own-examples', summary: 'x' }] };
  assert.ok(validateManifest(m).some((e) => /claims 2 but the committed evidence supports 1/.test(e)));
  m.validation.evidence.push({ kind: 'reference-output', summary: 'REopt run', path: 'verify/reference/missing.json' });
  assert.ok(validateManifest(m, { fileExists: () => false }).some((e) => /claims 2/.test(e)), 'uncommitted reference file accepted');
  assert.deepEqual(validateManifest(m, { fileExists: () => true }), []);
});

test('field verification needs three recorded cases', () => {
  const own = { kind: 'own-examples' };
  const ref = { kind: 'reference-output', path: 'a' };
  const field = { kind: 'field-case', path: 'b' };
  assert.equal(supportedLevel([own, ref, field, field]), 2);
  assert.equal(supportedLevel([own, ref, field, field, field]), 3);
  assert.equal(supportedLevel([]), 0);
});

test('handoffs are plain https links that carry no inputs', () => {
  const m = sample();
  m.handoffs = [{ label: 'REopt', url: 'https://reopt.example.org/?load=123' }];
  assert.ok(validateManifest(m).some((e) => /plain link/.test(e)));
});

test('examples may only use declared inputs and outputs, each output with a tolerance', () => {
  const m = sample();
  m.examples[0].inputs.z = 1;
  m.examples[0].expect.y.tolerance = {};
  const errors = validateManifest(m);
  assert.ok(errors.some((e) => /inputs\.z is not a declared input/.test(e)));
  assert.ok(errors.some((e) => /tolerance needs abs or rel/.test(e)));
});
