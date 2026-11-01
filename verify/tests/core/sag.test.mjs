// Midspan clearance (add-overhead-line-checks 1.5, 4.1 to 4.5): lengths as
// crews write them, the parabolic sag and lowest point by RUS Bulletin
// 1724E-152, the gap to the line above, rounding toward more clearance, and
// 50 exact-catenary cases from a separate script.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { feetInches, parseLength } from '../../../core/lib/field-length.mjs';
import { catenarySag, lowestPoint, parabolicSag, sagAt, smallestGap } from '../../../core/lib/sag.mjs';
import { runTool } from '../../../core/contract/run.mjs';
import { TOOLS } from '../../../core/tools/index.mjs';
import { ROOT } from '../../../pipeline/run.mjs';

const tool = TOOLS.find((t) => t.manifest.id === 'lines.midspan-clearance.check');
const run = (over) => runTool(tool.manifest, tool.impl, { ...tool.manifest.examples[0].inputs, ...over });

test('20 hand-written heights read as the feet a crew meant', () => {
  const cases = [["22'4\"", 22 + 4 / 12], ['22’4”', 22 + 4 / 12], ["22' 4\"", 22 + 4 / 12], ['22-4', 22 + 4 / 12], ['22 ft 4 in', 22 + 4 / 12], ['22 ft 4 in.', 22 + 4 / 12], ['22 feet 4 inches', 22 + 4 / 12], ['22ft4in', 22 + 4 / 12],
    ['22.33 ft', 22.33], ['22 ft', 22], ["22'", 22], ['22′ 4″', 22 + 4 / 12], ['40 in', 40 / 12], ['40"', 40 / 12], ['40 inches', 40 / 12], ['18-0', 18], ['18-11.5', 18 + 11.5 / 12], ['6.8 m', 6.8 / 0.3048], ['680 cm', 6.8 / 0.3048], ['  22 FT 4 IN  ', 22 + 4 / 12]];
  assert.equal(cases.length, 20);
  for (const [text, ft] of cases) assert.ok(Math.abs(parseLength(text).ft - ft) < 1e-9, text);
  assert.match(parseLength('22-12').error, /a foot or more/);
  assert.match(parseLength('twenty feet').error, /not a length we read/);
});

test('a metric height reads in feet, and lengths round toward more clearance', () => {
  assert.equal(feetInches(parseLength('7 m').ft, 'down'), '22 ft 11 in.');
  assert.equal(feetInches(2.501, 'up'), '2 ft 7 in.');
  assert.equal(feetInches(22.499, 'down'), '22 ft 5 in.');
  assert.equal(feetInches(1.875, 'up', 0.5), '1 ft 10.5 in.');
});

test('level, unequal, and at-a-pole spans give the spec\'s sag and lowest points', () => {
  const D = parabolicSag(0.5, 200, 1000);
  assert.equal(D, 2.5);
  assert.deepEqual(lowestPoint({ a: 25, b: 25, sag: D }, 200), { height: 22.5, fromLower: 100, atPole: false, midspan: true });
  const u = lowestPoint({ a: 25, b: 21, sag: D }, 200);
  assert.ok(Math.abs(u.fromLower - 60) < 1e-9 && Math.abs(u.height - 20.1) < 1e-9);
  assert.equal(feetInches(u.height, 'down'), '20 ft 1 in.');
  assert.deepEqual(lowestPoint({ a: 25, b: 21, sag: parabolicSag(0.5, 100, 1000) }, 100), { height: 21, fromLower: 0, atPole: true, midspan: false });
  assert.equal(sagAt(2.5, 200, 50), 1.875);
  const g = smallestGap({ a: 25, b: 25, sag: 2.5 }, { a: 25 + 40 / 12, b: 25 + 40 / 12, sag: 4 }, 200);
  assert.ok(Math.abs(g.gap * 12 - 22) < 1e-9 && g.midspan);
});

test('the answer waits for what the span crosses, then gives the margin or the shortfall with its source', () => {
  assert.equal(run({ crosses: 'not-chosen' }).sentence, 'The lowest point is 22 ft 6 in., at midspan. What does the span cross?');
  assert.equal(run({}).sentence, 'The lowest point is 22 ft 6 in., 4 ft 6 in. above the 18 ft your rules require over a road.');
  assert.equal(run({ heightA: '20 ft 2 in', heightB: '20 ft 2 in', sag: '2 ft 6 in' }).sentence, 'The lowest point is 4 in. lower than the 18 ft your rules require over a road.');
  assert.equal(run({ span: '100 ft', heightB: '21 ft', ruleSource: 'none' }).sentence, 'The lowest point is at the lower pole, at 21 ft 0 in.');
  const gap = run({ crosses: 'not-chosen', sag: '2 ft 6 in', above: '28 ft 4 in, 28 ft 4 in, 4 ft', midspanSep: '30 in' });
  assert.match(gap.sentence, /The gap to the line above is 22 in\. at midspan, 8 in\. short of the 30 in\. midspan value\.$/);
  assert.equal(run({ ruleSource: 'none' }).outputs.margin, undefined, 'no rules, no pass or fail');
});

test('every result says it is at the condition entered; deep sag shows the catenary beside it', () => {
  assert.ok(run({}).work.steps.some((s) => /At the condition you entered: it does not adjust for hotter or icier conditions/.test(s)));
  const deep = run({ span: '300 ft', tension: 100, weight: 0.5 });
  assert.ok(deep.work.steps.some((s) => /exact catenary sag is .* parabolic method understates deep sag/.test(s)), deep.work.steps.join('\n'));
  assert.equal(run({ span: 'twenty' }).errors[0].field, 'span');
});

test('50 exact-catenary cases: the parabolic sag is within 1% wherever sag is under 5% of the span', () => {
  const ref = JSON.parse(readFileSync(join(ROOT, 'verify/reference/catenary-50.json'), 'utf8'));
  assert.equal(ref.cases.length, 50);
  let shallow = 0;
  for (const c of ref.cases) {
    const p = parabolicSag(c.weight_lb_per_ft, c.span_ft, c.tension_lb);
    if (p > 0.05 * c.span_ft) { assert.ok(p < c.catenary_sag_ft, `case ${c.id}: the parabolic method understates deep sag`); continue; }
    shallow++;
    assert.ok(Math.abs(p - c.catenary_sag_ft) / c.catenary_sag_ft < 0.01, `case ${c.id}`);
    if (c.height_diff_ft === 0) assert.ok(Math.abs(catenarySag(c.weight_lb_per_ft, c.span_ft, c.tension_lb) - c.catenary_sag_ft) < 1e-4, `case ${c.id} catenary`);
  }
  assert.ok(shallow >= 30, `${shallow} shallow cases`);
});

test('the lines tools may never say "meets code", "compliant", "approved", or "safe", even negated', async () => {
  const { findScoped } = await import('../../../verify/gates/claims.mjs');
  assert.deepEqual(findScoped('lines.midspan-clearance.check', 'The span does not meet code. It clears by 4 in.'), ['The span does not meet code.']);
  assert.deepEqual(findScoped('lines.midspan-clearance.check', 'This is not safe.'), ['This is not safe.']);
  assert.deepEqual(findScoped('calc.energy-units.convert', 'This is safe.'), [], 'other tools are not scoped');
});

test('GO 95: the thoroughfare clearance comes from Table 1, Case 3, Column B, with its footnotes as exceptions not checked', async () => {
  const { checkRecord } = await import('../../../pipeline/lib/curated.mjs');
  const go95 = (await import('../../../data/curated/go95/clearances.mjs')).default;
  const { problems, publishable } = checkRecord(go95, ROOT);
  assert.deepEqual(problems, []);
  assert.deepEqual(publishable['ground.road.comm'], { ft: 18, footnotes: ['c', 'd', 'j', 'l', 'm', 'ii', 'kkk'] });
  // The values are the ones in the captured table text.
  const t1 = readFileSync(join(ROOT, 'data/curated/captures/go95/table-1.txt'), 'utf8');
  assert.match(t1, /^3 \| Crossing or along thoroughfares in urban districts[^\n]*\| 18 Feet \(j\) \(l\) \(m\) \(ii\) \(kkk\) \|/m);
  assert.match(readFileSync(join(ROOT, 'data/curated/captures/go95/table-2.txt'), 'utf8'), /^8 \| Communication Conductors and Service Drops \| - \| - \| 12 \(j, rr\) \| 48 \(k , l , m , n , pp \) \| 48 \(k\) \|/m);
  const r = run({ ruleSource: 'go95', required: 'none' });
  assert.equal(r.sentence, 'The lowest point is 22 ft 6 in., 4 ft 6 in. above the 18 ft GO 95 requires over a road.');
  assert.ok(r.work.steps.includes('GO 95 Table 1, Case 3, Column B: 18 ft. Exceptions not checked: (c) (d) (j) (l) (m) (ii) (kkk).'));
  const p = run({ ruleSource: 'go95', crosses: 'pedestrian' });
  assert.match(p.sentence, /above the 10 ft GO 95 requires over an area only people on foot can reach/);
});
