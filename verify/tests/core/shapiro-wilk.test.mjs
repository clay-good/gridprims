// The Shapiro-Wilk test (add-reliability-tools task 3.3): our implementation of
// Royston's AS R94 against SciPy's on 29 samples from n = 3 to 2,000, and the
// major-event-day threshold's report of the log-normal assumption.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT } from '../../../pipeline/run.mjs';
import { normalQuantile, normalUpper, shapiroWilk } from '../../../core/lib/shapiro-wilk.mjs';
import { NORMALITY_LEVEL, logNormality, threshold } from '../../../core/lib/reliability.mjs';

const ref = JSON.parse(readFileSync(join(ROOT, 'verify/reference/shapiro-wilk/scipy-cases.json'), 'utf8'));

test('W and p match SciPy\'s shapiro on every reference sample', () => {
  assert.ok(ref.cases.length >= 25);
  for (const c of ref.cases) {
    const r = shapiroWilk(c.x);
    assert.equal(r.status, 'ok', c.name);
    assert.ok(Math.abs(r.W - c.W) < 1e-9, `${c.name}: W ${r.W} vs ${c.W}`);
    // p to one part in a hundred thousand, even at 6e-27.
    assert.ok(Math.abs(r.p - c.p) <= 1e-5 * c.p + 1e-12, `${c.name}: p ${r.p} vs ${c.p}`);
  }
});

test('the normal quantile and tail agree with standard values', () => {
  assert.ok(Math.abs(normalQuantile(0.975) - 1.959963984540054) < 1e-12);
  assert.ok(Math.abs(normalQuantile(0.5)) < 1e-15);
  assert.ok(Math.abs(normalQuantile(1e-10) + 6.361340902404056) < 1e-9);
  assert.ok(Math.abs(normalUpper(1.959963984540054) - 0.025) < 1e-8);
  assert.ok(Math.abs(normalUpper(-1.959963984540054) - 0.975) < 1e-8);
});

test('too few values, too many, or no spread are refused rather than tested', () => {
  assert.equal(shapiroWilk([1, 2]).status, 'refused');
  assert.equal(shapiroWilk([4, 4, 4, 4]).status, 'refused');
  assert.equal(shapiroWilk(Array.from({ length: 5001 }, (_, i) => i)).status, 'refused');
});

/** Daily minutes per customer: quiet days, then a handful of storm days far above them. */
const day = (i, m) => ({ day: `2025-${String(1 + Math.floor(i / 28)).padStart(2, '0')}-${String(1 + (i % 28)).padStart(2, '0')}`, minutesPerCustomer: m });

test('assumption fails: a log dominated by a few storm days says so, keeps the threshold, and advises both bases', () => {
  const quiet = Array.from({ length: 60 }, (_, i) => day(i, 0.2 + (i % 7) * 0.01));
  const storms = [90, 120, 150, 200, 260].map((m, i) => day(60 + i, m));
  const t = threshold([...quiet, ...storms], { calendarDays: 365 });
  assert.equal(t.status, 'ok');
  assert.ok(t.value > 0, 'the threshold stays visible as a reference');
  assert.equal(t.normality.test, 'Shapiro-Wilk');
  assert.equal(t.normality.level, 0.05);
  assert.equal(t.normality.holds, false);
  assert.match(t.normality.sentence, /fail a normality test \(W = 0\.\d{4}, p = (under 0\.0001|0\.\d+), over 65 days with interruptions\)/);
  assert.match(t.normality.sentence, /the threshold may be unreliable for this data\. It is still shown for reference\./);
  assert.match(t.normality.warning, /both bases, with and without the flagged days, and state the method you used/);
  assert.equal(t.normality.ours, 'The test (Shapiro-Wilk) and the 5% level are our choice; the published method names neither.');
});

test('assumption holds: log-normal daily values pass, and the result says only that it is not contradicted', () => {
  // Logarithms spread evenly across normal quantiles: as normal as 40 values can be.
  const logs = Array.from({ length: 40 }, (_, i) => normalQuantile((i + 0.5) / 40));
  const t = logNormality(logs);
  assert.equal(t.holds, true);
  assert.ok(t.p > NORMALITY_LEVEL);
  assert.match(t.sentence, /pass a normality test .* not contradicted by this data\./);
  assert.equal(t.warning, null);
});
