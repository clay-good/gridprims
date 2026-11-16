// The jurisdiction screen record (add-interconnection-screens design D4 and
// D8, under trust/curated-contributions): one record per jurisdiction and
// screen, each field cited to the tariff or rule text with the vintage it was
// read from, because superseded copies circulate and differ. Checked on top
// of the curated-fact rules in pipeline/lib/curated.mjs, which handle the
// captures, checksums, and primary-source rules.

/** The cited fields every screen record carries. */
export const SCREEN_FIELDS = ['process', 'screen', 'threshold', 'testBasis', 'whoAnswers'];
/** Who can answer a screen: you and your installer, the utility from its records, or only the utility's circuit model. */
export const WHO_ANSWERS = ['you', 'utility', 'utility-model'];
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * The schema problems of one screen record; an empty list when it is complete. A field with no citation
 * (a source with no locator) or no vintage read is a problem, so it cannot publish.
 * @param {any} record {id, kind: 'interconnect-screen', jurisdiction, lastChecked, fields: {process, screen, threshold, testBasis, whoAnswers}}
 * @returns {string[]}
 */
export function checkScreenRecord(record) {
  const id = record.id ?? '(no id)';
  const problems = [];
  if (record.kind !== 'interconnect-screen') problems.push(`${id}: kind must be "interconnect-screen"`);
  if (!/^(federal|[A-Z]{2})$/.test(String(record.jurisdiction ?? ''))) problems.push(`${id}: jurisdiction must be "federal" or a two-letter state code`);
  if (!ISO_DATE.test(String(record.lastChecked ?? ''))) problems.push(`${id}: lastChecked must be the date the record was last checked against its source, as YYYY-MM-DD`);
  for (const name of SCREEN_FIELDS) {
    const f = record.fields?.[name];
    if (!f || String(f.value ?? '').trim() === '') { problems.push(`${id}.${name}: missing`); continue; }
    if (name === 'whoAnswers' && !WHO_ANSWERS.includes(f.value)) problems.push(`${id}.whoAnswers: must be one of ${WHO_ANSWERS.join(', ')}`);
    const sources = f.sources ?? [];
    if (!sources.length) problems.push(`${id}.${name}: has no citation`);
    for (const s of sources.filter((x) => !x.unreachable)) {
      if (!String(s.locator ?? '').trim()) problems.push(`${id}.${name}: the citation needs a locator, the section, sheet, or screen number in ${s.url ?? 'its source'}`);
      if (!String(s.vintage ?? '').trim()) problems.push(`${id}.${name}: the citation needs the vintage read, the version or effective date of ${s.url ?? 'its source'}`);
    }
  }
  return problems;
}
