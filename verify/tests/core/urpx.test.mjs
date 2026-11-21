// Our tariffs as URPX (add-tariff-conformance-suite 2.1): each case's bytes match a document pySHACL found
// conforming to the URPX v0.5.1 shapes (verify/tools/urpx-shacl.py), so changing the emitter fails here until
// the new output is validated again; and the structure says what the tariff says.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { chargeTypesOf, fromUrpx, toUrpx, URPX_CONTEXT } from '../../../core/lib/urpx.mjs';
import { checkVector } from '../../../pipeline/lib/bill-vectors.mjs';
import { URPX_CASES } from '../../fixtures/urpx/cases.mjs';
import { caseBytes } from '../../tools/urpx-emit.mjs';
import { ROOT } from '../../../pipeline/run.mjs';

const results = JSON.parse(readFileSync(`${ROOT}/verify/reference/urpx/shacl-results.json`, 'utf8'));
const sha = (s) => createHash('sha256').update(s).digest('hex');
const nodes = (doc, type) => { const out = []; const walk = (x) => { if (Array.isArray(x)) x.forEach(walk); else if (x && typeof x === 'object') { if (x['@type'] === type) out.push(x); Object.values(x).forEach(walk); } }; walk(doc); return out; };

test('every case is byte-identical to a document the URPX shapes accepted', () => {
  assert.equal(results.urpx.tag, 'v0.5.1');
  assert.deepEqual(Object.keys(results.cases).sort(), Object.keys(URPX_CASES).sort());
  for (const [name, c] of Object.entries(URPX_CASES)) {
    assert.equal(results.cases[name].conforms, true, `${name} did not conform`);
    assert.equal(sha(caseBytes(c)), results.cases[name].sha256, `${name} changed since it was validated: run verify/tools/urpx-shacl.py again`);
  }
});

test('seasons, tiers, and prices say what the tariff says', () => {
  const { document } = toUrpx(URPX_CASES.seasonal.tariff, URPX_CASES.seasonal.meta);
  assert.equal(document['@context'][0], URPX_CONTEXT);
  const seasons = nodes(document, 'urpx:Season');
  assert.deepEqual(seasons.map((s) => s['urpx:month']), [['--06', '--07', '--08', '--09'], ['--10', '--11', '--12', '--01', '--02', '--03', '--04', '--05']]);
  const brackets = nodes(document, 'urpx:ServiceBracket').map((b) => [b['urpx:lowerBound'], b['urpx:upperBound'] ?? 'open']);
  assert.deepEqual(brackets, [['0', '600'], ['0', '800'], ['600', 'open'], ['800', 'open']]);
  const prices = nodes(document, 'urpx:Price').map((p) => [p['urpx:name'], p['urpx:unitPrice']]);
  assert.deepEqual(prices, [['Customer Charge', '0.5'], ['Energy, June to September, tier 1', '0.12'], ['Energy, June to September, tier 2', '0.15'], ['Energy, October to May, tier 1', '0.1'], ['Energy, October to May, tier 2', '0.11']]);
  assert.equal(nodes(document, 'urpx:Ledger').find((l) => l['@id'].endsWith('ledger-service'))['urpx:hasCalculationMethod']['urpx:intervalDuration'], 'P1D');
  // Completeness is not claimed for a record that leaves riders and taxes out.
  assert.equal(nodes(document, 'urpx:CoverageClaim')[0]['urpx:completenessResult']['@id'], 'urpx:unknown');
});

test('time-of-use without its hour schedules, and daily allowances, are refused, not written partly', () => {
  assert.match(toUrpx({ seasons: [{ name: 'all year', periods: [{ name: 'period 1', rate: 0.2 }] }] }, URPX_CASES.flat.meta).error, /time-of-use periods need the weekday and weekend hour schedules/);
  assert.match(toUrpx({ seasons: [{ name: 'all year', tiers: [{ rate: 0.1, upToDaily: 10 }, { rate: 0.2 }] }] }, URPX_CASES.flat.meta).error, /daily tier allowances/);
});

test('time-of-use: the hours of each period become time brackets, weekdays and weekends apart when they differ', () => {
  const { document } = toUrpx(URPX_CASES.tou.tariff, URPX_CASES.tou.meta, URPX_CASES.tou.opts);
  const tiers = nodes(document, 'urpx:TOUTier').map((x) => [x['urpx:tierSourceName'], x['urpx:hasTOUPeriod'].map((p) => p['urpx:name'])]);
  assert.deepEqual(tiers, [['Period 1', ['June to September, period 1', 'October to May, period 1']], ['Period 2', ['June to September, period 2']], ['Period 3', ['October to May, period 3']]]);
  const brackets = (name) => nodes(document, 'urpx:TOUPeriod').find((p) => p['urpx:name'] === name)['urpx:hasTimeBracket'].map((b) => `${b['urpx:dayType']['@id'].slice(5)} ${b['urpx:startTime']}-${b['urpx:endTime']}`);
  assert.deepEqual(brackets('June to September, period 2'), ['weekdayDays 14:00:00-20:00:00']);
  assert.deepEqual(brackets('June to September, period 1'), ['weekdayDays 00:00:00-14:00:00', 'weekdayDays 20:00:00-00:00:00', 'weekendDays 00:00:00-00:00:00']);
  const prices = nodes(document, 'urpx:Price').filter((p) => p['urpx:name'].startsWith('Energy')).map((p) => [p['urpx:name'], p['urpx:unitPrice']]);
  assert.deepEqual(prices, [['Energy, June to September, period 1', '0.09'], ['Energy, June to September, period 2', '0.25'], ['Energy, October to May, period 1', '0.08'], ['Energy, October to May, period 3', '0.18']]);
  assert.deepEqual(chargeTypesOf(URPX_CASES.tou.tariff), ['fixed', 'tou-energy', 'seasonal-energy']);
});

test('charge types follow the tariff, and a vector built on an emitted tariff passes the vector check', () => {
  assert.deepEqual(chargeTypesOf(URPX_CASES.flat.tariff), ['fixed', 'flat-energy']);
  assert.deepEqual(chargeTypesOf(URPX_CASES.riders.tariff), ['fixed', 'rider', 'flat-energy']);
  assert.deepEqual(chargeTypesOf(URPX_CASES.tiered.tariff), ['fixed', 'tiered-energy', 'minimum-bill']);
  assert.deepEqual(chargeTypesOf(URPX_CASES.seasonal.tariff), ['fixed', 'tiered-energy', 'seasonal-energy']);
  const vector = {
    id: 'tiered-700-kwh', tariff: { format: 'URPX', version: 'v0.5.1', document: toUrpx(URPX_CASES.tiered.tariff, URPX_CASES.tiered.meta).document },
    load: { kind: 'monthly', periods: [{ start: '2026-01-01', end: '2026-01-31', kwh: 700 }] },
    // Hand arithmetic from the tariff: $10 + 500 × $0.10 + 200 × $0.13.
    expected: { total: { amount: 86, unit: 'USD' }, lines: [{ label: 'Customer charge', type: 'fixed', amount: 10, unit: 'USD' }, { label: 'Energy', type: 'tiered-energy', amount: 76, unit: 'USD' }] },
    tolerance: { amount: 0.01, unit: 'USD' },
    provenance: { kind: 'tariff-arithmetic', tariffSheet: 'Example Electric residential tiered, effective 2026-01-01 (a test tariff)', arithmetic: ['$10.00 customer charge', '500 kWh × $0.10 = $50.00', '200 kWh × $0.13 = $26.00'] },
    chargeTypes: ['fixed', 'tiered-energy'],
  };
  assert.deepEqual(checkVector(vector), []);
});

test('riders are written in the adjustment category with their charge type, and read back as the engine\'s charges', () => {
  const { document } = toUrpx(URPX_CASES.riders.tariff, URPX_CASES.riders.meta);
  const riders = nodes(document, 'urpx:PriceDefinition').filter((d) => d['urpx:chargeCategory']['@id'] === 'urpx:adjustment');
  assert.deepEqual(riders.map((d) => [d['urpx:name'], d['urpx:chargeType']['@id'], d['urpx:referencesLedger']['@id'].split('-').at(-1)]),
    [['Power Cost Adjustment', 'urpx:adjustmentPowerCost', 'energy'], ['Fuel Adjustment Clause', 'urpx:fuelCharge', 'energy'], ['Emergency Reserve Fund Rider', 'urpx:tariffRider', 'service']]);
  assert.deepEqual(fromUrpx(document).tariff.charges, URPX_CASES.riders.tariff.charges.map((c) => (c.urpxType === 'urpx:tariffRider' ? (({ urpxType, ...x }) => x)(c) : c)));
  assert.match(nodes(document, 'urpx:Evaluation')[0]['urpx:description'], /the riders the record names/);
});
