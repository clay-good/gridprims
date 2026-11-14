// "How unusual was this year" on the usage benchmark (add-weather-normalization
// task 4.2): with a station, the result names the degree-day comparison against
// NOAA's normals for the same days, and the station; with none, nothing changes.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getTool } from '../../../core/tools/index.mjs';
import { runTool } from '../../../core/contract/run.mjs';
import { againstNormal, readWeather } from '../../../core/lib/weather-text.mjs';
import { NORMALS_CAVEAT } from '../../../core/lib/weather-model.mjs';

const { manifest, impl } = getTool('household.usage-benchmark.compare');
const base = manifest.examples[0].inputs;
const DAY = 86_400_000;
const iso = (t) => new Date(t).toISOString().slice(0, 10);

/** A station: 2025's daily means `warmer` °F above a flat normal of 50 °F (15 heating degree days a day at base 65). */
function station(warmer) {
  const lines = ['station USW00013958 Austin Camp Mabry'];
  for (let t = Date.UTC(2025, 0, 1); t <= Date.UTC(2025, 11, 31); t += DAY) lines.push(`${iso(t)} ${50 + warmer}`);
  for (let t = Date.UTC(2025, 0, 1); t <= Date.UTC(2025, 11, 31); t += DAY) lines.push(`normal ${iso(t).slice(5)} htdd_65=15 cldd_65=0`);
  return lines.join('\n');
}

test('warm year: 2.7 °F warmer every day is 18% fewer heating degree days, named with the station and the base', () => {
  const r = runTool(manifest, impl, { ...base, weather: station(2.7) });
  assert.equal(r.status, 'ok');
  const line = r.work.steps.find((s) => s.startsWith('How unusual the weather was'));
  assert.ok(line, 'the weather line is there');
  assert.match(line, /Austin Camp Mabry \(station USW00013958\)/);
  assert.match(line, /recorded 4,490 heating degree days, 18% fewer than normal \(5,475\), and no cooling degree days, as normal/);
  assert.match(line, /at base 65 °F over the 365 days with a reading/);
  assert.ok(r.work.steps.includes(NORMALS_CAVEAT), 'the smoothed-normals caveat travels with it');
  // The answer itself does not change: weather is context, not a correction.
  assert.deepEqual(r.outputs, runTool(manifest, impl, base).outputs);
});

test('no station: no weather line, and a caller that leaves the input out is not refused', () => {
  const r = runTool(manifest, impl, base);
  const { weather, ...without } = base;
  assert.equal(weather, 'none');
  assert.deepEqual(runTool(manifest, impl, without).outputs, r.outputs);
  assert.ok(!r.work.steps.some((s) => s.startsWith('How unusual the weather was')));
});

test('a station without normals, or text that is not weather, is asked about, not guessed', () => {
  const noNormals = runTool(manifest, impl, { ...base, weather: 'station X Somewhere\n2025-01-01 40' });
  assert.equal(noNormals.status, 'invalid');
  assert.match(noNormals.errors[0].message, /its daily temperatures and its normals are both needed/);
  const junk = runTool(manifest, impl, { ...base, weather: 'sunny and mild' });
  assert.equal(junk.errors[0].field, 'weather');
});

test('days without a reading are left out of both sides and counted', () => {
  const w = readWeather(station(0));
  for (let t = Date.UTC(2025, 5, 1); t < Date.UTC(2025, 5, 11); t += DAY) w.means.delete(iso(t));
  const n = againstNormal(w, '2025-01-01', '2025-12-31');
  assert.equal(n.days, 355);
  assert.equal(n.span, 365);
  assert.equal(n.hddChange, 0, 'a normal year compares as normal');
});
