// The capacity NLR tracks as in queue in key states (awarded, under
// construction, and likely to come online in the next few years), from the
// "In Queue" column of the State Summary's first table. Aggregates only: the
// laboratory publishes no project count for it.

export const SCHEMA = [{ name: 'state', type: 'str' }, { name: 'mw_ac', type: 'f64', unit: 'MW-AC in queue' }];
const text = (c) => (c === null || c === undefined ? '' : String(c.value ?? '').trim());

export async function normalize(rows) {
  const headAt = rows.findIndex((r) => text(r?.[1]) === 'State' && (r ?? []).some((c) => text(c) === 'In Queue'));
  if (headAt < 0) return { rows: [], problems: ['the State Summary has no table with State and In Queue columns'] };
  const q = rows[headAt].findIndex((c) => text(c) === 'In Queue');
  const out = [];
  for (const r of rows.slice(headAt + 1)) {
    const state = text(r?.[1]);
    if (state === 'Total' || !state) break;
    const v = r[q]?.value;
    if (/^[A-Z]{2}$/.test(state) && typeof v === 'number' && v > 0) out.push({ state, mw_ac: Math.round(v * 1e6) / 1e6 });
  }
  return { rows: out, problems: [] };
}
