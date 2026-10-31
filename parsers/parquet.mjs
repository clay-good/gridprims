// A Parquet reader for flat tables (PUDL's releases, add-public-grid-data
// task 1.3): the Thrift compact footer, data pages v1 and v2, PLAIN and
// dictionary encodings, the RLE/bit-packed hybrid, the delta encodings, and
// Snappy, gzip, Brotli, or Zstandard pages. Nested columns (lists, maps,
// structs) are refused, not guessed at.

import { brotliDecompressSync, gunzipSync, zstdDecompressSync } from 'node:zlib';

export class ParquetError extends Error {
  /** @param {string} message @param {string} code */
  constructor(message, code) { super(message); this.code = code; }
}

// ---- Thrift compact protocol: structs come back as {fieldId: value}. ----

/** @param {Uint8Array} b @param {number} pos */
function thrift(b, pos) {
  const r = { pos };
  const byte = () => b[r.pos++];
  const varint = () => {
    let x = 0n;
    let shift = 0n;
    for (;;) {
      const c = byte();
      x |= BigInt(c & 0x7f) << shift;
      if (!(c & 0x80)) return x;
      shift += 7n;
    }
  };
  const zigzag = () => { const v = varint(); return Number((v >> 1n) ^ -(v & 1n)); };
  const binary = () => { const n = Number(varint()); const out = b.subarray(r.pos, r.pos + n); r.pos += n; return out; };
  const value = (type) => {
    switch (type) {
      case 1: return true;
      case 2: return false;
      case 3: return (byte() << 24) >> 24;
      case 4: case 5: case 6: return zigzag();
      case 7: { const v = new DataView(b.buffer, b.byteOffset + r.pos, 8).getFloat64(0, true); r.pos += 8; return v; }
      case 8: return binary();
      case 9: case 10: {
        const h = byte();
        const n = (h >> 4) === 15 ? Number(varint()) : h >> 4;
        const t = h & 15;
        return Array.from({ length: n }, () => (t === 1 || t === 2 ? byte() === 1 : value(t)));
      }
      case 11: throw new ParquetError('This Parquet file uses a Thrift map, which no footer field we read has.', 'thrift');
      case 12: return struct();
      default: throw new ParquetError(`Unknown Thrift type ${type} in the footer.`, 'thrift');
    }
  };
  const struct = () => {
    const out = {};
    let id = 0;
    for (;;) {
      const h = byte();
      if (h === 0) return out;
      const delta = h >> 4;
      id = delta ? id + delta : zigzag();
      out[id] = value(h & 15);
    }
  };
  return { struct, get pos() { return r.pos; } };
}

const text = (u8) => new TextDecoder().decode(u8);

// ---- Decompression ----

/** Snappy block format (google/snappy format_description.txt). */
export function snappyDecompress(src) {
  let pos = 0;
  let len = 0;
  for (let shift = 0; ; shift += 7) { const c = src[pos++]; len |= (c & 0x7f) << shift; if (!(c & 0x80)) break; }
  const out = new Uint8Array(len);
  let o = 0;
  while (pos < src.length) {
    const tag = src[pos++];
    const kind = tag & 3;
    if (kind === 0) {
      let n = tag >> 2;
      if (n >= 60) { const bytes = n - 59; n = 0; for (let k = 0; k < bytes; k++) n |= src[pos++] << (8 * k); }
      n += 1;
      out.set(src.subarray(pos, pos + n), o);
      pos += n;
      o += n;
      continue;
    }
    let n;
    let off;
    if (kind === 1) { n = ((tag >> 2) & 7) + 4; off = ((tag >> 5) << 8) | src[pos++]; }
    else if (kind === 2) { n = (tag >> 2) + 1; off = src[pos] | (src[pos + 1] << 8); pos += 2; }
    else { n = (tag >> 2) + 1; off = (src[pos] | (src[pos + 1] << 8) | (src[pos + 2] << 16) | (src[pos + 3] << 24)) >>> 0; pos += 4; }
    if (off === 0 || off > o) throw new ParquetError('A Snappy page points before its start.', 'corrupt');
    for (let k = 0; k < n; k++, o++) out[o] = out[o - off];
  }
  if (o !== len) throw new ParquetError('A Snappy page is shorter than it says.', 'corrupt');
  return out;
}

const CODECS = {
  0: (u8) => u8,
  1: snappyDecompress,
  2: (u8) => new Uint8Array(gunzipSync(u8)),
  4: (u8) => new Uint8Array(brotliDecompressSync(u8)),
  6: (u8) => new Uint8Array(zstdDecompressSync(u8)),
};
const CODEC_NAMES = { 3: 'LZO', 5: 'LZ4', 7: 'LZ4_RAW' };

// ---- Encodings ----

/** The RLE/bit-packed hybrid: `count` values of `width` bits from b[pos..end). */
function hybrid(b, pos, end, width, count) {
  const out = new Int32Array(count);
  let i = 0;
  const bytes = (width + 7) >> 3;
  while (i < count && pos < end) {
    let h = 0;
    for (let shift = 0; ; shift += 7) { const c = b[pos++]; h |= (c & 0x7f) << shift; if (!(c & 0x80)) break; }
    if (h & 1) {
      const n = (h >>> 1) * 8;
      let acc = 0;
      let have = 0;
      for (let k = 0; k < n; k++) {
        while (have < width) { acc |= b[pos++] << have; have += 8; }
        if (i < count) out[i++] = acc & ((1 << width) - 1);
        acc >>>= width;
        have -= width;
      }
    } else {
      let v = 0;
      for (let k = 0; k < bytes; k++) v |= b[pos++] << (8 * k);
      const n = h >>> 1;
      for (let k = 0; k < n && i < count; k++) out[i++] = v;
    }
  }
  return out;
}

/** DELTA_BINARY_PACKED: returns {values: bigint[], pos}. */
function deltaBinary(b, pos) {
  const uv = () => { let x = 0n; let s = 0n; for (;;) { const c = b[pos++]; x |= BigInt(c & 0x7f) << s; if (!(c & 0x80)) return x; s += 7n; } };
  const zz = () => { const v = uv(); return (v >> 1n) ^ -(v & 1n); };
  const block = Number(uv());
  const miniblocks = Number(uv());
  const total = Number(uv());
  let last = zz();
  const values = total ? [last] : [];
  const per = block / miniblocks;
  while (values.length < total) {
    const minDelta = zz();
    const widths = b.subarray(pos, pos + miniblocks);
    pos += miniblocks;
    for (let m = 0; m < miniblocks; m++) {
      const w = widths[m];
      if (values.length >= total) { pos += (per * w) / 8; continue; }
      let acc = 0n;
      let have = 0n;
      const W = BigInt(w);
      for (let k = 0; k < per; k++) {
        while (have < W) { acc |= BigInt(b[pos++]) << have; have += 8n; }
        const d = W ? acc & ((1n << W) - 1n) : 0n;
        acc >>= W;
        have -= W;
        if (values.length < total) { last += minDelta + d; values.push(last); }
      }
    }
  }
  return { values, pos };
}

/** PLAIN values of a physical type: `count` values from b at pos. */
function plain(b, pos, type, count, typeLength) {
  const dv = new DataView(b.buffer, b.byteOffset, b.byteLength);
  const out = new Array(count);
  switch (type) {
    case 0: for (let i = 0; i < count; i++) out[i] = ((b[pos + (i >> 3)] >> (i & 7)) & 1) === 1; return out;
    case 1: for (let i = 0; i < count; i++) out[i] = dv.getInt32(pos + 4 * i, true); return out;
    case 2: for (let i = 0; i < count; i++) out[i] = dv.getBigInt64(pos + 8 * i, true); return out;
    case 3: for (let i = 0; i < count; i++) { const at = pos + 12 * i; out[i] = { nanos: dv.getBigInt64(at, true), julianDay: dv.getInt32(at + 8, true) }; } return out;
    case 4: for (let i = 0; i < count; i++) out[i] = dv.getFloat32(pos + 4 * i, true); return out;
    case 5: for (let i = 0; i < count; i++) out[i] = dv.getFloat64(pos + 8 * i, true); return out;
    case 6: for (let i = 0; i < count; i++) { const n = dv.getInt32(pos, true); out[i] = b.subarray(pos + 4, pos + 4 + n); pos += 4 + n; } return out;
    case 7: for (let i = 0; i < count; i++) out[i] = b.subarray(pos + typeLength * i, pos + typeLength * (i + 1)); return out;
    default: throw new ParquetError(`Unknown Parquet physical type ${type}.`, 'type');
  }
}

/** Decode `count` non-null values of one page's value section. */
function values(b, pos, end, encoding, col, count, dict) {
  if (encoding === 0) return plain(b, pos, col.type, count, col.typeLength);
  if (encoding === 2 || encoding === 8) {
    const width = b[pos];
    return Array.from(hybrid(b, pos + 1, end, width, count), (k) => dict[k]);
  }
  if (encoding === 3 && col.type === 0) return Array.from(hybrid(b, pos + 4, end, 1, count), (v) => v === 1);
  if (encoding === 5) return deltaBinary(b, pos).values.map((v) => (col.type === 1 ? Number(v) : v));
  if (encoding === 6) {
    const lens = deltaBinary(b, pos);
    let at = lens.pos;
    return lens.values.map((n) => { const s = b.subarray(at, at + Number(n)); at += Number(n); return s; });
  }
  if (encoding === 7) {
    const pre = deltaBinary(b, pos);
    const suf = deltaBinary(b, pre.pos);
    let at = suf.pos;
    let prev = new Uint8Array(0);
    return pre.values.map((p, i) => {
      const s = b.subarray(at, at + Number(suf.values[i]));
      at += Number(suf.values[i]);
      const v = new Uint8Array(Number(p) + s.length);
      v.set(prev.subarray(0, Number(p)));
      v.set(s, Number(p));
      prev = v;
      return v;
    });
  }
  if (encoding === 9) {
    const width = { 4: 4, 5: 8, 1: 4, 2: 8 }[col.type];
    const tmp = new Uint8Array(count * width);
    for (let i = 0; i < count; i++) for (let k = 0; k < width; k++) tmp[i * width + k] = b[pos + k * count + i];
    return plain(tmp, 0, col.type, count);
  }
  throw new ParquetError(`Column ${col.name} uses Parquet encoding ${encoding}, which this reader does not support.`, 'encoding');
}

// ---- Logical types ----

const MS_PER_DAY = 86_400_000;
/** Turn a physical value into what a reader expects: strings, numbers, ISO dates. */
function logical(col) {
  const lt = col.logicalType ?? {};
  if (col.type === 6 && (col.convertedType === 0 || lt[1] || lt[4] || lt[5])) return (v) => text(v); // UTF8, STRING, ENUM, JSON
  if (col.convertedType === 6 || lt[6]) return (v) => new Date(v * MS_PER_DAY).toISOString().slice(0, 10); // DATE
  if (lt[8] || col.convertedType === 9 || col.convertedType === 10) {
    const unit = lt[8]?.[2] ?? {};
    const div = unit[1] || col.convertedType === 9 ? 1n : unit[2] || col.convertedType === 10 ? 1000n : 1_000_000n;
    return (v) => new Date(Number(BigInt(v) / div)).toISOString();
  }
  if (col.type === 3) return (v) => new Date(Number(BigInt(v.julianDay - 2440588) * 86_400_000n + v.nanos / 1_000_000n)).toISOString();
  if (col.type === 2) return (v) => Number(v);
  if (col.type === 7 || col.type === 6) return (v) => text(v);
  return (v) => v;
}

// ---- The file ----

/**
 * Open a Parquet file: its schema, row count, and a reader for whole columns.
 * @param {Uint8Array} bytes
 */
export function readParquet(bytes) {
  const n = bytes.length;
  if (n < 12 || text(bytes.subarray(0, 4)) !== 'PAR1' || text(bytes.subarray(n - 4)) !== 'PAR1') throw new ParquetError('This file is not a Parquet file.', 'not-parquet');
  const footerLen = new DataView(bytes.buffer, bytes.byteOffset + n - 8, 4).getUint32(0, true);
  if (footerLen > n - 12) throw new ParquetError('This Parquet file\'s footer is longer than the file.', 'corrupt');
  const meta = thrift(bytes, n - 8 - footerLen).struct();
  const [root, ...elements] = meta[2];
  if (elements.length !== root[5] || elements.some((e) => e[5])) throw new ParquetError('This Parquet file has nested columns, which this reader does not support.', 'nested');
  const columns = elements.map((e) => ({ name: text(e[4]), type: e[1], typeLength: e[2], optional: e[3] === 1, convertedType: e[6], logicalType: e[10] }));
  const rowGroups = meta[4] ?? [];
  const numRows = Number(meta[3]);

  /** Every value of one column, nulls included, in row order. */
  function column(name) {
    const ci = columns.findIndex((c) => c.name === name);
    if (ci < 0) throw new ParquetError(`No column ${name}. Columns: ${columns.map((c) => c.name).join(', ')}.`, 'column');
    const col = columns[ci];
    const convert = logical(col);
    const out = [];
    for (const rg of rowGroups) {
      const cm = rg[1][ci][3];
      const codec = cm[4];
      if (!CODECS[codec]) throw new ParquetError(`Column ${name} is compressed with ${CODEC_NAMES[codec] ?? `codec ${codec}`}, which this reader does not support.`, 'codec');
      const inflate = CODECS[codec];
      const total = Number(cm[5]);
      let pos = Number(cm[11] ?? cm[9]);
      if (cm[11] !== undefined && Number(cm[11]) === 0 && Number(cm[9]) > 0) pos = Number(cm[9]);
      let dict = null;
      let seen = 0;
      while (seen < total) {
        const t = thrift(bytes, pos);
        const ph = t.struct();
        const start = t.pos;
        const size = ph[3];
        pos = start + size;
        const kind = ph[1];
        if (kind === 2) {
          const page = inflate(bytes.subarray(start, start + size));
          dict = plain(page, 0, col.type, ph[7][1], col.typeLength);
          continue;
        }
        if (kind !== 0 && kind !== 3) continue; // index pages
        let page;
        let defs;
        let at;
        let count;
        let encoding;
        if (kind === 0) {
          const h = ph[5];
          count = h[1];
          encoding = h[2];
          page = inflate(bytes.subarray(start, start + size));
          at = 0;
          if (col.optional) {
            const len = new DataView(page.buffer, page.byteOffset).getUint32(0, true);
            defs = hybrid(page, 4, 4 + len, 1, count);
            at = 4 + len;
          }
        } else {
          const h = ph[8];
          count = h[1];
          encoding = h[4];
          const defLen = h[5];
          const repLen = h[6];
          const levels = bytes.subarray(start, start + repLen + defLen);
          const body = bytes.subarray(start + repLen + defLen, start + size);
          page = h[7] === false ? body : inflate(body);
          if (col.optional) defs = hybrid(levels, repLen, repLen + defLen, 1, count);
          at = 0;
        }
        const present = defs ? defs.reduce((k, d) => k + d, 0) : count;
        const vals = values(page, at, page.length, encoding, col, present, dict);
        let k = 0;
        for (let i = 0; i < count; i++) out.push(!defs || defs[i] ? convert(vals[k++]) : null);
        seen += count;
      }
    }
    return out;
  }

  /** Rows as objects with the named columns (all of them by default). */
  function rows(names = columns.map((c) => c.name)) {
    const cols = names.map((nm) => column(nm));
    return Array.from({ length: numRows }, (_, i) => Object.fromEntries(names.map((nm, k) => [nm, cols[k][i]])));
  }

  return { columns: columns.map(({ name, type, optional }) => ({ name, type, optional })), numRows, column, rows, createdBy: meta[6] ? text(meta[6]) : null };
}
