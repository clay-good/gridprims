// Places for the command bar (siting/home-and-shell, "One centred search bar
// under the read-out", design D7). One entry per state, county, utility with a
// page, balancing authority, and eGRID subregion, so the one search bar answers
// a place as well as a tool. Entries carry only a title and a URL: the index is
// fetched whole on first focus, so every byte is one a visitor waits for. A
// bare ZIP code is not indexed at all; the ranker recognizes five digits
// (core/contract/command.mjs) and sends it to the lookup, which reads the ZIP
// shards on the device.

import { balancingPath } from '../templates/balancing.mjs';
import { statePath, subregionPath } from '../templates/region.mjs';
import { utilityPath } from '../templates/utility.mjs';
import { LOOKUP_PATH } from '../templates/lookup.mjs';

/** A county's lookup, which names its serving utilities, its subregion, and its balancing authority. */
export const countyPath = (state, fips) => `${LOOKUP_PATH}#state=${state}&county=${fips}`;

/**
 * @param {{regions: any, utilities: any, balancing: any, lookup: any, withPage: Set<number>}} p
 * @returns {Array<{kind: string, placeKind: string, title: string, url: string}>}
 */
export function placeEntries({ regions, utilities, balancing, lookup, withPage }) {
  const place = (placeKind, title, url) => ({ kind: 'place', placeKind, title, url });
  const entries = [
    ...(regions?.states ?? []).map((s) => place('state', s.name, statePath(s.code))),
    ...(regions?.subregions ?? []).map((s) => place('subregion', s.subregion_name ?? s.subregion, subregionPath(s.subregion))),
    ...(balancing?.regions ?? []).map((r) => place('balancing-authority', r.name, balancingPath(r.ba))),
    ...(utilities?.utilities ?? []).filter((u) => withPage.has(u.id)).map((u) => place('utility', u.name, utilityPath(u.id))),
  ];
  // A county is named as a visitor would type it, with its state, because
  // 30 states have a Washington County and the title is all the ranker sees.
  for (const [st, shard] of lookup?.shards ?? []) {
    for (const [fips, c] of Object.entries(shard.counties)) entries.push(place('county', `${c.name}, ${st}`, countyPath(st, fips)));
  }
  return entries;
}
