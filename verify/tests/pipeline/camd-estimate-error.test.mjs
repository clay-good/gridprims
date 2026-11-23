// The published estimated-against-measured difference against an independent
// recomputation (add-measured-plant-emissions 3.5 and 3.6): three regions and
// two years recomputed in Python from EPA's hourly files, EIA's per-region
// workbooks, and eGRID's plant sheet, with the factors refitted, the hours
// moved, and the gates applied in that script's own code
// (verify/tools/camd-estimate-error.py).

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT } from '../../../pipeline/run.mjs';
import { loadComparison } from '../../../site/entities/estimated-vs-measured.mjs';
import { COVERAGE_FLOOR, GROSS_ALLOWANCE, MIN_FIT_R2 } from '../../../core/lib/estimated-vs-measured.mjs';

const ref = JSON.parse(readFileSync(join(ROOT, 'verify/reference/camd-estimate-error.json'), 'utf8'));
const comparison = loadComparison(join(ROOT, 'data'));
const skip = !comparison && 'epa-camd or eia-930 is not built';
/** Published and recomputed differences must agree to a tenth of a percentage point. */
const TOLERANCE_PP = 0.1;

test('the stored recomputation covers three regions and two years, from the publishers\' own files', () => {
  assert.equal(ref.cases.length, 6);
  assert.equal(new Set(ref.cases.map((c) => c.region)).size, 3);
  assert.equal(new Set(ref.cases.map((c) => c.year)).size, 2);
  // It applies the same gates, in its own code.
  assert.deepEqual(ref.gates, { coverageFloor: COVERAGE_FLOOR, minFitR2: MIN_FIT_R2, grossAllowance: GROSS_ALLOWANCE });
  for (const c of ref.cases) assert.ok(c.inputs.every((i) => /^[0-9a-f]{64}$/.test(i.sha256)), `${c.region} ${c.year} records its inputs`);
});

test('every published difference is within a tenth of a point of the independent recomputation', { skip }, () => {
  const off = [];
  for (const c of ref.cases) {
    const ours = comparison.rows.find((r) => r.region === c.region && r.year === c.year);
    if (!ours) { off.push(`${c.region} ${c.year}: not published`); continue; }
    assert.equal(ours.informative, c.informative, `${c.region} ${c.year}: the same verdict`);
    const gap = Math.abs(ours.difference * 100 - c.difference * 100);
    if (gap > TOLERANCE_PP) off.push(`${c.region} ${c.year}: ${(ours.difference * 100).toFixed(2)}% against ${(c.difference * 100).toFixed(2)}%`);
    // Coverage and the recovered natural-gas factor agree too, so the agreement is not a coincidence.
    if (Math.abs(ours.coverage - c.coverage) > 0.005) off.push(`${c.region} ${c.year} coverage: ${ours.coverage} against ${c.coverage}`);
    if (Math.abs(ours.fit.factors.gen_ng - c.factorsTonnesPerMwh.NG) > 0.002) off.push(`${c.region} ${c.year} gas factor: ${ours.fit.factors.gen_ng} against ${c.factorsTonnesPerMwh.NG}`);
  }
  assert.deepEqual(off, []);
});
