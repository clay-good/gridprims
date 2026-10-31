// The pages the browser gates visit: every page, except that entity families
// (thousands of plant and utility pages from two templates) are represented by a fixed
// sample chosen for their edge cases.

import { walk } from '../lib/walk.mjs';
import { ENTITY_FAMILIES } from '../../site/build.mjs';

/** Plant and utility pages that exercise every branch of their templates. */
export const ENTITY_SAMPLE = [
  '/plants/3470/', // coal and gas, years differ between eGRID and EIA-923
  '/plants/6167/', // pumped storage: net consumer of energy
  '/plants/65028/', // capacity factor above 100%, a proposed generator
  '/plants/6304/', // a planned retirement
  '/plants/59027/', // not in eGRID
  '/utilities/44372/', // Oncor: delivery only, no Form 714, its balancing authority's peak
  '/utilities/195/', // Alabama Power: full service, a Form 714 peak, plants, rates
  '/utilities/108/', // a cooperative that operates no plants
  '/utilities/55/', // no reliability report
  '/utilities/113/', // energy only
  '/states/tx/', // the most utilities and queue types
  '/states/dc/', // the smallest
  '/subregions/erct/', // every rate reported
  '/subregions/hims/', // a small island system
  '/queue/', // the national summary
  '/queue/tx/', // the most counties and project rows
];

/** @param {string} out a built site */
export function browserPages(out) {
  const all = walk(out).filter((f) => f.endsWith('.html')).map((f) => `/${f.replace(/index\.html$/, '')}`);
  const isEntity = (p) => ENTITY_FAMILIES.some((d) => p.startsWith(`/${d}`));
  return [...all.filter((p) => !isEntity(p)), ...ENTITY_SAMPLE.filter((p) => all.includes(p))];
}

/** How many of each family the 200-page entity sweep visits (public grid data task 7.2). */
export const ENTITY_SWEEP = { plants: 120, utilities: 50, states: 15, subregions: 10, queue: 5 };

/** A fixed spread of 200 entity pages: every Nth page of each family, in a stable order. */
export function entitySample(out) {
  const all = walk(out).filter((f) => f.endsWith('index.html')).map((f) => `/${f.replace(/index\.html$/, '')}`).sort();
  return Object.entries(ENTITY_SWEEP).flatMap(([family, n]) => {
    const pages = all.filter((p) => p.startsWith(`/${family}/`) && p !== `/${family}/`);
    return Array.from({ length: Math.min(n, pages.length) }, (_, i) => pages[Math.floor((i * pages.length) / n)]);
  });
}
