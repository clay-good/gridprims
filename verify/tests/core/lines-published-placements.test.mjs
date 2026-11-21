// Worked placements from published joint-use standards (add-overhead-line-checks 3.7): PacifiCorp's EU 101 shows
// the usual points of attachment on its 40 ft and 45 ft joint-use poles, a chain of the lowest supply conductor,
// a 40 in. separation space, CATV, and the uppermost telephone cable 1 ft below. The attachment tool, given the
// standard's own rules, reproduces each published height. Four placements are fewer than the ten that would
// raise the tool to cross-checked, so it stays where it is and says how many it has.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { runTool } from '../../../core/contract/run.mjs';
import { getTool } from '../../../core/tools/index.mjs';
import { ROOT } from '../../../pipeline/run.mjs';

const tool = getTool('lines.attachment-height.find');
const capture = readFileSync(join(ROOT, 'data/curated/captures/lines/pacificorp-eu101-space-allocation.txt'), 'utf8');
const RULES = 'rule_id,applies_to,value,unit,source_document,source_locator,note\nsep.secondary.comm,,40,in,PacifiCorp EU 101,"Separation Space 3\'-4""",\nsep.comm.comm,,12,in,PacifiCorp EU 101,Figures 1 and 3,\nground.pole.comm,,20,ft,PacifiCorp EU 101,Figures 1 and 3,';

const CASES = [
  { figure: 'Figure 1, 40 ft pole', attachments: 'secondary, Utility, 26 ft 4 in', newKind: 'catv', published: 23, labels: ['26’--4”', '23’'] },
  { figure: 'Figure 1, 40 ft pole', attachments: 'secondary, Utility, 26 ft 4 in\ncatv, Cable Co, 23 ft 0 in', newKind: 'telephone', published: 22, labels: ['23’', '22’'] },
  { figure: 'Figure 3, 45 ft pole', attachments: 'secondary, Utility, 28 ft 4 in', newKind: 'catv', published: 25, labels: ['28’--4”', '25’'] },
  { figure: 'Figure 3, 45 ft pole', attachments: 'secondary, Utility, 28 ft 4 in\ncatv, Cable Co, 25 ft 0 in', newKind: 'telephone', published: 24, labels: ['25’', '24’'] },
];

test('every published height and the 40 in. separation are in the stored figures', () => {
  for (const c of CASES) for (const l of c.labels) assert.ok(capture.includes(l), `${c.figure}: ${l}`);
  assert.equal((capture.match(/Separation[\s\S]{0,400}?3’--4”/g) ?? []).length, 2);
});

for (const c of CASES) {
  test(`${c.figure}: the new ${c.newKind} attaches at the published ${c.published} ft`, () => {
    const r = runTool(tool.manifest, tool.impl, { rules: RULES, attachments: c.attachments, newKind: c.newKind, poleLength: 'unknown', preference: 'highest' });
    assert.equal(r.status, 'ok', JSON.stringify(r.errors ?? r));
    assert.equal(r.outputs.height.value, c.published);
    assert.equal(r.outputs.moves.value, 0);
  });
}

test('four published placements are fewer than ten, so the tool stays at its level and its to-raise sentence says so', () => {
  assert.equal(tool.manifest.validation.level, 1);
  assert.match(tool.manifest.toRaise, /4 of the 10/);
});
