// The program links gate (add-program-fact-pages: program links). Every entry
// carries its facts (who maintains it, what it covers, what it costs, why we
// link rather than rebuild, and when it was last checked), no URL carries a
// referral or tracking parameter, and every outside page a tool hands off to
// is in the index, so "link, don't rebuild" stays auditable.

import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

export const REQUIRED = ['id', 'question', 'name', 'maintainer', 'covers', 'cost', 'why', 'url', 'lastChecked'];
export const COSTS = ['free', 'free with an account', 'paid'];
/** Query parameters that track or pay for a click. */
export const TRACKING = /^(utm_\w+|ref|referrer|aff|affiliate|aff_id|affid|partner|fbclid|gclid|msclkid|mc_cid|mc_eid|_hsenc|_hsmi|igshid|yclid|dclid|campaign)$/i;
const OURS = /^https:\/\/gridprims\.com\//;

/**
 * @param {Array<Record<string, any>>} links the index
 * @param {Array<{id: string}>} questions
 * @param {Array<{manifest: any}>} tools
 * @param {string} today YYYY-MM-DD
 * @returns {string[]} errors
 */
export function checkLinks(links, questions, tools, today) {
  const errors = [];
  const ids = new Set();
  const groups = new Set(questions.map((q) => q.id));
  for (const [i, l] of links.entries()) {
    const at = l.id ?? `entry ${i + 1}`;
    for (const f of REQUIRED) if (l[f] === undefined || l[f] === null || String(l[f]).trim() === '') errors.push(`${at}: missing ${f}`);
    if (l.id && ids.has(l.id)) errors.push(`${at}: id is used twice`);
    ids.add(l.id);
    if (l.question && !groups.has(l.question)) errors.push(`${at}: question "${l.question}" is not one of ${[...groups].join(', ')}`);
    if (l.cost && !COSTS.includes(l.cost)) errors.push(`${at}: cost "${l.cost}" is not one of ${COSTS.join(', ')}`);
    if (l.lastChecked && (!/^\d{4}-\d{2}-\d{2}$/.test(l.lastChecked) || l.lastChecked > today)) errors.push(`${at}: lastChecked "${l.lastChecked}" is not a date on or before ${today}`);
    if (l.url) {
      let u;
      try { u = new URL(l.url); } catch { errors.push(`${at}: url is not a URL`); continue; }
      if (u.protocol !== 'https:') errors.push(`${at}: url is not https`);
      for (const k of u.searchParams.keys()) if (TRACKING.test(k)) errors.push(`${at}: url carries the tracking parameter "${k}"`);
    }
  }
  // Every outside page a tool hands off to is an entry; our own files are not outside pages.
  const listed = new Set(links.map((l) => l.url));
  for (const { manifest: m } of tools) {
    for (const h of m.handoffs ?? []) if (!OURS.test(h.url) && !listed.has(h.url)) errors.push(`${m.id}: hands off to ${h.url}, which the program links index does not list`);
  }
  return errors;
}

/** @param {string} root */
export async function checkProgramLinks(root, today = new Date().toISOString().slice(0, 10)) {
  const mod = await import(pathToFileURL(join(root, 'data/curated/program-links.mjs')).href);
  const { TOOLS } = await import(pathToFileURL(join(root, 'core/tools/index.mjs')).href);
  return checkLinks(mod.default, mod.QUESTIONS, TOOLS, today);
}
