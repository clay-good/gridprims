// The pages the browser gates visit: every page, except that entity families
// (thousands of plant pages from one template) are represented by a fixed
// sample chosen for their edge cases.

import { walk } from '../lib/walk.mjs';
import { ENTITY_FAMILIES } from '../../site/build.mjs';

/** Plant pages that exercise every branch of the template. */
export const ENTITY_SAMPLE = [
  '/plants/3470/', // coal and gas, years differ between eGRID and EIA-923
  '/plants/6167/', // pumped storage: net consumer of energy
  '/plants/65028/', // capacity factor above 100%, a proposed generator
  '/plants/6304/', // a planned retirement
  '/plants/59027/', // not in eGRID
];

/** @param {string} out a built site */
export function browserPages(out) {
  const all = walk(out).filter((f) => f.endsWith('.html')).map((f) => `/${f.replace(/index\.html$/, '')}`);
  const isEntity = (p) => ENTITY_FAMILIES.some((d) => p.startsWith(`/${d}`));
  return [...all.filter((p) => !isEntity(p)), ...ENTITY_SAMPLE.filter((p) => all.includes(p))];
}
