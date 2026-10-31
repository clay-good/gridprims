// Terms are captured, not interpreted (platform/data-snapshots): each refresh
// fetches the publisher's terms page and checks that the text we recorded is
// still there. When it is not, the posture drops to what the matcher allows
// for the page as it now reads, until a person-free re-match recognizes it.

import { matchPosture } from './registry.mjs';

const ORDER = { link: 0, derive: 1, mirror: 2 };
const norm = (s) => s.replace(/\s+/g, ' ').replace(/[“”]/g, '"').replace(/[‘’]/g, "'").trim();

/** Visible text of an HTML page. */
export function pageText(html) {
  return norm(html.replace(/<(script|style)[\s\S]*?<\/\1>/gi, ' ').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'"));
}

/** The safer of two postures. */
export const safer = (a, b) => (ORDER[a] <= ORDER[b] ? a : b);

/**
 * Compare a fresh capture of the terms page with the text on record.
 * @param {any} entry registry entry
 * @param {string} html the terms page as fetched now
 * @returns {{changed: boolean, posture: string, excerpt?: string}}
 */
export function compareTerms(entry, html) {
  const now = pageText(html);
  if (now.includes(norm(entry.terms.text))) return { changed: false, posture: entry.posture ?? matchPosture({ ...entry.terms, factual: entry.factual }).posture };
  const rematched = matchPosture({ text: now, factual: entry.factual ?? true }).posture;
  // Changed wording never raises a posture: it can only stay or drop.
  const posture = safer(safer(entry.posture ?? 'mirror', rematched), 'derive');
  return { changed: true, posture, excerpt: now.slice(0, 600) };
}

/** The posture in force: a takedown request means link, without argument. */
export function postureInForce(entry, termsResult) {
  if (entry.takedown) return 'link';
  return termsResult?.posture ?? entry.posture;
}
