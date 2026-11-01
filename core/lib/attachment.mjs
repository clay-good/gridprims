// Where a new communication line attaches on a pole (add-overhead-line-checks:
// attachment height), against the rules the user loaded: the communication
// space under the lowest supply attachment, every whole-inch height that
// keeps each separation, the fewest moves of other communication lines that
// make room (two at most, our own limit), and the extra height a
// replacement pole would need. Supply attachments never move. All heights
// here are whole inches above the ground line.

import { parseLength } from './field-length.mjs';
import { TEMPLATE_IDS } from './standards-template.mjs';

export const SUPPLY = ['primary', 'neutral', 'secondary', 'streetlight', 'transformer'];
export const COMM = ['catv', 'telephone', 'fiber', 'communication-other'];
export const KIND_NAME = { primary: 'primary', neutral: 'neutral', secondary: 'secondary', streetlight: 'streetlight', transformer: 'transformer', catv: 'cable TV', telephone: 'telephone', fiber: 'fiber', 'communication-other': 'communication' };
export const MAX_MOVES = 2;

const toIn = (ft) => Math.round(ft * 12);

/** What a rule's value may plausibly be, so a unit mistake is flagged rather than trusted silently. */
const PLAUSIBLE_IN = { sep: [1, 120], ground: [60, 480], 'pole.length-step': [12, 240], 'pole.setting-depth.add': [0, 120] };
const plausibleFor = (id) => PLAUSIBLE_IN[id] ?? PLAUSIBLE_IN[id.split('.')[0]] ?? null;

/** A row that is not a rule at all: blank, a header, or a footer note. */
const isFurniture = (first, line) => !first || /^rule_?id$/i.test(first) || !/^[a-z][a-z0-9-]*(\.[a-z0-9-]+)+$/.test(first) || /^(notes?|source|prepared|revision|page)\b/i.test(line);

/**
 * Read the rules in the template's columns: rule_id, applies_to, value, unit, source_document,
 * source_locator, note. The reader never guesses. An id it does not know is ignored and listed. A rule given
 * twice with different values is a conflict, naming both rows, and the checks that need it are refused until
 * the user picks one. A value with no unit is refused unless the unit is written inside the value. A value
 * outside its plausible range is flagged and still used as written. Blank, header, and footer rows are
 * skipped and counted.
 * @param {string} text
 */
export function parseRules(text) {
  const rules = []; const problems = []; const ignored = []; const conflicts = []; let skipped = 0;
  String(text).split('\n').forEach((raw, i) => {
    const line = raw.trim();
    const cells = line.split(',').map((x) => x.trim());
    const [id, appliesTo = '', value = '', unit = '', source = '', locator = '', note = ''] = cells;
    const row = i + 1;
    if (isFurniture(id, line)) { if (line) skipped++; return; }
    if (!TEMPLATE_IDS.includes(id) && !/^ground\.[a-z-]+\.[a-z-]+$/.test(id)) { ignored.push({ id, row }); return; }
    if (id === 'place.preference') { rules.push({ id, value: value.toLowerCase(), row, source, locator, shown: value.toLowerCase() }); return; }
    if (id === 'pole.setting-depth.fraction') {
      const n = Number(value.replace('%', '')) / (value.includes('%') ? 100 : 1);
      if (!(n >= 0 && n < 1)) problems.push(`row ${row}: ${id} must be a fraction such as 0.1 or 10%`);
      else rules.push({ id, value: n, row, source, locator, shown: value });
      return;
    }
    const inValue = /[a-z]/i.test(value);
    if (inValue && unit) { problems.push(`row ${row}: the value "${value}" holds a unit; put the unit in its own column`); return; }
    if (!inValue && !unit) { problems.push(`row ${row}: ${id} has a value with no unit; write the unit in its column, or inside the value as "40 in"`); return; }
    const len = parseLength(inValue ? value : `${value} ${unit}`);
    if (len.error) { problems.push(`row ${row}: ${len.error}`); return; }
    let range = null;
    const m = /^(\d+(?:\.\d+)?)\s*-\s*(\d+(?:\.\d+)?)\s*kv$/i.exec(appliesTo);
    if (m) range = [Number(m[1]), Number(m[2])];
    const inches = toIn(len.ft);
    const bounds = plausibleFor(id);
    // A value far outside the range is most often a unit mistake: name the reading it would have in inches.
    const maybeInches = !inValue && /^ft$/i.test(unit) && Number(value) >= bounds?.[0] && Number(value) <= bounds?.[1];
    const flag = bounds && (inches < bounds[0] || inches > bounds[1])
      ? `Row ${row}: ${id} reads ${len.ft >= 1 ? `${+len.ft.toFixed(2)} ft` : `${inches} in.`}, outside the ${bounds[0]} to ${bounds[1]} in. a rule of this kind usually sets. ${maybeInches ? `Did you mean ${value} in.? ` : ''}It is used as written.`
      : null;
    const shown = `${value}${unit ? ` ${unit}` : ''}`.replace(/\b(in|ft)$/, '$1.').replace(/\bft\.$/, 'ft');
    rules.push({ id, ft: len.ft, inches, range, row, source, locator, note, shown, flag, unitFromValue: inValue });
  });
  // Two rows setting the same rule and range to different values: a conflict, not a silent pick.
  const seen = new Map();
  for (const r of rules) {
    const k = `${r.id}|${r.range?.join('-') ?? ''}`;
    const prev = seen.get(k);
    if (prev && (prev.inches ?? prev.value) !== (r.inches ?? r.value)) conflicts.push({ id: r.id, rows: [prev.row, r.row], values: [prev.shown, r.shown] });
    else seen.set(k, r);
  }
  const conflicted = new Set(conflicts.map((c) => c.id));
  return { rules: rules.filter((r) => !conflicted.has(r.id)), problems, ignored, conflicts, skipped };
}

/**
 * The receipt of a read: every rule with its value, unit, row and source, the rows ignored or skipped, and
 * every conflict and flag, so a reader can see what the file gave before any check uses it.
 * @param {ReturnType<typeof parseRules>} read
 */
export function rulesReceipt(read) {
  const lines = read.rules.map((r) => `Row ${r.row}: ${r.id} = ${r.shown}${r.range ? ` for ${r.range[0]} to ${r.range[1]} kV` : ''}${r.source ? `, from ${r.source}${r.locator ? ` ${r.locator}` : ''}` : ', with no source named'}${r.unitFromValue ? ' (the unit came from the value)' : ''}`);
  for (const c of read.conflicts) lines.push(`Rows ${c.rows.join(' and ')} both set ${c.id} (${c.values.join(' and ')}). Checks that need it are refused until you pick one.`);
  for (const r of read.rules.filter((x) => x.flag)) lines.push(r.flag);
  for (const i of read.ignored) lines.push(`Row ${i.row}: "${i.id}" is not a rule id we know, so it is ignored.`);
  if (read.skipped) lines.push(`${read.skipped} blank, header, or note ${read.skipped === 1 ? 'row' : 'rows'} skipped.`);
  return lines;
}

/**
 * Attachments one a line: kind, owner, height. A primary names its voltage in the kind, as "primary 12.47kV".
 * "no power" on its own line confirms a pole that carries no supply.
 * @param {string} text
 */
export function parseAttachments(text) {
  const out = []; const problems = []; let noPower = false;
  String(text).split('\n').forEach((raw, i) => {
    const line = raw.trim();
    if (!line) return;
    if (/^no power$/i.test(line)) { noPower = true; return; }
    const [k = '', owner = '', h = ''] = line.split(',').map((x) => x.trim());
    const km = /^([a-z-]+)(?:\s+(\d+(?:\.\d+)?)\s*kv)?$/i.exec(k);
    const kind = km?.[1].toLowerCase();
    const row = i + 1;
    if (!kind || (!SUPPLY.includes(kind) && !COMM.includes(kind))) { problems.push(`row ${row}: the kind "${k}" is not one we know (${[...SUPPLY, ...COMM].join(', ')})`); return; }
    const len = parseLength(h);
    if (len.error) { problems.push(`row ${row}: height could not be read`); return; }
    if (len.ft < 0) { problems.push(`row ${row}: a height below the ground line`); return; }
    out.push({ row, kind, kv: km[2] ? Number(km[2]) : null, owner, inches: toIn(len.ft), supply: SUPPLY.includes(kind) });
  });
  return { attachments: out, problems, noPower };
}

const rule = (rules, id) => rules.find((r) => r.id === id) ?? null;

/**
 * The communication space: its top (the lowest supply attachment less its separation) and its bottom (the
 * lowest attachment the rules allow), with the rules each came from.
 */
export function space(attachments, rules, { noPower = false, poleTopIn = null } = {}) {
  const supply = attachments.filter((a) => a.supply).sort((a, b) => a.inches - b.inches);
  const ground = rule(rules, 'ground.pole.comm');
  if (!ground) return { refused: 'Your rules give no lowest communication height (ground.pole.comm).' };
  const commSep = rule(rules, 'sep.comm.comm');
  if (!commSep) return { refused: 'Your rules give no separation between communication lines (sep.comm.comm).' };
  if (!supply.length) {
    if (!noPower) return { refused: 'No supply attachment is listed. Enter the lowest supply attachment, or add a line "no power" to confirm the pole carries none.' };
    if (poleTopIn === null) return { refused: 'With no power on the pole, the top of the space is the pole top: enter the pole length, and the setting depth in your rules.' };
    return { top: poleTopIn, bottom: ground.inches, lowestSupply: null, supplySep: null, ground, commSep };
  }
  const low = supply[0];
  let sep;
  if (low.kind === 'primary') {
    sep = rules.find((r) => r.id === 'sep.primary.comm' && (!r.range || (low.kv !== null && low.kv >= r.range[0] && low.kv <= r.range[1])));
    if (!sep) {
      const ranges = rules.filter((r) => r.id === 'sep.primary.comm' && r.range).map((r) => `${r.range[0]} to ${r.range[1]} kV`);
      return { refused: low.kv === null ? 'The lowest supply is a primary with no voltage; write it as "primary 12.47kV".' : `The lowest supply is a ${low.kv} kV primary, and your rules give sep.primary.comm only for ${ranges.join(' and ') || 'no voltage'}. Add a row for ${low.kv} kV.` };
    }
  } else {
    sep = rule(rules, `sep.${low.kind}.comm`);
    if (!sep) return { refused: `The lowest supply attachment is a ${KIND_NAME[low.kind]}, and your rules have no sep.${low.kind}.comm row.` };
  }
  return { top: low.inches - sep.inches, bottom: ground.inches, lowestSupply: low, supplySep: sep, ground, commSep };
}

/** Existing communication lines that break a separation, before the new line goes on. */
export function existingShortfalls(comm, sp) {
  const out = [];
  for (const a of comm) {
    if (sp.lowestSupply && sp.lowestSupply.inches - a.inches < sp.supplySep.inches) out.push({ kind: 'supply', a, short: sp.supplySep.inches - (sp.lowestSupply.inches - a.inches) });
    if (a.inches < sp.bottom) out.push({ kind: 'ground', a, short: sp.bottom - a.inches });
  }
  const sorted = [...comm].sort((x, y) => y.inches - x.inches);
  for (let i = 0; i < sorted.length; i++) for (let j = i + 1; j < sorted.length; j++) {
    const gap = sorted[i].inches - sorted[j].inches;
    if (gap < sp.commSep.inches) out.push({ kind: 'comm', a: sorted[i], b: sorted[j], short: sp.commSep.inches - gap });
  }
  return out;
}

/** Heights a line may take in the space, keeping the separation from every other line given. */
function heightsFree(others, sp) {
  const out = [];
  for (let h = sp.top; h >= sp.bottom; h--) if (others.every((o) => Math.abs(o - h) >= sp.commSep.inches)) out.push(h);
  return out;
}

/** Pick one height by placement preference. */
export function pick(heights, preference, existing) {
  if (!heights.length) return null;
  if (preference === 'lowest') return Math.min(...heights);
  if (preference === 'nearest-existing' && existing.length) {
    const d = (h) => Math.min(...existing.map((e) => Math.abs(e - h)));
    return heights.reduce((a, b) => (d(b) < d(a) || (d(b) === d(a) && b > a) ? b : a));
  }
  return Math.max(...heights);
}

/**
 * Plans of one or two moves that make room, ranked: fewest moves, least total distance, the new line's height
 * by preference, then moving up before moving down. Each moved line keeps every separation, inside the space.
 */
export function movePlans(comm, sp, preference) {
  const plans = [];
  const consider = (moves) => {
    const moved = new Map(moves.map((m) => [m.a, m.to]));
    const heights = comm.map((a) => moved.get(a) ?? a.inches);
    // A moved line must clear every other line, moved or not.
    for (const m of moves) {
      if (m.to > sp.top || m.to < sp.bottom) return;
      for (const b of comm) if (b !== m.a && Math.abs((moved.get(b) ?? b.inches) - m.to) < sp.commSep.inches) return;
    }
    const free = heightsFree(heights, sp);
    const at = pick(free, preference, heights);
    if (at === null) return;
    plans.push({ moves, at, distance: moves.reduce((n, m) => n + Math.abs(m.to - m.a.inches), 0), up: moves.filter((m) => m.to > m.a.inches).length });
  };
  const options = (a) => { const o = []; for (let h = sp.top; h >= sp.bottom; h--) if (h !== a.inches) o.push({ a, to: h }); return o; };
  for (const a of comm) for (const m of options(a)) consider([m]);
  if (!plans.length) {
    for (let i = 0; i < comm.length; i++) for (let j = i + 1; j < comm.length; j++) {
      for (const m1 of options(comm[i])) for (const m2 of options(comm[j])) consider([m1, m2]);
    }
  }
  const prefRank = (p) => (preference === 'lowest' ? p.at : -p.at);
  plans.sort((x, y) => x.moves.length - y.moves.length || x.distance - y.distance || (preference === 'nearest-existing' ? 0 : prefRank(x) - prefRank(y)) || y.up - x.up);
  // One plan per set of lines moved and direction: moving the same line 1 in. farther is not another option.
  const seen = new Set();
  return plans.filter((p) => { const k = p.moves.map((m) => `${m.a.row}${m.to > m.a.inches ? '+' : '-'}`).join(' '); if (seen.has(k)) return false; seen.add(k); return true; });
}

/**
 * The extra height above ground the space needs for the new line to fit with no moves, with supply raised by
 * the same amount; and the shortest replacement pole that gives it.
 */
export function extraHeight(comm, sp, { poleLengthFt = null, rules }) {
  let extra = 0;
  for (; extra <= 12 * 40; extra++) {
    if (heightsFree(comm.map((a) => a.inches), { ...sp, top: sp.top + extra }).length) break;
  }
  const step = rule(rules, 'pole.length-step');
  const frac = rule(rules, 'pole.setting-depth.fraction');
  const add = rule(rules, 'pole.setting-depth.add');
  if (poleLengthFt === null || !step || !frac || !add) return { extra, replacement: null, missing: poleLengthFt === null ? 'length' : 'rules' };
  const above = (L) => L - (L * frac.value + add.ft);
  for (let L = poleLengthFt + step.ft; L <= poleLengthFt + 60; L += step.ft) {
    const gain = above(L) - above(poleLengthFt);
    if (gain * 12 >= extra) return { extra, replacement: { lengthFt: L, longerFt: L - poleLengthFt, gainFt: gain }, step, frac, add };
  }
  return { extra, replacement: null, missing: 'none' };
}
