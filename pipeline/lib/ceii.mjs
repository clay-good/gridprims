// The CEII screen, run on every release automatically (add-public-grid-data
// task 7.1; 18 CFR 388.113): the registry's checklist for infrastructure
// datasets, plus a check of every published column's name for location and
// network fields. It needs no signature and waits on no one: a release that
// fails it is not written, and a release that passes carries the record.

/** Column-name words that would mean precise location or network detail. */
export const FORBIDDEN = ['lat', 'lon', 'lng', 'latitude', 'longitude', 'coord', 'coords', 'coordinates', 'geometry', 'wkt', 'substation', 'bus', 'impedance', 'reactance', 'poi', 'oneline'];
const CHECKLIST = ['publicSourceOnly', 'noPlanningModels', 'noSubstationPoints', 'noOneLineDiagrams', 'noBusImpedances', 'noNdaData'];

/**
 * @param {any} entry the registry entry
 * @param {Array<{name: string, columns: Array<{name: string}>}>} tables the tables about to be published
 * @param {string} screened the date of the screen (the retrieval day, so a re-run reproduces it)
 */
export function ceiiScreen(entry, tables, screened) {
  const infrastructure = Boolean(entry.ceii?.infrastructure);
  const checklist = infrastructure ? Object.fromEntries(CHECKLIST.map((k) => [k, entry.ceii.checklist?.[k] === true])) : null;
  const flagged = tables.flatMap((t) => t.columns.filter((c) => c.name.toLowerCase().split(/[^a-z0-9]+/).some((w) => FORBIDDEN.includes(w))).map((c) => `${t.name}.${c.name}`));
  const unconfirmed = checklist ? Object.entries(checklist).filter(([, v]) => !v).map(([k]) => k) : [];
  return {
    rule: '18 CFR 388.113', screened, infrastructure, ...(checklist ? { checklist } : {}),
    columnsChecked: tables.reduce((n, t) => n + t.columns.length, 0), flagged, unconfirmed,
    passed: flagged.length === 0 && unconfirmed.length === 0,
    note: entry.ceii?.note ?? null,
  };
}
