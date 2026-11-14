// The list, length, and handle input types (add-overhead-line-checks task 1.2,
// platform/tool-contract "List, length, and handle inputs"): each is declared
// and checked in the manifest, coerced the same way for the page and the MCP
// server, and round-trips through a share link, except a handle, which never
// goes in a URL.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateManifest } from '../../../core/contract/manifest.mjs';
import { checkInputs, runTool } from '../../../core/contract/run.mjs';
import { getTool } from '../../../core/tools/index.mjs';
import { decodeState, encodeState } from '../../../site/ui/share-state.mjs';
import { createServer } from '../../../mcp/protocol.mjs';
import { modern } from '../mcp/mcp-helpers.mjs';
import { calculatorPage } from '../../../site/templates/pages.mjs';
import { createI18n } from '../../../site/lib/i18n.mjs';
import strings from '../../../site/strings/en-US.mjs';
import { sample } from '../helpers.mjs';

const midspan = getTool('lines.midspan-clearance.check');
const base = midspan.manifest.examples[0].inputs;

test('length input round trip: 6.81 m in a share link comes back as 6.81 m and is read as 268.1 in.', () => {
  const hash = encodeState(midspan.manifest, { ...base, span: '6.81 m' });
  const back = decodeState(midspan.manifest, hash);
  assert.equal(back.span, '6.81 m');
  const { values, errors } = checkInputs(midspan.manifest, { ...base, ...back });
  assert.deepEqual(errors, []);
  assert.equal(Math.round(values.span * 10) / 10, 268.1);
  // Field formats read the same: 22' 4", 22-4, 22 ft 4 in, and decimal feet.
  for (const t of ['22\' 4"', '22-4', '22 ft 4 in', '22.3333333 ft']) assert.ok(Math.abs(checkInputs(midspan.manifest, { ...base, heightA: t }).values.heightA - 268) < 1e-4, t);
  assert.match(checkInputs(midspan.manifest, { ...base, heightA: 'tall' }).errors[0].message, /"tall" is not a length we read/);
});

test('the midspan tool gives the same numbers from a typed length as it did from text, on both surfaces', async () => {
  for (const ex of midspan.manifest.examples) {
    // The contract hands the tool inches; the tool still reads a length typed as text the same way.
    const viaContract = runTool(midspan.manifest, midspan.impl, ex.inputs);
    const viaText = runTool({ ...midspan.manifest, inputs: midspan.manifest.inputs.map((i) => (i.type === 'length' ? { ...i, type: 'text' } : i)) }, midspan.impl, ex.inputs);
    assert.equal(viaContract.status, 'ok', ex.id);
    assert.deepEqual(viaContract.outputs, viaText.outputs, ex.id);
    assert.equal(viaContract.sentence, viaText.sentence, ex.id);
  }
  // 60.96 m is exactly 200 ft, so the server gives the 200 ft example's answer.
  const r = await createServer().handle(modern(1, 'tools/call', { name: 'gridprims_run', arguments: { tool: midspan.manifest.id, inputs: { ...base, span: '60.96 m' } } }));
  assert.equal(r.result.isError, false, r.result.content[0].text);
  assert.deepEqual(r.result.structuredContent.outputs, runTool(midspan.manifest, midspan.impl, base).outputs);
  const bad = await createServer().handle(modern(2, 'tools/call', { name: 'gridprims_run', arguments: { tool: midspan.manifest.id, inputs: { ...base, span: 'far' } } }));
  assert.equal(bad.result.isError, true);
  assert.match(bad.result.content[0].text, /"far" is not a length we read/);
});

test('handle kind checked: a meter-file handle given to an input that takes lines-standards is refused, naming the kind', () => {
  const m = { ...sample(), inputs: [...sample().inputs, { name: 'rules', label: 'Your standards', type: 'handle', accepts: ['lines-standards'] }] };
  assert.deepEqual(validateManifest(m), []);
  const wrong = checkInputs(m, { x: 2, rules: { kind: 'meter-file', id: 'h1' } });
  assert.deepEqual(wrong.errors, [{ field: 'rules', message: 'Your standards takes a lines-standards file; this is a meter-file file.' }]);
  const none = checkInputs(m, { x: 2 });
  assert.equal(none.errors[0].message, 'Load a lines-standards file for your standards.');
  assert.deepEqual(checkInputs(m, { x: 2, rules: { kind: 'lines-standards', id: 'h2' } }).errors, []);
  // A handle never goes in a link, even when one is loaded.
  assert.equal(encodeState(m, { x: 2, rules: { kind: 'lines-standards', id: 'h2' } }), '#x=2');
  assert.deepEqual(decodeState(m, '#x=2&rules=h2'), { x: '2' });
});

test('rows: typed columns, one row a line, a maximum, and errors that name the row and the column', () => {
  const rows = { name: 'poles', label: 'Poles', type: 'rows', maxRows: 3, example: 'P1, 35 ft, wood', columns: [
    { name: 'id', label: 'Pole', type: 'text' },
    { name: 'height', label: 'Height', type: 'length' },
    { name: 'material', label: 'Material', type: 'enum', options: [{ value: 'wood', label: 'Wood' }, { value: 'steel', label: 'Steel' }] },
  ] };
  const m = { ...sample(), inputs: [...sample().inputs, rows] };
  assert.deepEqual(validateManifest(m), []);
  const ok = checkInputs(m, { x: 2, poles: 'P1, 35 ft, wood\nP2, 40-6, steel' });
  assert.deepEqual(ok.values.poles, [{ id: 'P1', height: 420, material: 'wood' }, { id: 'P2', height: 486, material: 'steel' }]);
  assert.deepEqual(checkInputs(m, { x: 2, poles: [{ id: 'P1', height: '35 ft', material: 'wood' }] }).values.poles, [{ id: 'P1', height: 420, material: 'wood' }]);
  assert.equal(checkInputs(m, { x: 2, poles: 'P1, 35 ft, wood\nP2, high, wood' }).errors[0].message, 'Row 2, height: "high" is not a length we read. Write it as 22\' 4", 22-4, 22 ft 4 in, 22.33 ft, or 6.8 m.');
  assert.equal(checkInputs(m, { x: 2, poles: 'P1, 35 ft, concrete' }).errors[0].message, 'Row 1, material: pick one of wood, steel.');
  assert.equal(checkInputs(m, { x: 2, poles: 'a,1 ft,wood\nb,1 ft,wood\nc,1 ft,wood\nd,1 ft,wood' }).errors[0].message, 'Poles holds at most 3 rows; there are 4.');
  // Rows round-trip through a link as the text that was typed.
  assert.equal(decodeState(m, encodeState(m, { x: 2, poles: 'P1, 35 ft, wood' })).poles, 'P1, 35 ft, wood');
});

test('the manifest names what each new type needs', () => {
  const add = (inp) => validateManifest({ ...sample(), inputs: [...sample().inputs, inp] }).join('\n');
  assert.match(add({ name: 'h', label: 'H', type: 'handle' }), /inputs\[1\]\.accepts must list the file kinds it takes/);
  assert.match(add({ name: 'r', label: 'R', type: 'rows', example: '' }), /inputs\[1\]\.maxRows must be a whole number of at least 1/);
  assert.match(add({ name: 'r', label: 'R', type: 'rows', example: '', maxRows: 2, columns: [{ name: 'a', label: 'A', type: 'date' }] }), /columns\[0\]\.type must be one of number, enum, text, length/);
  assert.match(add({ name: 'l', label: 'L', type: 'length', example: '1 ft', range: { min: 0 } }), /inputs\[1\]\.range needs numeric min and max, in inches/);
});

test('the page renders a length as a text field that keeps quote marks, with how to write it', () => {
  const ex = midspan.manifest.examples[0];
  const html = String(calculatorPage({ manifest: midspan.manifest, example: ex, result: runTool(midspan.manifest, midspan.impl, ex.inputs), i18n: createI18n(strings, 'en-US') }));
  assert.match(html, /<input id="in-span" name="span" type="text" inputmode="text" value="200 ft"/);
});

test('a private input never goes in a link or a report: the link names it, and the page asks for it', async () => {
  const { encodeState, decodeState, privateAsked, reportInputs, PRIVATE_MARK } = await import('../../../site/ui/share-state.mjs');
  const { default: m } = await import('../../../core/tools/lines.attachment-height.find/manifest.mjs');
  assert.equal(m.inputs.find((i) => i.name === 'rules').private, true);
  const values = Object.fromEntries(m.inputs.filter((i) => i.example !== undefined).map((i) => [i.name, i.example]));
  // The worked example's rules are ours, so a link may leave them out entirely.
  assert.doesNotMatch(encodeState(m, values), /rules=/);
  const mine = { ...values, rules: 'comm.sep.supply, all, 40, in, SENTINEL-RULES, p. 3' };
  const hash = encodeState(m, mine);
  assert.doesNotMatch(hash, /SENTINEL/);
  assert.match(hash, /rules=your\+standards\+file/);
  assert.equal(new URLSearchParams(hash.slice(1)).get('rules'), PRIVATE_MARK);
  assert.equal(decodeState(m, hash).rules, undefined, 'the mark never fills the field');
  assert.deepEqual(privateAsked(m, hash), ['rules']);
  const report = reportInputs(m, mine, 'not attached');
  assert.doesNotMatch(JSON.stringify(report), /SENTINEL/);
  assert.equal(report.note, 'not attached');
  assert.equal(reportInputs(m, values, 'x').note, undefined, 'the example rules can be attached as they are');
});

test('only a text input may be private', async () => {
  const { validateManifest } = await import('../../../core/contract/manifest.mjs');
  const { default: m } = await import('../../../core/tools/lines.attachment-height.find/manifest.mjs');
  const bad = { ...m, inputs: m.inputs.map((i) => (i.name === 'preference' ? { ...i, private: true } : i)) };
  assert.ok(validateManifest(bad).some((e) => /private/.test(e.path ?? e)), 'a private enum is refused');
});
