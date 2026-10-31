// Rebuild every dataset from its publisher's own file, with no API keys, and
// report any checksum that differs from the committed snapshot (agent/mcp-server,
// "Data commands are separate and verified").
//   node pipeline/build-data.mjs

import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { readdirSync, existsSync } from 'node:fs';
import { ROOT, runRecipe } from './run.mjs';

/** Shard and download checksums of a manifest, keyed by path. */
const sums = (m) => Object.fromEntries(m.tables.flatMap((t) => [...t.shards.map((s) => [s.path, s.sha256]), [t.download.path, t.download.sha256]]));

/**
 * @param {{dataDir?: string, fetch?: typeof fetch, inputs?: Record<string, Uint8Array>}} [o] inputs replaces downloads in tests
 */
export async function buildData(o = {}) {
  const dataDir = o.dataDir ?? join(ROOT, 'data');
  const report = [];
  for (const id of readdirSync(dataDir)) {
    const cur = join(dataDir, id, 'current.json');
    if (!existsSync(cur)) continue;
    const { version } = JSON.parse(readFileSync(cur, 'utf8'));
    const committed = JSON.parse(readFileSync(join(dataDir, id, version, 'manifest.json'), 'utf8'));
    const period = committed.tables[0].dataPeriod;
    const year = /^\d{4}-\d{2}$/.test(period) ? period : Number(period.slice(-4)); // "2025", a month "2026-09", or the last year of "2006-2025"
    const entry = (await import(pathToFileURL(join(ROOT, 'pipeline/registry', `${id}.mjs`)).href)).default;
    const get = async (r) => new Uint8Array(await (await (o.fetch ?? fetch)(r.release ?? r.url)).arrayBuffer());
    // A release of several files (PUDL) is fetched file by file and passed by name.
    const several = committed.raw.some((r) => r.file);
    let input = o.inputs?.[id];
    if (!input) input = several ? Object.fromEntries(await Promise.all(committed.raw.map(async (r) => [r.file, await get(r)]))) : await get(committed.raw[0]);
    const vintage = several
      ? { release: committed.release, asOf: committed.asOf, files: Object.fromEntries(committed.raw.map((r) => [r.file, { url: r.url, sha256: null }])) }
      : { url: committed.raw[0].url, asOf: committed.asOf, sha256: null };
    const out = mkdtempSync(join(tmpdir(), 'gridprims-rebuild-'));
    const r = await runRecipe({ dataset: id, year, input, retrieved: committed.retrieved, outDir: out, joinDir: dataDir, entry, vintage });
    if (!r.ok) { report.push({ id, ok: false, failures: r.failures }); continue; }
    const want = sums(committed);
    const got = sums(r.manifest);
    const differs = [...new Set([...Object.keys(want), ...Object.keys(got)])].filter((p) => want[p] !== got[p]);
    if (JSON.stringify(r.manifest.tables.map((t) => t.dataPeriod)) !== JSON.stringify(committed.tables.map((t) => t.dataPeriod))) differs.push('manifest data period');
    report.push({ id, ok: differs.length === 0, differs, rawSha256: r.manifest.raw[0].sha256, committedRawSha256: committed.raw[0].sha256 });
  }
  return report;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  for (const r of await buildData()) {
    if (r.failures) console.error(`FAIL ${r.id}: ${r.failures.join('; ')}`);
    else if (r.ok) console.log(`ok   ${r.id}: rebuilt from the publisher's file; every checksum matches`);
    else console.log(`diff ${r.id}: ${r.differs.length} files differ (${r.differs.slice(0, 5).join(', ')})${r.rawSha256 !== r.committedRawSha256 ? '; the publisher\'s file itself changed' : ''}`);
    if (!r.ok) process.exitCode = 1;
  }
}
