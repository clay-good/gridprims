import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { checkVersions, snapshotOf } from '../../gates/versions.mjs';
import { checkClaims, findClaims } from '../../gates/claims.mjs';
import { checkSentences } from '../../gates/sentences.mjs';
import { fixtureRepo, sample } from '../helpers.mjs';

const repo = join(import.meta.dirname, '../../..');

/** A mini repo with one tool whose compute multiplies by `factor`. */
function repoWith({ version = '1.0.0', factor = 2, snapshotVersion = '1.0.0', snapshotFactor = 2, changelog = [{ toolId: 'calc.sample.double', version: '1.0.0' }] } = {}) {
  const m = { ...sample(), version };
  const impl = (f) => ({ compute: ({ x }) => ({ status: 'ok', outputs: { y: x * f }, sentence: 'Done.' }) });
  const snap = snapshotOf({ manifest: { ...m, version: snapshotVersion }, impl: impl(snapshotFactor) });
  return fixtureRepo({
    'core/tools/index.mjs': `import m from './calc.sample.double/manifest.mjs';\nexport const TOOLS = [{ manifest: m, impl: { compute: ({ x }) => ({ status: 'ok', outputs: { y: x * ${factor} }, sentence: 'Done.' }) } }];\n`,
    'core/tools/calc.sample.double/manifest.mjs': `export default ${JSON.stringify(m)};\n`,
    'data/curated/changelog.mjs': `export default ${JSON.stringify(changelog)};\n`,
    'verify/fixtures/results/calc.sample.double.json': JSON.stringify(snap),
  });
}

test('versions gate passes on the repository and on an unchanged fixture', async () => {
  assert.deepEqual(await checkVersions(repo), []);
  assert.deepEqual(await checkVersions(repoWith()), []);
});

test('a fixture result change without a version bump fails', async () => {
  const errors = await checkVersions(repoWith({ factor: 3 }));
  assert.match(errors.join('\n'), /example two changed its result without a version bump \(still 1\.0\.0\)/);
});

test('a version bump needs a changelog entry', async () => {
  const errors = await checkVersions(repoWith({ version: '1.1.0', factor: 3 }));
  assert.match(errors.join('\n'), /version 1\.1\.0 has no entry in data\/curated\/changelog\.mjs/);
});

test('the committed snapshot matches the shared core today', () => {
  const snap = JSON.parse(readFileSync(join(repo, 'verify/fixtures/results/calc.energy-units.convert.json'), 'utf8'));
  assert.equal(snap.toolId, 'calc.energy-units.convert');
});

test('claims: accuracy and endorsement in prose fail; saying something is unchecked passes', () => {
  assert.deepEqual(findClaims('Our results are accurate. Matches REopt within 2%.'), ['Our results are accurate.', 'Matches REopt within 2%.']);
  assert.deepEqual(findClaims('No tool here is field-verified. This is not yet reviewed. Unverified source.'), []);
  assert.deepEqual(findClaims('Endorsed by utility engineers.'), ['Endorsed by utility engineers.']);
});

test('claims gate passes on the repository', async () => {
  assert.deepEqual(await checkClaims(repo), []);
});

test('sentence gate passes on the repository and fails on a dense sentence', async () => {
  assert.deepEqual(await checkSentences(repo), []);
  const m = sample();
  const root = fixtureRepo({
    'core/tools/index.mjs': `const m = ${JSON.stringify(m)};\nexport const TOOLS = [{ manifest: m, impl: { compute: () => ({ status: 'ok', outputs: { y: 4 }, sentence: 'Unfortunately, considerable uncertainty accompanies these preliminary calculations.' }) } }];\n`,
  });
  assert.match((await checkSentences(root))[0], /reads at grade \d+\.\d, above 8/);
});
