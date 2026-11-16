// The bill test vector format and its provenance rules (add-tariff-conformance-suite 2.1 and 2.2):
// scenarios "Vector fields present", "Charge types declared", "Accepted sources",
// "Self-generated expected value refused", and "User-supplied bill figure".

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CHARGE_TYPES, checkVector } from '../../../pipeline/lib/bill-vectors.mjs';

const URPX = { '@context': ['https://urpx.org/ns/context/releases/v0.5.1/jsonld/urpx-context.jsonld'], '@graph': [{ '@type': 'urpx:RatePlan', '@id': 'ex:residential' }] };
const vector = (over = {}) => ({
  id: 'example-500-kwh',
  tariff: { format: 'URPX', version: 'v0.5.1', document: URPX },
  load: { kind: 'monthly', periods: [{ start: '2026-01-01', end: '2026-01-31', kwh: 500 }] },
  expected: { total: { amount: 67.5, unit: 'USD' }, lines: [{ label: 'Customer charge', type: 'fixed', amount: 10, unit: 'USD' }, { label: 'Energy, two tiers', type: 'tiered-energy', amount: 57.5, unit: 'USD' }] },
  tolerance: { amount: 0.01, unit: 'USD' },
  provenance: { kind: 'commission-publication', document: 'Comparative rate report', date: '2026-03-01', page: 12, utility: 'Example Electric', consumptionLevel: '500 kWh' },
  chargeTypes: ['fixed', 'tiered-energy'],
  ...over,
});
const problems = (over) => checkVector(vector(over)).join('\n');

test('a complete vector has no problems', () => {
  assert.deepEqual(checkVector(vector()), []);
});

test('vector fields present: missing a tolerance, a provenance record, or the charge-type list fails', () => {
  assert.match(problems({ tolerance: undefined }), /a tolerance needs an amount and its unit/);
  assert.match(problems({ provenance: undefined }), /needs a provenance record/);
  assert.match(problems({ chargeTypes: undefined }), /must declare the charge types it exercises/);
  assert.match(problems({ tariff: { format: 'URPX', document: URPX } }), /must record its URPX version/);
  assert.match(problems({ tariff: { format: 'URDB', version: 'v0.5.1', document: {} } }), /must be in URPX[\s\S]*URPX JSON-LD/);
  assert.match(problems({ load: { kind: 'monthly', periods: [{ start: 'January', end: '2026-01-31', kwh: 500 }] } }), /start and end dates/);
  assert.match(problems({ expected: { total: { amount: 70, unit: 'USD' }, lines: vector().expected.lines } }), /sum to \$67\.50, not the expected total of \$70\.00/);
  assert.match(problems({ expected: { total: { amount: 67.5 }, lines: vector().expected.lines } }), /expected total needs an amount and its unit/);
});

test('charge types declared: a fixed charge and tiered energy declare those two and no others', () => {
  assert.match(problems({ chargeTypes: ['fixed', 'tiered-energy', 'flat-demand'] }), /declares flat-demand, but no expected line exercises it/);
  assert.match(problems({ chargeTypes: ['fixed'] }), /exercises tiered-energy, which the vector does not declare/);
  assert.match(problems({ chargeTypes: ['fixed', 'tiered-energy', 'demand'] }), /"demand" is not a charge type the suite counts/);
  assert.equal(CHARGE_TYPES.length, 10);
});

test('accepted sources: each of the four kinds passes with its citation, and is named when a field is missing', () => {
  const ok = [
    { kind: 'utility-typical-bill', document: 'Typical bills', date: '2026-01-01', utility: 'Example Electric', url: 'https://example.com/bills' },
    { kind: 'user-bill', period: '2026-01-01 to 2026-01-31', entered: '2026-02-05' },
    { kind: 'tariff-arithmetic', tariffSheet: 'Sheet 7, effective 2026-01-01', arithmetic: ['$10.00 customer charge', '500 kWh × $0.115 = $57.50'] },
  ];
  for (const provenance of ok) assert.deepEqual(checkVector(vector({ provenance })), [], provenance.kind);
  assert.match(problems({ provenance: { kind: 'commission-publication', document: 'Report', date: '2026-03-01', utility: 'Example Electric', consumptionLevel: '500 kWh' } }), /commission-publication provenance needs page/);
  assert.match(problems({ provenance: { kind: 'forum-post' } }), /"forum-post" is not one of/);
});

test('self-generated expected value refused, with the reason', () => {
  for (const provenance of [{ kind: 'engine' }, { kind: 'tariff-arithmetic', tariffSheet: 'Sheet 7', arithmetic: ['x'], producedBy: 'gridprims bill engine 0.4' }]) {
    assert.match(problems({ provenance }), /came from our own engine; a vector must have independent provenance/);
  }
});

test('user-supplied bill figure: amounts, tariff, and period only, with no account, address, meter id, or document', () => {
  const bill = { kind: 'user-bill', period: '2026-01-01 to 2026-01-31', entered: '2026-02-05' };
  assert.deepEqual(checkVector(vector({ provenance: bill })), []);
  assert.match(problems({ provenance: { ...bill, document: 'my-bill.pdf' } }), /never the bill document/);
  assert.match(problems({ provenance: { ...bill, accountNumber: '' } }), /no account number, meter identifier, or address/);
  assert.match(problems({ provenance: { ...bill, note: 'Account number 12345678' } }), /looks like an account number/);
  assert.match(problems({ provenance: { ...bill, note: 'ESIID 10443720000000000' } }), /17-digit meter identifier/);
  assert.match(problems({ provenance: { ...bill, note: 'Service at 12 Elm Street' } }), /street address/);
});
