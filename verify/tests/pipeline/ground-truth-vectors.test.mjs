// The first bill test vector release (add-tariff-conformance-suite 2.3): lines classified from the printed
// figures, a schedule the engine cannot read listed with why, the committed files exactly what the ground
// truth gives, every vector valid, every tariff accepted by the URPX shapes, our engine within tolerance on
// each, and a coverage table that names every charge type no vector exercises.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { classifyLine, releaseCoverage, riderType } from '../../../pipeline/lib/ground-truth-vectors.mjs';
import { CHARGE_TYPES, checkVector } from '../../../pipeline/lib/bill-vectors.mjs';
import { runVector } from '../../../pipeline/lib/run-vectors.mjs';
import { buildRelease } from '../../tools/ground-truth-vectors.mjs';
import { ROOT } from '../../../pipeline/run.mjs';

const dir = join(ROOT, 'data/curated/conformance/vectors');
const committed = readdirSync(dir).filter((f) => f.endsWith('.json')).sort().map((f) => JSON.parse(readFileSync(join(dir, f), 'utf8')));
const release = JSON.parse(readFileSync(join(ROOT, 'data/curated/conformance/release.json'), 'utf8'));
const at = (pairs) => pairs.map(([kwh, amount]) => ({ kwh, amount }));

test('a line is per month, per kWh within a cent of its rate, zero, or untestable with why', () => {
  assert.deepEqual(classifyLine('Monthly Service Charge', '15.00', at([[250, 15], [1000, 15]])), { kind: 'monthly', rate: 15 });
  // -0.012404 × 1,250 is -15.505: printed -15.51, so a half cent rounded away from zero still reads per kWh.
  assert.deepEqual(classifyLine('Power Cost Adjustment', '-0.012404', at([[250, -3.10], [1250, -15.51]])), { kind: 'perKwh', rate: -0.012404 });
  assert.deepEqual(classifyLine('Formula Rate Plan', '0.00%', at([[250, 0], [1000, 0]])), { kind: 'zero' });
  assert.match(classifyLine('FRP Rider', '13.00%', at([[250, 0.89]])).why, /percentage of other charges/);
  assert.match(classifyLine('Rate Schedule SRCA', '**', at([[250, 2.79]])).why, /footnote/);
  assert.match(classifyLine('Energy Charge', '0.0823', at([[250, 20.58], [1500, 150]])).why, /not 0.0823 a month or 0.0823 a kWh/);
  assert.equal(riderType('Wholesale Power Charge'), 'urpx:adjustmentPowerCost');
  assert.equal(riderType('Fuel Adjustment Clause'), 'urpx:fuelCharge');
  assert.equal(riderType('Capital Improvement Rider'), 'urpx:tariffRider');
});

test('the committed vectors and release are exactly what the ground truth gives', () => {
  const built = buildRelease(ROOT);
  assert.deepEqual(committed, [...built.vectors].sort((a, b) => a.id.localeCompare(b.id)), 'run node verify/tools/ground-truth-vectors.mjs');
  assert.deepEqual(release, built.release);
});

test('every vector is valid, cites its commission page, and our engine reproduces it within its tolerance', () => {
  assert.ok(committed.length >= 20);
  for (const v of committed) {
    assert.deepEqual(checkVector(v), [], v.id);
    assert.equal(v.provenance.kind, 'commission-publication');
    assert.ok(v.provenance.page && v.provenance.url && v.provenance.sha256, v.id);
    const r = runVector(v);
    assert.equal(r.status, 'pass', `${v.id}: ${JSON.stringify(r)}`);
  }
});

test('every vector\'s tariff is byte for byte a document the URPX shapes accepted', () => {
  const results = JSON.parse(readFileSync(join(ROOT, 'verify/reference/urpx/vector-shacl-results.json'), 'utf8'));
  assert.equal(results.urpx.tag, 'v0.5.1');
  for (const v of committed) {
    const id = v.tariff.document['@graph'][0]['urpx:hasRatePlan']['urpx:ratePlanUniqueIdentifier'];
    const sha = createHash('sha256').update(JSON.stringify(v.tariff.document, null, 2) + '\n').digest('hex');
    assert.equal(results.cases[id]?.conforms, true, `${id} was not validated`);
    assert.equal(results.cases[id].sha256, sha, `${id} changed since it was validated: run verify/tools/urpx-shacl.py on its output again`);
  }
});

test('the coverage table names every charge type with no coverage, and counts the untestable schedules', () => {
  const c = release.coverage;
  assert.deepEqual(Object.keys(c.byChargeType), CHARGE_TYPES, 'every type is listed, zeros included');
  assert.deepEqual(c.uncovered, CHARGE_TYPES.filter((t) => c.byChargeType[t] === 0));
  for (const t of ['ratchet', 'power-factor', 'tou-demand']) assert.ok(c.uncovered.includes(t), t);
  assert.equal(c.vectors, committed.length);
  assert.equal(c.untestable, release.untestable.length);
  for (const u of release.untestable) assert.ok(u.why.length && u.utility && u.schedule, JSON.stringify(u));
  assert.deepEqual(releaseCoverage([]).uncovered, CHARGE_TYPES);
});

test('printed lines that miss the total pass only when the vector says the publisher rounds apart, by half a cent a line', () => {
  const v = structuredClone(committed.find((x) => !x.expected.rounding));
  v.expected.lines[0].amount += 0.01;
  assert.match(checkVector(v).join('\n'), /the expected lines sum to/);
  v.expected.rounding = 'The commission rounds the total from unrounded charges.';
  assert.deepEqual(checkVector(v), []);
  v.expected.lines[0].amount += v.expected.lines.length * 0.005;
  assert.match(checkVector(v).join('\n'), /more than half a cent a line/);
});
