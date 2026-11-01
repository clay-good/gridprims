// Atom feeds (RFC 4287; site/discoverability, "Feeds for people who follow
// updates"): a feed is its entries, newest first, with the feed's updated
// date taken from its newest entry so a rebuild without news changes nothing.

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
/** RFC 3339 for a YYYY-MM-DD day or an ISO time. */
const stamp = (d) => (/^\d{4}-\d{2}-\d{2}$/.test(d) ? `${d}T00:00:00Z` : new Date(d).toISOString().replace(/\.\d{3}Z$/, 'Z'));

/**
 * @param {{id: string, title: string, self: string, alternate: string, author: string, empty?: string,
 *   entries: Array<{id: string, title: string, updated: string, link: string, summary: string}>}} f
 *   empty dates a feed with no entries yet, so it is stable too
 */
export function atomFeed(f) {
  const entries = [...f.entries].sort((a, b) => (stamp(b.updated) > stamp(a.updated) ? 1 : stamp(b.updated) < stamp(a.updated) ? -1 : a.id < b.id ? -1 : 1));
  const updated = stamp(entries.length ? entries[0].updated : f.empty ?? '1970-01-01');
  return `<?xml version="1.0" encoding="utf-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
<id>${esc(f.id)}</id>
<title>${esc(f.title)}</title>
<updated>${updated}</updated>
<link rel="self" type="application/atom+xml" href="${esc(f.self)}"/>
<link rel="alternate" type="text/html" href="${esc(f.alternate)}"/>
<author><name>${esc(f.author)}</name></author>
${entries.map((e) => `<entry>
<id>${esc(e.id)}</id>
<title>${esc(e.title)}</title>
<updated>${stamp(e.updated)}</updated>
<link rel="alternate" type="text/html" href="${esc(e.link)}"/>
<summary>${esc(e.summary)}</summary>
</entry>`).join('\n')}
</feed>
`;
}

/** One data release entry: the version id, data period, row changes by table, and the downloads. */
export function releaseEntry(m, shortTitle, origin) {
  const changes = m.tables.map((t) => (t.changes?.first ? `${t.name}: first version, ${t.rows.toLocaleString('en-US')} rows` : `${t.name}: ${t.changes.added} added, ${t.changes.removed} removed, ${t.changes.changed} changed`)).join('; ');
  return {
    id: `${origin}/data/${m.dataset}/${m.version}/`, title: `${shortTitle}, version ${m.version}`, updated: m.generatedAt, link: `${origin}/data/${m.dataset}/`,
    summary: `Version ${m.version}, data for ${[...new Set(m.tables.map((t) => t.dataPeriod))].join(', ')}. ${changes}. Download: ${m.tables.map((t) => `${origin}/data/${m.dataset}/${m.version}/${t.download?.path ?? 'manifest.json'}`).join(' ')}`,
  };
}
