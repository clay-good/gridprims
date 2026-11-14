// The command bar's index and ranker (platform/app-shell, "Command bar on
// every page"). Shared core, so the website and the MCP server's search rank
// the same way. Everything comes from manifests: each tool's `commandForms`
// say which plain-word phrasings fill which inputs.

const NUMBER = '([-+]?(?:\\d{1,3}(?:,\\d{3})+|\\d+)?(?:\\.\\d+)?(?:[eE][-+]?\\d+)?)';
const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Every phrase that names an enum option: its value, unit, label, and declared aliases. */
function optionAliases(o) {
  const names = [o.value, o.unit, o.one, o.label, ...(o.aliases ?? [])];
  const paren = /^(.*?)\s*\((.*)\)$/.exec(o.label ?? '');
  if (paren) names.push(paren[1], paren[2]);
  return [...new Set(names.filter((n) => typeof n === 'string' && n.trim()).map((n) => n.toLowerCase()))];
}

/**
 * Compile a manifest's command forms into matchers. Spaces in a form are
 * optional in the query, so "12MWh to MMBtu" reads like "12 MWh to MMBtu".
 * @param {any} manifest a manifest or a command-index entry
 * @returns {Array<{re: RegExp, slots: Array<{name: string, type: string, lookup?: Map<string, string>}>}>}
 */
export function compileForms(manifest) {
  return (manifest.commandForms ?? []).map((form) => {
    const slots = [];
    const pattern = form.split(/(\{\w+\})/).map((part) => {
      const m = /^\{(\w+)\}$/.exec(part);
      if (!m) return part.trim() ? `\\s*${part.trim().split(/\s+/).map(escapeRe).join('\\s+')}\\s*` : '\\s*';
      const inp = manifest.inputs.find((x) => x.name === m[1]);
      if (inp.type === 'number') {
        slots.push({ name: inp.name, type: 'number' });
        return NUMBER;
      }
      const lookup = new Map();
      for (const o of inp.options) for (const a of optionAliases(o)) if (!lookup.has(a)) lookup.set(a, o.value);
      slots.push({ name: inp.name, type: inp.type, lookup });
      const alts = [...lookup.keys()].sort((a, b) => b.length - a.length).map((a) => a.split(/\s+/).map(escapeRe).join('\\s+'));
      return `(${alts.join('|')})`;
    }).join('');
    return { re: new RegExp(`^\\s*${pattern}\\s*$`, 'i'), slots };
  });
}

/**
 * Try to read a query as one of a tool's command forms.
 * @param {string} query
 * @param {any} manifest
 * @returns {Record<string, string> | null} input values, or null when no form matches
 */
export function parseCommand(query, manifest) {
  for (const { re, slots } of compileForms(manifest)) {
    const m = re.exec(query);
    if (!m) continue;
    const values = {};
    let ok = true;
    slots.forEach((slot, i) => {
      const text = m[i + 1];
      if (slot.type === 'number') {
        if (!/\d/.test(text)) ok = false;
        values[slot.name] = text.replace(/,/g, '');
      } else values[slot.name] = slot.lookup.get(text.toLowerCase().replace(/\s+/g, ' '));
    });
    if (ok) return values;
  }
  return null;
}

const words = (s) => s.toLowerCase().split(/[^a-z0-9³²₂]+/).filter((w) => w.length > 1);

/** A term's names as a query would type them: lowercase, with spaces and hyphens alike. */
const phrase = (s) => s.toLowerCase().replace(/[-\s]+/g, ' ').trim();

/** A definitional query ("what is 4CP?", "define load factor") reduced to the term it asks about. */
export const askedTerm = (q) => phrase(q.replace(/[?.!]+$/, '').replace(/^\s*(what\s+is|what's|whats|what\s+are|define|definition\s+of|meaning\s+of)\s+/i, '').replace(/^(a|an|the)\s+/i, ''));

/**
 * The search index the command bar loads: one entry per tool, then one per glossary term (entities and
 * datasets join it with phase 1 data).
 * @param {Array<{manifest: any}>} tools
 * @param {(id: string) => string} pathOf
 * @param {any[]} [glossary] entries from data/curated/glossary.mjs
 */
export function buildCommandIndex(tools, pathOf, glossary = []) {
  return [
    ...tools.map(({ manifest: m }) => ({
      kind: 'tool',
      id: m.id,
      title: m.title,
      url: pathOf(m.id),
      words: [...new Set([...words(m.title), ...words(m.purpose), ...m.id.split(/[.-]/)])],
      // A tool whose id names the thing asked for outranks one that merely shares a title word.
      idWords: [...new Set(m.id.split(/[.-]/))],
      commandForms: m.commandForms ?? [],
      inputs: m.inputs.map(({ name, type, options }) => ({ name, type, ...(options ? { options } : {}) })),
    })),
    ...glossary.map((g) => ({
      kind: 'term',
      id: g.id,
      title: g.term,
      url: `/learn/glossary/#${g.id}`,
      words: [...new Set([...words(g.term), ...g.aliases.flatMap(words)])],
      names: [g.term, ...g.aliases].map(phrase),
      definition: g.short,
      citation: g.citation,
      inputs: [],
    })),
  ];
}

/** A bare five-digit ZIP code. Leading zeros matter, so it stays a string throughout. */
export const ZIP_RE = /^\s*(\d{5})\s*$/;

/**
 * Rank index entries for a query. A query that fills a tool's inputs ranks
 * first and carries those values; otherwise entries rank by shared words,
 * with title words counting double.
 * @param {string} query
 * @param {ReturnType<typeof buildCommandIndex>} index
 * @param {number} [limit]
 */
export function searchCommands(query, index, limit = 8) {
  const q = query.trim();
  if (!q) return [];
  const qWords = words(q);
  const scored = [];
  const asked = askedTerm(q);
  // ZIP codes are not indexed: 33,000 entries would dwarf the file, and the ZIP
  // shards already resolve one on the device. Five digits goes straight there.
  const zip = ZIP_RE.exec(q)?.[1];
  // The ZIP travels in the fragment, which no request carries, so looking one up
  // leaves nothing in the host's log (the standing rule: inputs stay on the device).
  if (zip) scored.push({ kind: 'place', placeKind: 'zip', title: `ZIP ${zip}`, url: `/lookup/#zip=${zip}`, words: [zip], inputs: [], score: 3000, values: null });
  for (const entry of index) {
    const values = entry.kind === 'tool' ? parseCommand(q, entry) : null;
    // A query that names a term, or asks what it is, puts that term first.
    let score = values ? 1000 : entry.names?.includes(asked) ? 2000 : 0;
    const titleWords = new Set(words(entry.title));
    // A place entry carries no word list of its own; its title is its words.
    const entryWords = entry.words ?? [...titleWords];
    for (const w of qWords) {
      if (titleWords.has(w)) score += 2;
      else if (entryWords.some((e) => e === w)) score += 1;
      else if (w.length >= 3 && entryWords.some((e) => e.startsWith(w))) score += 0.5;
      if (entry.idWords?.includes(w)) score += 1;
    }
    if (score > 0) scored.push({ ...entry, score, values });
  }
  return scored.sort((a, b) => b.score - a.score || a.title.localeCompare(b.title)).slice(0, limit);
}
