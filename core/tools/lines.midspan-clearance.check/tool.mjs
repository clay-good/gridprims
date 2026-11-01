// lines.midspan-clearance.check: a span's sag, its lowest point above ground,
// the margin over the clearance your rules require for what it crosses, and
// the smallest gap to the line above (add-overhead-line-checks: midspan
// clearance). Lengths are read as crews write them; answers round toward
// more clearance.

import { feetInches, parseLength, ruleLength } from '../../lib/field-length.mjs';
import { catenarySag, lowestPoint, parabolicSag, sagAt, smallestGap } from '../../lib/sag.mjs';
import GO95 from '../../../data/curated/go95/clearances.mjs';

const SURFACE = { road: 'over a road', driveway: 'over a driveway', pedestrian: 'over an area only people on foot can reach', rail: 'over a railroad' };
const len = (field, text) => { const r = parseLength(text); return r.error ? { error: { field, message: r.error } } : r; };
const optional = (field, text) => (String(text).trim().toLowerCase() === 'none' ? { ft: null } : len(field, text));
/** A GO 95 cell as a rule: its value, where it is, and its footnotes, which are exceptions this check does not apply. */
const go95 = (id) => { const f = GO95.fields[id]; return f && { ft: f.value.ft, label: `GO 95 ${f.label}`, footnotes: f.value.footnotes }; };
const SEP_ABOVE = { secondary: 'sep.secondary.comm', primary: 'sep.primary.comm', comm: 'sep.comm.comm' };
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
  // GO 95 fills the clearance and the separation from its tables; your values fill them otherwise.
  const fromGo95 = v.ruleSource === 'go95';
  const ground = fromGo95 ? (v.crosses === 'not-chosen' ? null : go95(`ground.${v.crosses}.comm`)) : null;
  if (fromGo95) parsed.required = { ft: ground?.ft ?? null };
  const who = fromGo95 ? 'GO 95 requires' : 'your rules require';
  const exceptions = (r) => (r?.footnotes?.length ? ` Exceptions not checked: ${r.footnotes.map((x) => `(${x})`).join(' ')}.` : '');
  if (ground) notes.push(`${ground.label}: ${ruleLength(ground.ft)}.${exceptions(ground)}`);
  if (!checks) sentences.push(`The lowest point is ${where}.`);
  else if (v.crosses === 'not-chosen' || parsed.required.ft === null) sentences.push(`The lowest point is ${where}. What does the span cross?`);
  else {
    const req = parsed.required.ft;
    margin = low.height - req;
    sentences.push(margin >= 0
      ? `The lowest point is ${feetInches(low.height, 'down')}, ${feetInches(margin, 'down')} above the ${ruleLength(req)} ${who} ${SURFACE[v.crosses]}.`
      : `The lowest point is ${feetInches(-margin, 'up')} lower than the ${ruleLength(req)} ${who} ${SURFACE[v.crosses]}.`);
    steps.push(`${feetInches(low.height, 'down')} − ${ruleLength(req)} required ${SURFACE[v.crosses]} = ${margin >= 0 ? feetInches(margin, 'down') : `${feetInches(-margin, 'up')} short`}.`);
  }
  let gap;
  if (above) {
    const g = smallestGap(line, above, S);
    gap = g.gap * 12;
    const g95 = fromGo95 ? go95(SEP_ABOVE[v.aboveKind]) : null;
    if (g95) notes.push(`${g95.label}: ${inches(g95.ft, 'up')} on the same pole and in adjoining midspans.${exceptions(g95)}`);
    const sep = g95 ? g95.ft : parsed.midspanSep.ft ?? parsed.poleSep.ft;
    const which = g95 ? 'GO 95 value' : parsed.midspanSep.ft !== null ? 'midspan value' : 'value at the pole';
    const place = g.midspan ? 'at midspan' : `${g.at.toFixed(0)} ft from the first pole`;
    steps.push(`The smallest gap to the line above is ${inches(g.gap, 'down')} ${place}.`);
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
  };
}
