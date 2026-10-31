import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createDelimitedParser, decodeText, detectDelimiter, parseDelimited } from '../../../parsers/delimited.mjs';

const enc = (s) => new TextEncoder().encode(s);

test('decodes UTF-8 with and without a byte-order mark', () => {
  assert.deepEqual(decodeText(Uint8Array.of(0xef, 0xbb, 0xbf, ...enc('kWh,°F'))), { text: 'kWh,°F', encoding: 'utf-8', bom: true });
  assert.deepEqual(decodeText(enc('kWh,°F')), { text: 'kWh,°F', encoding: 'utf-8', bom: false });
});

test('decodes UTF-16 little- and big-endian by their byte-order marks', () => {
  const le = Uint8Array.of(0xff, 0xfe, 0x6b, 0, 0x57, 0, 0x68, 0);
  const be = Uint8Array.of(0xfe, 0xff, 0, 0x6b, 0, 0x57, 0, 0x68);
  assert.equal(decodeText(le).text, 'kWh');
  assert.equal(decodeText(le).encoding, 'utf-16le');
  assert.equal(decodeText(be).text, 'kWh');
});

test('falls back to Windows-1252 when the bytes are not UTF-8', () => {
  // "Temp °F" as Excel on Windows saves it: 0xB0 is the degree sign.
  const r = decodeText(Uint8Array.of(...enc('Temp '), 0xb0, ...enc('F')));
  assert.equal(r.encoding, 'windows-1252');
  assert.equal(r.text, 'Temp °F');
});

test('detects comma, tab, semicolon, and pipe, past a preamble', () => {
  const body = (d) => ['Account: 12345', 'Meter: A', '', ['Date', 'Time', 'kWh'].join(d), ['2026-01-01', '00:00', '1.5'].join(d), ['2026-01-01', '00:15', '1.25'].join(d), ['2026-01-01', '00:30', '1.0'].join(d)].join('\n');
  for (const d of [',', '\t', ';', '|']) assert.equal(detectDelimiter(body(d)).delimiter, d, JSON.stringify(d));
});

test('ignores delimiters inside quotes when detecting', () => {
  const text = 'Name;Value\n"Smith, Jo";1\n"Lee, Al";2\n';
  assert.equal(detectDelimiter(text).delimiter, ';');
});

test('reads quoted fields with delimiters, doubled quotes, and line breaks', () => {
  const { rows } = parseDelimited('a,"b,c","say ""hi""","two\nlines"\r\nx,y,z,w\n');
  assert.deepEqual(rows, [['a', 'b,c', 'say "hi"', 'two\nlines'], ['x', 'y', 'z', 'w']]);
});

test('accepts CRLF, LF, and lone CR line endings, with no phantom last row', () => {
  for (const nl of ['\r\n', '\n', '\r']) {
    assert.deepEqual(parseDelimited(`a,b${nl}1,2${nl}`, { delimiter: ',' }).rows, [['a', 'b'], ['1', '2']], JSON.stringify(nl));
  }
});

test('keeps blank lines and empty fields so line numbers match the file', () => {
  const lines = [];
  const p = createDelimitedParser({ delimiter: ',', onRow: (r, line) => lines.push([line, r]) });
  p.push('h1,h2\n\n"multi\nline",\n3,4');
  p.end();
  assert.deepEqual(lines, [[1, ['h1', 'h2']], [2, ['']], [3, ['multi\nline', '']], [5, ['3', '4']]]);
});

test('any chunking gives the same rows as parsing the whole text', () => {
  const text = 'a,"q""uo""te",c\r\n"x\r\ny",,"""\n1,2,"3"\r\n"end"""\r';
  const whole = parseDelimited(text, { delimiter: ',' }).rows;
  for (let size = 1; size <= text.length; size++) {
    const rows = [];
    const p = createDelimitedParser({ delimiter: ',', onRow: (r) => rows.push(r) });
    for (let i = 0; i < text.length; i += size) p.push(text.slice(i, i + size));
    p.end();
    assert.deepEqual(rows, whole, `chunk size ${size}`);
  }
});

test('an unclosed quote at end of file still yields its row', () => {
  assert.deepEqual(parseDelimited('a,"open\n', { delimiter: ',' }).rows, [['a', 'open\n']]);
});

test('parses a year of 15-minute rows quickly in Node', () => {
  const lines = ['Date,Time,kWh'];
  for (let i = 0; i < 35_040; i++) lines.push(`2026-01-${String(1 + (i % 28)).padStart(2, '0')},${String(Math.floor(i / 4) % 24).padStart(2, '0')}:${String((i % 4) * 15).padStart(2, '0')},${(i % 97) / 10}`);
  const text = lines.join('\n');
  const t0 = performance.now();
  const { rows } = parseDelimited(text);
  const ms = performance.now() - t0;
  assert.equal(rows.length, 35_041);
  // The 1 s browser budget is set on the reference profile (task 2.1); this guards gross regressions.
  assert.ok(ms < 1000, `took ${ms.toFixed(0)} ms`);
});
