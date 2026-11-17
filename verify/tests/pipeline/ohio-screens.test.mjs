// Ohio's Level 2 screens as records (add-interconnection-screens 1.2): each number is in its own paragraph of
// the stored rule text, and each record passes the curated and screen-record rules.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { SCREENS, record } from '../../../data/curated/interconnect/oh/_screens.mjs';
import { checkRecord } from '../../../pipeline/lib/curated.mjs';
import { checkScreenRecord } from '../../../pipeline/lib/screen-records.mjs';
import { ROOT } from '../../../pipeline/run.mjs';

const text = readFileSync(`${ROOT}/data/curated/captures/interconnect/oh-oac-4901-1-22-07.txt`, 'utf8').split('\n----\n')[1];
const part = (locator) => { const at = text.indexOf(`[${locator}]`); assert.ok(at >= 0, locator); const next = text.indexOf('\n[', at + 1); return text.slice(at, next < 0 ? undefined : next); };

test('every number is in its own paragraph of the rule', () => {
  for (const s of SCREENS) for (const x of s.numbers) assert.ok(part(s.locator).includes(x), `${s.locator}: ${x}`);
  assert.match(part('4901:1-22-07(B)(1)(d)'), /shall not exceed one hundred per cent of the line section's relevant minimum load/);
});

test('each record passes', () => {
  for (const s of SCREENS) {
    const r = record(s.id);
    assert.deepEqual(checkScreenRecord(r), [], s.id);
    assert.deepEqual(checkRecord(r, ROOT).problems, [], s.id);
  }
});
