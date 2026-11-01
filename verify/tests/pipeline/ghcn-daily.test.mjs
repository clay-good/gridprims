// NOAA station temperatures and normals (add-weather-normalization 1.1, 1.2):
// per-station gzipped CSVs streamed and trimmed to station, date, maximum,
// and minimum with quality flags, NOAA's missing value kept missing, days
// before 2019 left out, the station index with its period of record, and the
// daily degree-day normals at every published base. Plus the ZCTA points.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { join } from 'node:path';
import { readFileSync } from 'node:fs';
import { runRecipe } from '../../../pipeline/run.mjs';
import { validateEntry } from '../../../pipeline/lib/registry.mjs';
import { readShard } from '../../../core/lib/shard.mjs';
import entry from '../../../pipeline/registry/ghcn-daily.mjs';
import points from '../../../pipeline/registry/census-zcta-points.mjs';
import { tempDir } from '../../lib/temp.mjs';

const ID = 'USW00023183';
const STATIONS_TXT = `${ID}  33.4278 -112.0039  337.4 AZ PHOENIX AIRPORT                                              72278\n`;
const INVENTORY = `${ID}  33.4278 -112.0039 TMAX 1933 2026\n${ID}  33.4278 -112.0039 TMIN 1933 2026\n`;
const HISTORY = [
  `${ID},20181231,TMAX,200,,,6,`, // before 2019: left out
  `${ID},20190101,TMAX,183,,,6,`, `${ID},20190101,TMIN,61,,,6,`, `${ID},20190101,PRCP,0,,,6,`,
  `${ID},20190102,TMAX,-9999,,,6,`, `${ID},20190102,TMIN,72,,G,6,`, // missing maximum; a flagged minimum
].join('\n');
const NORMALS_HEAD = ['STATION', 'DATE', 'month', 'day', ...[40, 45, 50, 55, 57, 60].map((b) => `DLY-HTDD-BASE${b}`), 'DLY-HTDD-NORMAL', ...[40, 45, 50, 55, 57, 60, 70, 72].map((b) => `DLY-CLDD-BASE${b}`), 'DLY-CLDD-NORMAL'];
const normalsCsv = () => [NORMALS_HEAD.map((h) => `"${h}"`).join(','), ...Array.from({ length: 366 }, (_, i) => { const d = new Date(Date.UTC(2024, 0, 1) + i * 86_400_000); return [`"${ID}"`, `"${d.toISOString().slice(5, 10)}"`, `"${String(d.getUTCMonth() + 1).padStart(2, '0')}"`, `"${String(d.getUTCDate()).padStart(2, '0')}"`, ...new Array(6).fill('"     0.0"'), '"    12.4"', ...new Array(8).fill('"  -7777"'), '"     0.3"'].join(','); })].join('\n');

const small = {
  ...entry,
  vintages: { '2026-11': { asOf: '2026-11-01', files: { stations: entry.vintages['2026-11'].files.stations, inventory: entry.vintages['2026-11'].files.inventory, [`h_${ID}`]: entry.vintages['2026-11'].files[`h_${ID}`], [`n_${ID}`]: entry.vintages['2026-11'].files[`n_${ID}`] } } },
  tables: entry.tables.map((t) => ({ ...t, recipe: t.recipe.map((s) => (s.step === 'validate' ? { ...s, rows: { ...s.rows, min: 1, max: 1000 } } : s.step === 'read-lines' ? { ...s, files: s.files.filter((f) => !/^[hn]_/.test(f) || f.endsWith(ID)) } : s)) })),
};

test('the registry entries are valid, and the weather entry names NOAA and its citation', () => {
  assert.deepEqual(validateEntry(entry), []);
  assert.deepEqual(validateEntry(points), []);
  assert.equal(entry.publisher, 'NOAA National Centers for Environmental Information');
  assert.match(entry.terms.text, /doi\.org\/10\.7289\/V5D21VHZ/);
  assert.equal(entry.redistributionBasis.kind, 'public domain');
});

test('a station file streamed gzipped: only station, date, maximum, and minimum from 2019, with flags', async () => {
  const dir = tempDir('gridprims-ghcn-in-');
  const files = { stations: join(dir, 's.txt'), inventory: join(dir, 'i.txt'), [`h_${ID}`]: join(dir, 'h.csv.gz'), [`n_${ID}`]: join(dir, 'n.csv') };
  writeFileSync(files.stations, STATIONS_TXT);
  writeFileSync(files.inventory, INVENTORY);
  writeFileSync(files[`h_${ID}`], gzipSync(HISTORY));
  writeFileSync(files[`n_${ID}`], normalsCsv());
  const out = tempDir('gridprims-ghcn-out-');
  // The chosen-station list is the registry's; a fixture run checks only the station it has.
  const { inventory, ...noInventory } = small.vintages['2026-11'].files;
  const r = await runRecipe({ dataset: 'ghcn-daily', year: '2026-11', retrieved: '2026-11-01', entry: { ...small, vintages: { '2026-11': { ...small.vintages['2026-11'], files: noInventory } }, tables: small.tables.filter((t) => t.name !== 'stations') }, input: files, outDir: out });
  assert.equal(r.ok, true, JSON.stringify(r.failures));
  const rows = (t) => readShard(readFileSync(join(out, 'ghcn-daily/2026-11', t, 'AZ.bin'))).rows();
  assert.deepEqual(rows('daily'), [
    { station: ID, state: 'AZ', day: 17897, tmax: 18.3, tmin: 6.1, qflag_tmax: null, qflag_tmin: null },
    { station: ID, state: 'AZ', day: 17898, tmax: null, tmin: 7.2, qflag_tmax: null, qflag_tmin: 'G' },
  ]);
  const n = rows('normals');
  assert.equal(n.length, 366);
  assert.equal(n[0].htdd_65, 12.4);
  assert.equal(n[0].cldd_72, null, 'NCEI\'s special codes are missing, never a count');
  assert.equal(n[0].cldd_65, 0.3);
  // The gzipped file is hashed as downloaded.
  const raw = r.manifest.raw.find((x) => x.file === `h_${ID}`);
  assert.equal(raw.bytes, readFileSync(files[`h_${ID}`]).length);
});

test('ZCTA internal points from the Gazetteer file inside its zip', async () => {
  const { writeZip } = await import('../../lib/zip-writer.mjs');
  const txt = 'GEOID\tALAND\tAWATER\tALAND_SQMI\tAWATER_SQMI\tINTPTLAT\tINTPTLONG                                                                                                               \n85004\t3330000\t0\t1.3\t0\t33.451\t-112.069                \n';
  const zip = writeZip([{ name: '2020_Gaz_zcta_national.txt', data: txt }]);
  const smallPts = { ...points, vintages: { 2020: { ...points.vintages[2020], sha256: null } }, tables: points.tables.map((t) => ({ ...t, recipe: t.recipe.map((s) => (s.step === 'validate' ? { ...s, rows: { ...s.rows, min: 1, max: 10 } } : s)) })) };
  const out = tempDir('gridprims-zcta-pts-');
  const r = await runRecipe({ dataset: 'census-zcta-points', year: 2020, retrieved: '2026-11-01', entry: smallPts, input: zip, outDir: out });
  assert.equal(r.ok, true, JSON.stringify(r.failures));
  assert.deepEqual(readShard(readFileSync(join(out, 'census-zcta-points/2026-11/points/US.bin'))).rows(), [{ zcta: '85004', lat: 33.451, lon: -112.069, land_m2: 3330000 }]);
  assert.deepEqual(r.manifest.ceiiScreen.allowedLocation, ['points.lat', 'points.lon']);
});
