// weather.change.explain (add-weather-normalization 3.1 to 3.6): the parts
// always sum to the total and every formula is shown; a colder winter, a
// change from something else, and the same weather each read as they should;
// flat use, a stated heat pump, and short bills are refused with the reason;
// the checklist never names a cause; and the normal year carries its caveat.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getTool } from '../../../core/tools/index.mjs';
import { runTool } from '../../../core/contract/run.mjs';
import { billsText, weatherText } from '../../../core/tools/weather.change.explain/examples.mjs';
import { NORMALS_CAVEAT } from '../../../core/lib/weather-model.mjs';

const { manifest, impl } = getTool('weather.change.explain');
const run = (inputs) => runTool(manifest, impl, { change: 'none', ...inputs });

test('the three parts sum to the total change within 0.01 kWh, with every formula shown', () => {
  for (const ex of manifest.examples) {
    const r = impl.compute(ex.inputs);
    assert.equal(r.status, 'ok', ex.id);
    assert.ok(Math.abs(r.outputs.weather + r.outputs.use + r.outputs.fit - r.outputs.total) < 0.01, ex.id);
    for (const part of ['Weather part = ', 'Use part = ', 'Baseline fit part = ']) assert.ok(r.steps.some((s) => s.startsWith(part)), `${ex.id}: ${part}`);
    assert.ok(r.steps.some((s) => /= [+−][\d,]+ kWh, the total change/.test(s)), `${ex.id}: the sum is shown`);
  }
});

test('the sentences: weather, something else, and the same weather', () => {
  const [a, b, c] = manifest.examples.map((ex) => run(ex.inputs).sentence);
  assert.match(a, /About 1,109 kWh of the 1,109 kWh change was the weather; the rest is too small to tell/);
  assert.match(b, /About 1,109 kWh of the 2,569 kWh change was the weather, and about 1,460 kWh was something else/);
  assert.match(c, /The weather was about the same; the change came from how much power was used: about 1,460 kWh more/);
});

test('a use increase offers the checklist and never asserts a cause', () => {
  const r = impl.compute(manifest.examples[1].inputs);
  const list = r.steps.find((s) => s.startsWith('Things to check'));
  assert.match(list, /not a diagnosis/);
  for (const s of [...r.steps, r.sentence()]) assert.doesNotMatch(s, /\b(caused by|because of|due to|the cause (is|was))\b/i, s);
});

test('flat use is a real answer: no split, and the reason in words', () => {
  const periods = billsText(0, { slope: 0 });
  const r = run({ periods, weather: weatherText(0) });
  assert.equal(r.status, 'refused');
  assert.match(r.reason, /Weather does not explain this use/);
});

test('a heat pump from a date gets separate baselines and no split across it', () => {
  const r = run({ periods: billsText(6), weather: weatherText(6), change: 'heat pump from 2026-03-01' });
  assert.equal(r.status, 'refused');
  assert.match(r.reason, /A heat pump began on 2026-03-01, so one model cannot span it/);
  assert.match(r.reason, /Before the heat pump: the heating only model, [\d,]+ kWh over 16 periods/);
  assert.match(r.reason, /After the heat pump: no model, because A baseline from bills needs at least 11 billing periods/);
  assert.equal(run({ periods: billsText(6), weather: weatherText(6), change: 'heat pump' }).status, 'invalid');
});

test('fewer than 12 bills are refused before anything is fitted', () => {
  const r = run({ periods: billsText(6).split('\n').slice(0, 10).join('\n'), weather: weatherText(6) });
  assert.equal(r.status, 'invalid');
  assert.match(r.errors[0].message, /Enter 12 to 24 billing periods; there are 10/);
});

test('with normals, the normal year and the degree-day comparison appear with the caveat', () => {
  const normals = Array.from({ length: 365 }, (_, i) => { const d = new Date(Date.UTC(2025, 0, 1) + i * 86_400_000); return `normal ${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')} htdd_57=8 htdd_60=10 htdd_65=14`; });
  const r = impl.compute({ ...manifest.examples[0].inputs, weather: `${weatherText(6)}\n${normals.join('\n')}` });
  assert.equal(r.status, 'ok');
  assert.ok(r.outputs.normalKwh > 0);
  assert.ok(r.steps.includes(NORMALS_CAVEAT));
  assert.ok(r.steps.some((s) => /heating degree days at base 60 °F against 3,650 in the normal year/.test(s)));
});
