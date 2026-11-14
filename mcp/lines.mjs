// The lines tools over MCP (add-overhead-line-checks 5.5, agent/mcp-server
// "Tools that read more than one file" and "Lines file text stays in
// source_text"). A standards file or a pole list analyzed from an allowed
// folder becomes a handle tagged with its kind; gridprims_run takes a handle
// or the same list inline. Before any check runs, every cell that is free
// text (owners, pole ids, notes, sources, and any cell that is not the
// number or word the column expects) is taken out and listed in source_text
// by row, truncated to 80 code points, so file text never shapes a result.

import { TEMPLATE_IDS } from '../core/lib/standards-template.mjs';
import { KIND_NAME, parseRules } from '../core/lib/attachment.mjs';
import { linesKind, poleInputs, readPoleList } from '../core/lib/lines-files.mjs';
import { runTool } from '../core/contract/run.mjs';

export { linesKind };
const truncate = (t) => [...String(t)].slice(0, 80).join('');
const LENGTH = /^[\d.,\s'"’”″′-]*(ft|feet|foot|in|inch|inches|m|cm|mm)?\.?(\s*[\d.]+\s*(in|inch|inches|cm|mm)?\.?)?$/i;
const UNIT = /^(ft|feet|foot|in|inch|inches|m|cm|mm|%)?\.?$/i;
const KV_RANGE = /^\d+(?:\.\d+)?\s*-\s*\d+(?:\.\d+)?\s*kv$/i;
const KIND = /^([a-z-]+)(\s+\d+(\.\d+)?\s*kv)?$/i;
const known = (id) => TEMPLATE_IDS.includes(id) || /^ground\.[a-z-]+\.[a-z-]+$/.test(id);

/**
 * The rules with every free-text cell taken out, row numbers kept.
 * @param {string} text @returns {{text: string, sourceText: string[]}}
 */
export function redactRules(text) {
  const sourceText = [];
  const keep = (row, what, v, ok) => { if (ok || v === '') return v; sourceText.push(truncate(`row ${row} ${what}: ${v}`)); return '?'; };
  const lines = String(text).split('\n').map((raw, i) => {
    const row = i + 1;
    const [id = '', appliesTo = '', value = '', unit = '', source = '', locator = '', note = ''] = raw.trim().split(',').map((x) => x.trim());
    if (!known(id)) {
      if (id && !/^rule_?id$/i.test(id)) sourceText.push(truncate(`row ${row}: ${raw.trim()}`));
      return /^rule_?id$/i.test(id) ? raw.trim() : '';
    }
    for (const [what, v] of [['source', source], ['locator', locator], ['note', note]]) if (v) sourceText.push(truncate(`row ${row} ${what}: ${v}`));
    const applies = KV_RANGE.test(appliesTo) ? appliesTo : (appliesTo && sourceText.push(truncate(`row ${row} applies_to: ${appliesTo}`)), '');
    const v = id === 'place.preference' ? keep(row, 'value', value, /^(highest|lowest|nearest)$/i.test(value)) : keep(row, 'value', value, LENGTH.test(value) || /^\d*\.?\d+%?$/.test(value));
    return [id, applies, v, keep(row, 'unit', unit, UNIT.test(unit)), source || locator ? 'the file; its words are in source_text' : '', '', ''].join(',');
  });
  return { text: lines.join('\n'), sourceText };
}

/** One attachment row with its owner and note taken out, its kind and height kept only when they read as such. */
function cleanRow(r, sourceText) {
  for (const [what, v] of [['owner', r.owner], ['note', r.note]]) if (v) sourceText.push(truncate(`row ${r.row} ${what}: ${v}`));
  const kind = KIND.test(r.kind) ? r.kind : (sourceText.push(truncate(`row ${r.row} kind: ${r.kind}`)), 'unreadable');
  const height = LENGTH.test(r.height) ? r.height : (sourceText.push(truncate(`row ${r.row} height: ${r.height}`)), '?');
  return { ...r, owner: '', note: '', kind, height };
}

/** One pole with its id, owners, and notes taken out. */
function redactPole(pole, index) {
  const sourceText = [truncate(`pole ${index} id: ${pole.id}`)];
  const rows = pole.rows.map((r) => cleanRow(r, sourceText));
  const poleLength = pole.poleLength === null || LENGTH.test(pole.poleLength) ? pole.poleLength : (sourceText.push(truncate(`pole ${index} length: ${pole.poleLength}`)), null);
  return { pole: { ...pole, id: '', rows, poleLength }, sourceText };
}

/** What gridprims_analyze_file returns for a lines file: counts, rows, and fixed vocabulary, with free text in source_text. */
export function linesView(kind, text, handle) {
  if (kind === 'lines-standards') {
    const { text: clean, sourceText } = redactRules(text);
    const read = parseRules(clean);
    return {
      handle, kind,
      receipt: {
        rules: read.rules.map((r) => ({ row: r.row, id: r.id, ...(r.inches !== undefined ? { inches: r.inches } : { value: r.value }), ...(r.range ? { kv: r.range } : {}), ...(r.flag ? { flagged: true } : {}) })),
        conflicts: read.conflicts.map((c) => ({ id: c.id, rows: c.rows })),
        problemRows: read.problems.map((p) => Number(/^row (\d+)/.exec(p)?.[1])).filter(Number.isFinite),
        ignoredRows: read.ignored.map((x) => x.row),
        skipped: read.skipped,
      },
      source_text: sourceText,
    };
  }
  const list = readPoleList(text);
  const sourceText = [];
  const poles = list.poles.map((p, index) => {
    const r = redactPole(p, index);
    sourceText.push(...r.sourceText);
    return { index, rows: p.rows.map((x) => x.row), kinds: r.pole.rows.map((x) => KIND_NAME[KIND.exec(x.kind)?.[1].toLowerCase()] ?? 'unreadable'), poleLengthGiven: p.poleLength !== null };
  });
  return { handle, kind, receipt: { poles, rowsRead: list.rowsRead, skipped: list.skipped, problems: list.problems }, source_text: sourceText };
}

/** Inline rules[] as template rows. */
const rulesText = (rows) => ['rule_id,applies_to,value,unit,source_document,source_locator,note', ...rows.map((r) => [r.rule_id ?? r.id, r.applies_to, r.value, r.unit, r.source_document, r.source_locator, r.note].map((c) => String(c ?? '').replace(/,/g, ' ')).join(','))].join('\n');
/** Inline attachments[] as the tool's lines. */
const attachmentsText = (rows) => rows.map((r) => [r.kind, r.owner, r.height].map((c) => String(c ?? '').replace(/,/g, ' ')).join(', ')).join('\n');

/**
 * Run a lines tool with handles or inline lists. Returns {error} for a bad handle, or the result with
 * source_text; a pole list gives one result per pole.
 * @param {{manifest: any, impl: any}} t @param {Record<string, any>} inputs @param {(id: string) => any} getHandle
 */
export function runLines(t, inputs, getHandle) {
  const sourceText = [];
  const v = { ...inputs };
  const fromHandle = (name, kind) => {
    const e = getHandle(v[name]);
    if (!e) return { error: `${name}: that handle is unknown or expired. Analyze the file again to get a new one.` };
    if (e.kind !== kind) return { error: `${name}: that handle is ${e.kind ? `a ${e.kind} file` : 'a load file'}; this input takes a ${kind} file.` };
    return { text: e.text };
  };
  if (typeof v.rules === 'string' && v.rules.startsWith('h_')) { const r = fromHandle('rules', 'lines-standards'); if (r.error) return r; v.rules = r.text; }
  if (Array.isArray(v.rules)) v.rules = rulesText(v.rules);
  if (v.rules !== undefined) { const r = redactRules(v.rules); v.rules = r.text; sourceText.push(...r.sourceText); }
  if (Array.isArray(v.attachments)) v.attachments = attachmentsText(v.attachments);

  let poles = null;
  if (v.poles !== undefined) {
    const r = fromHandle('poles', 'lines-pole-list');
    if (r.error) return r;
    poles = readPoleList(r.text).poles;
    delete v.poles;
  }
  if (!poles) {
    if (typeof v.attachments === 'string') {
      // Typed lines are read as the tool reads them; "no power" is a fixed phrase, kept as written.
      v.attachments = v.attachments.split('\n').map((line, i) => {
        const text = line.trim();
        if (!text || /^no power$/i.test(text)) return text;
        const [kind = '', owner = '', height = ''] = text.split(',').map((x) => x.trim());
        const r = cleanRow({ row: i + 1, kind, owner, height, note: '' }, sourceText);
        return `${r.kind}, , ${r.height}`;
      }).join('\n');
    }
    return { result: runTool(t.manifest, t.impl, v), source_text: [...new Set(sourceText)] };
  }
  const results = poles.map((p, index) => {
    const red = redactPole(p, index);
    sourceText.push(...red.sourceText);
    const r = runTool(t.manifest, t.impl, { ...v, ...poleInputs(red.pole) });
    return { index, rows: p.rows.map((x) => x.row), status: r.status, ...(r.status === 'ok' ? { outputs: r.outputs, sentence: r.sentence, steps: r.work.steps } : r.status === 'refused' ? { reason: r.reason } : { errors: r.errors }) };
  });
  return { result: { status: 'ok', toolId: t.manifest.id, toolVersion: t.manifest.version, poles: results }, source_text: [...new Set(sourceText)] };
}
