// Run a dataset's refresh recipe (platform/data-operations): fetch, validate,
// normalize, and snapshot. The same script runs on a laptop and in scheduled CI.
//   node pipeline/run.mjs eia-861 --year 2025 [--input path.zip] [--retrieved YYYY-MM-DD] [--out data]
// When a validator fails, nothing is written and the previous version stays live.

import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { parseArgs } from 'node:util';
import { gzipSync } from 'node:zlib';
import { readXlsx, readZipDirectory, readZipEntry } from '../parsers/xlsx.mjs';
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

  let raw = input;
  if (!raw) {
    const res = await fetch(vintage.url);
    if (!res.ok) return { ok: false, failures: [`fetch ${vintage.url}: HTTP ${res.status}`] };
    raw = new Uint8Array(await res.arrayBuffer());
  }
  const rawSha = sha256(raw);
  if (verifyPin && vintage.sha256 && vintage.sha256 !== rawSha) return { ok: false, failures: [`raw file SHA-256 ${rawSha} differs from the registry's ${vintage.sha256}`] };

  const datasetDir = join(outDir, dataset);
  const currentPath = join(datasetDir, 'current.json');
  const previous = existsSync(currentPath) ? JSON.parse(readFileSync(join(datasetDir, JSON.parse(readFileSync(currentPath, 'utf8')).version, 'manifest.json'), 'utf8')) : null;

  // Read, normalize, and validate every table before writing any file.
  const zip = readZipDirectory(raw);
  const failures = [];
  const ready = [];
  for (const tb of entry.tables) {
    const step = (name) => tb.recipe.find((s) => s.step === name);
    const entryName = step('unzip').entry.replace('{year}', String(year));
    const zipEntry = zip.find((e) => e.name === entryName);
    if (!zipEntry) { failures.push(`${tb.name}: ${entryName} is not in the download`); continue; }
    const read = step('read-xlsx');
    const bytes = await readZipEntry(raw, zipEntry);
    // One sheet hands the normalizer its rows; a list of sheets hands it rows by sheet name.
    const sheets = read.sheets ? Object.fromEntries(await Promise.all(read.sheets.map(async (sheet) => [sheet, (await readXlsx(bytes, { sheet })).rows]))) : (await readXlsx(bytes, { sheet: read.sheet })).rows;
    const normalizer = await import(pathToFileURL(join(ROOT, 'pipeline/normalize', `${step('normalize').module}.mjs`)).href);
    const { rows, problems } = normalizer.normalize(sheets, read.headerRows);
    if (problems.length) { failures.push(...problems.map((p) => `${tb.name}: schema: ${p}`)); continue; }
    const prevRows = previous?.tables.find((t) => t.name === tb.name && t.dataPeriod === String(year))?.rows;
    const bad = validateRows(rows, step('validate'), prevRows);
    const by = step('partition').by;
    const unplaced = rows.filter((r) => r[by] === null || r[by] === undefined).length;
    if (unplaced) bad.push(`${unplaced} rows have no ${by} to partition by`);
    if (bad.length) { failures.push(...bad.map((f) => `${tb.name}: ${f}`)); continue; }
    ready.push({ tb, rows, schema: normalizer.SCHEMA, by, entryName });
  }
  if (failures.length) return { ok: false, failures };

  // Permanent versions are cut at most monthly: the version is the retrieval month.
  const version = retrieved.slice(0, 7);
  const dir = join(datasetDir, version);
  const asOfMonth = `${MONTHS[Number(vintage.asOf.slice(5, 7)) - 1]} ${vintage.asOf.slice(0, 4)}`;
  const attribution = entry.attribution.replace('{asOfMonth}', asOfMonth);
  const lic = tableLicense([{ id: dataset, publisher: entry.publisher, license: entry.inputLicense ?? 'public-domain', attribution }]);
  if (!lic.ok) return { ok: false, failures: [lic.error] };
  const tables = [];
  for (const { tb, rows, schema, by } of ready) {
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
      name: table, title: tb.title, dataPeriod: String(year), rows: rows.length, columns: schema, partition: by,
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
    raw: [{ url: vintage.url, name: vintage.url.split('/').pop(), bytes: raw.length, sha256: rawSha, entries: ready.map((r) => r.entryName), ...(upstream?.lastModified ? { lastModified: upstream.lastModified } : {}) }],
    tables,
  };
  writeFileSync(join(dir, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
  writeFileSync(currentPath, JSON.stringify({ dataset, version }, null, 2) + '\n');
  return { ok: true, version, manifest };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const { positionals, values } = parseArgs({ allowPositionals: true, options: { year: { type: 'string' }, input: { type: 'string' }, retrieved: { type: 'string' }, out: { type: 'string' }, 'verify-pin': { type: 'boolean' } } });
  const r = await runRecipe({
    dataset: positionals[0], year: Number(values.year), retrieved: values.retrieved ?? new Date().toISOString().slice(0, 10),
    input: values.input ? new Uint8Array(readFileSync(values.input)) : undefined, outDir: values.out, verifyPin: values['verify-pin'],
  });
  if (!r.ok) {
    console.error(`FAIL ${positionals[0]}: the previous version stays live.`);
    for (const f of r.failures) console.error(`  ${f}`);
    process.exitCode = 2;
  } else console.log(`ok ${positionals[0]} ${r.version}: ${r.manifest.tables.map((t) => `${t.name} ${t.rows} rows in ${t.shards.length} shards`).join('; ')}`);
}

