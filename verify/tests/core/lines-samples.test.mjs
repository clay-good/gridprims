// The lines sample files (add-overhead-line-checks 2.7, scenario "Sample is labeled"): every rule is an example
// value from one captured public document, the source reads "Sample: Example Electric Co-op", each row names
// the document's URL, and the files read cleanly as a standards file and a pole list.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { SAMPLE_DOCUMENT, SAMPLE_RULES, SAMPLE_SOURCE, samplePolesCsv, sampleStandardsCsv } from '../../../core/lib/lines-samples.mjs';
import { parseRules } from '../../../core/lib/attachment.mjs';
import { linesKind, poleInputs, readPoleList } from '../../../core/lib/lines-files.mjs';
import { runTool } from '../../../core/contract/run.mjs';
import { getTool } from '../../../core/tools/index.mjs';
import { ROOT } from '../../../pipeline/run.mjs';

const capture = readFileSync(`${ROOT}/${SAMPLE_DOCUMENT.capture}`, 'utf8');

test('every sample value is in the passage it cites, and every passage is in the stored capture of that document', () => {
  assert.match(capture, new RegExp(`SHA-256 ${SAMPLE_DOCUMENT.sha256}`));
  assert.ok(capture.includes(`Source: ${SAMPLE_DOCUMENT.url}`));
  for (const r of SAMPLE_RULES) {
    assert.ok(capture.includes(r.quote), `${r.id}: quote not in the capture`);
    const shown = r.unit === 'ft' ? `${r.value}'` : `${r.value} inches`;
    assert.ok(r.quote.includes(shown) || r.quote.includes(`${r.value}"`) || r.id === 'sep.secondary.comm', `${r.id}: ${r.value} ${r.unit} not in its quote`);
    assert.ok(capture.includes(`PDF page ${/PDF p\. (\d+)/.exec(r.locator)[1]},`), `${r.id}: its page is not in the capture`);
  }
  // The secondary row rests on the same 40-inch sentence, which names secondary clevises and wires as supply equipment.
  assert.ok(capture.includes('A minimum clearance of 40 inches must be maintained between the bottom of the supply space'));
});

test('sample is labeled: every rule reads as an example from the sample co-op and links its document', () => {
  const text = sampleStandardsCsv();
  assert.equal(linesKind(text), 'lines-standards');
  const read = parseRules(text);
  assert.deepEqual(read.problems, []);
  assert.deepEqual(read.conflicts, []);
  assert.equal(read.rules.length, SAMPLE_RULES.length);
  for (const r of read.rules) {
    assert.ok(r.source.startsWith(SAMPLE_SOURCE), r.source);
    assert.match(r.note, new RegExp(`^Example value\\. Cited: ${SAMPLE_DOCUMENT.url.replace(/[.]/g, '\\.')}$`));
  }
  assert.equal(read.skipped, 2, 'the header and the note row on the missing height');
  assert.match(text, /no public source gives the lowest attachment height on the pole \(ground\.pole\.comm\)/);
});

test('the sample pole list reads as three poles of example values, and checks once a lowest height is added', () => {
  const text = samplePolesCsv();
  assert.equal(linesKind(text), 'lines-pole-list');
  const list = readPoleList(text);
  assert.deepEqual(list.poles.map((p) => p.id), ['EX-1', 'EX-2', 'EX-3']);
  assert.deepEqual(list.problems, []);
  assert.ok(list.poles.every((p) => p.rows.every((r) => r.note.startsWith('Example values'))));
  const { manifest, impl } = getTool('lines.attachment-height.find');
  const rules = `${sampleStandardsCsv()}ground.pole.comm,,18,ft,Your own standard,,`;
  const r = runTool(manifest, impl, { rules, ...poleInputs(list.poles[0]), newKind: 'fiber', preference: 'rules' });
  assert.equal(r.status, 'ok');
  assert.equal(r.outputs.height.display, '26.83');
  // Without a lowest height the tool says what is missing rather than guessing one.
  assert.notEqual(runTool(manifest, impl, { rules: sampleStandardsCsv(), ...poleInputs(list.poles[0]), newKind: 'fiber', preference: 'rules' }).status, 'ok');
});
