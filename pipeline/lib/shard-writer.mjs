// Writing packed column shards (docs/formats/column-shard.md). Deterministic:
// the same rows always give the same bytes, so checksums reproduce.

import { MAGIC, NULL_I32, NULL_INDEX } from '../../core/lib/shard.mjs';

/**
 * @param {Array<Record<string, any>>} rows
 * @param {Array<{name: string, type: 'f64' | 'f32' | 'i32' | 'str', unit?: string, scale?: number}>} schema
 * @param {object} [meta] extra header fields (dataset, version, credits)
 * @returns {Uint8Array}
 */
export function writeShard(rows, schema, meta) {
  const n = rows.length;
  const columns = [];
  const bodies = [];
  let offset = 0;
  for (const s of schema) {
    let body;
    let dictionary;
    const values = rows.map((r) => r[s.name]);
    const nullable = values.some((v) => v === null || v === undefined);
    if (s.type === 'f64') {
      body = new Uint8Array(n * 8);
      const dv = new DataView(body.buffer);
      values.forEach((v, i) => dv.setFloat64(i * 8, v === null || v === undefined ? NaN : v, true));
    } else if (s.type === 'f32') {
      // Seven significant digits; the normalizer passes values through Math.fround, so a value read back equals the row.
      body = new Uint8Array(n * 4);
      const dv = new DataView(body.buffer);
      values.forEach((v, i) => dv.setFloat32(i * 4, v === null || v === undefined ? NaN : v, true));
    } else if (s.type === 'i32') {
      // value × scale, rounded, must fit an int32 other than the missing marker. The
      // normalizer rounds to the scale first, so a value read back equals the row.
      body = new Uint8Array(n * 4);
      const dv = new DataView(body.buffer);
      values.forEach((v, i) => {
        if (v === null || v === undefined) { dv.setInt32(i * 4, NULL_I32, true); return; }
        const k = Math.round(v * s.scale);
        if (!(k > NULL_I32 && k <= 0x7fffffff)) throw new Error(`${s.name}: ${v} does not fit an int32 at scale ${s.scale}`);
        dv.setInt32(i * 4, k, true);
      });
    } else {
      // Strings are dictionary-coded in first-seen order.
      dictionary = [];
      const index = new Map();
      body = new Uint8Array(n * 4);
      const dv = new DataView(body.buffer);
      values.forEach((v, i) => {
        if (v === null || v === undefined) { dv.setUint32(i * 4, NULL_INDEX, true); return; }
        let k = index.get(v);
        if (k === undefined) { k = dictionary.length; dictionary.push(v); index.set(v, k); }
        dv.setUint32(i * 4, k, true);
      });
    }
    const padded = Math.ceil(body.length / 8) * 8;
    columns.push({ name: s.name, type: s.type, ...(s.unit ? { unit: s.unit } : {}), ...(s.type === 'i32' ? { scale: s.scale } : {}), nullable, offset, length: body.length, ...(dictionary ? { dictionary } : {}) });
    bodies.push([body, padded]);
    offset += padded;
  }
  const header = new TextEncoder().encode(JSON.stringify({ format: 'gridprims-cols/1', rows: n, columns, ...(meta ? { meta } : {}) }));
  const dataStart = Math.ceil((8 + header.length) / 8) * 8;
  const out = new Uint8Array(dataStart + offset);
  out.set(new TextEncoder().encode(MAGIC), 0);
  new DataView(out.buffer).setUint32(4, header.length, true);
  out.set(header, 8);
  let at = dataStart;
  for (const [body, padded] of bodies) { out.set(body, at); at += padded; }
  return out;
}
