// The release watch (platform/data-operations, "Publisher release watch and
// refresh in one run"): look for a new data year or a revised file, refresh in
// the same run when one appears, and record the check either way.
//   node pipeline/check.mjs eia-861 [--out data]

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { parseArgs } from 'node:util';
import { ROOT, findEntry, runRecipe } from './run.mjs';
import { readZipDirectory } from '../parsers/xlsx.mjs';
import { compareTerms, pageText, postureInForce } from './lib/terms.mjs';

/** The release a HEAD request describes, or null when the URL has nothing. */
async function head(url, f) {
  const res = await f(url, { method: 'HEAD', redirect: 'follow' });
  if (!res.ok) return null;
  return { url, bytes: Number(res.headers.get('content-length') ?? 0), lastModified: res.headers.get('last-modified') ?? null };
}
const MONTH_NAMES = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];
const asOfOf = (lastModified, fallback) => (lastModified ? new Date(lastModified).toISOString().slice(0, 10) : fallback);

/**
 * @param {{dataset: string, entry?: any, outDir?: string, fetch?: typeof fetch, today?: string}} o
 * @returns {Promise<{id: string, checked: boolean, refreshed: boolean, version?: string, posture?: string, terms?: object, failure?: string, found?: string, raw?: {name: string, bytes: Uint8Array, version: string}}>}
 */
export async function checkDataset(o) {
  const r = await checkRelease(o);
  const entry = o.entry ?? (await import(pathToFileURL(join(ROOT, 'pipeline/registry', `${o.dataset}.mjs`)).href)).default;
  if (entry.releaseCalendar) r.releasePromise = await capturePromise({ entry, fetch: o.fetch ?? fetch, today: o.today ?? new Date().toISOString().slice(0, 10), outDir: o.outDir ?? join(ROOT, 'data') });
  return r;
}

/**
 * The publisher's posted next-release date as its calendar page reads today (add-data-continuity-ledger
 * 1.3): the text the entry's pattern finds, or null when the page no longer says, with the page's text kept
 * under data/release-pages/ as the archived copy whenever the reading changes.
 * @param {{entry: any, fetch: typeof fetch, today: string, outDir: string}} o
 */
export async function capturePromise({ entry, fetch: f, today, outDir }) {
  const { url, pattern } = entry.releaseCalendar;
  try {
    const res = await f(url, { headers: { 'user-agent': 'gridprims-pipeline (+https://gridprims.com)' } });
    if (!res.ok) return { text: null, error: `HTTP ${res.status}` };
    const page = pageText(await res.text());
    const text = new RegExp(pattern, 'i').exec(page)?.[0] ?? null;
    const dir = join(outDir, 'release-pages', entry.id);
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, `${today}.txt`), `${url}\n${today}\n\n${page}\n`);
    return { text, archive: `https://gridprims.com/data/release-pages/${entry.id}/${today}.txt` };
  } catch (e) {
    return { text: null, error: e.message };
  }
}

/** The release watch proper: a new data year or a revised file, refreshed in the same run. */
async function checkRelease({ dataset, entry: given, outDir = join(ROOT, 'data'), fetch: f = fetch, today = new Date().toISOString().slice(0, 10) }) {
  const entry = given ?? (await import(pathToFileURL(join(ROOT, 'pipeline/registry', `${dataset}.mjs`)).href)).default;
  const cur = join(outDir, dataset, 'current.json');
  const manifest = existsSync(cur) ? JSON.parse(readFileSync(join(outDir, dataset, JSON.parse(readFileSync(cur, 'utf8')).version, 'manifest.json'), 'utf8')) : null;
  // Capture the terms page every run, a pinned dataset's too; a change lowers the posture until it is
  // recognized again (add-program-fact-pages 3.1: no person confirms it, and nothing waits on one).
  let terms = null;
  try {
    const res = await f(entry.terms.url, { headers: { 'user-agent': 'gridprims-pipeline (+https://gridprims.com)' } });
    if (res.ok) terms = { ...compareTerms(entry, await res.text()), checked: today };
  } catch { terms = null; }
  const posture = postureInForce(entry, terms);
  const termsRow = terms ? { checked: today, changed: terms.changed, posture, ...(terms.excerpt ? { excerpt: terms.excerpt } : {}), ...(entry.takedown ? { takedown: entry.takedown } : {}) } : undefined;
  // A dataset pinned to a release (PUDL) has no release watch: a new release is a hand-made bump.
  if (!entry.releaseWatch) return { id: dataset, checked: false, refreshed: false, version: manifest?.version, posture, terms: termsRow, waiting: 'pinned to a release; a new one is bumped by hand' };
  // Periods are data years (2025), or months ("2026-09") for a monthly dataset such as EIA-860M.
  const monthly = entry.releaseWatch.period === 'month';
  const servedYear = entry.releaseWatch.period === 'rolling' ? null : manifest
    ? (monthly ? manifest.tables[0].dataPeriod : Number(manifest.tables[0].dataPeriod.slice(-4)))
    : (monthly ? Object.keys(entry.vintages).sort().at(-1) : Math.max(...Object.keys(entry.vintages).map(Number)));
  const after = (p) => {
    if (!monthly) return p + 1;
    const [y, m] = p.split('-').map(Number);
    return m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, '0')}`;
  };
  const urlOf = (t, p) => (monthly ? t.replace('{month}', MONTH_NAMES[Number(p.slice(5)) - 1]).replace('{year}', p.slice(0, 4)) : t.replace('{year}', String(p)));
  const tryYear = async (period) => {
    for (const t of entry.releaseWatch.urls) {
      const found = await head(urlOf(t, period), f);
      if (found) return found;
    }
    return null;
  };

  // A file at one address that the publisher rewrites in place (URDB, daily) is taken at most once a
  // month: the period is the retrieval month.
  if (entry.releaseWatch.period === 'rolling') return { ...(await checkRolling({ dataset, entry, outDir, f, today, manifest })), posture, terms: termsRow };

  try {
    // A new data year beats a revision of the served one.
    let target = null;
    // A publisher that grows next year's file all year posts it final the year after; look only from then.
    const nextFrom = entry.releaseWatch.nextYearFrom ? `${servedYear + 2}-${entry.releaseWatch.nextYearFrom}` : null;
    const next = !nextFrom || today >= nextFrom ? await tryYear(after(servedYear)) : null;
    if (next) target = { year: after(servedYear), upstream: next, why: `new ${monthly ? 'month' : 'data year'} ${after(servedYear)}` };
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
    if (entry.releaseWatch.finalOnly) {
      const pattern = entry.tables[0].recipe.find((st) => st.step === 'unzip').entry.replace('{year}', String(target.year));
      if (findEntry(pattern, readZipDirectory(input)).problem) return { id: dataset, checked: true, refreshed: false, version: manifest?.version, posture, terms: termsRow, waiting: `the ${target.year} file is not final yet` };
    }
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

/** The once-a-month refresh of a file rewritten in place. */
async function checkRolling({ dataset, entry, outDir, f, today, manifest }) {
  const month = today.slice(0, 7);
  if (manifest?.tables[0].dataPeriod === month) return { id: dataset, checked: true, refreshed: false, version: manifest.version, waiting: `already taken this month (${month})` };
  try {
    const url = entry.releaseWatch.urls[0];
    const found = await head(url, f);
    if (!found) return { id: dataset, checked: true, refreshed: false, version: manifest?.version, failure: `${url} did not answer` };
    // Many files at fixed addresses (EIA-930, one workbook per region): the runner reads each in turn,
    // and the as-of date is the Last-Modified of the file the watch asked about.
    if (entry.releaseWatch.files) {
      const latest = entry.vintages[Object.keys(entry.vintages).sort().at(-1)];
      const vintage = { asOf: asOfOf(found.lastModified, today), files: Object.fromEntries(Object.entries(latest.files).map(([k, file]) => [k, { ...file, sha256: null }])) };
      const r = await runRecipe({ dataset, year: month, retrieved: today, outDir, entry, vintage });
      if (!r.ok) return { id: dataset, checked: true, refreshed: false, version: manifest?.version, failure: r.failures.join('; ') };
      return { id: dataset, checked: true, refreshed: true, version: r.version, found: `monthly refresh ${month}` };
    }
    const res = await f(url);
    if (!res.ok) return { id: dataset, checked: true, refreshed: false, version: manifest?.version, failure: `download ${url}: HTTP ${res.status}` };
    const input = new Uint8Array(await res.arrayBuffer());
    const vintage = { url, asOf: asOfOf(found.lastModified, today), sha256: null };
    const r = await runRecipe({ dataset, year: month, input, retrieved: today, outDir, entry, vintage, upstream: found });
    if (!r.ok) return { id: dataset, checked: true, refreshed: false, version: manifest?.version, failure: r.failures.join('; ') };
    return { id: dataset, checked: true, refreshed: true, version: r.version, found: `monthly refresh ${month}`, raw: { name: r.manifest.raw[0].name, bytes: input, version: r.version } };
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
