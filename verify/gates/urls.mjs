// Stable URLs (site/home-and-navigation): every URL ever published resolves or
// redirects, every new page is recorded, redirect targets exist, and the rule
// count stays within the 1,500 budget, with the largest groups named.
// GRIDPRIMS_RECORD=1 adds new pages to data/curated/published-urls.json.

import { existsSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { walk } from '../lib/walk.mjs';
import { redirectFor } from '../../site/lib/redirects.mjs';

export const RULE_BUDGET = 1500;

/** Page URLs in a built site. */
export const pagesOf = (dist) => walk(dist).filter((f) => f.endsWith('index.html')).map((f) => `/${f.replace(/index\.html$/, '')}`).sort();

/**
 * @param {{pages: string[], published: string[], rules: Array<{from: string, to: string}>, budget?: number}} o
 * @returns {string[]}
 */
export function checkUrls({ pages, published, rules, budget = RULE_BUDGET }) {
  const errors = [];
  const live = new Set(pages);
  for (const url of published) {
    if (live.has(url)) continue;
    const r = redirectFor(url, rules);
    if (!r) errors.push(`${url} was published and now neither resolves nor redirects; add a rule to data/curated/redirects.mjs`);
  }
  for (const r of rules) if (!r.to.includes(':') && !live.has(r.to)) errors.push(`redirect ${r.from} points at ${r.to}, which is not a page`);
  const unrecorded = pages.filter((p) => !published.includes(p));
  if (unrecorded.length) errors.push(`${unrecorded.length} new pages are not in data/curated/published-urls.json (${unrecorded.slice(0, 3).join(', ')}); run GRIDPRIMS_RECORD=1 npm run check`);
  if (rules.length > budget) {
    const groups = Object.entries(rules.reduce((g, r) => { const k = `/${r.from.split('/')[1]}/`; g[k] = (g[k] ?? 0) + 1; return g; }, {})).sort((a, b) => b[1] - a[1]).slice(0, 3);
    errors.push(`${rules.length} redirect rules, over the budget of ${budget}; largest groups: ${groups.map(([k, n]) => `${k} ${n}`).join(', ')}`);
  }
  return errors;
}

/** @param {string} root */
export async function checkSiteUrls(root, opts = {}) {
  const { build } = await import(pathToFileURL(join(root, 'site/build.mjs')).href);
  const out = mkdtempSync(join(tmpdir(), 'gridprims-urls-'));
  await build({ outDir: out });
  const pages = pagesOf(out);
  const file = join(root, 'data/curated/published-urls.json');
  let published = existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : [];
  if (opts.record) {
    published = [...new Set([...published, ...pages])].sort();
    writeFileSync(file, JSON.stringify(published, null, 2) + '\n');
  }
  const rules = (await import(pathToFileURL(join(root, 'data/curated/redirects.mjs')).href)).default;
  return checkUrls({ pages, published, rules });
}
