// Page metadata rules (site/discoverability, "Page metadata from the
// record"): titles of at most 60 characters, descriptions of at most 155,
// names made unique by adding what tells them apart, and JSON-LD that a
// stray "</script>" in a name cannot break out of.

export const TITLE_MAX = 60;
export const DESCRIPTION_MAX = 155;
const SUFFIX = ' · gridprims';

/** Cut text to a length at a word boundary, ending with an ellipsis when cut. */
export function fit(text, max) {
  const s = String(text).replace(/\s+/g, ' ').trim();
  if (s.length <= max) return s;
  const cut = s.slice(0, max - 1);
  const at = cut.lastIndexOf(' ');
  return `${(at > max * 0.6 ? cut.slice(0, at) : cut).replace(/[\s,;:·–-]+$/, '')}…`;
}

/** A page title: the page's own name, then the site's, in at most 60 characters. */
export const pageTitle = (name) => `${fit(name, TITLE_MAX - SUFFIX.length)}${SUFFIX}`;

/** The preferred title when it fits whole, else the fallback, so a long name is never cut mid-phrase. */
export const titleOr = (preferred, fallback) => pageTitle(preferred.length <= TITLE_MAX - SUFFIX.length ? preferred : fallback);

/**
 * Names made unique for titles: a name shared by several records gets its
 * state, and one still shared gets its id too ("Springfield (IL)", "Solar (CA, plant 123)").
 * @param {Array<{key: any, name: string, state?: string, id: any}>} items
 * @param {string} idLabel such as "plant" or "utility"
 * @returns {Map<any, string>} key to unique name
 */
export function uniqueNames(items, idLabel) {
  const count = (f) => items.reduce((m, x) => m.set(f(x), (m.get(f(x)) ?? 0) + 1), new Map());
  const byName = count((x) => x.name.toLowerCase());
  const byState = count((x) => `${x.name.toLowerCase()}|${x.state ?? ''}`);
  return new Map(items.map((x) => {
    if (byName.get(x.name.toLowerCase()) === 1) return [x.key, x.name];
    if (x.state && byState.get(`${x.name.toLowerCase()}|${x.state}`) === 1) return [x.key, `${x.name} (${x.state})`];
    return [x.key, `${x.name} (${x.state ? `${x.state}, ` : ''}${idLabel} ${x.id})`];
  }));
}

/** JSON for a <script type="application/ld+json"> block, with "<" escaped so no value can end the block. */
export const jsonLd = (obj) => JSON.stringify(obj).replace(/</g, '\\u003c');
