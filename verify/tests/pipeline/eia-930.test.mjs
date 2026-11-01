// EIA-930 hourly grid data (add-hourly-carbon 1.1): per-region workbooks read
// one at a time from disk and hashed as they are read, EIA's hour-ending UTC
// labels converted to hour starts (design D6), hours before 2018-07-01 left
// out, a fuel column a region lacks kept missing rather than zero, and one
// shard per region and year whose bytes do not change when its rows do not.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { changesFrom, runRecipe } from '../../../pipeline/run.mjs';
import { validateEntry } from '../../../pipeline/lib/registry.mjs';
import { readShard } from '../../../core/lib/shard.mjs';
import { writeShard } from '../../../pipeline/lib/shard-writer.mjs';
import { hourStartOf } from '../../../pipeline/normalize/eia-930-hourly.mjs';
import entry from '../../../pipeline/registry/eia-930.mjs';
import { writeXlsx } from '../../lib/zip-writer.mjs';
import { tempDir } from '../../lib/temp.mjs';

const FUELS = ['COL', 'NG', 'NUC', 'OIL', 'GEO', 'WAT', 'PS', 'SUN', 'SNB', 'WND', 'WNB', 'BAT', 'OES', 'UES', 'OTH', 'UNK'];
const HEADER = ['BA', 'UTC time', 'Local date', 'Hour', 'Adjusted demand', 'Adjusted net generation', 'Adjusted total interchange', ...FUELS.map((f) => `Adjusted ${f} Gen`),
  'CO2 Emissions Generated', 'CO2 Emissions Intensity for Generated Electricity', 'CO2 Emissions Intensity for Consumed Electricity'];
/** An Excel serial for a UTC time, as EIA writes "UTC time" (the hour's end). */
const serial = (iso) => Date.parse(`${iso}Z`) / 86_400_000 + 25569;
const row = (ba, utcEnd, demand, extra = {}) => {
  const r = Object.fromEntries(HEADER.map((h) => [h, null]));
  Object.assign(r, { BA: ba, 'UTC time': serial(utcEnd), 'Adjusted demand': demand, 'Adjusted net generation': demand - 10, 'Adjusted total interchange': -10, 'Adjusted NG Gen': demand - 10,
    'CO2 Emissions Generated': 412.123456, 'CO2 Emissions Intensity for Generated Electricity': 0.81234567, 'CO2 Emissions Intensity for Consumed Electricity': 0.8 }, extra);
  return HEADER.map((h) => r[h]);
};
const book = (header, rows) => writeXlsx({ 'Published Hourly Data': [header, ...rows] });

const small = (regions) => ({
  ...entry,
  vintages: { '2026-10': { asOf: '2026-10-31', files: Object.fromEntries(regions.map((ba) => [ba, { ...entry.vintages['2026-10'].files.PJM, url: `https://example.test/${ba}.xlsx`, name: `${ba}.xlsx` }])) } },
  tables: entry.tables.map((t) => ({ ...t, recipe: t.recipe.map((s) => (s.step === 'validate' ? { ...s, rows: { ...s.rows, min: 1, max: 100 } } : s.step === 'read-xlsx' ? { ...s, files: regions } : s)) })),
});

function files(dir, books) {
  return Object.fromEntries(Object.entries(books).map(([ba, bytes]) => { const p = join(dir, `${ba}.xlsx`); writeFileSync(p, bytes); return [ba, p]; }));
}

test('the registry entry is valid and lists one workbook per region', () => {
  assert.deepEqual(validateEntry(entry), []);
  assert.equal(Object.keys(entry.vintages['2026-10'].files).length, 68);
});

test('hour-ending UTC labels become hour starts: the 01:00 label is the hour from midnight', () => {
  assert.equal(new Date(hourStartOf(serial('2018-07-01T01:00:00')) * 3_600_000).toISOString(), '2018-07-01T00:00:00.000Z');
  // A serial with floating-point noise still lands on the hour.
  assert.equal(hourStartOf(serial('2024-03-10T08:00:00') + 1e-9), Date.UTC(2024, 2, 10, 7) / 3_600_000);
});

test('read from disk one region at a time: hour starts, the July 2018 cutoff, missing kept missing, and region-year shards', async () => {
  const dir = tempDir('gridprims-eia930-in-');
  const out = tempDir('gridprims-eia930-out-');
  const input = files(dir, {
    AAA: book(HEADER, [
      row('AAA', '2018-07-01T00:00:00', 900), // the hour from 23:00 on June 30: before the cutoff
      row('AAA', '2018-07-01T01:00:00', 1000),
      row('AAA', '2019-01-01T00:00:00', 1100), // the last hour of 2018
      row('AAA', '2019-01-01T01:00:00', 1200, { 'CO2 Emissions Intensity for Consumed Electricity': null }),
    ]),
    // A region whose file has no battery column at all.
    BBB: book(HEADER.filter((h) => h !== 'Adjusted BAT Gen'), [row('BBB', '2025-06-01T13:00:00', 50).filter((_, i) => HEADER[i] !== 'Adjusted BAT Gen')]),
  });
  const r = await runRecipe({ dataset: 'eia-930', year: '2026-10', retrieved: '2026-10-31', entry: small(['AAA', 'BBB']), input, outDir: out });
  assert.equal(r.ok, true, JSON.stringify(r.failures));
  const t = r.manifest.tables[0];
  assert.deepEqual(t.shards.map((s) => s.path), ['hourly/AAA-2018.bin', 'hourly/AAA-2019.bin', 'hourly/BBB-2025.bin']);
  assert.equal(t.download, null, 'shards only: no table-wide CSV');
  const read = (p) => readShard(readFileSync(join(out, 'eia-930/2026-10', p)));
  const a18 = read('hourly/AAA-2018.bin').rows();
  assert.deepEqual(a18.map((x) => new Date(x.hour * 3_600_000).toISOString().slice(0, 13)), ['2018-07-01T00', '2018-12-31T23']);
  assert.equal(a18[0].demand, 1000);
  assert.equal(a18[0].co2_generated, Math.fround(412.123456), 'CO2 kept to float32');
  assert.equal(a18[0].intensity_generated, Math.fround(0.81234567), 'intensity kept to float32');
  assert.ok(Math.abs(a18[0].intensity_generated * 1000 - 812.34567) < 1e-4, 'within 0.0001 lb/MWh');
  assert.equal(a18[0].gen_col, null, 'a blank fuel cell is missing, not zero');
  assert.equal(read('hourly/AAA-2019.bin').rows()[0].intensity_consumed, null);
  assert.equal(read('hourly/BBB-2025.bin').rows()[0].gen_bat, null, 'a fuel column the file lacks is missing');
  // Each file's hash and size are recorded, as if it had been fetched whole.
  const raw = r.manifest.raw.find((x) => x.file === 'AAA');
  assert.equal(raw.sha256, createHash('sha256').update(readFileSync(input.AAA)).digest('hex'));
  assert.equal(raw.bytes, readFileSync(input.AAA).length);
  assert.equal(read('hourly/AAA-2018.bin').header.meta.version, undefined, 'stable shards carry no version');
});

test('a later version keeps the bytes of a shard whose rows did not change', async () => {
  const dir = tempDir('gridprims-eia930-in-');
  const out = tempDir('gridprims-eia930-out-');
  const rows = [row('AAA', '2018-07-01T01:00:00', 1000), row('AAA', '2019-01-01T01:00:00', 1200)];
  const one = await runRecipe({ dataset: 'eia-930', year: '2026-10', retrieved: '2026-10-31', entry: small(['AAA']), input: files(dir, { AAA: book(HEADER, rows) }), outDir: out });
  assert.equal(one.ok, true, JSON.stringify(one.failures));
  // EIA revises the 2019 hour only.
  const later = { ...small(['AAA']), vintages: { '2026-11': small(['AAA']).vintages['2026-10'] } };
  const two = await runRecipe({ dataset: 'eia-930', year: '2026-11', retrieved: '2026-11-30', entry: later, input: files(dir, { AAA: book(HEADER, [rows[0], row('AAA', '2019-01-01T01:00:00', 1250)]) }), outDir: out });
  assert.equal(two.ok, true, JSON.stringify(two.failures));
  const sum = (m, p) => m.tables[0].shards.find((s) => s.path === p).sha256;
  assert.equal(sum(two.manifest, 'hourly/AAA-2018.bin'), sum(one.manifest, 'hourly/AAA-2018.bin'));
  assert.notEqual(sum(two.manifest, 'hourly/AAA-2019.bin'), sum(one.manifest, 'hourly/AAA-2019.bin'));
  assert.deepEqual([two.manifest.tables[0].changes.changed, two.manifest.tables[0].changes.added], [1, 0]);
  // The revised hour is reported under its year with its range.
  assert.deepEqual(two.manifest.tables[0].changes.by, [{ group: 2019, changed: 1, added: 0, removed: 0, first: '2019-01-01T00:00Z', last: '2019-01-01T00:00Z' }]);
});

test('revisions by year: 500 changed hours in a month, an old year revised, and new hours added', () => {
  const H = (iso) => Date.parse(`${iso}:00Z`) / 3_600_000;
  const before = [];
  for (let h = H('2021-03-01T00'); h < H('2021-03-01T00') + 600; h++) before.push({ ba: 'PJM', year: 2021, hour: h, demand: 100 });
  for (let h = H('2026-10-01T00'); h < H('2026-10-01T00') + 700; h++) before.push({ ba: 'PJM', year: 2026, hour: h, demand: 100 });
  const rows = before.map((r) => ({ ...r }));
  // EIA revises 20 hours of March 2021 and 500 of October 2026, and posts 24 new hours.
  rows.filter((r) => r.year === 2021).slice(100, 120).forEach((r) => { r.demand = 101; });
  rows.filter((r) => r.year === 2026).slice(0, 500).forEach((r) => { r.demand = 99; });
  for (let h = H('2026-10-01T00') + 700; h < H('2026-10-01T00') + 724; h++) rows.push({ ba: 'PJM', year: 2026, hour: h, demand: 100 });
  const c = changesFrom(rows, before, ['ba', 'hour'], entry.tables[0].changelog);
  assert.deepEqual([c.changed, c.added, c.removed], [520, 24, 0]);
  assert.deepEqual(c.by, [
    { group: 2021, changed: 20, added: 0, removed: 0, first: '2021-03-05T04:00Z', last: '2021-03-05T23:00Z' },
    { group: 2026, changed: 500, added: 24, removed: 0, first: '2026-10-01T00:00Z', last: '2026-10-31T03:00Z' },
  ]);
});

test('a web page where a workbook should be is refused by name', async () => {
  const dir = tempDir('gridprims-eia930-in-');
  const input = files(dir, { AAA: new TextEncoder().encode('<!doctype html><html></html>') });
  const r = await runRecipe({ dataset: 'eia-930', year: '2026-10', retrieved: '2026-10-31', entry: small(['AAA']), input, outDir: tempDir('gridprims-eia930-out-') });
  assert.equal(r.ok, false);
  assert.match(r.failures.join('\n'), /AAA: This file is not an .xlsx workbook/);
});

test('a value the shard cannot hold fails the run with nothing written', async () => {
  const dir = tempDir('gridprims-eia930-in-');
  const out = tempDir('gridprims-eia930-out-');
  const input = files(dir, { AAA: book(HEADER, [row('AAA', '2018-07-01T01:00:00', 1000), row('AAA', '2019-07-01T01:00:00', 3e9)]) });
  const r = await runRecipe({ dataset: 'eia-930', year: '2026-10', retrieved: '2026-10-31', entry: small(['AAA']), input, outDir: out });
  assert.equal(r.ok, false);
  assert.match(r.failures.join('\n'), /demand: 3000000000 does not fit an int32 at scale 1/);
  assert.equal(existsSync(join(out, 'eia-930')), false, 'no shard of the earlier year was written');
});

test('a missing header column is refused rather than misread', async () => {
  const dir = tempDir('gridprims-eia930-in-');
  const header = HEADER.map((h) => (h === 'CO2 Emissions Intensity for Consumed Electricity' ? 'CO2 Intensity' : h));
  const r = await runRecipe({ dataset: 'eia-930', year: '2026-10', retrieved: '2026-10-31', entry: small(['AAA']), input: files(dir, { AAA: book(header, [row('AAA', '2018-07-01T01:00:00', 1)]) }), outDir: tempDir('gridprims-eia930-out-') });
  assert.equal(r.ok, false);
  assert.match(r.failures.join('\n'), /AAA: header lacks CO2 Emissions Intensity for Consumed Electricity/);
});

test('f32 columns: values passed through Math.fround read back exactly, and huge outliers fit', () => {
  const schema = [{ name: 'x', type: 'f32' }];
  const rows = [{ x: Math.fround(0.81234567) }, { x: null }, { x: Math.fround(-224872252.3) }];
  assert.deepEqual(readShard(writeShard(rows, schema)).rows(), rows);
});

test('i32 columns: scaled integers read back exactly, missing as null, and out of range refused', () => {
  const schema = [{ name: 'x', type: 'i32', scale: 1000 }];
  const rows = [{ x: 1.234 }, { x: null }, { x: -2_000_000.5 }];
  assert.deepEqual(readShard(writeShard(rows, schema)).rows(), rows);
  assert.throws(() => writeShard([{ x: 3e6 }], schema), /does not fit an int32/);
});
