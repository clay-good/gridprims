// The same interconnection screen across the federal procedures and each state
// we hold (add-interconnection-screens: screen explainer, "State threshold
// comparison"), side by side from the curated records, each threshold cited.
// A state row is marked against the federal one: a different test when it
// measures something else (minimum load, hosting capacity, or feeder load in
// place of peak load), a different threshold when it measures the same thing
// with another number or comparison.

/** The screen families compared, in page order. */
export const FAMILIES = ['aggregate-generation', 'interrupting-capability', 'network'];

const numbersIn = (text) => (String(text).match(/\d+(?:\.\d+)?\s?(?:%|kW|kVA|MW)/g) ?? []).map((x) => x.replace(/\s/g, '')).sort().join(' ');

/**
 * @param {any[]} records curated interconnection screen records
 * @returns {Array<{family: string, rows: Array<{id: string, jurisdiction: string, screen: string, threshold: string, measure: string, comparison: string, cites: Array<{publisher: string, locator: string, vintage: string, url: string}>, unreachable: Array<{publisher: string, checked: string}>, versusFederal: 'federal' | 'same' | 'different-threshold' | 'different-test'}>}>}
 */
export function compareScreens(records) {
  return FAMILIES.map((family) => {
    const inFamily = records.filter((r) => r.family === family)
      .sort((a, b) => (a.jurisdiction === 'federal' ? -1 : b.jurisdiction === 'federal' ? 1 : a.jurisdiction.localeCompare(b.jurisdiction) || a.id.localeCompare(b.id)));
    const federal = inFamily.find((r) => r.jurisdiction === 'federal');
    const rows = inFamily.map((r) => {
      const sources = r.fields.threshold.sources;
      const versusFederal = r === federal ? 'federal'
        : !federal || r.measure !== federal.measure ? 'different-test'
          : r.comparison !== federal.comparison || numbersIn(r.fields.threshold.value) !== numbersIn(federal.fields.threshold.value) ? 'different-threshold' : 'same';
      return {
        id: r.id, jurisdiction: r.jurisdiction, screen: r.fields.screen.value, threshold: r.fields.threshold.value, measure: r.measure, comparison: r.comparison,
        cites: sources.filter((s) => !s.unreachable).map((s) => ({ publisher: s.publisher, locator: s.locator, vintage: s.vintage, url: s.url })),
        unreachable: sources.filter((s) => s.unreachable).map((s) => ({ publisher: s.publisher, checked: s.unreachable.checked })),
        versusFederal,
      };
    });
    return { family, rows };
  }).filter((f) => f.rows.length);
}
