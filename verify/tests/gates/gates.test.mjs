import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { checkDependencies } from '../../gates/dependency.mjs';
import { checkPlatformApis } from '../../gates/platform-apis.mjs';
import { checkOwnImplementations } from '../../gates/own-implementations.mjs';
import { checkFileCount, FILE_LIMIT } from '../../gates/file-count.mjs';
import { checkManifests } from '../../gates/manifests.mjs';
import { fixtureRepo, sample } from '../helpers.mjs';

const repo = join(dirname(fileURLToPath(import.meta.url)), '../../..');
const clean = { 'package.json': '{"name":"x","type":"module"}', 'core/a.mjs': "import { x } from './b.mjs';\n" };

test('every gate passes on the repository itself', async () => {
  assert.deepEqual(checkDependencies(repo), []);
  assert.deepEqual(checkPlatformApis(repo), []);
  assert.deepEqual(checkOwnImplementations(repo), []);
  assert.deepEqual(await checkManifests(repo), []);
});

test('dependency gate: passes a clean fixture', () => {
  assert.deepEqual(checkDependencies(fixtureRepo(clean)), []);
});

test('dependency gate: fails when a package is added', () => {
  const root = fixtureRepo({ ...clean, 'package.json': '{"name":"x","devDependencies":{"left-pad":"1.3.0"}}' });
  assert.match(checkDependencies(root).join('\n'), /declares devDependencies \(left-pad\)/);
});

test('dependency gate: fails on node_modules, a lockfile, or a package import', () => {
  const root = fixtureRepo({
    ...clean,
    'node_modules/': '',
    'package-lock.json': '{}',
    // Split so this test file does not itself contain a dynamic import of "fs".
    'core/c.mjs': "import Papa from 'papaparse';\nconst fs = await imp" + "ort('fs');\n",
  });
  const errors = checkDependencies(root).join('\n');
  assert.match(errors, /node_modules directory/);
  assert.match(errors, /lockfile/);
  assert.match(errors, /imports "papaparse"/);
  assert.match(errors, /imports "fs"/);
});

test('dependency gate: a font needs a license record with a matching checksum', () => {
  const font = Buffer.from('not really a font');
  const sha = createHash('sha256').update(font).digest('hex');
  const unlisted = fixtureRepo({ ...clean, 'site/fonts/overpass.woff2': font });
  assert.match(checkDependencies(unlisted).join('\n'), /overpass\.woff2: third-party file is not listed/);

  const row = (hash) => `| Path | Source | License | Version | SHA-256 |\n|---|---|---|---|---|\n| \`site/fonts/overpass.woff2\` | RedHatOfficial/Overpass | OFL-1.1 | 4.0 | ${hash} |\n`;
  const listed = fixtureRepo({ ...clean, 'site/fonts/overpass.woff2': font, 'docs/reference-artifacts.md': row(sha) });
  assert.deepEqual(checkDependencies(listed), []);
  const tampered = fixtureRepo({ ...clean, 'site/fonts/overpass.woff2': font, 'docs/reference-artifacts.md': row('0'.repeat(64)) });
  assert.match(checkDependencies(tampered).join('\n'), /SHA-256 is/);
});

test('platform-API gate: fails on an experimental or unlisted Node API', () => {
  const doc = '| API | Introduced | Stability |\n|---|---|---|\n| `node:fs` | 0.x | Stable |\n| `node:sqlite` | 22.5 | Release candidate |\n';
  const root = fixtureRepo({
    'docs/platform-apis.md': doc,
    'core/ok.mjs': "import { readFileSync } from 'node:fs';\n",
    'core/db.mjs': "import { DatabaseSync } from 'node:sqlite';\n",
    'core/net.mjs': "import net from 'node:net';\n",
  });
  const errors = checkPlatformApis(root).join('\n');
  assert.match(errors, /core\/db\.mjs: uses node:sqlite, which docs\/platform-apis\.md marks "Release candidate"/);
  assert.match(errors, /core\/net\.mjs: uses node:net, which docs\/platform-apis\.md does not list/);
  assert.doesNotMatch(errors, /ok\.mjs/);
});

test('own-implementations gate: fails on an unlisted general-purpose module', () => {
  const root = fixtureRepo({
    'docs/own-implementations.md': '| `parsers/csv.mjs` | CSV libraries | x | y |\n',
    'parsers/csv.mjs': '',
    'parsers/xml.mjs': '',
    'core/tools/x/tool.mjs': '',
  });
  assert.deepEqual(checkOwnImplementations(root), ['parsers/xml.mjs: general-purpose module has no entry in docs/own-implementations.md']);
});

test('file-count gate: fails on a fixture build over the limit', () => {
  const files = Object.fromEntries(Array.from({ length: 12 }, (_, i) => [`dist/p${i}.html`, '']));
  const root = fixtureRepo(files);
  assert.deepEqual(checkFileCount(join(root, 'dist'), { limit: 12 }), []);
  assert.match(checkFileCount(join(root, 'dist'), { limit: 11 })[0], /12 deployable files, over the limit of 11/);
  assert.equal(FILE_LIMIT, 80_000);
});

test('manifests gate: fails on an unregistered tool folder and on a drifted example', async () => {
  const contract = (p) => `export * from '${join(repo, 'core/contract', p).replaceAll('\\', '/')}';\n`;
  const root = fixtureRepo({
    'core/contract/manifest.mjs': contract('manifest.mjs'),
    'core/tools/calc.sample.double/manifest.mjs': `export default ${JSON.stringify(sample())};\n`,
    'core/tools/calc.sample.double/tool.mjs': 'export const compute = ({ x }) => ({ status: "ok", outputs: { y: x * 2.01 }, sentence: "" });\n',
    'core/tools/calc.sample.orphan/manifest.mjs': 'export default {};\n',
    'core/tools/index.mjs': "import m from './calc.sample.double/manifest.mjs';\nimport * as impl from './calc.sample.double/tool.mjs';\nexport const TOOLS = [{ manifest: m, impl }];\n",
  });
  const errors = (await checkManifests(root)).join('\n');
  assert.match(errors, /calc\.sample\.orphan: folder is not registered/);
  assert.match(errors, /calc\.sample\.double example two: y expected 4, got 4\.02, tolerance ±0/);
});

test('npm test covers every test folder, so a new one is never silently skipped', async () => {
  const { readdirSync, readFileSync } = await import('node:fs');
  const script = JSON.parse(readFileSync(join(repo, 'package.json'), 'utf8')).scripts.test;
  for (const d of readdirSync(join(repo, 'verify/tests'), { withFileTypes: true }).filter((x) => x.isDirectory())) {
    assert.ok(new RegExp(`[{,/]${d.name}[,}/]`).test(script), `verify/tests/${d.name} is not in the npm test script`);
  }
});
