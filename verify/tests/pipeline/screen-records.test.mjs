// The jurisdiction screen record (add-interconnection-screens 1.1): every field cited, with the vintage read;
// a record missing a citation or a vintage fails, on its own and through the curated gate.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { checkScreenRecord } from '../../../pipeline/lib/screen-records.mjs';
import { checkCurated } from '../../gates/curated.mjs';
import { fixtureRepo } from '../helpers.mjs';

const text = 'Section 2.2.1.2: aggregate generation on the line section shall not exceed 15% of the line section annual peak load.';
const sha = createHash('sha256').update(text).digest('hex');
const src = { type: 'tariff', publisher: 'FERC', url: 'https://example.gov/sgip.pdf', retrieved: '2026-11-16', capture: 'data/curated/captures/sgip.txt', sha256: sha, locator: 'SGIP § 2.2.1.2', vintage: 'pro forma SGIP as revised by Order No. 792, effective 2014-02-03' };
const field = (value, over = {}) => ({ value, disputable: false, sources: [{ ...src, ...over }] });
const record = (over = {}, fields = {}) => ({
  id: 'federal-fast-track-2.2.1.2', kind: 'interconnect-screen', jurisdiction: 'federal', lastChecked: '2026-11-16',
  contributor: { name: 'gridprims', conflict: 'none' },
  fields: { process: field('Fast Track'), screen: field('2.2.1.2 Generation on the line section'), threshold: field('at most 15% of the line section annual peak load'), testBasis: field('line section annual peak load, as last measured at the substation'), whoAnswers: field('utility'), ...fields },
  ...over,
});

test('a complete record has no problems', () => {
  assert.deepEqual(checkScreenRecord(record()), []);
});

test('a field with no citation, or a citation with no locator or vintage, fails', () => {
  assert.match(checkScreenRecord(record({}, { threshold: { value: '15%', sources: [] } })).join('\n'), /threshold: has no citation/);
  assert.match(checkScreenRecord(record({}, { threshold: field('15%', { locator: '' }) })).join('\n'), /threshold: the citation needs a locator/);
  assert.match(checkScreenRecord(record({}, { testBasis: field('peak load', { vintage: undefined }) })).join('\n'), /testBasis: the citation needs the vintage read/);
});

test('missing fields, an unknown who-answers, a bad jurisdiction, and no last-checked date each fail', () => {
  const { testBasis, ...noBasis } = record().fields;
  assert.match(checkScreenRecord({ ...record(), fields: noBasis }).join('\n'), /testBasis: missing/);
  assert.match(checkScreenRecord(record({}, { whoAnswers: field('anyone') })).join('\n'), /whoAnswers: must be one of you, utility, utility-model/);
  assert.match(checkScreenRecord(record({ jurisdiction: 'California' })).join('\n'), /jurisdiction must be "federal" or a two-letter state code/);
  assert.match(checkScreenRecord(record({ lastChecked: 'last week' })).join('\n'), /lastChecked must be/);
});

test('through the gate: the complete record passes, and one missing a vintage is named', async () => {
  const body = (r) => `export default ${JSON.stringify(r)};\n`;
  const good = fixtureRepo({ 'data/curated/captures/sgip.txt': text, 'data/curated/interconnect/federal/fast-track-2.2.1.2.mjs': body(record()) });
  assert.deepEqual(await checkCurated(good), []);
  const bad = fixtureRepo({ 'data/curated/captures/sgip.txt': text, 'data/curated/interconnect/federal/fast-track-2.2.1.2.mjs': body(record({}, { threshold: field('15%', { vintage: '' }) })) });
  assert.match((await checkCurated(bad)).join('\n'), /data\/curated\/interconnect\/federal\/fast-track-2\.2\.1\.2\.mjs: federal-fast-track-2\.2\.1\.2\.threshold: the citation needs the vintage read/);
});
