// The two files the lines tools read (add-overhead-line-checks design D8):
// the standards template and the pole list, told apart by their header rows.
// The pole list has one row per attachment, `pole_id, owner, kind, height,
// note`, with an optional `pole_length`; rows are grouped into poles in the
// order each pole first appears.

import { parseDelimited } from '../../parsers/delimited.mjs';

const cellsOf = (line) => line.replace(/^﻿/, '').split(',').map((c) => c.trim().toLowerCase().replace(/\s+/g, '_'));

/**
 * Which lines file this is, from its first non-blank row, or null.
 * @param {string} text @returns {'lines-standards' | 'lines-pole-list' | null}
 */
export function linesKind(text) {
  const first = String(text).split(/\r?\n/).find((l) => l.trim() !== '');
  if (!first) return null;
  const h = cellsOf(first);
  if (h.includes('rule_id') && h.includes('value')) return 'lines-standards';
  if (h.includes('pole_id') && h.includes('kind') && h.includes('height')) return 'lines-pole-list';
  return null;
}

/**
 * Read a pole list. Each row keeps its line in the file; a row with no pole id, kind, or height is listed
 * with its row number and the field it lacks.
 * @param {string} text
 */
export function readPoleList(text) {
  const rows = parseDelimited(String(text).replace(/^﻿/, ''), { delimiter: ',' }).rows;
  const at = rows.findIndex((r) => r.some((c) => String(c).trim() !== ''));
  const header = (rows[at] ?? []).map((c) => String(c).trim().toLowerCase().replace(/\s+/g, '_'));
  const col = (name) => header.indexOf(name);
  const C = { pole: col('pole_id'), owner: col('owner'), kind: col('kind'), height: col('height'), note: col('note'), length: col('pole_length') };
  const poles = new Map();
  const problems = [];
  let skipped = 0;
  rows.slice(at + 1).forEach((r, k) => {
    const row = at + k + 2;
    const cell = (i) => (i < 0 ? '' : String(r[i] ?? '').trim());
    if (r.every((c) => String(c).trim() === '')) { skipped++; return; }
    for (const [field, i] of [['pole_id', C.pole], ['kind', C.kind], ['height', C.height]]) {
      if (cell(i) === '') { problems.push({ row, missing: field }); return; }
    }
    const id = cell(C.pole);
    const pole = poles.get(id) ?? poles.set(id, { id, rows: [], poleLength: null }).get(id);
    pole.rows.push({ row, owner: cell(C.owner), kind: cell(C.kind), height: cell(C.height), note: cell(C.note) });
    if (cell(C.length) !== '' && pole.poleLength === null) pole.poleLength = cell(C.length);
  });
  return { poles: [...poles.values()], problems, rowsRead: rows.length - at - 1 - skipped, skipped };
}

/**
 * One pole's inputs for lines.attachment-height.find: its attachments a line each, and its length.
 * @param {{rows: Array<{kind: string, owner: string, height: string}>, poleLength: string | null}} pole
 */
export function poleInputs(pole) {
  // Each attachment sits on its own line of the file, so the tool's row numbers are the pole list's.
  const lines = Array.from({ length: Math.max(...pole.rows.map((r) => r.row)) }, () => '');
  for (const r of pole.rows) lines[r.row - 1] = `${r.kind}, ${r.owner.replace(/,/g, ' ')}, ${r.height}`;
  return { attachments: lines.join('\n'), poleLength: pole.poleLength ?? 'unknown' };
}
