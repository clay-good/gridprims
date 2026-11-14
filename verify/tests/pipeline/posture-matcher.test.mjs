// The license matcher beside the hand-set postures (establish-platform-foundation
// task 2.5): every registry entry's hand posture is set by a person, the
// matcher reads the recorded terms on its own, and they must agree before the
// matcher's reading is trusted. Where a federal agency names no license, the
// matcher reads the agency's host, not our hand setting.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { ROOT } from '../../../pipeline/run.mjs';
import { FEDERAL_HOSTS, matchPosture, postureOf } from '../../../pipeline/lib/registry.mjs';

const entries = await Promise.all(readdirSync(join(ROOT, 'pipeline/registry')).filter((f) => f.endsWith('.mjs')).map(async (f) => (await import(pathToFileURL(join(ROOT, 'pipeline/registry', f)).href)).default));

test('the matcher agrees with every hand-set posture in the registry', () => {
  const handSet = entries.filter((e) => e.posture);
  assert.ok(handSet.length >= 15, `${handSet.length} hand-set entries`);
  const disagree = handSet.map((e) => ({ id: e.id, ...postureOf(e) })).filter((p) => !p.agrees).map((p) => `${p.id}: hand ${p.posture}, matcher ${p.advisory.posture} (${p.advisory.reason})`);
  assert.deepEqual(disagree, []);
});

test('a federal agency\'s page that names no license reads as public domain, from its host alone', () => {
  const r = matchPosture({ url: 'https://www.census.gov/about/policies/citation.html', text: 'Cite the Census Bureau as the source.', factual: true });
  assert.equal(r.posture, 'mirror');
  assert.equal(r.license, 'us-federal-public-domain');
  assert.match(r.reason, /17 U\.S\.C\. 105/);
  assert.ok(FEDERAL_HOSTS.includes('noaa.gov'));
});

test('a state site, a contractor-run laboratory, or restrictive words on a federal page do not', () => {
  const quiet = 'Please cite this source.';
  assert.equal(matchPosture({ url: 'https://www.puc.texas.gov/terms', text: quiet, factual: true }).posture, 'derive');
  assert.equal(matchPosture({ url: 'https://www.nlr.gov/terms', text: quiet, factual: true }).posture, 'derive');
  assert.equal(matchPosture({ url: 'https://example.census.gov.evil.com/terms', text: quiet, factual: true }).posture, 'derive');
  assert.equal(matchPosture({ url: 'https://www.eia.gov/x', text: 'For personal use only.', factual: true }).posture, 'derive');
});
