// The standards template (add-overhead-line-checks 2.1): the CSV, the Excel
// workbook, and the rule ids the checks read all come from one list; no NESC
// value ships, only rule and table numbers; and the workbook is a package a
// spreadsheet program can open.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { COLUMNS, TEMPLATE_IDS, TEMPLATE_ROWS, templateCsv } from '../../../core/lib/standards-template.mjs';
import { parseRules } from '../../../core/lib/attachment.mjs';
import { readXlsx, readZipDirectory } from '../../../parsers/xlsx.mjs';
import { sharedSite } from '../../lib/shared-site.mjs';

const out = await sharedSite();
const csv = readFileSync(join(out, 'lines/standards-template.csv'), 'utf8');
const xlsx = readFileSync(join(out, 'lines/standards-template.xlsx'));

test('the CSV, the workbook, and the ids the checks read are the same list', async () => {
  const rows = csv.trim().split('\n').slice(1).map((l) => l.split(',')[0]);
  assert.deepEqual(rows, TEMPLATE_IDS);
  const { rows: sheet } = await readXlsx(xlsx, { sheet: 'Standards' });
  assert.deepEqual(sheet[0].map((c) => c.value), COLUMNS);
  assert.deepEqual(sheet.slice(1).map((r) => r[0].value), TEMPLATE_IDS);
  // Every id the template carries is one the reader accepts, each given a value of the kind it takes.
  const filled = (r) => (r.id === 'place.preference' ? 'highest,' : r.id === 'pole.setting-depth.fraction' ? '10%,' : r.id.startsWith('ground.') ? '18,ft' : '40,in');
  const read = parseRules(TEMPLATE_ROWS.map((r) => `${r.id},${r.appliesTo},${filled(r)}`).join('\n'));
  assert.deepEqual(read.problems, []);
  assert.deepEqual(parseRules('sep.wizard.comm,,4,in').problems, ['row 1: "sep.wizard.comm" is not a rule id we know']);
});

test('the template ships no NESC value: every value cell is blank and every NESC reference is a number', () => {
  for (const line of csv.trim().split('\n').slice(1)) {
    const cells = line.split(',');
    assert.equal(cells[COLUMNS.indexOf('value')], '', line.slice(0, 40));
    assert.equal(cells[COLUMNS.indexOf('unit')], '', line.slice(0, 40));
  }
  for (const r of TEMPLATE_ROWS) {
    assert.match(r.nesc, /^(NESC (Table \d{3}-\d|Rule \d{3})|not in the NESC; your own standard)$/, r.id);
    // A reference, never a quoted requirement: no length may appear in it.
    assert.doesNotMatch(r.nesc, /\d+\s*(in|ft|inch|feet)\b/, r.id);
  }
});

test('the workbook is a package a spreadsheet program opens, not only one our reader forgives', () => {
  const names = readZipDirectory(xlsx).map((e) => e.name);
  for (const part of ['[Content_Types].xml', '_rels/.rels', 'xl/workbook.xml', 'xl/_rels/workbook.xml.rels', 'xl/worksheets/sheet1.xml']) {
    assert.ok(names.includes(part), `${part} is missing from the workbook`);
  }
});
