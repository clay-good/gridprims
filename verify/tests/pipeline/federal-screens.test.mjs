// The federal Fast Track screen records (add-interconnection-screens 1.2): each threshold is checked against
// both primary documents by the two-source route, section by section, and agrees with what the fast-track tool
// shows; every record passes the curated and screen-record rules.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { SCREENS, record } from '../../../data/curated/interconnect/federal/_screens.mjs';
import { checkRecord } from '../../../pipeline/lib/curated.mjs';
import { checkScreenRecord } from '../../../pipeline/lib/screen-records.mjs';
import { runTool } from '../../../core/contract/run.mjs';
import { getTool } from '../../../core/tools/index.mjs';
import { ROOT } from '../../../pipeline/run.mjs';

const capture = (f) => readFileSync(`${ROOT}/data/curated/captures/interconnect/${f}`, 'utf8').split('\n----\n')[1];
/** One section's text: from its number to the next section's. */
const section = (text, prefix, n) => {
  const at = text.search(new RegExp(`${prefix.replace(/\./g, '\\.')}${n}\\.?\\s`));
  const next = n < 10 ? text.search(new RegExp(`${prefix.replace(/\./g, '\\.')}${n + 1}\\.?\\s`)) : text.length;
  assert.ok(at >= 0 && next > at, `${prefix}${n} not found`);
  return text.slice(at, next).replace(/\s+/g, ' ');
};
const ferc = capture('ferc-sgip-2.2.1.txt');
const nyiso = capture('nyiso-oatt-32.2.2.1.txt');

test('every threshold number is in the same screen of both primary documents', () => {
  for (const s of SCREENS) {
    for (const x of s.numbers ?? []) {
      const pattern = new RegExp(x.replace('.', '\\.').replace(/\s?(%|kW|MW)$/, '\\s?$1'));
      assert.match(section(ferc, '2.2.1.', s.n), pattern, `FERC § 2.2.1.${s.n}: ${x}`);
      assert.match(section(nyiso, '32.2.2.1.', s.n), pattern, `NYISO § 32.2.2.1.${s.n}: ${x}`);
    }
  }
  assert.match(section(ferc, '2.2.1.', 2), /15 % of the line section annual peak load/);
  assert.match(section(nyiso, '32.2.2.1.', 2), /15% of the line section annual peak load/);
});

test('every record passes the curated rules with two independent archived sources, and the screen-record schema', () => {
  for (let n = 1; n <= 10; n++) {
    const r = record(n);
    assert.deepEqual(checkRecord(r, ROOT).problems, [], `2.2.1.${n}`);
    assert.deepEqual(checkScreenRecord(r), [], `2.2.1.${n}`);
    assert.deepEqual(new Set(r.fields.threshold.sources.map((x) => x.publisher)).size, 2);
  }
});

test('the records and the fast-track tool name the same screens with the same numbers', () => {
  const { manifest, impl } = getTool('interconnect.fast-track.screens');
  const steps = runTool(manifest, impl, manifest.examples[0].inputs).work.steps;
  for (const s of SCREENS) {
    const step = steps.find((x) => x.startsWith(`§ 2.2.1.${s.n}, `));
    assert.ok(step, `the tool shows § 2.2.1.${s.n}`);
    for (const x of s.numbers ?? []) assert.ok(step.includes(x), `§ 2.2.1.${s.n}: the tool shows ${x}`);
  }
});
