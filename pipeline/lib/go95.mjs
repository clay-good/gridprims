// The GO 95 table watch (add-overhead-line-checks D3): one extractor for both
// the stored capture and the weekly check, so a difference means the CPUC's
// page changed and never that our two readers disagree. The captures hold the
// table rows as text; the watch compares that text, not the page's bytes, so a
// regenerated page with the same rules raises no alarm.

import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

/** The GO 95 pages the clearance facts come from, with the capture each is compared against. */
export const GO95_PAGES = [
  { table: '1', url: 'https://ia.cpuc.ca.gov/gos/go95/go_95_table_1.html', capture: 'data/curated/captures/go95/table-1.txt' },
  { table: '2', url: 'https://ia.cpuc.ca.gov/gos/go95/go_95_table_2.html', capture: 'data/curated/captures/go95/table-2.txt' },
];

const ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', ndash: '–', mdash: '—', rsquo: '’', lsquo: '‘' };

// Windows-1252 differs from Latin-1 only in 0x80-0x9F, and the CPUC's tables use those bytes for
// dashes and quotes. Decoded here rather than through TextDecoder('windows-1252'), which falls back
// to Latin-1 on a Node built without the full ICU data, so the extractor reads the same everywhere.
const HIGH = '\u20ac\u0081\u201a\u0192\u201e\u2026\u2020\u2021\u02c6\u2030\u0160\u2039\u0152\u008d\u017d\u008f\u0090\u2018\u2019\u201c\u201d\u2022\u2013\u2014\u02dc\u2122\u0161\u203a\u0153\u009d\u017e\u0178';
const decode1252 = (bytes) => Array.from(bytes, (b) => (b >= 0x80 && b <= 0x9f ? HIGH[b - 0x80] : String.fromCharCode(b))).join('');
const unescape = (s) => s.replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (m, e) => {
  if (e[0] === '#') return String.fromCodePoint(Number(e[1] === 'x' || e[1] === 'X' ? `0x${e.slice(2)}` : e.slice(1)));
  return ENTITIES[e.toLowerCase()] ?? m;
});

/**
 * Each table row's cells, joined with " | ", tags and empty cells removed. The CPUC serves these pages as
 * Windows-1252, which is how they are decoded.
 * @param {Uint8Array | string} html
 * @returns {string} one line a row
 */
export function tableText(html) {
  const text = typeof html === 'string' ? html : decode1252(html);
  const body = text.replace(/<(script|style)[\s\S]*?<\/\1>/gi, ' ');
  const rows = [];
  for (const m of body.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)) {
    const cells = [...m[1].matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi)]
      .map((c) => unescape(c[1].replace(/<[^>]+>/g, '')).replace(/\s+/g, ' ').trim())
      .filter(Boolean);
    if (cells.length) rows.push(cells.join(' | '));
  }
  return rows.join('\n');
}

/** A capture file: its header fields and the text below the rule. */
export function readCapture(root, rel) {
  const text = readFileSync(join(root, rel), 'utf8');
  const [head, ...rest] = text.split('\n----\n');
  const field = (name) => new RegExp(`^${name}: (.*)$`, 'm').exec(head)?.[1] ?? null;
  return { source: field('Source'), retrieved: field('Retrieved'), body: rest.join('\n----\n').replace(/\n$/, '') };
}

/** A capture's text, with the header that records where it came from. */
export const captureFile = (url, bytes, body, how) =>
  `Source: ${url}\nRetrieved: ${new Date().toISOString().slice(0, 10)}\nOriginal: ${bytes.length} bytes, SHA-256 ${createHash('sha256').update(bytes).digest('hex')}\nCapture: ${how}\n----\n${body}\n`;

/**
 * Compare each GO 95 page with its stored capture.
 * @param {string} root @param {typeof fetch} fetchFn
 * @returns {Promise<Array<{table: string, url: string, changed: boolean, reason?: string, rowsNow?: number, rowsStored?: number}>>}
 */
export async function checkGo95(root, fetchFn = fetch) {
  const out = [];
  for (const p of GO95_PAGES) {
    if (!existsSync(join(root, p.capture))) { out.push({ table: p.table, url: p.url, changed: true, reason: 'no stored capture' }); continue; }
    const stored = readCapture(root, p.capture);
    try {
      const res = await fetchFn(p.url);
      if (!res.ok) { out.push({ table: p.table, url: p.url, changed: false, reason: `HTTP ${res.status}; the stored capture still stands` }); continue; }
      const now = tableText(new Uint8Array(await res.arrayBuffer()));
      const changed = now !== stored.body;
      out.push({
        table: p.table, url: p.url, changed,
        ...(changed ? { reason: 'the table text differs from the stored capture', rowsNow: now.split('\n').length, rowsStored: stored.body.split('\n').length } : {}),
      });
    } catch (e) {
      out.push({ table: p.table, url: p.url, changed: false, reason: `could not be fetched (${e.message}); the stored capture still stands` });
    }
  }
  return out;
}

/** The tables a difference touches, so every fact from them reads "needs review". */
export const tablesNeedingReview = (results) => results.filter((r) => r.changed).map((r) => r.table);
