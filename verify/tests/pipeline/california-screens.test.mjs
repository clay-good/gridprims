// California Rule 21's numbered screens as records (add-interconnection-screens 1.2): each threshold is found
// in the same screen of both PG&E's and SCE's tariff by the two-source route, and Screen M is the one where a
// published hosting capacity profile is the screen.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { SCREENS, record } from '../../../data/curated/interconnect/ca/_screens.mjs';
import { checkRecord } from '../../../pipeline/lib/curated.mjs';
import { checkScreenRecord } from '../../../pipeline/lib/screen-records.mjs';
import { ROOT } from '../../../pipeline/run.mjs';

const body = (f) => readFileSync(`${ROOT}/data/curated/captures/interconnect/${f}`, 'utf8').split('\n----\n')[1];
const part = (text, label) => { const at = text.indexOf(`[${label} (`); assert.ok(at >= 0, label); const next = text.indexOf('\n[', at + 1); return text.slice(at, next < 0 ? undefined : next); };
const pge = body('pge-rule-21-g.txt');
const sce = body('sce-rule-21-g.txt');

test('every threshold is in the same screen of both utilities\' Rule 21', () => {
  for (const s of SCREENS) {
    for (const x of s.numbers) {
      assert.ok(part(pge, s.capture).includes(x), `PG&E ${s.capture}: ${x}`);
      assert.ok(part(sce, s.capture).includes(x), `SCE ${s.capture}: ${x}`);
    }
  }
  // Screen M passes only when both profile questions are answered yes.
  for (const text of [pge, sce]) assert.match(part(text, 'Screen M with ICA values'), /If the response is “yes” to both a\) and b\), the Interconnection Request passes Screen M/);
});

test('each record passes with two independent archived sources', () => {
  for (const s of SCREENS) {
    const r = record(s.id);
    assert.equal(r.jurisdiction, 'CA');
    assert.deepEqual(checkScreenRecord(r), [], s.id);
    const c = checkRecord(r, ROOT);
    assert.deepEqual(c.problems, [], s.id);
    assert.deepEqual(c.labels, {}, `${s.id}: two sources, no single-source label`);
  }
});

test('hosting capacity is the screen: Screen M reads the published profiles, and the applicant can answer it from the map', () => {
  const m = record('m-ica');
  assert.match(m.fields.threshold.value, /90% of the lowest value in the ICA-SG 576 profile and at most 90% of the lowest value in the ICA-OF 576 profile/);
  assert.match(m.fields.testBasis.value, /published Integration Capacity Analysis profiles/);
  assert.equal(m.fields.whoAnswers.value, 'you');
  // Without published values, the older 15%-of-peak test applies and only the utility can answer it.
  assert.equal(record('m-peak').fields.whoAnswers.value, 'utility');
});
