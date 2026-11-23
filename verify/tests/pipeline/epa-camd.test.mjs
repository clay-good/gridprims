// EPA CAMPD measured emissions (add-measured-plant-emissions 1.1 to 1.4): the
// registry entry and its captured terms, the hourly files streamed a line at a
// time into monthly unit totals and hourly regional totals, the short-ton to
// metric-ton conversion, the apportioned-unit flag, and a changed header
// refused rather than misread.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT, runRecipe } from '../../../pipeline/run.mjs';
import { postureOf, validateEntry } from '../../../pipeline/lib/registry.mjs';
import { readShard } from '../../../core/lib/shard.mjs';
import entry from '../../../pipeline/registry/epa-camd.mjs';
import { SHORT_TON_TO_TONNE, SPLIT_ZONE_STATES, STANDARD_OFFSETS, splitCsvLine, utcHourOf } from '../../../pipeline/normalize/camd-common.mjs';
import { tempDir } from '../../lib/temp.mjs';

const HOURLY_HEADER = '"State","Facility Name","Facility ID","Unit ID","unit_id","Associated Stacks","Date","Hour","Operating Time","Gross Load (MW)","Steam Load (1000 lb/hr)","SO2 Mass (lbs)","SO2 Mass Measure Indicator","SO2 Rate (lbs/mmBtu)","SO2 Rate Measure Indicator","CO2 Mass (short tons)","CO2 Mass Measure Indicator","CO2 Rate (short tons/mmBtu)","CO2 Rate Measure Indicator","NOx Mass (lbs)","NOx Mass Measure Indicator","NOx Rate (lbs/mmBtu)","NOx Rate Measure Indicator","Heat Input (mmBtu)","Heat Input Measure Indicator","Primary Fuel Type","Secondary Fuel Type","Unit Type","SO2 Controls","NOx Controls","PM Controls","Hg Controls","Program Code"';
const FACILITY_HEADER = '"State","Facility Name","Facility ID","Unit ID","Associated Stacks","Year","Program Code","Primary Rep Info","EPA Region","NERC Region","County","County Code","FIPS Code","Source Category","Latitude","Longitude","Owner/Operator","SO2 Phase","NOx Phase","Unit Type","Primary Fuel Type","Secondary Fuel Type","SO2 Controls","NOx Controls","PM Controls","Hg Controls","Commercial Operation Date","Operating Status","Max Hourly HI Rate (mmBtu/hr)","Associated Generators & Nameplate Capacity (MWe)"';

/** One hourly record, in the column order of EPA's file. */
const hourlyRow = ({ state = 'AL', plant = 3, unit = '1', stacks = '', date, hour, operating = 1, load = 100, so2 = 2, co2 = 50, nox = 3, heat = 500 }) =>
  `"${state}","Barry",${plant},"${unit}",378,"${stacks}","${date}",${hour},${operating},${load},,${so2},"Measured",0.01,"Measured",${co2},"Measured",0.05,"Calculated",${nox},"Measured",0.006,"Calculated",${heat},"Measured","Pipeline Natural Gas",,"Tangentially-fired",,"Low NOx Burner Technology w/ Closed-coupled OFA",,,"ARP, CSNOX"`;
const facilityRow = ({ state = 'AL', plant = 3, unit = '1', stacks = '', year, generators = '1 (153.1)' }) =>
  `"${state}","Barry",${plant},"${unit}","${stacks}",${year},"ARP, CSNOX","605449",4,"SERC","Mobile County","AL097","097","Electric Utility",31.0069,-88.0103,"Alabama Power Company (Owner)","Phase 2","Phase 2 Group 1","Tangentially-fired","Pipeline Natural Gas",,,"Selective Non-catalytic Reduction",,,"1954-02-12","Operating",2322,"${generators}"`;

/** A fixture release: two states, two years, a handful of hours. */
function fixture(dir, { hourlyHeader = HOURLY_HEADER } = {}) {
  const files = {};
  const write = (key, lines) => {
    const path = join(dir, `${key}.csv`);
    writeFileSync(path, `${lines.join('\n')}\n`);
    files[key] = path;
  };
  for (const year of [2024, 2025]) {
    write(`f${year}`, [FACILITY_HEADER, facilityRow({ year, unit: '1' }), facilityRow({ year, unit: '2', stacks: 'CS0AAN', generators: '2 (153.1)|3 (100)' }), facilityRow({ state: 'DE', plant: 594, unit: '1', year, generators: '1 (442)' })]);
    write(`h${year}-al`, [hourlyHeader,
      hourlyRow({ date: `${year}-01-01`, hour: 0 }),
      hourlyRow({ date: `${year}-01-01`, hour: 1, co2: 10, load: 40, heat: 100, operating: 0.5 }),
      hourlyRow({ date: `${year}-02-01`, hour: 0, co2: 20 }),
      hourlyRow({ date: `${year}-01-01`, hour: 0, unit: '2', stacks: 'CS0AAN', co2: 5, load: 10, heat: 50 }),
    ]);
    write(`h${year}-de`, [hourlyHeader, hourlyRow({ state: 'DE', plant: 594, date: `${year}-01-01`, hour: 0, co2: 7, load: 30, heat: 200 })]);
  }
  return files;
}

/** The registry entry cut down to the fixture's files and row counts. */
const small = (() => {
  const v = entry.vintages['2026-11'];
  const keys = ['f2024', 'f2025', 'h2024-al', 'h2024-de', 'h2025-al', 'h2025-de'];
  return {
    ...entry,
    vintages: { '2026-11': { ...v, files: Object.fromEntries(keys.map((k) => [k, v.files[k]])) } },
    tables: entry.tables.map((t) => ({
      ...t,
      recipe: t.recipe.map((s) => (s.step === 'validate' ? { ...s, rows: { ...s.rows, min: 1, max: 1000 } }
        : s.step === 'read-lines' ? { ...s, files: s.files.filter((f) => keys.includes(f)) } : s)),
    })),
  };
})();

const egridBuilt = existsSync(join(ROOT, 'data/egrid/current.json'));
const run = (input, outDir) => runRecipe({ dataset: 'epa-camd', year: '2026-11', retrieved: '2026-11-23', entry: small, input, outDir, joinDir: join(ROOT, 'data') });

test('the registry entry is valid, and EPA\'s own terms put it on derive', () => {
  assert.deepEqual(validateEntry(entry), []);
  const { posture, agrees } = postureOf(entry);
  assert.equal(posture, 'derive');
  assert.equal(agrees, true);
  // The disclaimer EPA states, verbatim, is what the posture rests on.
  assert.match(entry.terms.text, /non-commercial, scientific and educational purposes/);
  assert.match(entry.terms.text, /may be protected under the U.S. and Foreign Copyright Laws/);
  assert.equal(entry.openItems.length, 1);
  // Every hourly and facility file is named by its table's read step.
  const named = new Set(entry.tables.flatMap((t) => t.recipe.find((s) => s.step === 'read-lines').files));
  for (const key of Object.keys(entry.vintages['2026-11'].files)) assert.ok(named.has(key), `${key} is read by a table`);
});

test('no key or key name reaches the registry entry or its files', () => {
  const text = readFileSync(join(ROOT, 'pipeline/registry/epa-camd.mjs'), 'utf8');
  assert.ok(!/x-api-key|api_key|apiKey=/i.test(text), 'the bulk files take no key');
  for (const f of Object.values(entry.vintages['2026-11'].files)) assert.match(f.url, /^https:\/\/api\.epa\.gov\/easey\/bulk-files\//);
});

test('hourly files stream into monthly unit totals, with carbon dioxide in metric tons', { skip: !egridBuilt && 'egrid is not built' }, async () => {
  const out = tempDir('gridprims-camd-out-');
  const r = await run(fixture(tempDir('gridprims-camd-in-')), out);
  assert.equal(r.ok, true, JSON.stringify(r.failures));
  const rows = (table, shard) => readShard(readFileSync(join(out, 'epa-camd/2026-11', table, `${shard}.bin`))).rows();
  const al = rows('units_monthly', 'AL');
  const jan = al.find((x) => x.unit_id === '1' && x.year === 2024 && x.month === 1);
  // Two hours in January for unit 1: 50 and 10 short tons of CO2.
  assert.equal(jan.co2_tonnes, Math.round(60 * SHORT_TON_TO_TONNE * 1e6) / 1e6);
  assert.equal(jan.heat_input_mmbtu, 600);
  // 100 MW for a whole hour and 40 MW for half of one: EPA's own megawatt-hours.
  assert.equal(jan.gross_load_mwh, 120);
  assert.equal(jan.operating_hours, 1.5);
  assert.equal(jan.hours_reported, 2);
  assert.equal(jan.so2_lbs, 4);
  assert.equal(jan.nox_lbs, 6);
  assert.equal(jan.apportioned, 'no');
  // February is its own row, and each year is its own rows.
  assert.deepEqual(al.filter((x) => x.unit_id === '1').map((x) => [x.year, x.month]), [[2024, 1], [2024, 2], [2025, 1], [2025, 2]]);
  // A unit sharing a stack carries EPA's apportionment flag.
  assert.equal(al.find((x) => x.unit_id === '2').apportioned, 'yes');
  assert.equal(rows('units_monthly', 'DE').length, 2);
});

test('monitored units carry their plant, fuels, and summed nameplate, and no coordinates', { skip: !egridBuilt && 'egrid is not built' }, async () => {
  const out = tempDir('gridprims-camd-out-');
  assert.equal((await run(fixture(tempDir('gridprims-camd-in-')), out)).ok, true);
  const units = readShard(readFileSync(join(out, 'epa-camd/2026-11/units/AL.bin'))).rows();
  const one = units.find((u) => u.unit_id === '1' && u.year === 2024);
  assert.equal(one.plant_name, 'Barry');
  assert.equal(one.county, 'Mobile County');
  assert.equal(one.primary_fuel, 'Pipeline Natural Gas');
  assert.equal(one.programs, 'ARP, CSNOX');
  assert.equal(one.nameplate_mw, 153.1);
  assert.equal(one.apportioned, 'no');
  // Two associated generators are summed; the shared stack is flagged.
  const two = units.find((u) => u.unit_id === '2' && u.year === 2024);
  assert.equal(two.nameplate_mw, 253.1);
  assert.equal(two.apportioned, 'yes');
  assert.equal(two.associated_stacks, 'CS0AAN');
  // Unit to plant, region, and fuel, all by EPA's facility id and eGRID's ORISPL id, never by name.
  const { version } = JSON.parse(readFileSync(join(ROOT, 'data/egrid/current.json'), 'utf8'));
  const place = readShard(readFileSync(join(ROOT, 'data/egrid', version, 'plants/AL.bin'))).rows().find((p) => p.plant_id === 3);
  assert.equal(one.region, place.ba_code);
  assert.equal(one.subregion, place.subregion);
  assert.equal(one.egrid_match, 'yes');
  const columns = new Set(Object.keys(one));
  for (const c of ['latitude', 'longitude']) assert.ok(!columns.has(c), `${c} stays in EPA's file`);
});

test('regional hours are summed on a common clock, under eGRID\'s balancing authority, one shard per region and year', { skip: !egridBuilt && 'egrid is not built' }, async () => {
  const out = tempDir('gridprims-camd-out-');
  assert.equal((await run(fixture(tempDir('gridprims-camd-in-')), out)).ok, true);
  const { version } = JSON.parse(readFileSync(join(ROOT, 'data/egrid/current.json'), 'utf8'));
  const ba = readShard(readFileSync(join(ROOT, 'data/egrid', version, 'plants/AL.bin'))).rows().find((p) => p.plant_id === 3).ba_code;
  const rows = readShard(readFileSync(join(out, 'epa-camd/2026-11/region_hourly', `${ba}-2024.bin`))).rows();
  // Alabama keeps Central standard time, so midnight on the plant's clock is 06:00 UTC.
  const hour = Date.UTC(2024, 0, 1, 6) / 3_600_000;
  const first = rows.find((x) => x.hour === hour);
  assert.ok(first, 'the hour is on the UTC clock');
  // Both Alabama units ran in that hour: 50 and 5 short tons.
  assert.equal(first.co2_tonnes, Math.round(55 * SHORT_TON_TO_TONNE * 1e6) / 1e6);
  assert.equal(first.gross_load_mwh, 110);
  assert.equal(first.units_reporting, 2);
  assert.equal(first.region, ba);
  // Gross load is split by the fuel categories EIA-930 reports, so the estimate can be set beside it.
  assert.equal(first.load_ng_mwh, 110);
  assert.equal(first.load_col_mwh, 0);
});

test('a changed hourly header is refused rather than misread', { skip: !egridBuilt && 'egrid is not built' }, async () => {
  const dir = tempDir('gridprims-camd-in-');
  const input = fixture(dir);
  writeFileSync(input['h2024-al'], `"State","Facility ID","Unit ID","Date","Hour"\n`);
  const r = await run(input, tempDir('gridprims-camd-out-'));
  assert.equal(r.ok, false);
  assert.match(r.failures.join('\n'), /AL 2024: the hourly header is missing/);
});

test('a plant\'s hour is placed by its own state\'s clock, so a region spanning two zones does not mix hours', () => {
  // Noon on January 1 reads as 17:00 UTC in Georgia (Eastern standard) and 18:00 in Alabama (Central).
  assert.equal(utcHourOf('2025-01-01', 12, STANDARD_OFFSETS.GA) * 3_600_000, Date.UTC(2025, 0, 1, 17));
  assert.equal(utcHourOf('2025-01-01', 12, STANDARD_OFFSETS.AL) * 3_600_000, Date.UTC(2025, 0, 1, 18));
  // Every state the registry downloads a file for has an offset, and the split-zone ones are among them.
  const states = [...new Set(Object.keys(entry.vintages['2026-11'].files).map((k) => /^h\d{4}-([a-z]{2})$/.exec(k)?.[1]?.toUpperCase()).filter(Boolean))];
  for (const st of states) assert.equal(typeof STANDARD_OFFSETS[st], 'number', st);
  assert.ok(SPLIT_ZONE_STATES.every((st) => states.includes(st)));
});

test('EPA\'s quoted fields survive the split, commas and all', () => {
  assert.deepEqual(splitCsvLine('"AL","Barry",3,"1","","ARP, CSNOX",'), ['AL', 'Barry', '3', '1', '', 'ARP, CSNOX', '']);
  assert.deepEqual(splitCsvLine('"a""b",2'), ['a"b', '2']);
});
