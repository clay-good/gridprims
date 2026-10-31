// Overhead conductor ampacity (grid calculators tasks 1.1 and 1.2): each
// scenario as the line-rating spec states it, and 50 stored linerate cases.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ampacity, mva } from '../../../core/lib/line-rating.mjs';
import { runTool } from '../../../core/contract/run.mjs';
import { getTool } from '../../../core/tools/index.mjs';

const { manifest, impl } = getTool('calc.line-rating.ampacity');
const base = manifest.examples[0].inputs;
const run = (o) => runTool(manifest, impl, { ...base, ...o });

test('higher wind raises the rating, and the sentence names the cooling that rose', () => {
  const slow = run({ wind: 2 });
  const fast = run({ wind: 4 });
  assert.ok(fast.outputs.amps.value > slow.outputs.amps.value);
  assert.ok(fast.outputs.convection.value > slow.outputs.convection.value);
  assert.match(fast.sentence, /^The line can carry [\d,]+ A at 100 °C\. In 4 ft\/s of wind, the air takes away [\d.]+ W\/ft of heat\.$/);
});

test('1,000 A on a 230 kV line is 398.4 MVA', () => {
  assert.equal(Math.round(mva(1000, 230) * 10) / 10, 398.4);
});

test('metric inputs give the same result as the equivalent US inputs within 0.01%', () => {
  const us = run({});
  const si = run({ units: 'si', diameter: 1.108 * 25.4, r1: 0.117 / 1.609344, r2: 0.1396 / 1.609344, wind: 2 * 0.3048, elevation: 0 });
  assert.ok(Math.abs(si.outputs.amps.value / us.outputs.amps.value - 1) < 1e-4);
  // Heat terms are per foot in US units and per meter in SI.
  assert.ok(Math.abs(si.outputs.convection.value * 0.3048 / us.outputs.convection.value - 1) < 1e-4);
});

test('50 stored cases: every ampacity within 1% of both linerate and pypacity', () => {
  const ref = JSON.parse(readFileSync(join(import.meta.dirname, '../../reference/line-rating/ieee738-cases.json'), 'utf8'));
  assert.equal(ref.cases.length, 50);
  for (const k of ref.cases) {
    const c = { diameterM: k.diameterM, r1: k.r25OhmPerM, t1: 25, r2: k.r75OhmPerM, t2: 75, emissivity: k.emissivity, absorptivity: k.absorptivity };
    const w = { ambientC: k.ambientC, windMps: k.windMps, windAngleDeg: k.windAngleDeg, elevationM: k.elevationM, latitude: k.latitude, lineAzimuthDeg: k.lineAzimuthDeg, dayOfYear: k.dayOfYear, solarHour: k.solarHour };
    const a = ampacity(c, w, k.maxTempC).amps;
    assert.ok(Math.abs(a / k.ampsLinerate - 1) < 0.01, `case ${k.id}: ${a} against linerate's ${k.ampsLinerate}`);
    assert.ok(Math.abs(a / k.ampsPypacity - 1) < 0.01, `case ${k.id}: ${a} against pypacity's ${k.ampsPypacity}`);
  }
});

test('the result states it is the conductor\'s thermal limit only', () => {
  const r = run({});
  assert.match(r.work.steps.at(-1), /thermal limit only; terminal equipment, emergency ratings, and clearances also limit a line/);
  assert.equal(run({ date: '2025-02-30' }).status, 'invalid');
});

test('the rating table: one row per degree from −20 to 45 °C with day and night amps, and the assumptions in a header comment', async () => {
  const { ratingTable, ratingTableCsv } = await import('../../../core/lib/line-rating.mjs');
  const c = { diameterM: 0.02814, r1: 7.27e-5, t1: 25, r2: 8.67e-5, t2: 75, emissivity: 0.8, absorptivity: 0.8 };
  const w = { windMps: 0.61, windAngleDeg: 90, elevationM: 0, latitude: 30, lineAzimuthDeg: 90, dayOfYear: 172, solarHour: 14 };
  const rows = ratingTable(c, w, 100);
  assert.equal(rows.length, 66);
  assert.deepEqual([rows[0].ambientC, rows.at(-1).ambientC], [-20, 45]);
  assert.ok(rows.every((r) => r.nightAmps > r.dayAmps), 'night has no solar gain');
  assert.ok(rows.every((r, i) => i === 0 || r.dayAmps < rows[i - 1].dayAmps), 'hotter air, lower rating');
  const csv = ratingTableCsv(rows, ['Wind 2 ft/s at 90 degrees', 'Maximum conductor temperature 100 °C']).trim().split('\n');
  assert.match(csv[1], /excludes terminal equipment and emergency ratings/);
  assert.ok(csv.includes('# Wind 2 ft/s at 90 degrees'));
  const header = csv.indexOf('ambient_c,day_amps,night_amps');
  assert.equal(csv.length - header - 1, 66);
  assert.match(csv[header + 1], /^-20,\d+,\d+$/);
});

test('the conductor library: every entry has its RUS source and license, diameters only, and Drake is 795 kcmil 26/7 at 1.108 in', async () => {
  const lib = JSON.parse(readFileSync(join(import.meta.dirname, '../../../data/curated/conductors-acsr.json'), 'utf8'));
  assert.match(lib.source, /Rural Utilities Service, Bulletin 1724E-200/);
  assert.equal(lib.license, 'U.S. federal government work, public domain');
  assert.ok(lib.conductors.length >= 30);
  for (const c of lib.conductors) assert.deepEqual(Object.keys(c).sort(), ['diameterIn', 'name', 'size', 'stranding'], c.name);
  assert.deepEqual(lib.conductors.find((c) => c.name === 'Drake'), { name: 'Drake', size: '795 kcmil', stranding: '26/7', diameterIn: 1.108 });
});
