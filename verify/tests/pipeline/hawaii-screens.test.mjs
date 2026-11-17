// Hawaii's Rule 14H screens as records (add-interconnection-screens 1.2): each threshold is in the same screen
// of both companies' Rule 14 by the two-source route, and the 15% screen matches the federal one.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { SCREENS, record } from '../../../data/curated/interconnect/hi/_screens.mjs';
import { checkRecord } from '../../../pipeline/lib/curated.mjs';
import { checkScreenRecord } from '../../../pipeline/lib/screen-records.mjs';
import RECORDS from '../../../data/curated/interconnect/_index.mjs';
import { compareScreens } from '../../../core/lib/screen-compare.mjs';
import { ROOT } from '../../../pipeline/run.mjs';

const body = (f) => readFileSync(`${ROOT}/data/curated/captures/interconnect/${f}`, 'utf8').split('\n----\n')[1];
const part = (text, n) => { const at = text.indexOf(`[Screen ${n}]`); assert.ok(at >= 0, n); const next = text.indexOf('\n[', at + 1); return text.slice(at, next < 0 ? undefined : next); };

test('every threshold is in the same screen of both companies\' Rule 14', () => {
  for (const s of SCREENS) for (const x of s.numbers) for (const f of ['heco-rule-14-screens.txt', 'meco-rule-14-screens.txt']) assert.ok(part(body(f), s.id).includes(x), `${f} Screen ${s.id}: ${x}`);
});

test('each record passes with two independent sources, and Screen 5 is the federal test and number', () => {
  for (const s of SCREENS) {
    const r = record(s.id);
    assert.deepEqual(checkScreenRecord(r), [], s.id);
    const c = checkRecord(r, ROOT);
    assert.deepEqual(c.problems, [], s.id);
    assert.deepEqual(c.labels, {}, s.id);
  }
  const rows = compareScreens(RECORDS).flatMap((f) => f.rows);
  assert.equal(rows.find((r) => r.id === 'hi-rule-14-screen-5').versusFederal, 'same');
  assert.equal(rows.find((r) => r.id === 'hi-rule-14-screen-9').versusFederal, 'same');
});
