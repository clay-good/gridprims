// The release watch (platform/data-operations, "Publisher release watch and
// refresh in one run"): look for a new data year or a revised file, refresh in
// the same run when one appears, and record the check either way.
//   node pipeline/check.mjs eia-861 [--out data]

import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { parseArgs } from 'node:util';
import { ROOT, runRecipe } from './run.mjs';
import { compareTerms, postureInForce } from './lib/terms.mjs';

/** The release a HEAD request describes, or null when the URL has nothing. */
async function head(url, f) {
  const res = await f(url, { method: 'HEAD', redirect: 'follow' });
  if (!res.ok) return null;
  return { url, bytes: Number(res.headers.get('content-length') ?? 0), lastModified: res.headers.get('last-modified') ?? null };
}
const asOfOf = (lastModified, fallback) => (lastModified ? new Date(lastModified).toISOString().slice(0, 10) : fallback);

/**
 * @param {{dataset: string, entry?: any, outDir?: string, fetch?: typeof fetch, today?: string}} o
 * @returns {Promise<{id: string, checked: boolean, refreshed: boolean, version?: string, posture?: string, terms?: object, failure?: string, found?: string, raw?: {name: string, bytes: Uint8Array, version: string}}>}
 */
export async function checkDataset({ dataset, entry: given, outDir = join(ROOT, 'data'), fetch: f = fetch, today = new Date().toISOString().slice(0, 10) }) {
  const entry = given ?? (await import(pathToFileURL(join(ROOT, 'pipeline/registry', `${dataset}.mjs`)).href)).default;
  const cur = join(outDir, dataset, 'current.json');
  const manifest = existsSync(cur) ? JSON.parse(readFileSync(join(outDir, dataset, JSON.parse(readFileSync(cur, 'utf8')).version, 'manifest.json'), 'utf8')) : null;
  const servedYear = manifest ? Number(manifest.tables[0].dataPeriod) : Math.max(...Object.keys(entry.vintages).map(Number));
  const tryYear = async (year) => {
    for (const t of entry.releaseWatch.urls) {
      const found = await head(t.replace('{year}', String(year)), f);
      if (found) return found;
    }
    return null;
  };

  // Capture the terms page every run; a change lowers the posture until it is recognized again.
  let terms = null;
  try {
    const res = await f(entry.terms.url, { headers: { 'user-agent': 'gridprims-pipeline (+https://gridprims.com)' } });
    if (res.ok) terms = { ...compareTerms(entry, await res.text()), checked: today };
  } catch { terms = null; }
  const posture = postureInForce(entry, terms);
  const termsRow = terms ? { checked: today, changed: terms.changed, posture, ...(terms.excerpt ? { excerpt: terms.excerpt } : {}), ...(entry.takedown ? { takedown: entry.takedown } : {}) } : undefined;

  try {
    // A new data year beats a revision of the served one.
    let target = null;
    const next = await tryYear(servedYear + 1);
    if (next) target = { year: servedYear + 1, upstream: next, why: `new data year ${servedYear + 1}` };
    else {
      const now = await tryYear(servedYear);
      const known = manifest?.raw[0];
      const changed = now && known && (now.bytes !== known.bytes || (now.lastModified && known.lastModified && now.lastModified !== known.lastModified));
      if (changed) target = { year: servedYear, upstream: now, why: `revised ${servedYear} file` };
      if (!manifest && now) target = { year: servedYear, upstream: now, why: 'first snapshot' };
    }
    if (!target) return { id: dataset, checked: true, refreshed: false, version: manifest?.version, posture, terms: termsRow };

    const res = await f(target.upstream.url);
    if (!res.ok) return { id: dataset, checked: true, refreshed: false, failure: `download ${target.upstream.url}: HTTP ${res.status}` };
    const input = new Uint8Array(await res.arrayBuffer());
    const vintage = { url: target.upstream.url, asOf: asOfOf(target.upstream.lastModified, today), sha256: null };
    const r = await runRecipe({ dataset, year: target.year, input, retrieved: today, outDir, entry, vintage, upstream: target.upstream });
    if (!r.ok) return { id: dataset, checked: true, refreshed: false, version: manifest?.version, failure: r.failures.join('; ') };
    // Re-running on unchanged input reproduces the same files, so this is a refresh only when something changed.
    const same = manifest && manifest.version === r.version && JSON.stringify(manifest.tables) === JSON.stringify(r.manifest.tables);
    return { id: dataset, checked: true, refreshed: !same, version: r.version, posture, terms: termsRow, found: target.why, raw: same ? undefined : { name: r.manifest.raw[0].name, bytes: input, version: r.version } };
  } catch (e) {
    return { id: dataset, checked: false, refreshed: false, version: manifest?.version, failure: `check failed: ${e.message}` };
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const { positionals, values } = parseArgs({ allowPositionals: true, options: { out: { type: 'string' } } });
  const r = await checkDataset({ dataset: positionals[0], outDir: values.out });
  console.log(JSON.stringify(r));
  if (r.failure) process.exitCode = 2;
}
