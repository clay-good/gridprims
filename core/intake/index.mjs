// The one front door for user files (platform/file-intake): detect the
// format from content, not the name, then read it into canonical series and
// a receipt. Runs in a worker or in Node; reads only the bytes it is given.

import { decodeText, detectDelimiter, parseDelimited } from '../../parsers/delimited.mjs';
import { readXlsx, readZipDirectory, XlsxError } from '../../parsers/xlsx.mjs';
import { readTable } from './tabular.mjs';

export const MAX_BYTES = 200_000_000;
export const WARN_BYTES = 50_000_000;
export const GET_YOUR_DATA_URL = '/learn/get-your-data/';

/**
 * What a file is, from its first bytes and, for text, its content.
 * @param {Uint8Array} bytes
 * @returns {'pdf' | 'ole' | 'xlsx' | 'zip' | 'espi-xml' | 'xml' | 'delimited' | 'empty' | 'unknown'}
 */
export function detectFormat(bytes) {
  if (bytes.length === 0) return 'empty';
  const head = String.fromCharCode(...bytes.subarray(0, 8));
  if (head.startsWith('%PDF')) return 'pdf';
  if (bytes[0] === 0xd0 && bytes[1] === 0xcf && bytes[2] === 0x11 && bytes[3] === 0xe0) return 'ole';
  if (head.startsWith('PK')) {
    try {
      const names = readZipDirectory(bytes).map((e) => e.name);
      return names.includes('xl/workbook.xml') ? 'xlsx' : 'zip';
    } catch { return 'unknown'; }
  }
  const { text } = decodeText(bytes.subarray(0, 65_536));
  const start = text.replace(/^\s+/, '');
  if (start.startsWith('<')) return /<(\w+:)?feed\b|naesb\.org\/espi/i.test(start) ? 'espi-xml' : 'xml';
  if (/[\x00-\x08\x0e-\x1f]/.test(text.slice(0, 4096))) return 'unknown';
  const lines = text.split(/\r\n|\n|\r/).filter((l) => l.trim());
  if (lines.length >= 2 && detectDelimiter(text).confidence >= 0.5) return 'delimited';
  return 'unknown';
}

/** Plain-language refusals, each saying what we saw and what to do instead. */
const REFUSALS = {
  pdf: 'This is a PDF. PDF bills are not read yet. Most utilities let you download your usage as a Green Button or CSV file instead.',
  ole: 'This looks like an older .xls file or a password-protected workbook. Open it and save it as .xlsx without a password, or download a CSV from your utility.',
  zip: 'This is a ZIP archive that is not an Excel workbook. If it holds a Green Button export, unzip it and drop the .xml file inside.',
  'espi-xml': 'This is a Green Button XML file. Reading Green Button XML is being built; download the CSV version from your utility for now.',
  xml: 'This is an XML file, but not a Green Button export.',
  empty: 'This file is empty.',
  unknown: 'We could not tell what kind of file this is. We read Green Button XML or CSV, utility CSV files, and Excel workbooks.',
};

/**
 * Read a file the user dropped.
 * @param {Uint8Array} bytes
 * @param {{name?: string}} file
 * @param {import('./tabular.mjs').Choices} choices
 */
export async function intakeFile(bytes, file, choices) {
  const t0 = performance.now();
  const meta = { name: file.name ?? '', size: bytes.length };
  if (bytes.length > MAX_BYTES) return { ok: false, format: 'too-large', message: `This file is ${bytes.length.toLocaleString('en-US')} bytes; the limit is ${MAX_BYTES.toLocaleString('en-US')}.`, learnUrl: GET_YOUR_DATA_URL };
  const format = detectFormat(bytes);
  let result;
  if (format === 'delimited') {
    const { text, encoding } = decodeText(bytes);
    const { rows, delimiter } = parseDelimited(text);
    result = readTable(rows, choices, { ...meta, format, encoding, delimiter: delimiter === '\t' ? 'tab' : delimiter });
  } else if (format === 'xlsx') {
    try {
      const wb = await readXlsx(bytes);
      result = readTable(wb.rows, { ...choices, date1904: wb.date1904 }, { ...meta, format, sheet: wb.sheet, sheets: wb.sheets });
    } catch (e) {
      if (e instanceof XlsxError) return { ok: false, format, message: e.message, learnUrl: GET_YOUR_DATA_URL };
      throw e;
    }
  } else {
    return { ok: false, format, message: REFUSALS[format], learnUrl: GET_YOUR_DATA_URL };
  }
  if (!result.ok) return { ...result, format, learnUrl: GET_YOUR_DATA_URL };
  result.receipt.file.warnLarge = bytes.length > WARN_BYTES;
  result.receipt.parseMs = Math.round(performance.now() - t0);
  return { ...result, format };
}
