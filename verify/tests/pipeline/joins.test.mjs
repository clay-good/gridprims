// Cross-source joins (public grid data task 1.4): joined on ids, never on a
// name alone, with every unmatched key reported.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT } from '../../../pipeline/run.mjs';
import { COUNTY_SUCCESSORS, JOINS, countyKey, joinReport, nameAlone } from '../../../pipeline/joins.mjs';

test('no join matches by name alone: each keys on an id, and a name only narrows one', () => {
  for (const j of JOINS) assert.equal(nameAlone(j), false, j.id);
  for (const j of JOINS) for (const [i, kind] of j.kinds.entries()) if (kind === 'name') assert.ok(j.kinds.slice(0, i).includes('id'), `${j.id}: a name key follows an id key`);
  assert.equal(nameAlone({ kinds: ['name'], left: { keys: ['utility_name'] }, right: { keys: ['utility_name'] } }), true);
});

test('county names compare without accents, case, punctuation, or "County", but keep "City"', () => {
  assert.equal(countyKey('Doña Ana County'), countyKey('Dona Ana'));
  assert.equal(countyKey('St. Louis city'), countyKey('St Louis City'));
  assert.notEqual(countyKey('Baltimore County'), countyKey('Baltimore city'));
  assert.equal(countyKey("Prince George's County"), countyKey('Prince Georges'));
  assert.equal(countyKey('Matanuska-Susitna Borough'), countyKey('Matanuska Susitna'));
});

test('the committed report is current with the committed data', () => {
  assert.equal(readFileSync(join(ROOT, 'data/joins/report.json'), 'utf8'), JSON.stringify(joinReport(join(ROOT, 'data')), null, 1) + '\n', 'run node pipeline/joins.mjs');
});

test('the report names what did not match, on both sides, with the versions it read', () => {
  const r = JSON.parse(readFileSync(join(ROOT, 'data/joins/report.json'), 'utf8'));
  assert.deepEqual(r.joins.map((j) => j.id), JOINS.map((j) => j.id));
  for (const j of r.joins) {
    assert.match(j.left.version, /^\d{4}-\d{2}$/);
    assert.equal(j.matched + j.left.unmatched, j.left.keys, j.id);
    assert.ok(j.left.sample.length === Math.min(20, j.left.unmatched) && j.right.sample.length === Math.min(20, j.right.unmatched), j.id);
  }
  const counties = r.joins.find((j) => j.id === 'counties-eia861-census');
  assert.deepEqual(counties.left.sample, [{ key: 'AK|Not Applicable', name: 'City of Elfin Cove - (AK)' }], 'every named county matches, renamed Alaska areas and Bedford City included');
  const gens = r.joins.find((j) => j.id === 'generators-eia860-eia860m');
  assert.ok(gens.matched / gens.left.keys > 0.999, 'nearly every operable generator has a monthly status');
});

test('county successors point at counties the Census file has', () => {
  const z = JSON.parse(readFileSync(join(ROOT, 'data/joins/report.json'), 'utf8')).joins.find((j) => j.id === 'counties-eia861-census');
  assert.ok(z);
  for (const [k, fips] of Object.entries(COUNTY_SUCCESSORS)) for (const f of fips) assert.match(f, new RegExp(`^${{ AK: '02', VA: '51' }[k.slice(0, 2)]}\\d{3}$`), k);
});
