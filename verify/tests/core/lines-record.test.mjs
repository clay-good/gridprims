// platform/tool-contract "One file, one set of numbers", scenario "Standards choice propagates": both lines
// tools read the one rule record, and a pick between conflicting rows reaches both.
import test from 'node:test';
import assert from 'node:assert/strict';
import { chooseRow, parseRules, recordRule } from '../../../core/lib/attachment.mjs';
import { runTool } from '../../../core/contract/run.mjs';
import { getTool } from '../../../core/tools/index.mjs';

const FILE = [
  'rule_id,applies_to,value,unit,source_document,source_locator,note',
  'sep.neutral.comm,,40,in,Our joint use standard,§4.2,',
  'sep.comm.comm,,12,in,Our joint use standard,§4.3,',
  'ground.pole.comm,,18,ft,Our joint use standard,§4.1,',
  'ground.road.comm,,18,ft,Our joint use standard,§4.5,',
  'ground.road.comm,,15 ft 6 in,,Old standard,§9,',
  'sep.midspan.secondary.comm,,30,in,Our joint use standard,§4.4,',
].join('\n');

const attach = getTool('lines.attachment-height.find');
const midspan = getTool('lines.midspan-clearance.check');
const span = (rules, over = {}) => runTool(midspan.manifest, midspan.impl, { ...midspan.manifest.examples.find((e) => e.id === 'from-file').inputs, rules, ...over });
const pole = (rules) => runTool(attach.manifest, attach.impl, { ...attach.manifest.examples.find((e) => e.id === 'fits').inputs, rules });

test('picking one of two conflicting rows blanks the other and keeps every row number', () => {
  assert.deepEqual(parseRules(FILE).conflicts.map((c) => c.rows), [[5, 6]]);
  const picked = chooseRow(FILE, 6);
  assert.equal(picked.split('\n').length, FILE.split('\n').length);
  assert.equal(picked.split('\n')[4], '');
  const read = parseRules(picked);
  assert.deepEqual(read.conflicts, []);
  assert.equal(recordRule(read, 'ground.road.comm').rule.row, 6);
  // A header or a row number past the end changes nothing.
  assert.equal(chooseRow(FILE, 1), FILE);
  assert.equal(chooseRow(FILE, 99), FILE);
  // Different voltage ranges of one rule are not the same row.
  const ranges = 'sep.primary.comm,0-8.7kV,40,in\nsep.primary.comm,8.7-50kV,60,in\nsep.primary.comm,0-8.7 kV,30,in';
  assert.equal(chooseRow(ranges, 1), 'sep.primary.comm,0-8.7kV,40,in\nsep.primary.comm,8.7-50kV,60,in\n');
});

test('standards choice propagates: both tools recompute from the record the pick updated', () => {
  const before = span(FILE);
  assert.equal(before.status, 'refused');
  assert.match(before.reason, /Rows 5 and 6 both set ground\.road\.comm \(18 ft and 15 ft 6 in\.\)\. Pick one/);

  const first = chooseRow(FILE, 5);
  const second = chooseRow(FILE, 6);
  assert.equal(span(first).outputs.margin.value, 4.5);
  assert.equal(span(second).outputs.margin.value, 7);
  assert.ok(span(second).work.steps.includes('The clearance over a road came from your standards file: ground.road.comm, row 6 (Old standard, §9).'));
  // The attachment tool reads the same record: the pick leaves its rules intact, and its answer agrees for both.
  for (const record of [first, second]) {
    const r = pole(record);
    assert.equal(r.status, 'ok');
    assert.equal(r.outputs.height.display, "26.83");
  }
});

test('the midspan check takes its clearance and separation from the file, and a value you type wins', () => {
  const r = span(chooseRow(FILE, 5));
  assert.match(r.sentence, /4 ft 6 in\. above the 18 ft your rules require over a road/);
  assert.match(r.sentence, /8 in\. short of the 30 in\. midspan value\.$/);
  assert.ok(r.work.steps.includes('The separation from the line above came from your standards file: sep.midspan.secondary.comm, row 7 (Our joint use standard, §4.4).'));
  assert.equal(span(chooseRow(FILE, 5), { required: '20 ft' }).outputs.margin.value, 2.5);
  // GO 95 fills only what the file leaves out, and a GO 95 or no-rules check never reads the file.
  const noRoad = FILE.split('\n').filter((l) => !l.startsWith('ground.road')).join('\n');
  assert.match(span(noRoad, { ruleSource: 'yours-go95' }).sentence, /18 ft GO 95 requires over a road/);
  assert.equal(span(FILE, { ruleSource: 'go95' }).status, 'ok');
  assert.equal(span(FILE, { ruleSource: 'none' }).status, 'ok');
  // A bad row is named against the file.
  const bad = span('ground.road.comm,,18,,,,');
  assert.equal(bad.status, 'invalid');
  assert.equal(bad.errors[0].field, 'rules');
});

test('a primary separation is read from the row whose range covers 750 to 7,500 V', () => {
  const read = parseRules('sep.primary.comm,8.7-50kV,60,in\nsep.primary.comm,0-8.7kV,40,in');
  assert.equal(recordRule(read, 'sep.primary.comm').rule.row, 2);
  assert.equal(recordRule(parseRules('sep.primary.comm,0-5kV,40,in'), 'sep.primary.comm'), null);
});
