// The curated state regulator links (add-ratepayer-tools 1.5, design D2):
// one entry per state and DC, each link checked and none left broken.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import REGULATORS from '../../../data/curated/regulators.mjs';

const checked = JSON.parse(readFileSync(new URL('../../reference/regulator-links.json', import.meta.url), 'utf8'));

test('one regulator for each state and DC, with a name and an https homepage', () => {
  assert.equal(REGULATORS.length, 51);
  assert.equal(new Set(REGULATORS.map((r) => r.state)).size, 51);
  for (const r of REGULATORS) {
    assert.match(r.state, /^[A-Z]{2}$/);
    assert.ok(r.name && r.stateName, r.state);
    for (const k of ['home', 'docket', 'comment']) if (r[k] !== undefined) assert.match(r[k], /^https:\/\//, `${r.state} ${k}`);
  }
});

test('every link resolves: each was checked, and none came back broken', () => {
  for (const r of REGULATORS) {
    for (const k of ['home', 'docket', 'comment']) {
      if (!r[k]) continue;
      const c = checked.links[r[k]];
      assert.ok(c, `${r.state} ${k} was never checked; rerun verify/tools/regulator-links.mjs`);
      assert.notEqual(c.state, 'broken', `${r.state} ${k} ${r[k]} returned ${c.status}`);
    }
  }
});
