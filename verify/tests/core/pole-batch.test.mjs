// A pole list checked one pole at a time (add-overhead-line-checks 3.5): each
// pole's answer is the single-pole answer, an unreadable row leaves its pole
// not checked with the row and reason, the CSV has one row per pole and no
// cell a spreadsheet would run, and 10,000 rows check in under 2 s.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkPoleList, poleBatchCsv } from '../../../core/lib/pole-batch.mjs';
import { linesKind, poleInputs, readPoleList } from '../../../core/lib/lines-files.mjs';
import { runTool } from '../../../core/contract/run.mjs';
import { getTool } from '../../../core/tools/index.mjs';

const { manifest, impl } = getTool('lines.attachment-height.find');
const base = manifest.examples[0].inputs;
const run = (pole) => runTool(manifest, impl, { ...base, ...pole });
const HEAD = 'pole_id,owner,kind,height,note';

/** A list of n poles, four lines each; every seventh pole's fiber height reads "see photo". */
function list(n) {
  const rows = [HEAD];
  for (let p = 0; p < n; p++) rows.push(`P-${p},Coop,neutral,${27 + (p % 4)} ft,`, `P-${p},TelCo,telephone,${19 + (p % 3)} ft,`, `P-${p},CableCo,catv,${20 + (p % 5)} ft 6 in,`, `P-${p},Fiber,fiber,${p % 7 === 0 ? 'see photo' : '21 ft'},`);
  return rows.join('\n');
}

test('the two lines files are told apart by their header rows', () => {
  assert.equal(linesKind('﻿pole_id, owner, kind, height, note\nP-1,Coop,neutral,28 ft,'), 'lines-pole-list');
  assert.equal(linesKind('rule_id,applies_to,value,unit\n'), 'lines-standards');
  assert.equal(linesKind('Date,Start Time,kWh\n'), null);
});

test('a pole list groups rows into poles in first-seen order, keeping each row\'s line, and lists rows it cannot place', () => {
  const r = readPoleList(`${HEAD},pole_length\nB,Coop,neutral,28 ft,,40 ft\nA,Coop,neutral,26 ft,,\nB,TelCo,telephone,"22'4""",,\n,Coop,catv,20 ft,,\nA,TelCo,catv,,,\n`);
  assert.deepEqual(r.poles.map((p) => [p.id, p.rows.map((x) => x.row), p.poleLength]), [['B', [2, 4], '40 ft'], ['A', [3], null]]);
  assert.deepEqual(r.problems, [{ row: 5, missing: 'pole_id' }, { row: 6, missing: 'height' }]);
  // The tool numbers each attachment by its line in the file.
  assert.equal(poleInputs(r.poles[0]).attachments.split('\n')[3], 'telephone, TelCo, 22\'4"');
});

test('each pole\'s answer is the single-pole answer, and an unreadable height leaves its pole not checked', () => {
  const b = checkPoleList(list(14), run);
  assert.equal(b.poles.length, 14);
  const p1 = b.poles[1];
  const single = run({ attachments: 'neutral, Coop, 28 ft\ntelephone, TelCo, 20 ft\ncatv, CableCo, 21 ft 6 in\nfiber, Fiber, 21 ft', poleLength: 'unknown' });
  assert.equal(p1.status, 'checked');
  assert.equal([p1.instruction, ...p1.shortfalls].join(' ').length > 0, true);
  assert.equal(single.sentence.includes(p1.instruction), true);
  for (const s of p1.shortfalls) assert.ok(single.sentence.includes(s));
  assert.deepEqual(b.poles[0], { id: 'P-0', rows: [2, 3, 4, 5], status: 'not checked', reasons: [{ row: 5, reason: 'height could not be read' }] });
});

test('the CSV has one row per pole, with the instruction, moves, shortfalls, and rule source, and no formula cells', () => {
  const b = checkPoleList(list(120), run);
  const csv = poleBatchCsv(b, { source: 'Your rules: Our joint use standard', edition: '' });
  const lines = csv.trim().split('\n');
  assert.equal(lines[0], 'pole_id,rows,status,instruction,moves,existing_shortfalls,rule_source,rule_edition');
  assert.equal(lines.length, 121);
  assert.match(lines[2], /^P-1,6 7 8 9,checked,.+,0,.*,Your rules: Our joint use standard,$/);
  assert.match(lines[1], /^P-0,2 3 4 5,not checked,row 5: height could not be read,,,/);
  const evil = poleBatchCsv(checkPoleList(`${HEAD}\n=HYPERLINK("x"),Coop,neutral,28 ft,\n`, run), { source: '+cmd', edition: '' });
  assert.match(evil, /\n"'=HYPERLINK\(""x""\)",/);
  assert.match(evil, /,'\+cmd,$/m);
});

test('10,000 attachment rows are read and checked in under 2 s', () => {
  const text = list(2500);
  const t0 = performance.now();
  const b = checkPoleList(text, run);
  const ms = performance.now() - t0;
  assert.equal(b.rowsRead, 10_000);
  assert.ok(ms < 2000, `${Math.round(ms)} ms`);
});

test('a standards workbook is read from its first sheet with the template header, by stored values', async () => {
  const { writeXlsx } = await import('../../lib/zip-writer.mjs');
  const { readStandardsWorkbook } = await import('../../../core/lib/lines-files.mjs');
  const book = writeXlsx({ Instructions: [['How to fill in this workbook'], ['One rule per row.']], Standards: [['rule_id', 'applies_to', 'value', 'unit', 'source_document', 'source_locator', 'note'], ['sep.comm.comm', '', 12, 'in', 'Our standard, 2024', '4.3', '']] });
  const r = await readStandardsWorkbook(book);
  assert.equal(r.sheet, 'Standards');
  assert.equal(r.text, 'rule_id,applies_to,value,unit,source_document,source_locator,note\nsep.comm.comm,,12,in,Our standard  2024,4.3,');
  const none = await readStandardsWorkbook(writeXlsx({ Notes: [['nothing here']] }));
  assert.match(none.error, /No sheet in this workbook has the standards template/);
});

test('rows deep in a long file keep their file numbers, and a bad rules row is named as a rules row', () => {
  const b = checkPoleList(list(300), run);
  assert.deepEqual(b.poles[294].reasons, [{ row: 1181, reason: 'height could not be read' }]);
  const bad = checkPoleList(list(1), (pole) => runTool(manifest, impl, { ...base, rules: `${base.rules}\nsep.comm.comm,,12,,x,,`, ...pole }));
  assert.equal(bad.poles[0].status, 'not checked');
  assert.ok(bad.poles[0].reasons.every((r) => r.rules || r.row === null), JSON.stringify(bad.poles[0].reasons));
});
