// The tool manifest schema (docs/decisions-day-one.md §1). Every surface is
// generated from a manifest that passes this validator.

/** The most inputs a tool's first screen may show (site/home-and-navigation, "Simplicity budget"). */
export const FIRST_SCREEN_MAX = 5;

export const ARCHETYPES = ['calculator', 'file-workbench', 'entity-page', 'explorer'];
export const STABILITIES = ['experimental', 'stable'];
export const INPUT_TYPES = ['number', 'enum', 'text', 'file', 'length', 'rows', 'handle'];
/** Column types a `rows` input may hold. */
export const ROW_COLUMN_TYPES = ['number', 'enum', 'text', 'length'];

/** Plain-sentence meaning of each validation level (platform/citations-and-verification). */
export const VALIDATION_LEVELS = [
  { level: 0, name: 'unvalidated', meaning: 'The method is cited, but nothing independent has checked it yet.' },
  { level: 1, name: 'self-checked', meaning: 'Our own worked examples and consistency tests pass, but no independent check has been run yet.' },
  { level: 2, name: 'cross-checked', meaning: 'Results agree with an independent implementation or a published worked example within a stated tolerance.' },
  { level: 3, name: 'field-verified', meaning: 'Results agree with real bills, utility figures, or practitioner calculations in at least 3 recorded cases.' },
];

/** Evidence kinds and the level each supports. */
export const EVIDENCE_KINDS = { 'own-examples': 1, 'reference-output': 2, 'published-example': 2, 'field-case': 3 };

const SEGMENT = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** @param {string} id */
export function isToolId(id) {
  if (typeof id !== 'string') return false;
  const parts = id.split('.');
  return parts.length === 3 && parts.every((p) => SEGMENT.test(p));
}

/** True when `name` is an enum input whose chosen option supplies a unit. */
function isEnumInput(m, name) {
  return typeof name === 'string' && Array.isArray(m.inputs) && m.inputs.some((i) => i?.name === name && i.type === 'enum');
}

/**
 * The highest validation level the committed evidence supports.
 * Level 3 needs at least 3 field cases; level 2 needs one reference output or
 * published example with a committed file; level 1 needs our own examples.
 * @param {Array<{kind: string, path?: string}>} evidence
 * @param {(path: string) => boolean} [fileExists] checks committed files when given
 */
export function supportedLevel(evidence, fileExists) {
  const ok = (e) => !fileExists || (typeof e.path === 'string' && fileExists(e.path));
  const kinds = (k) => evidence.filter((e) => e.kind === k);
  const own = kinds('own-examples').length > 0;
  const cross = [...kinds('reference-output'), ...kinds('published-example')].some(ok);
  const field = kinds('field-case').filter(ok).length >= 3;
  if (own && cross && field) return 3;
  if (own && cross) return 2;
  if (own) return 1;
  return 0;
}

/**
 * Validate a manifest. Returns a list of errors, each naming the tool and the field.
 * @param {any} m
 * @param {{fileExists?: (path: string) => boolean}} [opts]
 * @returns {string[]}
 */
export function validateManifest(m, opts = {}) {
  const errors = [];
  const id = m && typeof m.id === 'string' ? m.id : '(no id)';
  const fail = (field, why) => errors.push(`${id}: ${field} ${why}`);
  if (!m || typeof m !== 'object') return ['(no id): manifest is not an object'];

  if (!isToolId(m.id)) fail('id', 'must be <domain>.<group>.<operation> in lowercase kebab segments');
  if (typeof m.version !== 'string' || !/^\d+\.\d+\.\d+$/.test(m.version)) fail('version', 'must be semver like 1.0.0');
  for (const f of ['title', 'purpose', 'method']) {
    if (typeof m[f] !== 'string' || m[f].trim() === '') fail(f, 'is missing');
  }
  if (!ARCHETYPES.includes(m.archetype)) fail('archetype', `must be one of ${ARCHETYPES.join(', ')}`);
  if (!STABILITIES.includes(m.stability)) fail('stability', `must be one of ${STABILITIES.join(', ')}`);

  const list = (f, min) => {
    if (!Array.isArray(m[f])) { fail(f, 'is missing'); return []; }
    if (m[f].length < min) fail(f, `needs at least ${min} entr${min === 1 ? 'y' : 'ies'}`);
    return m[f];
  };

  const inputs = list('inputs', 1);
  const inputNames = new Set();
  inputs.forEach((inp, i) => {
    const at = `inputs[${i}]`;
    if (typeof inp?.name !== 'string') return fail(at, 'has no name');
    inputNames.add(inp.name);
    if (typeof inp.label !== 'string') fail(`${at}.label`, 'is missing');
    if (!INPUT_TYPES.includes(inp.type)) fail(`${at}.type`, `must be one of ${INPUT_TYPES.join(', ')}`);
    // A file or a handle is loaded, never typed, so it has no example value.
    if (inp.type !== 'file' && inp.type !== 'handle' && inp.example === undefined) fail(`${at}.example`, 'is missing');
    if (inp.optional !== undefined && (inp.optional !== true || ['file', 'handle'].includes(inp.type))) fail(`${at}.optional`, 'must be true, on an input with an example as its neutral value');
    // A private input holds the user's own rules: never put in a link or a problem report (add-overhead-line-checks 2.3).
    if (inp.private !== undefined && (inp.private !== true || inp.type !== 'text')) fail(`${at}.private`, 'must be true, on a text input');
    if (inp.type === 'length' && inp.range !== undefined && (typeof inp.range.min !== 'number' || typeof inp.range.max !== 'number')) fail(`${at}.range`, 'needs numeric min and max, in inches');
    if (inp.type === 'handle' && (!Array.isArray(inp.accepts) || !inp.accepts.length || inp.accepts.some((k) => typeof k !== 'string'))) fail(`${at}.accepts`, 'must list the file kinds it takes');
    if (inp.type === 'rows') {
      if (!Number.isInteger(inp.maxRows) || inp.maxRows < 1) fail(`${at}.maxRows`, 'must be a whole number of at least 1');
      if (!Array.isArray(inp.columns) || !inp.columns.length) fail(`${at}.columns`, 'is missing');
      else inp.columns.forEach((c, j) => {
        if (typeof c?.name !== 'string' || typeof c.label !== 'string') fail(`${at}.columns[${j}]`, 'needs a name and a label');
        if (!ROW_COLUMN_TYPES.includes(c?.type)) fail(`${at}.columns[${j}].type`, `must be one of ${ROW_COLUMN_TYPES.join(', ')}`);
        if (c?.type === 'enum' && (!Array.isArray(c.options) || !c.options.length)) fail(`${at}.columns[${j}].options`, 'is missing');
        if (c?.type === 'number' && (!c.range || typeof c.range.min !== 'number' || typeof c.range.max !== 'number')) fail(`${at}.columns[${j}].range`, 'needs numeric min and max');
      });
    }
    if (inp.type === 'number') {
      if (typeof inp.unit !== 'string' && inp.unitless !== true && !isEnumInput(m, inp.unitFrom)) fail(`${at}.unit`, 'is missing (or name an enum input in unitFrom)');
      if (!inp.range || typeof inp.range.min !== 'number' || typeof inp.range.max !== 'number') fail(`${at}.range`, 'needs numeric min and max');
      if (!['exact', 'measured'].includes(inp.precision)) fail(`${at}.precision`, 'must be exact or measured');
    }
    if (inp.type === 'enum') {
      if (!Array.isArray(inp.options) || inp.options.length === 0) fail(`${at}.options`, 'is missing');
      else if (!inp.options.some((o) => o.value === inp.example)) fail(`${at}.example`, 'is not one of the options');
    }
  });
  // The simplicity budget (site/home-and-navigation): a tool names the inputs on its first screen, at most five;
  // the rest sit behind one "More options" control.
  if (!Array.isArray(m.firstScreen) || !m.firstScreen.length) fail('firstScreen', 'must list the inputs shown on the first screen');
  else {
    if (m.firstScreen.length > FIRST_SCREEN_MAX) fail('firstScreen', `lists ${m.firstScreen.length} inputs; at most ${FIRST_SCREEN_MAX} fit on the first screen, so put the rest behind "More options"`);
    for (const n of m.firstScreen) if (!inputNames.has(n)) fail('firstScreen', `names "${n}", which is not a declared input`);
  }

  const outputs = list('outputs', 1);
  const outputNames = new Set();
  outputs.forEach((out, i) => {
    const at = `outputs[${i}]`;
    if (typeof out?.name !== 'string') return fail(at, 'has no name');
    outputNames.add(out.name);
    if (typeof out.label !== 'string') fail(`${at}.label`, 'is missing');
    if (typeof out.unit !== 'string' && out.unitless !== true && !isEnumInput(m, out.unitFrom)) fail(`${at}.unit`, 'is missing (or name an enum input in unitFrom)');
    const r = out.rounding;
    if (!r || (typeof r.sigFigs !== 'number' && typeof r.decimals !== 'number')) fail(`${at}.rounding`, 'needs sigFigs or decimals');
  });

  list('assumptions', 0);
  list('datasets', 0);
  list('related', 0);
  list('handoffs', 0).forEach((h, i) => {
    if (typeof h?.url !== 'string' || !/^https:\/\//.test(h.url)) fail(`handoffs[${i}].url`, 'must be an https link');
    else if (/[?#]/.test(h.url)) fail(`handoffs[${i}].url`, 'must be a plain link with no query or fragment');
  });
  list('limitations', 1);

  list('citations', 1).forEach((c, i) => {
    for (const f of ['source', 'edition', 'locator']) {
      if (typeof c?.[f] !== 'string' || c[f] === '') fail(`citations[${i}].${f}`, 'is missing');
    }
    if (typeof c?.url !== 'string' && c?.paywalled !== true) fail(`citations[${i}].url`, 'is missing (or mark paywalled: true)');
  });

  list('examples', 1).forEach((ex, i) => {
    const at = `examples[${i}]`;
    if (typeof ex?.id !== 'string') fail(`${at}.id`, 'is missing');
    if (typeof ex?.source !== 'string') fail(`${at}.source`, 'is missing');
    if (!ex?.inputs || typeof ex.inputs !== 'object') fail(`${at}.inputs`, 'is missing');
    else for (const k of Object.keys(ex.inputs)) if (!inputNames.has(k)) fail(`${at}.inputs.${k}`, 'is not a declared input');
    if (!ex?.expect || typeof ex.expect !== 'object') return fail(`${at}.expect`, 'is missing');
    for (const [k, e] of Object.entries(ex.expect)) {
      if (!outputNames.has(k)) fail(`${at}.expect.${k}`, 'is not a declared output');
      const t = e?.tolerance;
      if (!t || (typeof t.abs !== 'number' && typeof t.rel !== 'number')) fail(`${at}.expect.${k}.tolerance`, 'needs abs or rel');
    }
  });

  const v = m.validation;
  if (!v || typeof v !== 'object') {
    fail('validation', 'is missing');
  } else if (!Number.isInteger(v.level) || v.level < 0 || v.level > 3) {
    fail('validation.level', 'must be 0, 1, 2, or 3');
  } else {
    const evidence = Array.isArray(v.evidence) ? v.evidence : [];
    if (!Array.isArray(v.evidence)) fail('validation.evidence', 'is missing');
    evidence.forEach((e, i) => {
      if (!(e?.kind in EVIDENCE_KINDS)) fail(`validation.evidence[${i}].kind`, `must be one of ${Object.keys(EVIDENCE_KINDS).join(', ')}`);
      if (typeof e?.summary !== 'string') fail(`validation.evidence[${i}].summary`, 'is missing');
    });
    const supported = supportedLevel(evidence, opts.fileExists);
    if (v.level > supported) fail('validation.level', `claims ${v.level} but the committed evidence supports ${supported}`);
    if (m.stability === 'stable' && v.level < 2) fail('stability', `is stable at validation level ${v.level}; stable requires level 2 (cross-checked)`);
  }

  if (m.commandForms !== undefined) {
    if (!Array.isArray(m.commandForms)) fail('commandForms', 'must be a list');
    else m.commandForms.forEach((f, i) => {
      for (const [, name] of String(f).matchAll(/\{(\w+)\}/g)) {
        const inp = inputs.find((x) => x?.name === name);
        if (!inp || !['number', 'enum'].includes(inp.type)) fail(`commandForms[${i}]`, `names {${name}}, which is not a number or enum input`);
      }
    });
  }
  if (m.screeningLabel !== undefined && typeof m.screeningLabel !== 'string') fail('screeningLabel', 'must be a string');
  if (m.sharedRoutines !== undefined && !Array.isArray(m.sharedRoutines)) fail('sharedRoutines', 'must be a list');
  if (m.claims !== undefined && !Array.isArray(m.claims)) fail('claims', 'must be a list of unverified-claim ids');
  if (m.toRaise !== undefined && typeof m.toRaise !== 'string') fail('toRaise', 'must say what evidence would raise the validation level');
  return errors;
}
