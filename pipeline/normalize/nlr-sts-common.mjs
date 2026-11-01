// Reading NLR's Sharing the Sun workbook: the Project List's columns by
// header name, and project capacity in MW-AC.

const text = (c) => (c === null || c === undefined ? '' : String(c.value ?? '').trim());
const NEED = ['State', 'Subscription Marketer', 'System Size (MW-AC)', 'Year of Interconnection'];

/** @param {Array<Array<any>>} rows the Project List sheet */
export function projects(rows) {
  const head = (rows[0] ?? []).map(text);
  const missing = NEED.filter((h) => !head.includes(h));
  if (missing.length) return { problem: `the Project List lacks ${missing.join(', ')}` };
  const at = (h) => head.indexOf(h);
  const out = [];
  for (const r of rows.slice(1)) {
    const state = text(r?.[at('State')]);
    if (!/^[A-Z]{2}$/.test(state)) continue;
    const mw = r[at('System Size (MW-AC)')]?.value;
    const year = r[at('Year of Interconnection')]?.value;
    out.push({ state, marketer: text(r[at('Subscription Marketer')]) || 'Not reported', mw: typeof mw === 'number' ? mw : 0, year: typeof year === 'number' ? year : null });
  }
  return { projects: out };
}
