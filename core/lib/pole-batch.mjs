// A pole list checked one pole at a time (add-overhead-line-checks 3.5,
// lines/attachment-height "A list of poles from a field file"): each pole's
// rows become that pole's inputs, with the file's own row numbers, and the
// tool's answer becomes one line: the instruction, any moves, and any
// existing shortfalls. A pole the tool cannot check is listed as not
// checked, with the rows and reasons. The CSV export guards every cell a
// spreadsheet would read as a formula.

import { poleInputs, readPoleList } from './lines-files.mjs';

const EXISTING = 'Existing condition: ';

/**
 * @param {string} text the pole list
 * @param {(inputs: {attachments: string, poleLength: string}) => any} run a runTool for one pole, with the other inputs fixed
 * @param {(done: number, total: number) => void} [onProgress]
 */
export function checkPoleList(text, run, onProgress) {
  const list = readPoleList(text);
  const poles = list.poles.map((pole, k) => {
    const { offset, ...inputs } = poleInputs(pole, { absolute: false });
    const r = run(inputs);
    if (onProgress && (k % 100 === 99 || k === list.poles.length - 1)) onProgress(k + 1, list.poles.length);
    const base = { id: pole.id, rows: pole.rows.map((x) => x.row) };
    if (r.status === 'ok') {
      const shortfalls = r.work.steps.filter((s) => s.startsWith(EXISTING)).map((s) => s.slice(EXISTING.length));
      let instruction = r.sentence;
      for (const s of shortfalls) instruction = instruction.replace(s, '').trim();
      return { ...base, status: 'checked', instruction, moves: r.outputs.moves?.value ?? null, height: r.outputs.height?.value ?? null, shortfalls };
    }
    const reasons = r.status === 'refused' ? [{ row: null, reason: r.reason }]
      // An attachment's row is relative to the pole's first row; add the offset back. A rules row stays as it is.
      : r.errors.map((e) => { const m = /^row (\d+): (.*)$/.exec(e.message); return m ? { row: Number(m[1]) + (e.field === 'attachments' ? offset : 0), ...(e.field === 'rules' ? { rules: true } : {}), reason: m[2] } : { row: null, reason: e.message }; });
    return { ...base, status: 'not checked', reasons };
  });
  return { poles, problems: list.problems, rowsRead: list.rowsRead };
}

/** A cell as CSV, quoted when it must be, and never read as a formula. */
const cell = (v) => {
  let s = String(v ?? '');
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

/**
 * One row per pole.
 * @param {ReturnType<typeof checkPoleList>} batch @param {{source: string, edition: string}} rules
 */
export function poleBatchCsv(batch, rules) {
  const head = ['pole_id', 'rows', 'status', 'instruction', 'moves', 'existing_shortfalls', 'rule_source', 'rule_edition'];
  const lines = batch.poles.map((p) => [
    p.id, p.rows.join(' '), p.status,
    p.status === 'checked' ? p.instruction : p.reasons.map((r) => (r.row ? `${r.rules ? 'rules row' : 'row'} ${r.row}: ${r.reason}` : r.reason)).join('; '),
    p.status === 'checked' ? p.moves : '', p.status === 'checked' ? p.shortfalls.join(' ') : '', rules.source, rules.edition,
  ].map(cell).join(','));
  return [head.join(','), ...lines].join('\n') + '\n';
}
