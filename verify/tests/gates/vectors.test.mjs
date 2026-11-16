// The bill engine gated on the bill test vectors (add-tariff-conformance-suite 2.5): scenario "Our own failure"
// blocks a release, a recorded finding that the vector is wrong releases it, and a vector the engine cannot
// read is skipped with its reason rather than passed. URPX tariffs read back into the engine unchanged.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fromUrpx, toUrpx } from '../../../core/lib/urpx.mjs';
import { gateVectors, runVector } from '../../../pipeline/lib/run-vectors.mjs';
import { checkVectors } from '../../gates/vectors.mjs';
import { URPX_CASES } from '../../fixtures/urpx/cases.mjs';
import { fixtureRepo } from '../helpers.mjs';
import { ROOT } from '../../../pipeline/run.mjs';

const tiered = URPX_CASES.tiered;
// Hand arithmetic from the tariff: $10 + 500 × $0.10 + 200 × $0.13 = $86.00.
const vector = (amount, over = {}) => ({
  id: 'tiered-700-kwh', tariff: { format: 'URPX', version: 'v0.5.1', document: toUrpx(tiered.tariff, tiered.meta).document },
  load: { kind: 'monthly', periods: [{ start: '2026-01-01', end: '2026-01-31', kwh: 700 }] },
  expected: { total: { amount, unit: 'USD' }, lines: [{ label: 'Customer charge', type: 'fixed', amount: 10, unit: 'USD' }, { label: 'Energy', type: 'tiered-energy', amount: amount - 10, unit: 'USD' }] },
  tolerance: { amount: 0.01, unit: 'USD' },
  provenance: { kind: 'tariff-arithmetic', tariffSheet: 'Example Electric residential tiered (a test tariff)', arithmetic: ['$10.00 customer charge', '500 kWh × $0.10 = $50.00', '200 kWh × $0.13 = $26.00'] },
  chargeTypes: ['fixed', 'tiered-energy'],
  ...over,
});

test('every URPX case reads back into the engine as the tariff it was written from', () => {
  for (const [name, c] of Object.entries(URPX_CASES)) {
    const { tariff } = fromUrpx(toUrpx(c.tariff, c.meta, c.opts).document);
    const strip = (t) => ({ ...t, seasons: t.seasons.map(({ name: n, from, tiers, periods }) => ({ name: n, from, ...(tiers ? { tiers } : {}), ...(periods ? { periods: periods.map(({ name: p, rate }) => ({ name: p, rate })) } : {}) })) });
    assert.deepEqual(strip(tariff), strip(c.tariff), name);
  }
});

test('a vector the engine reproduces passes', () => {
  assert.deepEqual(runVector(vector(86)), { id: 'tiered-700-kwh', status: 'pass', expected: 86, computed: 86, difference: 0 });
  assert.deepEqual(gateVectors([vector(86)]), []);
});

test('our own failure: a miss beyond the tolerance blocks the release, until a finding shows the vector is wrong', () => {
  const blocked = gateVectors([vector(86.5)]);
  assert.equal(blocked.length, 1);
  assert.match(blocked[0], /^tiered-700-kwh: our engine gives \$86\.00, the vector expects \$86\.50 \(-0\.50\); fix the engine, or record a finding/);
  assert.deepEqual(gateVectors([vector(86.5)], [{ vector: 'tiered-700-kwh', finding: 'The printed table rounds the tier boundary.', date: '2026-11-16' }]), []);
  // A percentage tolerance is a share of the expected total.
  assert.equal(runVector(vector(86.5, { tolerance: { amount: 1, unit: '%' } })).status, 'pass');
});

test('a tariff the engine cannot read is skipped with the reason, never passed', () => {
  const doc = toUrpx(tiered.tariff, tiered.meta).document;
  const def = JSON.parse(JSON.stringify(doc));
  const walk = (x) => { if (Array.isArray(x)) x.forEach(walk); else if (x && typeof x === 'object') { if (x['@id']?.endsWith('pd-minimum')) x['urpx:chargeType'] = { '@id': 'urpx:powerFactorCharge' }; Object.values(x).forEach(walk); } };
  walk(def);
  const r = runVector(vector(86, { tariff: { format: 'URPX', version: 'v0.5.1', document: def } }));
  assert.equal(r.status, 'skipped');
  assert.match(r.reason, /not read by the bill engine: Minimum Bill: charge type urpx:powerFactorCharge/);
});

test('through the gate: an invalid vector is named, a failing one blocks, and the repository passes', () => {
  const file = (v) => ({ 'data/curated/conformance/vectors/one.json': JSON.stringify(v) });
  assert.match(checkVectors(fixtureRepo(file(vector(86, { provenance: { kind: 'engine' } })))).join('\n'), /one\.json: tiered-700-kwh: its expected bill came from our own engine/);
  assert.match(checkVectors(fixtureRepo(file(vector(90)))).join('\n'), /our engine gives \$86\.00, the vector expects \$90\.00/);
  assert.deepEqual(checkVectors(fixtureRepo(file(vector(86)))), []);
  assert.deepEqual(checkVectors(ROOT), []);
});
