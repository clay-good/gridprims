import { test } from 'node:test';
import assert from 'node:assert/strict';
import { LIMITS, XlsxError, columnIndex, isDateFormat, readXlsx, readZipDirectory, serialToFields } from '../../../parsers/xlsx.mjs';
import { WORKBOOKS } from '../../fixtures/xlsx/workbooks.mjs';
import { writeZip } from '../../lib/zip-writer.mjs';

for (const wb of WORKBOOKS) {
  test(`reads fixture ${wb.id}: ${wb.note}`, async () => {
    const r = await readXlsx(wb.bytes());
    assert.deepEqual(r.rows, wb.rows);
    assert.equal(r.date1904, wb.date1904 ?? false);
  });
}

test('there are at least 10 workbook fixtures', () => {
  assert.ok(WORKBOOKS.length >= 10);
});

test('reads a sheet by name or number when asked', async () => {
  const wb = WORKBOOKS.find((w) => w.id === 'first-sheet-by-order');
  const byName = await readXlsx(wb.bytes(), { sheet: 'Intervals' });
  assert.deepEqual(byName.rows, wb.second);
  assert.deepEqual(byName.sheets, ['Summary', 'Intervals']);
  assert.equal((await readXlsx(wb.bytes(), { sheet: 1 })).sheet, 'Intervals');
  await assert.rejects(readXlsx(wb.bytes(), { sheet: 'Nope' }), (e) => e.code === 'no-sheet');
});

test('serial dates become wall-clock fields in both date systems', () => {
  // 46023 is 2026-01-01 in the 1900 system; 0.010416666 of a day is 00:15.
  assert.deepEqual(serialToFields(46023.010416666664), { year: 2026, month: 1, day: 1, hour: 0, minute: 15, second: 0 });
  assert.deepEqual(serialToFields(46023.5), { year: 2026, month: 1, day: 1, hour: 12, minute: 0, second: 0 });
  // The 1904 system counts from 1904-01-01, which is serial 1,462 in the 1900 system: 44561 + 1462 = 46023.
  assert.deepEqual(serialToFields(44561, true), { year: 2026, month: 1, day: 1, hour: 0, minute: 0, second: 0 });
  // Floating-point serials round to the nearest second rather than reading 00:14:59.
  assert.equal(serialToFields(46023 + 899.9996 / 86_400).minute, 15);
});

test('date formats are recognized; text, colors, and plain numbers are not dates', () => {
  for (const f of ['yyyy-mm-dd', 'm/d/yy h:mm', '[h]:mm:ss', '[Red]d-mmm', 'hh:mm AM/PM']) assert.ok(isDateFormat(f), f);
  for (const f of ['0.00', '#,##0', '0.00" kWh"', '[Blue]0.0', '0.00\\d', '"Day "0']) assert.ok(!isDateFormat(f), f);
});

test('column letters to indexes', () => {
  assert.deepEqual(['A', 'Z', 'AA', 'AB', 'XFD'].map(columnIndex), [0, 25, 26, 27, 16_383]);
});

test('refuses old .xls and password-protected workbooks with a plain message', async () => {
  const ole = Uint8Array.of(0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1, ...new Uint8Array(504));
  await assert.rejects(readXlsx(ole), (e) => e instanceof XlsxError && e.code === 'ole' && /save it as \.xlsx without a password/.test(e.message));
});

test('refuses a non-workbook ZIP, a non-ZIP, and a truncated archive', async () => {
  await assert.rejects(readXlsx(writeZip([{ name: 'readme.txt', data: 'hi' }])), (e) => e.code === 'not-xlsx');
  await assert.rejects(readXlsx(new TextEncoder().encode('Date,kWh\n')), (e) => e.code === 'not-zip');
  const good = WORKBOOKS[0].bytes();
  await assert.rejects(readXlsx(good.subarray(0, good.length - 30)), (e) => e.code === 'no-directory' || e.code === 'bad-directory');
});

test('a part that inflates past its declared size is refused', async () => {
  const bytes = WORKBOOKS[0].bytes();
  const entries = readZipDirectory(bytes);
  const sheet = entries.find((e) => e.name === 'xl/worksheets/sheet1.xml');
  // Lower the declared size in the central directory so the real data overruns it.
  const view = new DataView(bytes.buffer, bytes.byteOffset);
  let p = 0;
  for (let i = bytes.length - 22; i >= 0; i--) if (view.getUint32(i, true) === 0x06054b50) { p = view.getUint32(i + 16, true); break; }
  for (const e of entries) {
    if (e === sheet) view.setUint32(p + 24, 10, true);
    p += 46 + view.getUint16(p + 28, true) + view.getUint16(p + 30, true) + view.getUint16(p + 32, true);
  }
  await assert.rejects(readXlsx(bytes), (e) => e.code === 'size-mismatch');
});

test('a part with an absurd compression ratio is refused before inflating', async () => {
  const zeros = new Uint8Array(5_000_000);
  const bytes = writeZip([
    { name: 'xl/workbook.xml', data: '<workbook><sheets><sheet name="S" r:id="rId1"/></sheets></workbook>' },
    { name: 'xl/worksheets/sheet1.xml', data: zeros },
  ]);
  assert.ok(5_000_000 / readZipDirectory(bytes)[1].compressedSize > LIMITS.maxRatio);
  await assert.rejects(readXlsx(bytes), (e) => e.code === 'too-large');
});

test('reading never makes a network request', async () => {
  const original = globalThis.fetch;
  let fetched = 0;
  globalThis.fetch = () => { fetched++; throw new Error('no network'); };
  try {
    for (const wb of WORKBOOKS) await readXlsx(wb.bytes());
    assert.equal(fetched, 0);
  } finally {
    globalThis.fetch = original;
  }
});
