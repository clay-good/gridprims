// Excel .xlsx reader (foundation design D6): our own ZIP central-directory
// reader, raw inflate through DecompressionStream (a web API Node also ships),
// shared strings, styles for date detection, and cached cell values only.
// Formulas are never evaluated and external links are never followed.

import { readXml } from './xml.mjs';

/** Thrown for workbooks we cannot or will not read, with a message for the receipt. */
export class XlsxError extends Error {
  /** @param {string} message @param {string} code */
  constructor(message, code) { super(message); this.name = 'XlsxError'; this.code = code; }
}

export const LIMITS = { maxEntries: 10_000, maxEntryBytes: 1_000_000_000, maxTotalBytes: 2_000_000_000, maxRatio: 1_000 };

const u16 = (b, o) => b[o] | (b[o + 1] << 8);
const u32 = (b, o) => (b[o] | (b[o + 1] << 8) | (b[o + 2] << 16) | (b[o + 3] << 24)) >>> 0;

/**
 * @typedef {{name: string, method: number, flags: number, compressedSize: number, size: number, localOffset: number}} ZipEntry
 */

/**
 * Read the ZIP central directory. Only what .xlsx files use: stored and
 * deflated entries, no encryption, no multi-disk archives.
 * @param {Uint8Array} bytes
 * @returns {ZipEntry[]}
 */
export function readZipDirectory(bytes) {
  if (bytes[0] === 0xd0 && bytes[1] === 0xcf && bytes[2] === 0x11 && bytes[3] === 0xe0) {
    throw new XlsxError('This looks like an older .xls file or a password-protected workbook. Open it in your spreadsheet program and save it as .xlsx without a password.', 'ole');
  }
  if (bytes[0] !== 0x50 || bytes[1] !== 0x4b) throw new XlsxError('This file is not an .xlsx workbook.', 'not-zip');
  // The end-of-central-directory record sits in the last 64 KiB + 22 bytes.
  let eocd = -1;
  for (let i = bytes.length - 22; i >= Math.max(0, bytes.length - 65_557); i--) {
    if (u32(bytes, i) === 0x06054b50) { eocd = i; break; }
  }
  if (eocd < 0) throw new XlsxError('This workbook is damaged: its file index is missing.', 'no-directory');
  const count = u16(bytes, eocd + 10);
  let p = u32(bytes, eocd + 16);
  if (count === 0xffff || p === 0xffffffff) throw new XlsxError('This workbook is too large to read here (ZIP64).', 'zip64');
  if (count > LIMITS.maxEntries) throw new XlsxError('This workbook has too many parts to read safely.', 'too-many');
  const entries = [];
  const names = new TextDecoder('utf-8');
  for (let n = 0; n < count; n++) {
    if (p + 46 > bytes.length || u32(bytes, p) !== 0x02014b50) throw new XlsxError('This workbook is damaged: its file index is cut short.', 'bad-directory');
    const flags = u16(bytes, p + 8);
    const method = u16(bytes, p + 10);
    const compressedSize = u32(bytes, p + 20);
    const size = u32(bytes, p + 24);
    const nameLen = u16(bytes, p + 28);
    const extraLen = u16(bytes, p + 30);
    const commentLen = u16(bytes, p + 32);
    const localOffset = u32(bytes, p + 42);
    const name = names.decode(bytes.subarray(p + 46, p + 46 + nameLen));
    entries.push({ name, method, flags, compressedSize, size, localOffset });
    p += 46 + nameLen + extraLen + commentLen;
  }
  return entries;
}

/**
 * Read one entry's bytes, inflating if needed, and stop at the declared size
 * so a crafted archive cannot expand without bound.
 * @param {Uint8Array} bytes
 * @param {ZipEntry} e
 * @returns {Promise<Uint8Array>}
 */
export async function readZipEntry(bytes, e) {
  if (e.flags & 1) throw new XlsxError('This workbook is password-protected. Save it without a password and try again.', 'encrypted');
  if (e.size > LIMITS.maxEntryBytes || (e.compressedSize > 0 && e.size / e.compressedSize > LIMITS.maxRatio)) {
    throw new XlsxError('This workbook expands to more data than we read safely.', 'too-large');
  }
  const h = e.localOffset;
  if (u32(bytes, h) !== 0x04034b50) throw new XlsxError('This workbook is damaged: a part is missing.', 'bad-entry');
  const start = h + 30 + u16(bytes, h + 26) + u16(bytes, h + 28);
  const data = bytes.subarray(start, start + e.compressedSize);
  if (e.method === 0) return data.slice();
  if (e.method !== 8) throw new XlsxError('This workbook uses a compression method we do not read.', 'method');

  const stream = new Blob([data]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
  const reader = stream.getReader();
  const out = new Uint8Array(e.size);
  let at = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      if (at + value.length > e.size) {
        await reader.cancel();
        throw new XlsxError('This workbook is damaged: a part is larger than its index says.', 'size-mismatch');
      }
      out.set(value, at);
      at += value.length;
    }
  } catch (err) {
    if (err instanceof XlsxError) throw err;
    throw new XlsxError('This workbook is damaged: a part could not be decompressed.', 'inflate');
  }
  if (at !== e.size) throw new XlsxError('This workbook is damaged: a part is shorter than its index says.', 'size-mismatch');
  return out;
}

/** Excel's built-in number formats that display dates or times. */
const BUILTIN_DATE_FORMATS = new Set([14, 15, 16, 17, 18, 19, 20, 21, 22, 45, 46, 47]);

/**
 * True when a custom number format displays a date or time: a d, m, y, h, or s
 * token outside quoted text, bracketed colors, and escaped characters.
 * @param {string} code
 */
export function isDateFormat(code) {
  const bare = code.replace(/"[^"]*"/g, '').replace(/\\./g, '').replace(/\[(?!h\]|m\]|s\])[^\]]*\]/gi, '');
  return /[dmyhs]/i.test(bare.split(';')[0]);
}

/**
 * Excel serial date to wall-clock fields. Serials carry no time zone: they are
 * whatever the clock on the sheet read, which is why intake asks for the zone.
 * @param {number} serial
 * @param {boolean} [date1904]
 */
export function serialToFields(serial, date1904 = false) {
  // Day 0 is 1899-12-30 in the 1900 system once Excel's phantom 1900-02-29 is
  // accounted for (serials from 61 on); 1904-01-01 in the 1904 system.
  const epoch = date1904 ? Date.UTC(1904, 0, 1) : Date.UTC(1899, 11, 30);
  const ms = Math.round(serial * 86_400) * 1000;
  const d = new Date(epoch + ms);
  return { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1, day: d.getUTCDate(), hour: d.getUTCHours(), minute: d.getUTCMinutes(), second: d.getUTCSeconds() };
}

/** Column letters to a zero-based index ("A" → 0, "AB" → 27). */
export function columnIndex(letters) {
  let n = 0;
  for (const c of letters.toUpperCase()) n = n * 26 + (c.charCodeAt(0) - 64);
  return n - 1;
}

/** Excel escapes control characters as _xHHHH_ in strings. */
const unescapeOoxml = (s) => s.replace(/_x([0-9A-Fa-f]{4})_/g, (_, h) => String.fromCharCode(parseInt(h, 16)));

const local = (name) => name.slice(name.indexOf(':') + 1);

/**
 * @typedef {{value: string | number | boolean | null, type: 'n' | 's' | 'b' | 'e', date: boolean}} Cell
 */

/**
 * Read a workbook's first sheet (or a named or numbered one) to rows of cells.
 * @param {Uint8Array} bytes
 * @param {{sheet?: string | number}} [opts]
 * @returns {Promise<{sheets: string[], sheet: string, date1904: boolean, rows: Array<Array<Cell | null>>}>}
 */
export async function readXlsx(bytes, opts = {}) {
  const entries = readZipDirectory(bytes);
  const byName = new Map(entries.map((e) => [e.name.replace(/^\//, ''), e]));
  let total = 0;
  const text = async (name) => {
    const e = byName.get(name);
    if (!e) return null;
    total += e.size;
    if (total > LIMITS.maxTotalBytes) throw new XlsxError('This workbook expands to more data than we read safely.', 'too-large');
    return new TextDecoder('utf-8').decode(await readZipEntry(bytes, e));
  };

  const workbookXml = await text('xl/workbook.xml');
  if (workbookXml === null) throw new XlsxError('This file is a ZIP archive but not an Excel workbook.', 'not-xlsx');

  const sheets = [];
  let date1904 = false;
  readXml(workbookXml, {
    open(name, a) {
      const n = local(name);
      if (n === 'sheet') sheets.push({ name: a.name, rid: a['r:id'] ?? Object.entries(a).find(([k]) => local(k) === 'id' && k.includes(':'))?.[1] });
      if (n === 'workbookPr' && (a.date1904 === '1' || a.date1904 === 'true')) date1904 = true;
    },
  });
  if (sheets.length === 0) throw new XlsxError('This workbook has no sheets.', 'no-sheets');

  const targets = new Map();
  const relsXml = await text('xl/_rels/workbook.xml.rels');
  if (relsXml) readXml(relsXml, { open(name, a) { if (local(name) === 'Relationship') targets.set(a.Id, a.Target); } });

  const pick = opts.sheet === undefined ? 0 : typeof opts.sheet === 'number' ? opts.sheet : sheets.findIndex((s) => s.name === opts.sheet);
  const chosen = sheets[pick];
  if (!chosen) throw new XlsxError(`This workbook has no sheet named ${JSON.stringify(opts.sheet)}.`, 'no-sheet');
  let target = targets.get(chosen.rid) ?? `worksheets/sheet${pick + 1}.xml`;
  target = target.startsWith('/') ? target.slice(1) : `xl/${target}`;
  const sheetXml = await text(target);
  if (sheetXml === null) throw new XlsxError('This workbook is damaged: its first sheet is missing.', 'no-sheet-part');

  const shared = [];
  const sstXml = await text('xl/sharedStrings.xml');
  if (sstXml) {
    // A shared string is its <t> text, or the concatenated <t> of its rich-text
    // runs; phonetic hints (<rPh>) are not part of the value.
    let cur = null;
    let inT = false;
    let inPhonetic = 0;
    readXml(sstXml, {
      open(name) { const n = local(name); if (n === 'si') cur = ''; else if (n === 'rPh') inPhonetic++; else if (n === 't' && !inPhonetic) inT = true; },
      close(name) { const n = local(name); if (n === 'si') { shared.push(unescapeOoxml(cur)); cur = null; } else if (n === 'rPh') inPhonetic--; else if (n === 't') inT = false; },
      text(v) { if (inT && cur !== null) cur += v; },
    });
  }

  const dateStyles = [];
  const stylesXml = await text('xl/styles.xml');
  if (stylesXml) {
    const custom = new Map();
    let inCellXfs = false;
    readXml(stylesXml, {
      open(name, a) {
        const n = local(name);
        if (n === 'numFmt') custom.set(Number(a.numFmtId), a.formatCode ?? '');
        else if (n === 'cellXfs') inCellXfs = true;
        else if (n === 'xf' && inCellXfs) {
          const id = Number(a.numFmtId ?? 0);
          dateStyles.push(BUILTIN_DATE_FORMATS.has(id) || (custom.has(id) && isDateFormat(custom.get(id))));
        }
      },
      close(name) { if (local(name) === 'cellXfs') inCellXfs = false; },
    });
  }

  /** @type {Array<Array<Cell | null>>} */
  const rows = [];
  let row = null;
  let rowIndex = -1;
  let col = -1;
  let cell = null;
  let capture = '';
  let inValue = false;
  readXml(sheetXml, {
    open(name, a) {
      const n = local(name);
      if (n === 'row') {
        rowIndex = a.r ? Number(a.r) - 1 : rowIndex + 1;
        row = rows[rowIndex] = [];
        col = -1;
      } else if (n === 'c' && row) {
        const ref = /^([A-Z]+)/i.exec(a.r ?? '');
        col = ref ? columnIndex(ref[1]) : col + 1;
        cell = { t: a.t ?? 'n', s: Number(a.s ?? 0), raw: null };
      } else if ((n === 'v' || n === 't') && cell) {
        inValue = true;
        capture = '';
      }
    },
    close(name) {
      const n = local(name);
      if ((n === 'v' || n === 't') && cell) {
        inValue = false;
        cell.raw = (cell.raw ?? '') + capture;
      } else if (n === 'c' && cell && row) {
        row[col] = toCell(cell, shared, dateStyles);
        cell = null;
      } else if (n === 'row') row = null;
    },
    text(v) { if (inValue) capture += v; },
  });
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i] ?? [];
    for (let j = 0; j < r.length; j++) if (r[j] === undefined) r[j] = null;
    rows[i] = r;
  }
  return { sheets: sheets.map((s) => s.name), sheet: chosen.name, date1904, rows };
}

/** @returns {Cell | null} */
function toCell(c, shared, dateStyles) {
  if (c.raw === null) return null; // a formula with no cached value, or a styled empty cell
  switch (c.t) {
    case 's': return { value: shared[Number(c.raw)] ?? '', type: 's', date: false };
    case 'inlineStr':
    case 'str': return { value: unescapeOoxml(c.raw), type: 's', date: false };
    case 'b': return { value: c.raw === '1', type: 'b', date: false };
    case 'e': return { value: c.raw, type: 'e', date: false };
    case 'd': return { value: c.raw, type: 's', date: true }; // ISO 8601 text, rare
    default: {
      const v = Number(c.raw);
      return Number.isFinite(v) ? { value: v, type: 'n', date: dateStyles[c.s] === true } : { value: c.raw, type: 's', date: false };
    }
  }
}
