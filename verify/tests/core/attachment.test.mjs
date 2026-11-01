// Where a new line attaches (add-overhead-line-checks 3.1 to 3.4): the space
// under the lowest supply, sources shown, the separation chosen by the supply
// kind and voltage, ranked move plans, a replacement length or the question
// that asks for one, existing shortfalls named first, and messy lists.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { runTool } from '../../../core/contract/run.mjs';
import { TOOLS } from '../../../core/tools/index.mjs';
import { parseAttachments } from '../../../core/lib/attachment.mjs';
import { feetInches } from '../../../core/lib/field-length.mjs';

const tool = TOOLS.find((t) => t.manifest.id === 'lines.attachment-height.find');
const ex = (id) => tool.manifest.examples.find((e) => e.id === id).inputs;
const run = (inputs) => runTool(tool.manifest, tool.impl, inputs);
const RULES = ex('fits').rules;

test('it fits as is, and the answer lists each value with the row it came from', () => {
  const r = run(ex('fits'));
  assert.equal(r.sentence, 'Attach at 26 ft 10 in. No other line needs to move.');
  assert.ok(r.work.steps.includes('40 in. below the neutral: sep.neutral.comm, row 2 (Our joint use standard, §4.2)'));
  assert.ok(r.work.steps.includes('12 in. between communication lines: sep.comm.comm, row 3 (Our joint use standard, §4.3)'));
});

test('the space is measured from a secondary with sep.secondary.comm when that is the lowest supply', () => {
  const rules = `${RULES}\nsep.secondary.comm,,30,in,Our joint use standard,§4.4,`.replace('sep.neutral.comm,,40,in,Our joint use standard,§4.2,\n', '');
  const r = run({ ...ex('fits'), rules, attachments: 'secondary, Utility, 28 ft 0 in\ncatv, Cable Co, 22 ft 0 in' });
  assert.equal(r.sentence, 'Attach at 25 ft 6 in. No other line needs to move.');
  assert.ok(r.work.steps.some((s) => /below the secondary: sep\.secondary\.comm/.test(s)));
});

test('a 34.5 kV primary outside the rules\' voltage ranges is refused, naming the range', () => {
  const rules = `${RULES}\nsep.primary.comm,0-8.7kV,40,in,Our joint use standard,§4.5,`;
  const r = run({ ...ex('fits'), rules, attachments: 'primary 34.5kV, Utility, 32 ft\ncatv, Cable Co, 24 ft' });
  assert.equal(r.status, 'refused');
  assert.match(r.reason, /34\.5 kV primary.*only for 0 to 8\.7 kV/);
});

test('one move makes room, the cable TV move is the second option, and no plan is called simple or complex make-ready', () => {
  const r = run(ex('one-move'));
  assert.equal(r.sentence, 'Move the telephone line up 3 in. to 25 ft 0 in. Then attach at 24 ft 0 in.');
  assert.ok(r.work.steps.some((s) => s === 'Next option: Move the cable TV line up 5 in. to 26 ft 9 in. Then attach at 25 ft 9 in. It ranks lower: it moves 2 in. more.'));
  assert.ok(r.work.steps.includes('Moves are limited to two, our own limit to keep plans readable.'));
  assert.doesNotMatch([r.sentence, ...r.work.steps].join(' '), /simple make-ready|complex make-ready/i);
});

test('a pole too short gets a replacement length; without its length, the tool asks for it', () => {
  assert.equal(run(ex('too-short')).sentence, 'No height fits. The pole needs 2 in. more height above ground. A 40 ft pole, 5 ft longer, gives 4 ft 6 in. more.');
  assert.equal(run({ ...ex('too-short'), poleLength: 'unknown' }).sentence, 'No height fits. The pole needs 2 in. more height above ground. Enter the pole\'s length to get a replacement length.');
});

test('an existing line too close is named first, apart from the answer', () => {
  const r = run({ ...ex('fits'), attachments: 'neutral, Utility, 30 ft 2 in\ncatv, Cable Co, 27 ft 2 in' });
  assert.match(r.sentence, /^Cable TV is 4 in\. closer to the neutral than your rules allow\. /);
});

test('messy lists: a metric height, two lines at one height, an unknown kind, and a pole with no supply', () => {
  const { attachments } = parseAttachments('fiber, Fiber Co, 6.81 m');
  assert.equal(feetInches(attachments[0].inches / 12, 'down'), '22 ft 4 in.');
  const same = run({ ...ex('fits'), attachments: 'neutral, Utility, 30 ft 2 in\ncatv, Cable Co, 24 ft 0 in\nfiber, Fiber Co, 24 ft 0 in' });
  assert.ok(same.work.steps.some((s) => s === 'Two lines at one height: row 2 and row 3 at 24 ft 0 in.'));
  assert.match(same.sentence, /Cable TV and fiber are 1 ft 0 in\. closer together than your rules allow\./);
  assert.match(run({ ...ex('fits'), attachments: 'cable, Cable Co, 24 ft' }).errors[0].message, /the kind "cable" is not one we know/);
  assert.match(run({ ...ex('fits'), attachments: 'catv, Cable Co, see photo' }).errors[0].message, /row 1: height could not be read/);
  assert.match(run({ ...ex('fits'), attachments: 'catv, Cable Co, 24 ft' }).reason, /add a line "no power"/);
});

test('rules: a bad fraction and a unit in both places are refused, naming the row', () => {
  assert.match(run({ ...ex('fits'), rules: `${RULES}\nsep.comm.comm,,40 in,in,,,` }).errors[0].message, /holds a unit/);
  assert.match(run({ ...ex('fits'), rules: `${RULES}\npole.setting-depth.fraction,,2,,,,` }).errors[0].message, /must be a fraction/);
  assert.match(run({ ...ex('fits'), rules: 'sep.neutral.comm,,40,in' }).reason, /ground\.pole\.comm/);
})

test('the first screen holds the rules, the attachments, and the new line, and nothing else', () => {
  assert.deepEqual(tool.manifest.firstScreen, ['rules', 'attachments', 'newKind']);
});

test('two moves: neither line can move alone without crowding the other', () => {
  const rules = ex('one-move').rules;
  const r = run({ ...ex('fits'), rules, attachments: 'neutral, Utility, 30 ft 2 in\ncatv, Cable Co, 25 ft 11 in\ntelephone, Phone Co, 24 ft 11 in' });
  assert.equal(r.sentence, 'Move the cable TV line down 1 in. to 25 ft 10 in. Then move the telephone line down 1 in. to 24 ft 10 in. Then attach at 26 ft 10 in.');
  assert.equal(r.outputs.moves.value, 2);
});

test('placement preference: lowest and nearest-existing pick other fits', () => {
  assert.equal(run({ ...ex('fits'), preference: 'lowest' }).sentence, 'Attach at 18 ft 0 in. No other line needs to move.');
  assert.equal(run({ ...ex('fits'), preference: 'nearest-existing' }).sentence, 'Attach at 25 ft 0 in. No other line needs to move.');
  const byRules = run({ ...ex('fits'), rules: `${RULES}\nplace.preference,,lowest,,Our joint use standard,§4.6,` });
  assert.equal(byRules.sentence, 'Attach at 18 ft 0 in. No other line needs to move.');
});

test('the reader never guesses: an unknown id is ignored, a conflict is refused naming both rows', () => {
  const unknown = run({ ...ex('fits'), rules: `${RULES}\nsep.antenna.comm,,4,in,,,` });
  assert.equal(unknown.status, 'ok', 'an id we do not know does not stop the check');
  assert.ok(unknown.work.steps.some((s) => s === 'Row 5: "sep.antenna.comm" is not a rule id we know, so it is ignored.'));
  const clash = run({ ...ex('fits'), rules: `${RULES}\nsep.comm.comm,,6,in,,,` });
  assert.equal(clash.status, 'refused');
  assert.equal(clash.reason, 'Rows 3 and 5 both set sep.comm.comm (12 in. and 6 in.). Pick one and the check can run.');
});

test('an implausible value is flagged as a likely unit mistake, used as written, and repeated on the result', () => {
  const r = run({ ...ex('fits'), rules: RULES.replace('sep.comm.comm,,12,in', 'sep.comm.comm,,12,ft') });
  const flag = 'Row 3: sep.comm.comm reads 12 ft, outside the 1 to 120 in. a rule of this kind usually sets. Did you mean 12 in.? It is used as written.';
  assert.ok(r.work.steps.filter((s) => s === flag).length >= 2, 'the flag is in the receipt and beside the result');
  // Used as written: a 12 ft separation leaves no room, so the existing lines now read as too close.
  assert.match(r.sentence, /11 ft 0 in\. closer together than your rules allow/);
});

test('the receipt names each rule with its row and source; blank, header, and note rows are counted', () => {
  const rules = `rule_id,applies_to,value,unit,source_document,source_locator,note\n${RULES.split('\n').slice(1).join('\n')}\n\nNotes: prepared by the engineering group`;
  const r = run({ ...ex('fits'), rules });
  const steps = r.work.steps.join('\n');
  assert.match(steps, /Row 2: sep\.neutral\.comm = 40 in\., from Our joint use standard §4\.2/);
  assert.match(steps, /Row 4: ground\.pole\.comm = 18 ft, from Our joint use standard §4\.1/);
  assert.match(steps, /2 blank, header, or note rows skipped\./);
});

test('a unit written inside the value reads, and the receipt says where the unit came from', async () => {
  const { parseRules, rulesReceipt } = await import('../../../core/lib/attachment.mjs');
  const read = parseRules('sep.comm.comm,,40 in,,,,');
  assert.deepEqual([read.rules[0].inches, read.problems], [40, []]);
  assert.match(rulesReceipt(read).join('\n'), /Row 1: sep\.comm\.comm = 40 in\., with no source named \(the unit came from the value\)/);
  // No unit anywhere is refused rather than assumed.
  assert.match(parseRules('sep.comm.comm,,40,,,,').problems[0], /has a value with no unit/);
});
