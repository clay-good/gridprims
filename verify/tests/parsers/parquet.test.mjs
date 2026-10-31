// The Parquet reader against pyarrow 26 (verify/tools/parquet-fixtures.py):
// every codec, page version, and encoding PUDL's writers use, read back value
// for value. The whole-file check against PUDL's real files is in
// docs/own-implementations.md.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readParquet, snappyDecompress } from '../../../parsers/parquet.mjs';

const DIR = fileURLToPath(new URL('../../fixtures/parquet/', import.meta.url));
const file = (name) => new Uint8Array(readFileSync(join(DIR, name)));
const expected = JSON.parse(readFileSync(join(DIR, 'expected.json'), 'utf8'));

for (const name of expected.cases) {
  test(`${name}: every value matches pyarrow, nulls included`, () => {
    const p = readParquet(file(`${name}.parquet`));
    assert.equal(p.numRows, expected.rows.length);
    const rows = p.rows();
    rows.forEach((r, i) => {
      const want = expected.rows[i];
      for (const k of Object.keys(want)) {
        const got = k === 'ratio' && r[k] !== null ? Math.fround(r[k]) : r[k];
        assert.equal(got, want[k], `row ${i} ${k}`);
      }
    });
  });
}

test('one column reads alone, and the schema says which columns allow nulls', () => {
  const p = readParquet(file('zstd-v2-dict.parquet'));
  assert.deepEqual(p.column('state').slice(0, 5), [null, 'CA', 'NY', 'Puerto Rico ñ', 'TX']);
  assert.equal(p.columns.find((c) => c.name === 'mwh').optional, true);
  assert.match(p.createdBy, /parquet-cpp-arrow/);
  assert.throws(() => p.column('zip'), /No column zip\. Columns: id, small, flag/);
});

test('files it cannot read are refused by name: not Parquet, nested columns, LZ4', () => {
  assert.throws(() => readParquet(new TextEncoder().encode('plant_id,state\n1,TX\n')), { code: 'not-parquet' });
  assert.throws(() => readParquet(file('refuse-nested.parquet')), { code: 'nested', message: /nested columns/ });
  const lz4 = readParquet(file('refuse-lz4.parquet'));
  assert.throws(() => lz4.column('id'), { code: 'codec', message: /compressed with LZ4/ });
});

test('Snappy: literals, short and long copies, and overlapping runs', () => {
  // "abcabcabcabc!": a 3-byte literal, a 9-byte copy at offset 3 (overlapping), a 1-byte literal.
  const block = Uint8Array.from([13, 0b00001000, 97, 98, 99, 0b00010101, 3, 0, 33]);
  assert.equal(new TextDecoder().decode(snappyDecompress(block)), 'abcabcabcabc!');
  assert.throws(() => snappyDecompress(Uint8Array.from([4, 0b00000001, 9])), { code: 'corrupt' });
});
