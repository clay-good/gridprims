// The dataset registry's rules (platform/data-snapshots, platform/data-operations):
// every entry's required fields, its machine-readable recipe, its CEII screen,
// and the redistribution posture derived from its recorded terms.

/** Recipe steps the pipeline knows how to run (docs/decisions-day-one.md §3). */
export const STEPS = ['fetch', 'unzip', 'read-xlsx', 'read-csv', 'read-parquet', 'normalize', 'quirk', 'validate', 'partition', 'write-shards', 'write-csv-gz'];

/** Licenses the matcher recognizes, by identifier or the publisher's own words. Anything else is unrecognized. */
export const RECOGNIZED = [
  { id: 'us-federal-public-domain', posture: 'mirror', words: /\b(public domain|not subject to copyright)\b/i },
  { id: 'CC0-1.0', posture: 'mirror', words: /\bCC0\b|public domain dedication/i },
  { id: 'CC-BY-4.0', posture: 'mirror', words: /\bCC[ -]BY[ -]4\.0\b|Creative Commons Attribution 4\.0/i },
  { id: 'CC-BY-SA-4.0', posture: 'mirror', words: /\bCC[ -]BY[ -]SA[ -]4\.0\b|Attribution-ShareAlike 4\.0/i, shareAlike: true },
  { id: 'ODbL-1.0', posture: 'mirror', words: /\bODbL\b|Open Database License/i, shareAlike: true },
  { id: 'Apache-2.0', posture: 'mirror', words: /\bApache License,? Version 2\.0\b/i },
  { id: 'MIT', posture: 'mirror', words: /\bMIT License\b/i },
];
const RESTRICTIVE = /non-?commercial|educational use|written permission|not for redistribution|personal use/i;

/**
 * The posture the recorded terms support: mirror, derive, or link.
 * @param {{text?: string, license?: string, factual?: boolean}} terms
 * @returns {{posture: 'mirror' | 'derive' | 'link', license: string | null, reason: string}}
 */
export function matchPosture(terms) {
  const text = `${terms.license ?? ''} ${terms.text ?? ''}`;
  if (RESTRICTIVE.test(text)) {
    return terms.factual ? { posture: 'derive', license: null, reason: 'restrictive wording; only our own computed values may be published' } : { posture: 'link', license: null, reason: 'restrictive wording and no basis to compute over the values' };
  }
  const hit = RECOGNIZED.find((r) => r.id === terms.license || r.words.test(text));
  if (hit) return { posture: hit.posture, license: hit.id, reason: `recognized ${hit.id}` };
  return terms.factual ? { posture: 'derive', license: null, reason: 'terms absent or unrecognized; values are facts we may compute over' } : { posture: 'link', license: null, reason: 'terms absent or unrecognized' };
}

const REQUIRED = ['id', 'title', 'publisher', 'sourceUrl', 'terms', 'redistributionBasis', 'attribution', 'cadence', 'recipe', 'tables', 'ceii', 'owner'];
/** Steps every table recipe needs: a read (a workbook from the zip, or Parquet files), then these. */
const TABLE_STEPS = ['normalize', 'validate', 'partition'];

const checkSteps = (steps, where, fail) => {
  steps.forEach((s, i) => { if (!STEPS.includes(s?.step)) fail(`${where}[${i}].step`, `must be one of ${STEPS.join(', ')}`); });
  steps.filter((s) => s.step === 'quirk').forEach((s) => { if (!s.fixture) fail(`${where} quirk`, `"${s.name}" has no fixture pinning it`); });
};

/**
 * Check one registry entry. Returns errors naming the dataset and the field.
 * @param {any} e
 */
export function validateEntry(e) {
  const id = e?.id ?? '(no id)';
  const errors = [];
  const fail = (field, why) => errors.push(`${id}: ${field} ${why}`);
  for (const f of REQUIRED) if (e?.[f] === undefined || e[f] === '') fail(f, 'is missing');
  if (!e) return errors;
  if (e.redistributionBasis !== undefined && !['public domain', 'named license', 'written permission'].includes(e.redistributionBasis?.kind)) fail('redistributionBasis', 'must be public domain, named license, or written permission; a dataset without one does not ship');
  if (e.terms && (typeof e.terms.url !== 'string' || typeof e.terms.text !== 'string')) fail('terms', 'needs the terms page url and the captured text');
  if (e.cadence && !['daily', 'weekly', 'monthly', 'quarterly', 'annual'].includes(e.cadence.every)) fail('cadence.every', 'must be daily, weekly, monthly, quarterly, or annual');
  if (Array.isArray(e.recipe)) {
    if (!e.recipe.length) fail('recipe', 'has no steps');
    checkSteps(e.recipe, 'recipe', fail);
  } else if (e.recipe !== undefined) fail('recipe', 'must be a list of steps');
  if (Array.isArray(e.tables)) {
    if (!e.tables.length) fail('tables', 'has no tables');
    const names = new Set();
    e.tables.forEach((t, i) => {
      const where = `tables[${i}]`;
      if (!/^[a-z][a-z0-9_]*$/.test(t?.name ?? '')) fail(`${where}.name`, 'must be lowercase letters, digits, and underscores');
      else if (names.has(t.name)) fail(`${where}.name`, `repeats ${t.name}`);
      names.add(t?.name);
      if (!Array.isArray(t?.recipe)) { fail(`${where}.recipe`, 'must be a list of steps'); return; }
      checkSteps(t.recipe, `${where}.recipe`, fail);
      for (const need of TABLE_STEPS) if (!t.recipe.some((s) => s.step === need)) fail(`${where}.recipe`, `has no ${need} step`);
      const has = (step) => t.recipe.some((s) => s.step === step);
      if (!(has('unzip') && has('read-xlsx')) && !has('read-parquet')) fail(`${where}.recipe`, 'has no read: unzip and read-xlsx, or read-parquet');
      t.recipe.filter((s) => s.step === 'read-parquet').forEach((s) => (s.files ?? []).forEach((f) => { if (!Object.values(e.vintages ?? {}).every((v) => v.files?.[f])) fail(`${where}.recipe read-parquet`, `names file "${f}", which a vintage does not list`); }));
    });
  } else if (e.tables !== undefined) fail('tables', 'must be a list of tables');
  // CEII screen (18 CFR 388.113): infrastructure datasets need a completed checklist.
  if (e.ceii) {
    if (typeof e.ceii.infrastructure !== 'boolean') fail('ceii.infrastructure', 'must say whether the dataset describes grid infrastructure');
    if (e.ceii.infrastructure) {
      const c = e.ceii.checklist ?? {};
      for (const item of ['publicSourceOnly', 'noPlanningModels', 'noSubstationPoints', 'noOneLineDiagrams', 'noBusImpedances', 'noNdaData']) {
        if (c[item] !== true) fail(`ceii.checklist.${item}`, 'is not confirmed; an infrastructure dataset ships only after the CEII screen');
      }
    }
  }
  if (e.posture !== undefined && !['mirror', 'derive', 'link'].includes(e.posture)) fail('posture', 'must be mirror, derive, or link');
  return errors;
}

/**
 * The posture in force: a hand-set posture wins while the matcher is young,
 * and the matcher's verdict is kept beside it as advisory.
 * @param {any} e
 */
export function postureOf(e) {
  const matched = matchPosture({ ...e.terms, factual: e.factual ?? true });
  const posture = e.posture ?? matched.posture;
  return { posture, advisory: matched, agrees: matched.posture === posture };
}
