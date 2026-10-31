// Release integrity (foundation task 5.5).

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { build } from '../../../site/build.mjs';
import { mcpFiles, release } from '../../../pipeline/release.mjs';
import { readZipDirectory } from '../../../parsers/xlsx.mjs';
import { tempDir } from '../../lib/temp.mjs';

const tmp = () => tempDir('gridprims-rel-');
const CREATED = '2026-10-31T12:00:00Z';

test('a rebuild of the same commit reproduces every digest, the MCP archive, and the SBOM byte for byte', async () => {
  const [d1, d2, o1, o2] = [tmp(), tmp(), tmp(), tmp()];
  await build({ outDir: d1 });
  await build({ outDir: d2 });
  release({ tag: 'v0.0.0-test', dist: d1, outDir: o1, created: CREATED });
  release({ tag: 'v0.0.0-test', dist: d2, outDir: o2, created: CREATED });
  for (const f of ['SHA256SUMS', 'sbom.spdx.json', 'gridprims-mcp-v0.0.0-test.zip']) assert.deepEqual(readFileSync(join(o1, f)), readFileSync(join(o2, f)), f);
});

test('the digest list covers every deployed file and the archive, and each digest is right', async () => {
  const [d, o] = [tmp(), tmp()];
  await build({ outDir: d });
  release({ tag: 'v0.0.0-test', dist: d, outDir: o, created: CREATED });
  const lines = readFileSync(join(o, 'SHA256SUMS'), 'utf8').trim().split('\n');
  for (const line of lines) {
    const [sum, name] = line.split('  ');
    const path = name.endsWith('.zip') ? join(o, name) : join(d, name);
    assert.equal(createHash('sha256').update(readFileSync(path)).digest('hex'), sum, name);
  }
  assert.ok(lines.some((l) => l.endsWith('index.html')) && lines.some((l) => l.endsWith('.zip')));
});

test('the SBOM lists zero third-party packages and every reference artifact, dated by the commit', async () => {
  const [d, o] = [tmp(), tmp()];
  await build({ outDir: d });
  const r = release({ tag: 'v0.0.0-test', dist: d, outDir: o, created: CREATED });
  assert.equal(r.thirdPartyPackages, 0);
  const sbom = JSON.parse(readFileSync(join(o, 'sbom.spdx.json'), 'utf8'));
  assert.equal(sbom.creationInfo.created, CREATED);
  assert.deepEqual(sbom.packages.map((p) => p.name), ['gridprims']);
  assert.ok(sbom.files.some((f) => f.fileName === 'verify/reference/nist-sp811-b8-energy.json'));
});

test('the MCP archive holds the server, core, parsers, and data, and runs without the rest of the repository', () => {
  const files = mcpFiles();
  for (const must of ['mcp/server.mjs', 'core/contract/run.mjs', 'parsers/xlsx.mjs', 'data/eia-861/current.json', 'package.json', 'LICENSE']) assert.ok(files.includes(must), must);
  assert.ok(!files.some((f) => f.startsWith('verify/') || f.startsWith('site/') || f.startsWith('data/health/')));
  const o = tmp();
  release({ tag: 'v0.0.0-test', dist: tmp(), outDir: o, created: CREATED });
  const names = readZipDirectory(new Uint8Array(readFileSync(join(o, 'gridprims-mcp-v0.0.0-test.zip')))).map((e) => e.name);
  assert.ok(names.includes('gridprims-v0.0.0-test/mcp/server.mjs'));
});
