// The same interconnection screen across the federal procedures and each state
// we hold (add-interconnection-screens: screen explainer, "State threshold
// comparison"), side by side from the curated records, each threshold cited.
// A state row is marked against the federal one: a different test when it
// measures something else (minimum load, hosting capacity, or feeder load in
// place of peak load), a different threshold when it measures the same thing
// with another number or comparison.

/** The screen families compared, in page order. */
export const FAMILIES = ['aggregate-generation', 'interrupting-capability', 'network', 'transformer-rating'];

const numbersIn = (text) => (String(text).match(/\d+(?:\.\d+)?\s?(?:%|kW|kVA|MW)/g) ?? []).map((x) => x.replace(/\s/g, '')).sort().join(' ');

/**
 * @param {any[]} records curated interconnection screen records
 * @returns {Array<{family: string, rows: Array<{id: string, jurisdiction: string, lastChecked: string, screen: string, threshold: string, measure: string, comparison: string, cites: Array<{publisher: string, locator: string, vintage: string, url: string}>, unreachable: Array<{publisher: string, checked: string}>, versusFederal: 'federal' | 'same' | 'different-threshold' | 'different-test' | 'no-federal'}>}>}
 */
export function compareScreens(records) {
  return FAMILIES.map((family) => {
    const inFamily = records.filter((r) => r.family === family)
      .sort((a, b) => (a.jurisdiction === 'federal' ? -1 : b.jurisdiction === 'federal' ? 1 : a.jurisdiction.localeCompare(b.jurisdiction) || a.id.localeCompare(b.id)));
    const federal = inFamily.find((r) => r.jurisdiction === 'federal');
    const rows = inFamily.map((r) => {
      const sources = r.fields.threshold.sources;
      const versusFederal = r === federal ? 'federal'
        : !federal ? 'no-federal'
        : r.measure !== federal.measure ? 'different-test'
          : r.comparison !== federal.comparison || numbersIn(r.fields.threshold.value) !== numbersIn(federal.fields.threshold.value) ? 'different-threshold' : 'same';
      return {
        id: r.id, jurisdiction: r.jurisdiction, screen: r.fields.screen.value, threshold: r.fields.threshold.value, measure: r.measure, comparison: r.comparison, lastChecked: r.lastChecked,
        cites: sources.filter((s) => !s.unreachable).map((s) => ({ publisher: s.publisher, locator: s.locator, vintage: s.vintage, url: s.url })),
        unreachable: sources.filter((s) => s.unreachable).map((s) => ({ publisher: s.publisher, checked: s.unreachable.checked })),
        versusFederal,
      };
    });
    return { family, rows };
  }).filter((f) => f.rows.length);
}

/** The date a record is due for review: 12 months after it was last checked. */
export const reviewDue = (lastChecked) => `${Number(lastChecked.slice(0, 4)) + 1}${lastChecked.slice(4)}`;

const CSV_COLUMNS = ['id', 'jurisdiction', 'family', 'process', 'screen', 'threshold', 'test_basis', 'who_answers', 'measure', 'comparison', 'last_checked', 'review_due', 'sources', 'unreachable_sources'];
const quote = (v) => (/[",\n]/.test(String(v)) ? `"${String(v).replace(/"/g, '""')}"` : String(v));

/** Every record as a row with its citations and last-checked date, in a stable order. */
export function screenRows(records) {
  return [...records].sort((a, b) => a.id.localeCompare(b.id)).map((r) => ({
    id: r.id, jurisdiction: r.jurisdiction, family: r.family ?? '', process: r.fields.process.value, screen: r.fields.screen.value,
    threshold: r.fields.threshold.value, test_basis: r.fields.testBasis.value, who_answers: r.fields.whoAnswers.value,
    measure: r.measure ?? '', comparison: r.comparison ?? '', last_checked: r.lastChecked, review_due: reviewDue(r.lastChecked),
    sources: r.fields.threshold.sources.filter((s) => !s.unreachable).map((s) => ({ publisher: s.publisher, document: s.vintage, locator: s.locator, url: s.url, retrieved: s.retrieved })),
    unreachable_sources: r.fields.threshold.sources.filter((s) => s.unreachable).map((s) => ({ publisher: s.publisher, url: s.url, checked: s.unreachable.checked })),
  }));
}

/** The rows as CSV; sources are joined as "publisher, locator, document, url" separated by " | ". */
export function screensCsv(records) {
  const cell = (row, c) => (c === 'sources' ? row.sources.map((s) => `${s.publisher}, ${s.locator}, ${s.document}, ${s.url}`).join(' | ')
    : c === 'unreachable_sources' ? row.unreachable_sources.map((s) => `${s.publisher}, unreachable on ${s.checked}, ${s.url}`).join(' | ') : row[c]);
  return [CSV_COLUMNS.join(','), ...screenRows(records).map((row) => CSV_COLUMNS.map((c) => quote(cell(row, c))).join(','))].join('\n') + '\n';
}
