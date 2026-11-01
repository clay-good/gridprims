// The large-load terms table (add-large-load-screen: tariff terms): each
// record's fields as the curated rules let them publish, with both citations
// and their archived copies, "Not public" where a field has no passing
// source, and "needs review" once a record goes 12 months unchecked.

import { checkRecord } from '../../pipeline/lib/curated.mjs';
import records from '../../data/curated/large-load-tariffs/_index.mjs';

export { termsFor } from '../ui/large-load-picker.mjs';

/** The fields every entry shows, in order. */
export const TERM_FIELDS = ['regulator', 'docket', 'orderDate', 'effective', 'status', 'threshold', 'minimum', 'ramp', 'term', 'exitFee', 'collateral', 'studyFee'];
export const REVIEW_DAYS = 365;
const DAY = 86_400_000;

/** Where a stored capture is published, so a reader can check it without us. */
export const capturePath = (capture) => `/large-load/sources/${capture.split('/').pop()}`;

/**
 * @param {string} root the repository @param {number} now the build's clock
 * @param {any[]} [list] records (the committed ones by default)
 */
export function termsData(root, now, list = records) {
  const entries = list.map((r) => {
    const { publishable, labels } = checkRecord(r, root);
    const fields = Object.fromEntries(TERM_FIELDS.map((k) => {
      const f = r.fields[k];
      const passed = k in publishable;
      return [k, {
        value: passed ? publishable[k] : null,
        label: passed ? labels[k] ?? null : null,
        citations: passed ? f.sources.filter((s) => !s.unreachable).map((s) => ({ publisher: s.publisher, type: s.type, url: s.url, locator: s.locator ?? null, retrieved: s.retrieved, archive: capturePath(s.capture), sha256: s.sha256, ...(s.note ? { note: s.note } : {}) })) : [],
        unreachable: passed ? f.sources.filter((s) => s.unreachable).map((s) => ({ publisher: s.publisher, url: s.url, ...s.unreachable })) : [],
      }];
    }));
    const age = Math.floor((now - Date.parse(`${r.lastChecked}T00:00:00Z`)) / DAY);
    return {
      id: r.id, type: r.type,
      name: r.title ?? r.utility.name,
      state: r.utility?.state ?? r.scope.state, region: r.scope?.region ?? null, eiaId: r.utility?.eiaId ?? null,
      lastChecked: r.lastChecked, needsReview: age > REVIEW_DAYS, fields, prefill: r.prefill ?? null,
    };
  });
  const captures = [...new Set(list.flatMap((r) => Object.values(r.fields).flatMap((f) => f.sources.filter((s) => s.capture).map((s) => s.capture))))];
  return { entries, captures, utilities: entries.filter((e) => e.type === 'tariff').length, rules: entries.filter((e) => e.type === 'rule').length };
}

/** The table as CSV: one row per entry and field, with each citation and archived copy. */
export function termsCsv(data) {
  const q = (v) => (v === null || v === undefined ? '' : /[",\n]/.test(String(v)) ? `"${String(v).replace(/"/g, '""')}"` : String(v));
  const rows = data.entries.flatMap((e) => TERM_FIELDS.map((k) => {
    const f = e.fields[k];
    const c = f.citations[0];
    return [e.id, e.type, e.name, e.state, k, f.value ?? 'Not public', f.label ?? '', c?.publisher, c?.url, c?.locator, c?.archive ? `https://gridprims.com${c.archive}` : '', c?.sha256, e.lastChecked];
  }));
  return [['entry', 'type', 'name', 'state', 'field', 'value', 'label', 'source', 'source_url', 'locator', 'archive', 'archive_sha256', 'last_checked'].join(','), ...rows.map((r) => r.map(q).join(','))].join('\n') + '\n';
}
