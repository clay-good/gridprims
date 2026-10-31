// Checks a feed against what RFC 4287 requires, for the feed tests: the Atom
// namespace; a feed id, title, and updated date; an author on the feed or on
// every entry; a self link; and on each entry an id, title, updated date, and
// an alternate link or content. Dates must be RFC 3339; ids must be absolute IRIs.

import { findAll, parseXml } from '../../parsers/xml.mjs';

const RFC3339 = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/;
const IRI = /^[a-z][a-z0-9+.-]*:\S+$/i;

/** @param {string} xml @returns {string[]} problems, empty when the feed is valid */
export function checkAtom(xml) {
  const problems = [];
  const feed = parseXml(xml);
  if (feed.local !== 'feed' || feed.attrs.xmlns !== 'http://www.w3.org/2005/Atom') return ['the root is not an Atom feed element'];
  const child = (n, local) => n.children.filter((c) => c.local === local);
  const one = (n, local, where) => {
    const found = child(n, local);
    if (found.length !== 1) problems.push(`${where} needs exactly one ${local}, has ${found.length}`);
    return found[0];
  };
  const id = one(feed, 'id', 'feed');
  if (id && !IRI.test(id.text)) problems.push(`feed id "${id.text}" is not an absolute IRI`);
  one(feed, 'title', 'feed');
  const updated = one(feed, 'updated', 'feed');
  if (updated && !RFC3339.test(updated.text)) problems.push(`feed updated "${updated.text}" is not RFC 3339`);
  if (!child(feed, 'link').some((l) => l.attrs.rel === 'self')) problems.push('feed has no self link');
  const feedAuthor = child(feed, 'author').length > 0;
  const entries = child(feed, 'entry');
  const ids = new Set();
  entries.forEach((e, i) => {
    const where = `entry ${i + 1}`;
    const eid = one(e, 'id', where);
    if (eid && !IRI.test(eid.text)) problems.push(`${where} id "${eid.text}" is not an absolute IRI`);
    if (eid && ids.has(eid.text)) problems.push(`${where} repeats id ${eid.text}`);
    if (eid) ids.add(eid.text);
    one(e, 'title', where);
    const u = one(e, 'updated', where);
    if (u && !RFC3339.test(u.text)) problems.push(`${where} updated "${u.text}" is not RFC 3339`);
    if (!feedAuthor && !child(e, 'author').length) problems.push(`${where} has no author and the feed has none`);
    if (!child(e, 'content').length && !child(e, 'link').some((l) => (l.attrs.rel ?? 'alternate') === 'alternate')) problems.push(`${where} has neither content nor an alternate link`);
  });
  if (findAll(feed, 'entry').length !== entries.length) problems.push('an entry is nested inside another element');
  return problems;
}
