// Run a dataset's refresh recipe (platform/data-operations): fetch, validate,
// normalize, and snapshot. The same script runs on a laptop and in scheduled CI.
//   node pipeline/run.mjs eia-861 --year 2025 [--input path.zip] [--retrieved YYYY-MM-DD] [--out data]
//   node pipeline/run.mjs pudl-ferc714 --year 2025 --input hourly=a.parquet --input respondents=b.parquet
// When a validator fails, nothing is written and the previous version stays live.

import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { parseArgs } from 'node:util';
import { gzipSync } from 'node:zlib';
import { readXlsx, readZipDirectory, readZipEntry } from '../parsers/xlsx.mjs';
import { readParquet } from '../parsers/parquet.mjs';
import { writeShard } from './lib/shard-writer.mjs';
import { postureOf, validateEntry } from './lib/registry.mjs';
import { tableLicense } from './lib/licenses.mjs';

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
export const MAX_FILE_BYTES = 20 * 1024 * 1024;
const sha256 = (b) => createHash('sha256').update(b).digest('hex');
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** Locale-neutral CSV: ISO dates, "." decimals, empty for missing (site/translation-ready). */
export function toCsv(rows, schema) {
  const cell = (v) => (v === null || v === undefined ? '' : typeof v === 'number' ? String(v) : /[",\r\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
  return [schema.map((s) => s.name).join(','), ...rows.map((r) => schema.map((s) => cell(r[s.name])).join(','))].join('\n') + '\n';
}

/**
 * The one zip entry an unzip step names; `*` matches any run of characters
 * within a name, so a file EIA renames between years ("_Final_Revision") still matches.
 * @param {string} pattern with {year} already filled in
 * @param {Array<{name: string}>} entries
 * @returns {{entry?: any, problem?: string}}
 */
export function findEntry(pattern, entries) {
  const re = new RegExp(`^${pattern.split('*').map((p) => p.replace(/[.+?^${}()|[\]\\]/g, '\\$&')).join('[^/]*')}$`);
  const hits = entries.filter((e) => re.test(e.name));
  if (hits.length > 1) return { problem: `${pattern} matches ${hits.length} files: ${hits.map((e) => e.name).join(', ')}` };
  return hits.length ? { entry: hits[0] } : { problem: `${pattern} is not in the download` };
}

/**
 * Check rows against the recipe's validate step and the previous version.
 * @returns {string[]} failures
 */
export function validateRows(rows, step, previousRows) {
  const failures = [];
  const keys = new Set();
  for (const r of rows) {
    const k = step.key.map((f) => r[f]).join('|');
    if (keys.has(k)) { failures.push(`duplicate key ${k}`); break; }
    keys.add(k);
  }
  const { min, max, maxDropPct, maxRisePct } = step.rows;
  if (rows.length < min || rows.length > max) failures.push(`${rows.length} rows, outside the expected ${min} to ${max}`);
  if (previousRows) {
    const change = ((rows.length - previousRows) / previousRows) * 100;
    if (change < -maxDropPct) failures.push(`rows dropped ${(-change).toFixed(1)}% from ${previousRows}, more than ${maxDropPct}%`);
    if (change > maxRisePct) failures.push(`rows rose ${change.toFixed(1)}% from ${previousRows}, more than ${maxRisePct}%`);
  }
  return failures;
}

/**
 * Run one dataset's recipe for one data year.
 * @param {{dataset: string, year: number, input?: Uint8Array, retrieved: string, outDir?: string, entry?: any, vintage?: {url: string, asOf: string, sha256?: string | null}, verifyPin?: boolean, upstream?: {lastModified?: string, bytes?: number}}} o
 *   vintage: a release the registry does not list yet (the release watch found it);
 *   verifyPin: refuse a raw file whose checksum differs from the registry's pin (rebuilds of a past version)
 *   entry replaces the registry entry (tests use it to run a recipe on a small fixture)
 * @returns {Promise<{ok: true, version: string, manifest: any} | {ok: false, failures: string[]}>}
 */
export async function runRecipe({ dataset, year, input, retrieved, outDir = join(ROOT, 'data'), entry: given, vintage: found, verifyPin = false, upstream }) {
  const entry = given ?? (await import(pathToFileURL(join(ROOT, 'pipeline/registry', `${dataset}.mjs`)).href)).default;
  const entryErrors = validateEntry(entry);
  if (entryErrors.length) return { ok: false, failures: entryErrors };
  const vintage = found ?? entry.vintages[year];
  if (!vintage) return { ok: false, failures: [`${dataset}: no vintage ${year} in the registry`] };

  // One raw file, or several named files for a release that ships them apart (PUDL's Parquet tables).
  const named = vintage.files ? Object.entries(vintage.files) : [['', { url: vintage.url, sha256: vintage.sha256 }]];
  const raws = {};
  for (const [name, file] of named) {
    let bytes = name ? input?.[name] : input;
    if (!bytes) {
      const res = await fetch(file.url);
      if (!res.ok) return { ok: false, failures: [`fetch ${file.url}: HTTP ${res.status}`] };
      bytes = new Uint8Array(await res.arrayBuffer());
    }
    const sum = sha256(bytes);
    if (verifyPin && file.sha256 && file.sha256 !== sum) return { ok: false, failures: [`raw file${name ? ` ${name}` : ''} SHA-256 ${sum} differs from the registry's ${file.sha256}`] };
    raws[name] = { bytes, sha256: sum, url: file.url };
  }
  const raw = raws['']?.bytes;

  const datasetDir = join(outDir, dataset);
  const currentPath = join(datasetDir, 'current.json');
  const previous = existsSync(currentPath) ? JSON.parse(readFileSync(join(datasetDir, JSON.parse(readFileSync(currentPath, 'utf8')).version, 'manifest.json'), 'utf8')) : null;

  // Read, normalize, and validate every table before writing any file.
  const zip = raw && entry.tables.some((t) => t.recipe.some((st) => st.step === 'unzip')) ? readZipDirectory(raw) : [];
  const failures = [];
  const ready = [];
  for (const tb of entry.tables) {
    const step = (name) => tb.recipe.find((s) => s.step === name);
    let input;
    let read = {};
    let entryName = null;
    if (step('read-parquet')) {
      // Parquet files hand the normalizer a reader per file, so it can aggregate a row group at a time.
      input = Object.fromEntries(step('read-parquet').files.map((f) => [f, readParquet(raws[f].bytes)]));
    } else {
      read = step('read-xlsx');
      // A workbook inside a zip (EIA-860, 861, 923), or the raw file is the workbook (EIA-860M).
      let bytes = raw;
      if (step('unzip')) {
        const found = findEntry(step('unzip').entry.replace('{year}', String(year)), zip);
        if (found.problem) { failures.push(`${tb.name}: ${found.problem}`); continue; }
        entryName = found.entry.name;
        bytes = await readZipEntry(raw, found.entry);
      }
      // One sheet hands the normalizer its rows; a list of sheets hands it rows by sheet name.
      input = read.sheets ? Object.fromEntries(await Promise.all(read.sheets.map(async (sheet) => [sheet, (await readXlsx(bytes, { sheet })).rows]))) : (await readXlsx(bytes, { sheet: read.sheet })).rows;
    }
    const normalizer = await import(pathToFileURL(join(ROOT, 'pipeline/normalize', `${step('normalize').module}.mjs`)).href);
    const { rows, problems, dataPeriod } = normalizer.normalize(input, read.headerRows);
    if (problems.length) { failures.push(...problems.map((p) => `${tb.name}: schema: ${p}`)); continue; }
    const prevRows = previous?.tables.find((t) => t.name === tb.name && t.dataPeriod === (dataPeriod ?? String(year)))?.rows;
    const bad = validateRows(rows, step('validate'), prevRows);
    const by = step('partition').by;
    const unplaced = rows.filter((r) => r[by] === null || r[by] === undefined).length;
    if (unplaced) bad.push(`${unplaced} rows have no ${by} to partition by`);
    if (bad.length) { failures.push(...bad.map((f) => `${tb.name}: ${f}`)); continue; }
    ready.push({ tb, rows, schema: normalizer.SCHEMA, by, entryName, dataPeriod: dataPeriod ?? String(year) });
  }
  if (failures.length) return { ok: false, failures };

  // Permanent versions are cut at most monthly: the version is the retrieval month.
  const version = retrieved.slice(0, 7);
  const dir = join(datasetDir, version);
  const asOfMonth = `${MONTHS[Number(vintage.asOf.slice(5, 7)) - 1]} ${vintage.asOf.slice(0, 4)}`;
  const attribution = entry.attribution.replace('{asOfMonth}', asOfMonth).replace('{release}', vintage.release ?? '');
  const lic = tableLicense([{ id: dataset, publisher: entry.publisher, license: entry.inputLicense ?? 'public-domain', attribution }]);
  if (!lic.ok) return { ok: false, failures: [lic.error] };
  const tables = [];
  for (const { tb, rows, schema, by, dataPeriod } of ready) {
    const table = tb.name;
    mkdirSync(join(dir, table), { recursive: true });
    const parts = [...new Set(rows.map((r) => r[by]))].sort();
    const shards = parts.map((st) => {
      const part = rows.filter((r) => r[by] === st);
      const bytes = writeShard(part, schema, { dataset, version, table, state: st });
      const path = `${table}/${st}.bin`;
      writeFileSync(join(dir, path), bytes);
      return { path, state: st, rows: part.length, bytes: bytes.length, sha256: sha256(bytes) };
    });
    const csv = gzipSync(toCsv(rows, schema), { level: 9 });
    writeFileSync(join(dir, `${table}.csv.gz`), csv);
    const tooBig = [...shards.map((s) => [s.path, s.bytes]), [`${table}.csv.gz`, csv.length]].filter(([, b]) => b > MAX_FILE_BYTES);
    if (tooBig.length) return { ok: false, failures: tooBig.map(([p, b]) => `${p} is ${b} bytes, over the 20 MiB limit`) };
    tables.push({
      name: table, title: tb.title, dataPeriod, rows: rows.length, columns: schema, partition: by,
      shards, download: { path: `${table}.csv.gz`, bytes: csv.length, sha256: sha256(csv), format: 'text/csv; gzip' },
      license: lic.license, credits: lic.credits, notices: lic.notices,
    });
  }

  const { posture, advisory, agrees } = postureOf(entry);
  const manifest = {
    dataset, version, title: entry.title, publisher: entry.publisher, sourceUrl: entry.sourceUrl,
    terms: entry.terms, redistributionBasis: entry.redistributionBasis, posture, postureAdvisory: { ...advisory, agrees },
    license: `${entry.redistributionBasis.kind}${entry.redistributionBasis.note ? ` (${entry.redistributionBasis.note})` : ''}`, attribution,
    // When this version was generated: the retrieval day, so a re-run of the same input reproduces it exactly.
    asOf: vintage.asOf, retrieved, generatedAt: `${retrieved}T00:00:00Z`, cadence: entry.cadence,
    raw: named.map(([name]) => {
      const r = raws[name];
      return { url: r.url, name: r.url.split('/').pop(), bytes: r.bytes.length, sha256: r.sha256, ...(name ? { file: name } : ready.some((x) => x.entryName) ? { entries: ready.map((x) => x.entryName) } : {}), ...(!name && upstream?.lastModified ? { lastModified: upstream.lastModified } : {}) };
    }),
    ...(vintage.release ? { release: vintage.release } : {}),
    tables,
  };
  writeFileSync(join(dir, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
  writeFileSync(currentPath, JSON.stringify({ dataset, version }, null, 2) + '\n');
  return { ok: true, version, manifest };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const { positionals, values } = parseArgs({ allowPositionals: true, options: { year: { type: 'string' }, input: { type: 'string', multiple: true }, retrieved: { type: 'string' }, out: { type: 'string' }, 'verify-pin': { type: 'boolean' } } });
  // --input path, or --input name=path once per file for a dataset whose release is several files.
  const inputs = (values.input ?? []).map((v) => (/^[a-z_]+=/.test(v) ? v.split(/=(.*)/s).slice(0, 2) : ['', v]));
  const input = !inputs.length ? undefined : inputs[0][0] ? Object.fromEntries(inputs.map(([k, p]) => [k, new Uint8Array(readFileSync(p))])) : new Uint8Array(readFileSync(inputs[0][1]));
  const r = await runRecipe({
    // --year 2025, or --year 2026-09 for a monthly dataset.
    dataset: positionals[0], year: /^\d{4}$/.test(values.year ?? '') ? Number(values.year) : values.year, retrieved: values.retrieved ?? new Date().toISOString().slice(0, 10),
    input, outDir: values.out, verifyPin: values['verify-pin'],
  });
  if (!r.ok) {
    console.error(`FAIL ${positionals[0]}: the previous version stays live.`);
    for (const f of r.failures) console.error(`  ${f}`);
    process.exitCode = 2;
  } else console.log(`ok ${positionals[0]} ${r.version}: ${r.manifest.tables.map((t) => `${t.name} ${t.rows} rows in ${t.shards.length} shards`).join('; ')}`);
}

