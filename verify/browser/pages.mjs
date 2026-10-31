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
];

/** @param {string} out a built site */
export function browserPages(out) {
  const all = walk(out).filter((f) => f.endsWith('.html')).map((f) => `/${f.replace(/index\.html$/, '')}`);
  const isEntity = (p) => ENTITY_FAMILIES.some((d) => p.startsWith(`/${d}`));
  return [...all.filter((p) => !isEntity(p)), ...ENTITY_SAMPLE.filter((p) => all.includes(p))];
}
