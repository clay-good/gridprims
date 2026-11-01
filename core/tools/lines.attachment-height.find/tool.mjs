// lines.attachment-height.find: where one new communication line attaches on
// a pole, what has to move to make room, or how much taller a replacement
// pole must be, against the rules you enter (add-overhead-line-checks:
// attachment height). Existing shortfalls are named first, apart from the
// answer.

import { feetInches, parseLength } from '../../lib/field-length.mjs';
import { KIND_NAME, existingShortfalls, extraHeight, movePlans, parseAttachments, parseRules, pick, space } from '../../lib/attachment.mjs';

const fi = (inches) => feetInches(inches / 12, 'down');
const by = (inches) => feetInches(inches / 12, 'up');
const cap = (s) => s[0].toUpperCase() + s.slice(1);
const cite = (r) => `${r.id}, row ${r.row}${r.source ? ` (${r.source}${r.locator ? `, ${r.locator}` : ''})` : ''}`;

export function compute(v) {
  const { rules, problems: ruleProblems } = parseRules(v.rules);
  if (ruleProblems.length) return { status: 'invalid', errors: ruleProblems.map((m) => ({ field: 'rules', message: m })) };
  const { attachments, problems, noPower } = parseAttachments(v.attachments);
  if (problems.length) return { status: 'invalid', errors: problems.map((m) => ({ field: 'attachments', message: m })) };
  let poleLengthFt = null;
  if (String(v.poleLength).trim().toLowerCase() !== 'unknown') {
    const p = parseLength(v.poleLength);
    if (p.error) return { status: 'invalid', errors: [{ field: 'poleLength', message: p.error }] };
    poleLengthFt = p.ft;
    const tall = attachments.find((a) => a.inches > poleLengthFt * 12);
    if (tall) return { status: 'invalid', errors: [{ field: 'attachments', message: `row ${tall.row}: a height above the pole's ${poleLengthFt} ft length` }] };
  }
  const frac = rules.find((r) => r.id === 'pole.setting-depth.fraction');
  const add = rules.find((r) => r.id === 'pole.setting-depth.add');
  const poleTopIn = poleLengthFt !== null && frac && add ? Math.floor((poleLengthFt - (poleLengthFt * frac.value + add.ft)) * 12) : null;
  const sp = space(attachments, rules, { noPower, poleTopIn });
  if (sp.refused) return { status: 'refused', reason: sp.refused };

  const preference = v.preference === 'rules' ? rules.find((r) => r.id === 'place.preference')?.value ?? 'highest' : v.preference;
  const comm = attachments.filter((a) => !a.supply);
  const receipt = attachments.map((a) => `Row ${a.row}: ${KIND_NAME[a.kind]}${a.kv ? ` ${a.kv} kV` : ''}${a.owner ? ` (${a.owner})` : ''} at ${fi(a.inches)}`);
  const same = comm.filter((a, i) => comm.some((b, j) => j !== i && b.inches === a.inches));
  if (same.length) receipt.push(`Two lines at one height: ${same.map((a) => `row ${a.row}`).join(' and ')} at ${fi(same[0].inches)}`);
  const sources = [
    ...(sp.supplySep ? [`${sp.supplySep.shown} below the ${KIND_NAME[sp.lowestSupply.kind]}: ${cite(sp.supplySep)}`] : ['No power on the pole: the top of the space is the pole top above ground.']),
    `${sp.commSep.shown} between communication lines: ${cite(sp.commSep)}`,
    `${sp.ground.shown} above ground at the lowest: ${cite(sp.ground)}`,
    `The communication space runs from ${fi(sp.top)} down to ${fi(sp.bottom)}.`,
  ];
  const existing = existingShortfalls(comm, sp).map((s) => (s.kind === 'supply' ? `${cap(KIND_NAME[s.a.kind])} is ${by(s.short)} closer to the ${KIND_NAME[sp.lowestSupply.kind]} than your rules allow.`
    : s.kind === 'ground' ? `${cap(KIND_NAME[s.a.kind])} is ${by(s.short)} lower than your rules allow.`
      : `${cap(KIND_NAME[s.a.kind])} and ${KIND_NAME[s.b.kind]} are ${by(s.short)} closer together than your rules allow.`));
  const free = [];
  for (let h = sp.top; h >= sp.bottom; h--) if (comm.every((a) => Math.abs(a.inches - h) >= sp.commSep.inches)) free.push(h);
  const at = pick(free, preference, comm.map((a) => a.inches));
  const notes = ['Pole loading is not checked. The pole owner and a qualified engineer have the final word.'];
  let answer; const outputs = {};
  if (at !== null) {
    answer = `Attach at ${fi(at)}. No other line needs to move.`;
    Object.assign(outputs, { height: at / 12, moves: 0 });
  } else {
    const plans = movePlans(comm, sp, preference);
    if (plans.length) {
      const [best, next] = plans;
      const step = (m) => `move the ${KIND_NAME[m.a.kind]} line ${m.to > m.a.inches ? 'up' : 'down'} ${by(Math.abs(m.to - m.a.inches))} to ${fi(m.to)}.`;
      answer = cap(`${best.moves.map(step).join(' Then ')} Then attach at ${fi(best.at)}.`).replace(/\.\./g, '.');
      // The steps name each owner, in order.
      best.moves.forEach((m, i) => notes.unshift(`Step ${i + 1}: ${m.a.owner || 'the owner'} moves its ${KIND_NAME[m.a.kind]} line (row ${m.a.row}) ${m.to > m.a.inches ? 'up' : 'down'} ${by(Math.abs(m.to - m.a.inches))}, from ${fi(m.a.inches)} to ${fi(m.to)}.`));
      if (next) notes.unshift(`Next option: ${cap(next.moves.map(step).join(' Then '))} Then attach at ${fi(next.at)}. It ranks lower: ${next.moves.length > best.moves.length ? 'it moves more lines' : next.distance > best.distance ? `it moves ${by(next.distance - best.distance)} more` : 'it leaves the new line in a less preferred place'}.`.replace(/\.\./g, '.'));
      notes.push('Moves are limited to two, our own limit to keep plans readable.');
      Object.assign(outputs, { height: best.at / 12, moves: best.moves.length });
    } else {
      const x = extraHeight(comm, sp, { poleLengthFt, rules });
      answer = `No height fits. The pole needs ${by(x.extra)} more height above ground.${x.replacement ? ` A ${x.replacement.lengthFt} ft pole, ${x.replacement.longerFt} ft longer, gives ${feetInches(x.replacement.gainFt, 'down')} more.` : x.missing === 'length' ? ' Enter the pole\'s length to get a replacement length.' : x.missing === 'rules' ? ' Add pole.length-step and the setting-depth rows to get a replacement length.' : ''}`;
      if (x.replacement) {
        notes.push(`Height above ground is length − (length × ${x.frac.value} + ${x.add.ft} ft) from your rules (rows ${x.frac.row} and ${x.add.row}), a custom with no public source. Supply attachments are assumed to move up by the same amount; replacement design is the pole owner's work.`);
        outputs.replacement = x.replacement.lengthFt;
      }
      outputs.extra = x.extra;
    }
  }
  return {
    status: 'ok', outputs,
    sentence: [...existing, answer].join(' ').replace(/\.\./g, '.'),
    steps: [...receipt, ...sources, ...existing.map((e) => `Existing condition: ${e}`), ...notes].map((s) => s.replace(/\.\./g, '.')),
  };
}
