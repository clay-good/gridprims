// The claims gate (platform/citations-and-verification, "Honest claims only"):
// copy may not claim accuracy, validation, review, or endorsement in prose.
// Such claims come only from committed evidence, which the manifest validator
// checks against each tool's level. Saying that something is not yet checked is
// always allowed (site/limitations, "Absence-of-review vocabulary is exempt").

import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { runTool } from '../../core/contract/run.mjs';

const CLAIM = /\b(accurate|accuracy|precise|validated|verified|certified|endorsed|approved|guaranteed|reviewed|audited|matches|agrees with)\b|\bwithin\s+[\d.]+\s?%/i;
const ABSENCE = /\b(not|no|never|nothing|none|un\w*|without|pending|n't|yet)\b|field-verified|cross-checked|self-checked/i;

/**
 * Words some tools may never use, even negated, keyed by tool id prefix: for overhead lines, "does not meet
 * code" implies the opposite answer would be an approval, which a screening check cannot give.
 */
export const SCOPED_TERMS = { 'lines.': /\b(meets? code|code[- ]compliant|compliant|compliance|approved|safe|safety-approved)\b/i };

/** Scoped words in one tool's text. @param {string} toolId @param {string} text */
export function findScoped(toolId, text) {
  return Object.entries(SCOPED_TERMS).filter(([prefix]) => toolId.startsWith(prefix)).flatMap(([, re]) => String(text).split(/(?<=[.!?])\s+/).filter((s) => re.test(s)));
}

/** Strings shown only when a record supports them: the limits page renders this label only for a tool with a row in docs/review-signoffs.md. */
export const CONDITIONAL_KEYS = ['limits.review.signed off'];

/**
 * Claims in one text, sentence by sentence.
 * @param {string} text
 * @returns {string[]} the offending sentences
 */
export function findClaims(text) {
  return String(text).split(/(?<=[.!?])\s+/).filter((s) => CLAIM.test(s) && !ABSENCE.test(s));
}

/**
 * @param {string} root
 * @returns {Promise<string[]>}
 */
export async function checkClaims(root) {
  const errors = [];
  const strings = (await import(pathToFileURL(join(root, 'site/strings/en-US.mjs')).href)).default;
  for (const [id, value] of Object.entries(strings).filter(([k]) => !CONDITIONAL_KEYS.includes(k))) {
    for (const v of typeof value === 'object' ? Object.values(value) : [value]) {
      for (const c of findClaims(v)) errors.push(`site/strings/en-US.mjs ${id}: "${c}" claims accuracy or review that no CI result backs`);
    }
  }
  const { TOOLS } = await import(pathToFileURL(join(root, 'core/tools/index.mjs')).href);
  // Every unverified claim a tool relies on must be in the register (site/limitations).
  const register = (await import(pathToFileURL(join(root, 'data/curated/claims.mjs')).href)).default;
  for (const { manifest: m } of TOOLS) {
    for (const id of m.claims ?? []) if (!register.some((c) => c.id === id)) errors.push(`${m.id} claims: "${id}" has no entry in data/curated/claims.mjs`);
  }
  for (const c of register) for (const k of ['id', 'claim', 'brief', 'usedBy', 'wouldConfirm']) if (!c[k] || (Array.isArray(c[k]) && !c[k].length)) errors.push(`data/curated/claims.mjs ${c.id ?? '?'}: ${k} is missing`);
  for (const { manifest: m } of TOOLS) {
    const texts = [['title', m.title], ['purpose', m.purpose], ['method', m.method], ['screeningLabel', m.screeningLabel ?? ''],
      ...m.assumptions.map((a, i) => [`assumptions[${i}]`, a]), ...m.limitations.map((l, i) => [`limitations[${i}]`, l]),
      ...m.handoffs.map((h, i) => [`handoffs[${i}].label`, h.label])];
    for (const [field, t] of texts) for (const c of findClaims(t)) errors.push(`${m.id} ${field}: "${c}" claims accuracy or review; only validation evidence may`);
    // Scoped words, in the manifest and in every worked example's sentence and steps.
    const shown = [...texts, ...m.examples.flatMap((ex) => { const r = runTool(m, TOOLS.find((x) => x.manifest === m).impl, ex.inputs); return r.status === 'ok' ? [[`example ${ex.id} sentence`, r.sentence], ...r.work.steps.map((st, i) => [`example ${ex.id} step ${i + 1}`, st])] : []; })];
    for (const [field, t] of shown) for (const c of findScoped(m.id, t)) errors.push(`${m.id} ${field}: "${c}" uses a word this tool may never use, even negated`);
  }
  return errors;
}
