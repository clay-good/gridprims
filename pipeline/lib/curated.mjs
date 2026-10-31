// The rules for hand-maintained facts (trust/curated-contributions), checked
// automatically: every field has a primary source with a stored capture and its
// checksum; disputable fields have two independent archived primaries; secondary
// sources and personal data are refused; conflicts of interest are recorded; and
// large changes arrive as one labeled bulk batch. No person gates publication: a
// field that fails is left out, and the rest publishes.

import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

/** Source types that count as primary: the issuer's own document. */
export const PRIMARY = ['order', 'tariff', 'regulator', 'publisher', 'statute', 'utility'];
/** Source types that never support a published field. */
export const SECONDARY = ['news', 'vendor', 'compilation', 'blog', 'unsourced'];

/** Shapes of personal data a contribution must never carry. */
const PERSONAL = [
  [/\b\d{17}\b/, 'a 17-digit meter identifier (such as an ESIID)'],
  [/\baccount\s*(number|no\.?|#)\s*[:#]?\s*\d{4,}/i, 'an account number'],
  [/\b\d{1,5}\s+\w+(\s\w+)?\s+(street|st|avenue|ave|road|rd|lane|ln|drive|dr|boulevard|blvd)\b/i, 'a street address'],
];
const ATTACHMENT = /\.(csv|xml|xlsx|xls|zip|png|jpe?g|heic)$/i;

/**
 * Check one curated record against the repository's stored captures.
 * @param {any} record {id, kind, contributor: {conflict}, fields: {name: {value, disputable?, sources: [...]}}}
 * @param {string} root
 * @returns {{publishable: Record<string, any>, labels: Record<string, string>, problems: string[]}}
 */
export function checkRecord(record, root) {
  const problems = [];
  const id = record.id ?? '(no id)';
  if (typeof record.contributor?.conflict !== 'string') problems.push(`${id}: the contributor's conflict-of-interest answer is missing ("none" or the affiliation)`);
  const publishable = {};
  const labels = {};
  for (const [name, f] of Object.entries(record.fields ?? {})) {
    const fieldProblems = [];
    for (const [re, what] of PERSONAL) if (re.test(String(f.value))) fieldProblems.push(`${id}.${name}: holds what looks like ${what}; contributions are text-only and carry no personal data`);
    const sources = f.sources ?? [];
    for (const s of sources.filter((x) => !x.unreachable)) {
      if (SECONDARY.includes(s.type)) fieldProblems.push(`${id}.${name}: cites a ${s.type} source (${s.url}); cite the order, tariff sheet, or regulator's page instead`);
      else if (!PRIMARY.includes(s.type)) fieldProblems.push(`${id}.${name}: source type "${s.type}" is not a recognized primary type`);
      if (!s.url || !s.publisher || !s.retrieved) fieldProblems.push(`${id}.${name}: a source needs its URL, publisher, and retrieval date`);
      if (s.capture && ATTACHMENT.test(s.capture)) fieldProblems.push(`${id}.${name}: ${s.capture} looks like a meter file or screenshot; type the values by hand instead`);
      else if (!s.capture || !existsSync(join(root, s.capture))) fieldProblems.push(`${id}.${name}: no stored capture is committed for ${s.url}`);
      else if (createHash('sha256').update(readFileSync(join(root, s.capture))).digest('hex') !== s.sha256) fieldProblems.push(`${id}.${name}: the capture ${s.capture} does not match its recorded checksum`);
    }
    const archivedPrimaries = sources.filter((s) => PRIMARY.includes(s.type) && s.capture && existsSync(join(root, s.capture)));
    const independent = new Set(archivedPrimaries.map((s) => s.publisher)).size;
    if (!sources.length) fieldProblems.push(`${id}.${name}: has no source; it reads "Not public" until one is added`);
    else if (f.disputable && independent < 2) {
      // A second primary source recorded as unreachable lets the field publish, labeled single-source.
      const gone = sources.find((x) => x.unreachable && x.url && x.unreachable.checked);
      if (independent === 1 && gone) labels[name] = `single source: the second (${gone.url}) was unreachable on ${gone.unreachable.checked}`;
      else fieldProblems.push(`${id}.${name}: a disputable field needs two independent archived primary sources; it has ${independent}`);
    }
    if (fieldProblems.length) problems.push(...fieldProblems);
    else publishable[name] = f.value;
  }
  return { publishable, labels, problems };
}

/**
 * The bulk rule: a change touching more than 20 records or 500 lines must be
 * one labeled, revertible batch with its verification stated, and must not
 * mix a data refresh with an edit to a published number.
 * @param {{records: number, lines: number, touchesData: boolean, editsPublished: boolean, batch?: {bulk: boolean, verification?: string}}} c
 */
export function checkBulk(c) {
  const problems = [];
  const bulk = c.records > 20 || c.lines > 500;
  if (bulk && !c.batch?.bulk) problems.push(`this change touches ${c.records} records and ${c.lines} lines; label it as a bulk batch in data/curated/facts/_batch.json`);
  if (bulk && !c.batch?.verification) problems.push('a bulk batch must say how the contributor verified it');
  if (bulk && c.touchesData && c.editsPublished) problems.push('a bulk batch may not mix a data refresh with an edit to a published number');
  return problems;
}
