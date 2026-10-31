// The data commands (MCP tasks 4.1, 4.2).

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cpSync, existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { getData } from '../../../pipeline/get-data.mjs';
import { buildData } from '../../../pipeline/build-data.mjs';
import { serve } from '../../lib/static-server.mjs';
import { ROOT } from '../../../pipeline/run.mjs';
import { tempDir } from '../../lib/temp.mjs';

/** A clone with the committed manifests but none of the data files, and a site serving the real files. */
function setup() {
  const clone = tempDir('gridprims-clone-');
  cpSync(join(ROOT, 'data/eia-861'), join(clone, 'eia-861'), { recursive: true });
  const m = JSON.parse(readFileSync(join(clone, 'eia-861/2026-10/manifest.json'), 'utf8'));
  for (const s of m.tables[0].shards) rmSync(join(clone, 'eia-861/2026-10', s.path));
  rmSync(join(clone, 'eia-861/2026-10', m.tables[0].download.path));
  const site = tempDir('gridprims-site-');
  cpSync(join(ROOT, 'data'), join(site, 'data'), { recursive: true });
  return { clone, site, m };
}

test('get-data downloads every file and verifies it against the committed digests', async () => {
  const { clone, site, m } = setup();
  const server = await serve(site);
  try {
    const r = await getData({ origin: server.url, dataDir: clone });
    assert.deepEqual(r.refused, []);
    assert.equal(r.fetched.length, m.tables[0].shards.length + 1);
    const again = await getData({ origin: server.url, dataDir: clone });
    assert.equal(again.fetched.length, 0, 'verified files are not downloaded again');
  } finally {
    await server.close();
  }
});

test('a tampered file is deleted and reported, even when the site also serves a matching tampered digest list', async () => {
  const { clone, site, m } = setup();
  const target = m.tables[0].shards.find((s) => s.state === 'TX');
  writeFileSync(join(site, 'data/eia-861/2026-10', target.path), 'tampered');
  // The site's own manifest is rewritten to match the tampered file; get-data must ignore it.
  const forged = JSON.parse(readFileSync(join(site, 'data/eia-861/2026-10/manifest.json'), 'utf8'));
  forged.tables[0].shards.find((s) => s.state === 'TX').sha256 = 'f'.repeat(64);
  writeFileSync(join(site, 'data/eia-861/2026-10/manifest.json'), JSON.stringify(forged));
  const server = await serve(site);
  try {
    const r = await getData({ origin: server.url, dataDir: clone });
    assert.equal(r.refused.length, 1);
    assert.match(r.refused[0], /eia-861\/2026-10\/sales\/TX\.bin: SHA-256 .* does not match the committed/);
    assert.ok(!existsSync(join(clone, 'eia-861/2026-10', target.path)));
  } finally {
    await server.close();
  }
});

test('build-data reports a dataset it cannot rebuild instead of passing it', async () => {
  const fixture = tempDir('gridprims-bd-');
  const { runRecipe } = await import('../../../pipeline/run.mjs');
  const { eia861Zip, smallTables } = await import('../../fixtures/data/eia-861/workbook.mjs');
  const entry = (await import('../../../pipeline/registry/eia-861.mjs')).default;
  const small = { ...entry, tables: smallTables(entry) };
  const zip = eia861Zip();
  await runRecipe({ dataset: 'eia-861', year: 2025, retrieved: '2026-10-31', input: zip, outDir: fixture, entry: small, vintage: { url: entry.vintages[2025].url, asOf: '2026-10-07', sha256: null } });
  // The registry's real row bounds reject the tiny fixture, so the rebuild fails and is reported.
  // The full match is proven against EIA's real file in docs/decisions-day-one.md §10.
  const r = await buildData({ dataDir: fixture, inputs: { 'eia-861': zip } });
  assert.equal(r[0].id, 'eia-861');
  assert.equal(r[0].ok, false);
});
