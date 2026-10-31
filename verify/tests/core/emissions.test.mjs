// Emissions from electricity use (grid calculators task 2.2): the spec's
// 800 lb/MWh case, the eGRID edition named, and CO₂e from the three gases
// against eGRID's own published CO₂e rates.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { GWP, metricTons } from '../../../core/tools/calc.energy-units.emissions/tool.mjs';
import { RATES } from '../../../core/tools/calc.energy-units.emissions/rates.mjs';
import { runTool } from '../../../core/contract/run.mjs';
import { getTool } from '../../../core/tools/index.mjs';

const ROOT = join(import.meta.dirname, '../../..');

test('1,000 MWh at 800 lb/MWh is 362.87 metric tons of CO₂ (800,000 lb × 0.45359237 kg/lb)', () => {
  assert.equal(Math.round(metricTons(1000, 800) * 100) / 100, 362.87);
});

test('the tool names the eGRID edition and the subregion, and says hourly data gives a better answer', () => {
  const { manifest, impl } = getTool('calc.energy-units.emissions');
  const r = runTool(manifest, impl, { mwh: 1000, subregion: 'ERCT' });
  assert.equal(r.status, 'ok');
  assert.match(r.sentence, /^1,000 MWh in ERCT is about [\d,.]+ metric tons of CO₂\. With other gases, it is [\d,.]+ tons of CO₂e \(eGRID2023\)\.$/);
  assert.ok(r.work.steps.some((s) => /hourly rates give a better answer/.test(s)));
  assert.equal(r.outputs.co2.display, (Math.round(1000 * RATES.ERCT.co2 * 0.45359237) / 1000).toFixed(2));
});

test('CO₂e from each subregion\'s three gases matches eGRID\'s published CO₂e rate within 0.1% in all 27 subregions', () => {
  const ref = JSON.parse(readFileSync(join(ROOT, 'verify/reference/egrid2023-co2e-check.json'), 'utf8'));
  assert.deepEqual(ref.gwp, { co2: 1, ...GWP });
  assert.equal(Object.keys(ref.subregions).length, 27);
  for (const [id, r] of Object.entries(ref.subregions)) {
    const ours = r.co2 + GWP.ch4 * r.ch4 + GWP.n2o * r.n2o;
    assert.ok(Math.abs(ours / r.publishedCo2e - 1) < ref.tolerance, `${id}: ${ours} against ${r.publishedCo2e}`);
  }
});

test('the rates module matches the served eGRID snapshot', () => {
  const fresh = execFileSync(process.execPath, [join(ROOT, 'verify/tools/egrid-rates.mjs')], { encoding: 'utf8' });
  assert.equal(readFileSync(join(ROOT, 'core/tools/calc.energy-units.emissions/rates.mjs'), 'utf8'), fresh, 'run node verify/tools/egrid-rates.mjs');
});
