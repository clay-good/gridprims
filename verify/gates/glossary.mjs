// The glossary gate (learn/glossary): every entry has a citation, a one-line
// definition of at most 25 words at reading grade 8 or below, and related
// terms that exist; every term a tool manifest lists has an entry; and the
// launch terms are all present.

import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { fleschKincaid } from '../../core/lib/readability.mjs';

export const MAX_WORDS = 25;
export const MAX_GRADE = 8;
/** The terms learn/glossary requires at launch, by entry id. */
export const LAUNCH = ['kw', 'kwh', 'demand', 'demand-charge', 'billing-demand', 'demand-window', 'ratchet', 'load-factor', 'power-factor', 'time-of-use', 'tier', 'fixed-charge', 'rider', 'interval-data', 'green-button', '8760', 'coincident-peak', '4cp', '5cp', 'peak-load-contribution', 'capacity-tag', 'balancing-authority', 'egrid-subregion', 'emission-rate', 'consumption-based-intensity', 'hourly-matching', 'carbon-free-energy-share', 'capacity-factor', 'nameplate-capacity', 'saidi', 'saifi', 'interconnection-queue', 'rate-case', 'urdb'];

/**
 * @param {any[]} entries @param {Array<{manifest: any}>} tools
 * @returns {string[]}
 */
export function glossaryProblems(entries, tools) {
  const errors = [];
  const ids = new Set(entries.map((e) => e.id));
  const names = new Map();
  for (const e of entries) {
    for (const f of ['id', 'term', 'short', 'long', 'example']) if (typeof e[f] !== 'string' || !e[f].trim()) errors.push(`glossary ${e.id ?? '(no id)'}: ${f} is missing`);
    if (!e.citation?.source || !e.citation?.url || !e.citation?.locator) errors.push(`glossary ${e.id}: needs a citation with its source, URL, and locator`);
    const n = e.short.trim().split(/\s+/).length;
    if (n > MAX_WORDS) errors.push(`glossary ${e.id}: the one-line definition has ${n} words, over ${MAX_WORDS}`);
    const g = fleschKincaid(e.short).grade;
    if (g > MAX_GRADE) errors.push(`glossary ${e.term}: the one-line definition reads at grade ${g.toFixed(1)}, above ${MAX_GRADE}`);
    for (const r of e.related ?? []) if (!ids.has(r)) errors.push(`glossary ${e.id}: related term "${r}" has no entry`);
    for (const name of [e.term, ...e.aliases].map((x) => x.toLowerCase())) {
      if (names.has(name) && names.get(name) !== e.id) errors.push(`glossary ${e.id}: "${name}" is also a name of ${names.get(name)}`);
      names.set(name, e.id);
    }
  }
  if (ids.size !== entries.length) errors.push('glossary: two entries share an id');
  for (const { manifest: m } of tools) {
    if (!Array.isArray(m.glossary)) { errors.push(`${m.id}: lists no glossary terms (an empty list when it uses none)`); continue; }
    for (const t of m.glossary) if (!ids.has(t)) errors.push(`${m.id}: lists glossary term "${t}", which has no entry`);
  }
  const missing = LAUNCH.filter((t) => !ids.has(t));
  if (missing.length) errors.push(`glossary: launch terms missing: ${missing.join(', ')}`);
  return errors;
}

/** @param {string} root */
export async function checkGlossary(root) {
  const entries = (await import(pathToFileURL(join(root, 'data/curated/glossary.mjs')).href)).default;
  const { TOOLS } = await import(pathToFileURL(join(root, 'core/tools/index.mjs')).href);
  return glossaryProblems(entries, TOOLS);
}
