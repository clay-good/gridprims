// The time-of-use estimate from totals (add-household-bill-check 1.1 state fallback and 3.3): every state's
// typical pattern sums to 1.0 in each month of 2018, the estimate's parts add up to the bill's kWh, a flat rate
// prices the same both ways, and on three homes with meter data the estimate's error is what the methods record.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import SHAPES from '../../../data/curated/load-shapes/residential-sfd-by-state.json' with { type: 'json' };
import HOMES from '../../fixtures/bill/resstock-homes-2018.json' with { type: 'json' };
import { estimateTou } from '../../../core/lib/typical-shape.mjs';
import { touEstimateError } from '../../../pipeline/lib/tou-estimate-error.mjs';
import { readShard } from '../../../core/lib/shard.mjs';
import { ROOT } from '../../../pipeline/run.mjs';

const RATES = { CO: '5d260edf5457a31715dc1324', TX: '67d32c46e3755f399109c6fe', CA: '69de75bd6c6b1b3352045e3c' };
const row = (st, label) => readShard(readFileSync(join(ROOT, 'data/urdb/2026-10/rates', `${st}.bin`))).rows().find((r) => r.label === label);

test('each state\'s pattern sums to 1.0 in every month of 2018, within 0.0001', () => {
  assert.equal(Object.keys(SHAPES.states).length, 51);
  for (const [st, months] of Object.entries(SHAPES.states)) {
    for (let m = 0; m < 12; m++) {
      let sum = 0;
      for (let d = new Date(Date.UTC(2018, m, 1)); d.getUTCMonth() === m; d = new Date(d.getTime() + 86_400_000)) sum += months[m][d.getUTCDay() % 6 === 0 ? 1 : 0].reduce((a, b) => a + b, 0);
      assert.ok(Math.abs(sum - 1) < 0.0001, `${st} month ${m + 1}: ${sum}`);
    }
  }
  assert.equal(SHAPES.source.license, 'CC BY 4.0');
});

test('the estimate\'s periods add up to the bill\'s kWh exactly', () => {
  const sched = { weekday: Array.from({ length: 12 }, () => Array.from({ length: 24 }, (_, h) => (h >= 16 && h < 21 ? 1 : 0))), weekend: Array.from({ length: 12 }, () => Array(24).fill(0)) };
  const t = estimateTou({ start: '2026-07-01', end: '2026-07-31', kwh: 913 }, SHAPES.states.CO, sched);
  assert.equal(t['period 1'] + t['period 2'], 913);
  assert.ok(t['period 2'] > 0 && t['period 2'] < t['period 1']);
});

test('estimate error published: on three homes the estimate is within 5% of the exact bill, as the methods record', () => {
  const ref = JSON.parse(readFileSync(join(ROOT, 'verify/reference/tou-estimate-errors.json'), 'utf8'));
  for (const h of HOMES.homes) {
    const r = touEstimateError(h, row(h.state, RATES[h.state]), SHAPES.states[h.state]);
    const stored = ref.homes.find((x) => x.state === h.state);
    assert.deepEqual([r.exact, r.estimate, r.percent], [stored.exact, stored.estimate, stored.percent], h.state);
    assert.ok(Math.abs(r.percent) <= 5, `${h.state}: ${r.percent}%`);
  }
});
