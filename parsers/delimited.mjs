// Delimited text (CSV, TSV, semicolon, pipe): encoding, delimiter, and quote
// handling for meter exports (platform/file-intake). Runs in a worker or in
// Node; makes no network request and reads nothing but the bytes given.

/**
 * Decode file bytes to text. A byte-order mark wins; otherwise the bytes must
 * be valid UTF-8, and anything else is read as Windows-1252, which is what
 * spreadsheet programs on Windows write when they save "CSV".
 * @param {Uint8Array} bytes
 * @returns {{text: string, encoding: 'utf-8' | 'utf-16le' | 'utf-16be' | 'windows-1252', bom: boolean}}
 */
export function decodeText(bytes) {
  const b = bytes;
  if (b[0] === 0xef && b[1] === 0xbb && b[2] === 0xbf) return { text: new TextDecoder('utf-8').decode(b.subarray(3)), encoding: 'utf-8', bom: true };
  if (b[0] === 0xff && b[1] === 0xfe) return { text: new TextDecoder('utf-16le').decode(b.subarray(2)), encoding: 'utf-16le', bom: true };
  if (b[0] === 0xfe && b[1] === 0xff) return { text: new TextDecoder('utf-16be').decode(b.subarray(2)), encoding: 'utf-16be', bom: true };
  try {
    return { text: new TextDecoder('utf-8', { fatal: true }).decode(b), encoding: 'utf-8', bom: false };
  } catch {
    return { text: new TextDecoder('windows-1252').decode(b), encoding: 'windows-1252', bom: false };
  }
}

export const DELIMITERS = [',', '\t', ';', '|'];

/**
 * Count delimiter occurrences outside quotes on one line.
 * @param {string} line
 * @param {string} d
 */
function countOutsideQuotes(line, d) {
  let n = 0;
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') quoted = !quoted;
    else if (c === d && !quoted) n++;
  }
  return n;
}

/**
 * Pick the delimiter whose per-line count is most consistent across the first
 * lines of the file. Preamble lines (account names, blank lines) are why this
 * scores agreement with the most common count instead of requiring every line.
 * @param {string} text
 * @returns {{delimiter: string, confidence: number}} confidence is the share of sampled lines that agree
 */
export function detectDelimiter(text) {
  const lines = text.slice(0, 65_536).split(/\r\n|\n|\r/).filter((l) => l.trim() !== '').slice(0, 50);
  let best = { delimiter: ',', confidence: 0, count: 0 };
  for (const d of DELIMITERS) {
    const counts = lines.map((l) => countOutsideQuotes(l, d));
    const freq = new Map();
    for (const c of counts) if (c > 0) freq.set(c, (freq.get(c) ?? 0) + 1);
    let mode = 0;
    let modeN = 0;
    for (const [c, n] of freq) if (n > modeN || (n === modeN && c > mode)) { mode = c; modeN = n; }
    const confidence = lines.length ? modeN / lines.length : 0;
    if (confidence > best.confidence || (confidence === best.confidence && mode > best.count)) best = { delimiter: d, confidence, count: mode };
  }
  return { delimiter: best.delimiter, confidence: best.confidence };
}

/**
 * An incremental parser: push text chunks, receive rows. Handles quoted fields,
 * doubled quotes, and line breaks inside quotes; accepts CRLF, LF, or CR.
 * @param {{delimiter: string, onRow: (fields: string[], line: number) => void}} opts
 */
export function createDelimitedParser({ delimiter, onRow }) {
  let field = '';
  let row = [];
  let quoted = false;
  let afterQuote = false;
  let pendingCR = false;
  let line = 1;
  let rowLine = 1;

  const endField = () => { row.push(field); field = ''; afterQuote = false; };
  const endRow = () => {
    endField();
    onRow(row, rowLine);
    row = [];
    rowLine = line;
  };

  return {
    /** @param {string} chunk */
    push(chunk) {
      for (let i = 0; i < chunk.length; i++) {
        const c = chunk[i];
        if (pendingCR) {
          pendingCR = false;
          if (c === '\n') continue;
        }
        if (quoted) {
          if (c === '"') {
            if (chunk[i + 1] === '"') { field += '"'; i++; }
            else if (i + 1 === chunk.length) { quoted = false; afterQuote = 'maybe'; }
            else { quoted = false; afterQuote = true; }
          } else {
            if (c === '\n' || (c === '\r' && chunk[i + 1] !== '\n')) line++;
            field += c;
          }
          continue;
        }
        if (afterQuote === 'maybe') {
          // A quote ended the previous chunk: a quote here means it was doubled.
          afterQuote = true;
          if (c === '"') { field += '"'; quoted = true; afterQuote = false; continue; }
        }
        if (c === delimiter) endField();
        else if (c === '\n' || c === '\r') {
          line++;
          endRow();
          if (c === '\r') pendingCR = true;
        } else if (c === '"' && field === '' && !afterQuote) quoted = true;
        else field += c;
      }
    },
    end() {
      if (field !== '' || row.length > 0 || quoted) endRow();
    },
  };
}

/**
 * Parse a whole text into rows of strings. Blank lines are kept as [''] so line
 * numbers on the receipt match the file.
 * @param {string} text
 * @param {{delimiter?: string}} [opts]
 * @returns {{rows: string[][], delimiter: string, confidence: number}}
 */
export function parseDelimited(text, opts = {}) {
  const detected = opts.delimiter ? { delimiter: opts.delimiter, confidence: 1 } : detectDelimiter(text);
  const rows = [];
  const p = createDelimitedParser({ delimiter: detected.delimiter, onRow: (r) => rows.push(r) });
  p.push(text);
  p.end();
  return { rows, ...detected };
}
