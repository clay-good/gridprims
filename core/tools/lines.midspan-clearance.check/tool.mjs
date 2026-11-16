// lines.midspan-clearance.check: a span's sag, its lowest point above ground,
// the margin over the clearance your rules require for what it crosses, and
// the smallest gap to the line above (add-overhead-line-checks: midspan
// clearance). Lengths are read as crews write them; answers round toward
// more clearance.

import { feetInches, parseLength, ruleLength } from '../../lib/field-length.mjs';
import { catenarySag, lowestPoint, parabolicSag, sagAt, smallestGap } from '../../lib/sag.mjs';
import { parseRules, recordRule } from '../../lib/attachment.mjs';
import GO95 from '../../../data/curated/go95/clearances.mjs';

const SURFACE = { road: 'over a road', driveway: 'over a driveway', pedestrian: 'over an area only people on foot can reach', rail: 'over a railroad' };
// A `length` input arrives from the contract in inches; a text one is read here as crews write it.
const len = (field, x) => { if (typeof x === 'number') return { ft: x / 12 }; const r = parseLength(x); return r.error ? { error: { field, message: r.error } } : r; };
const optional = (field, text) => (String(text).trim().toLowerCase() === 'none' ? { ft: null } : len(field, text));
/** A GO 95 cell as a rule: its value, where it is, and its footnotes, which are exceptions this check does not apply. */
const go95 = (id) => { const f = GO95.fields[id]; return f && { ft: f.value.ft, label: `GO 95 ${f.label}`, footnotes: f.value.footnotes, table: /Table (\d)/.exec(f.label)?.[1] ?? null }; };
const SEP_ABOVE = { secondary: 'sep.secondary.comm', primary: 'sep.primary.comm', comm: 'sep.comm.comm' };
const SEP_FILE = { secondary: ['sep.midspan.secondary.comm', 'sep.secondary.comm'], primary: ['sep.primary.comm'], comm: ['sep.midspan.comm.comm', 'sep.comm.comm'] };
const cite = (r) => `${r.id}, row ${r.row}${r.source ? ` (${r.source}${r.locator ? `, ${r.locator}` : ''})` : ''}`;
const inches = (ft, toward) => `${toward === 'up' ? Math.ceil(ft * 12 - 1e-9) : Math.floor(ft * 12 + 1e-9)} in.`;

export function compute(v) {
  const parsed = { span: len('span', v.span), a: len('heightA', v.heightA), b: len('heightB', v.heightB), required: optional('required', v.required), midspanSep: optional('midspanSep', v.midspanSep), poleSep: optional('poleSep', v.poleSep), offset: optional('offset', v.offset) };
  const computeSag = String(v.sag).trim().toLowerCase() === 'compute';
  if (!computeSag) parsed.sag = len('sag', v.sag);
  const bad = Object.values(parsed).find((p) => p.error);
  if (bad) return { status: 'invalid', errors: [bad.error] };
  const S = parsed.span.ft;
  if (!(S > 0)) return { status: 'invalid', errors: [{ field: 'span', message: 'The span must be longer than 0 ft.' }] };
  let above = null;
  if (String(v.above).trim().toLowerCase() !== 'none') {
    const parts = String(v.above).split(',').map((x) => parseLength(x));
    if (parts.length !== 3 || parts.some((p) => p.error)) return { status: 'invalid', errors: [{ field: 'above', message: 'Enter the line above as its height at each pole and its sag, such as 28 ft 4 in, 28 ft 4 in, 4 ft.' }] };
    above = { a: parts[0].ft, b: parts[1].ft, sag: parts[2].ft };
  }
  if (parsed.offset.ft !== null && parsed.offset.ft > S / 2) return { status: 'invalid', errors: [{ field: 'offset', message: `The offset must be at most half the span, ${feetInches(S / 2, 'down')}` }] };

  const D = computeSag ? parabolicSag(v.weight, S, v.tension) : parsed.sag.ft;
  const line = { a: parsed.a.ft, b: parsed.b.ft, sag: D };
  const low = lowestPoint(line, S);
  const cat = computeSag && parsed.a.ft === parsed.b.ft ? catenarySag(v.weight, S, v.tension) : null;
  const deep = D > 0.05 * S;
  const steps = [
    computeSag ? `Sag = ${v.weight} lb/ft × (${+S.toFixed(2)} ft)² ÷ (8 × ${v.tension.toLocaleString('en-US')} lb) = ${D.toFixed(3)} ft, or ${feetInches(D, 'up')}` : `Sag at the design condition, as you entered it: ${feetInches(D, 'up')}`,
    low.atPole ? `The bottom of the curve falls outside the span, so the lowest point is the lower pole, at ${feetInches(low.height, 'down')}` : `The lowest point is ${low.fromLower.toFixed(1)} ft from the lower pole, ${feetInches(low.height, 'down')} above ground.`,
  ];
  const notes = ['At the condition you entered: it does not adjust for hotter or icier conditions.'];
  if (cat !== null && Math.abs(cat - D) * 12 > 1) notes.push(`The exact catenary sag is ${feetInches(cat, 'up')}, ${deep ? 'and the parabolic method understates deep sag' : 'beside the parabolic value'}.`);
  else if (deep) notes.push('Sag is more than 5% of the span, where the parabolic method understates deep sag.');
  if (parsed.offset.ft !== null) steps.push(`Sag ${feetInches(parsed.offset.ft, 'down')} from midspan = ${D.toFixed(3)} × (1 − (2 × ${+parsed.offset.ft.toFixed(2)} ÷ ${+S.toFixed(2)})²) = ${sagAt(D, S, parsed.offset.ft).toFixed(3)} ft, or ${feetInches(sagAt(D, S, parsed.offset.ft), 'up', 0.5)}`);

  const where = low.atPole ? `at the lower pole, at ${feetInches(low.height, 'down')}` : `${feetInches(low.height, 'down')}${low.midspan ? ', at midspan' : `, ${low.fromLower.toFixed(0)} ft from the lower pole`}`;
  const sentences = [];
  let margin;
  const checks = v.ruleSource !== 'none';
  // Where the values come from: GO 95's tables, your values, your values with GO 95 filling the gaps, or
  // NESC values you copy from your own edition (the code is paywalled, so its values are never built in).
  const fromGo95 = v.ruleSource === 'go95';
  const layered = v.ruleSource === 'yours-go95';
  const nesc = /^nesc-(\d{4})$/.exec(v.ruleSource)?.[1] ?? null;
  const exceptions = (r) => (r?.footnotes?.length ? ` Exceptions not checked: ${r.footnotes.map((x) => `(${x})`).join(' ')}.` : '');
  // The weekly watch found the CPUC's page no longer matches our capture: say so on every value from it.
  const review = (r) => (r && String(v.go95Review).split(',').includes(r.table) ? ` Needs review: GO 95 Table ${r.table} has changed since this value was captured.` : '');
  const yourWords = nesc ? `the NESC ${nesc} value you entered` : 'your rules';
  // Your standards file, read once into the rule record both lines tools share: it fills what you left as
  // none, before GO 95 does. A value you type still wins.
  const record = checks && !fromGo95 && String(v.rules ?? 'none').trim() !== '' && String(v.rules ?? 'none').trim().toLowerCase() !== 'none' ? parseRules(v.rules) : null;
  if (record?.problems.length) return { status: 'invalid', errors: record.problems.map((m) => ({ field: 'rules', message: m })) };
  const clash = (c) => ({ status: 'refused', reason: `Rows ${c.rows.join(' and ')} both set ${c.id} (${c.values.join(' and ')}). Pick one and the check can run.` });
  let ground = null;
  let clearanceFrom = yourWords;
  let fileGround = false;
  if (record && v.crosses !== 'not-chosen' && parsed.required.ft === null) {
    const r = recordRule(record, `ground.${v.crosses}.comm`);
    if (r?.conflict) return clash(r.conflict);
    if (r) { parsed.required = { ft: r.rule.ft }; fileGround = true; steps.push(`The clearance ${SURFACE[v.crosses]} came from your standards file: ${cite(r.rule)}.`); }
  }
  if (v.crosses !== 'not-chosen' && (fromGo95 || (layered && parsed.required.ft === null))) {
    ground = go95(`ground.${v.crosses}.comm`);
    parsed.required = { ft: ground?.ft ?? null };
    clearanceFrom = layered ? 'GO 95, filling the value your rules left as none' : 'GO 95';
  }
  const who = clearanceFrom.startsWith('GO 95') ? 'GO 95 requires' : nesc ? `the NESC ${nesc} value you entered requires` : 'your rules require';
  if (ground) notes.push(`${ground.label}: ${ruleLength(ground.ft)}.${exceptions(ground)}${review(ground)}`);
  if (!checks) sentences.push(`The lowest point is ${where}. No rules were loaded, so there is no pass or fail.`);
  else if (v.crosses === 'not-chosen') sentences.push(`The lowest point is ${where}. What does the span cross?`);
  else if (parsed.required.ft === null) sentences.push(nesc ? `The lowest point is ${where}. Enter the clearance from your NESC ${nesc} copy for what it crosses.` : `The lowest point is ${where}. What clearance do your rules require over it?`);
  else {
    const req = parsed.required.ft;
    margin = low.height - req;
    sentences.push(margin >= 0
      ? `The lowest point is ${feetInches(low.height, 'down')}, ${feetInches(margin, 'down')} above the ${ruleLength(req)} ${who} ${SURFACE[v.crosses]}.`
      : `The lowest point is ${feetInches(-margin, 'up')} lower than the ${ruleLength(req)} ${who} ${SURFACE[v.crosses]}.`);
    steps.push(`${feetInches(low.height, 'down')} − ${ruleLength(req)} required ${SURFACE[v.crosses]} = ${margin >= 0 ? feetInches(margin, 'down') : `${feetInches(-margin, 'up')} short`}.`);
    if ((layered || nesc) && !fileGround) steps.push(`The clearance ${SURFACE[v.crosses]} came from ${clearanceFrom}.`);
  }
  let gap;
  if (above) {
    const g = smallestGap(line, above, S);
    gap = g.gap * 12;
    let typedSep = parsed.midspanSep.ft ?? parsed.poleSep.ft;
    let fileSep = null;
    if (record && typedSep === null) {
      for (const id of SEP_FILE[v.aboveKind]) {
        const r = recordRule(record, id);
        if (r?.conflict) return clash(r.conflict);
        if (r) { fileSep = r.rule; break; }
      }
      if (fileSep) { typedSep = fileSep.ft; steps.push(`The separation from the line above came from your standards file: ${cite(fileSep)}.`); }
    }
    const g95 = fromGo95 || (layered && typedSep === null) ? go95(SEP_ABOVE[v.aboveKind]) : null;
    if (g95) notes.push(`${g95.label}: ${inches(g95.ft, 'up')} on the same pole and in adjoining midspans.${exceptions(g95)}${review(g95)}`);
    const sep = g95 ? g95.ft : typedSep;
    const which = g95 ? 'GO 95 value' : `${nesc ? `NESC ${nesc} ` : ''}${parsed.midspanSep.ft !== null || fileSep?.id.startsWith('sep.midspan.') ? 'midspan value' : 'value at the pole'}`;
    const place = g.midspan ? 'at midspan' : `${g.at.toFixed(0)} ft from the first pole`;
    steps.push(`The smallest gap to the line above is ${inches(g.gap, 'down')} ${place}.`);
    if (layered && sep !== null && !fileSep) steps.push(`The separation came from ${g95 ? 'GO 95, filling the value your rules left as none' : 'your rules'}.`);
    if (checks && sep !== null) {
      const short = sep - g.gap;
      sentences.push(short > 0 ? `The gap to the line above is ${inches(g.gap, 'down')} ${place}, ${inches(short, 'up')} short of the ${inches(sep, 'up')} ${which}.` : `The gap to the line above is ${inches(g.gap, 'down')} ${place}, at or above the ${inches(sep, 'up')} ${which}.`);
    } else sentences.push(`The gap to the line above is ${inches(g.gap, 'down')} ${place}.`);
  }
  return {
    status: 'ok',
    outputs: {
      sag: D, lowest: low.height, fromLower: low.fromLower,
      ...(margin === undefined ? {} : { margin }), ...(gap === undefined ? {} : { gap }),
      ...(parsed.offset.ft === null ? {} : { offsetSag: sagAt(D, S, parsed.offset.ft) }), ...(cat === null ? {} : { catenary: cat }),
    },
    // Lengths end in "in.", so a sentence ending on one keeps a single period.
    sentence: sentences.join(' ').replace(/\.\./g, '.'),
    steps: [...steps, ...notes].map((x) => x.replace(/\.\./g, '.')),
    // The span profile the page draws (feet above ground; the ground is straight between the poles).
    // The contract does not pass it on, so recorded results are unchanged.
    figure: {
      span: S, line, above, required: checks && v.crosses !== 'not-chosen' ? parsed.required.ft : null,
      lowest: { at: line.a <= line.b ? low.fromLower : S - low.fromLower, height: low.height },
    },
  };
}

/** The span profile for the page's chart, or null when the inputs give no answer. */
export function figure(v) {
  const r = compute(v);
  return r.status === 'ok' ? r.figure : null;
}
