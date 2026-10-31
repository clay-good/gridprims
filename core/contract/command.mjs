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

/**
 * The search index the command bar loads: one entry per tool (entities,
 * datasets, and Learn entries join it with phase 1 data).
 * @param {Array<{manifest: any}>} tools
 * @param {(id: string) => string} pathOf
 */
export function buildCommandIndex(tools, pathOf) {
  return tools.map(({ manifest: m }) => ({
    kind: 'tool',
    id: m.id,
    title: m.title,
    url: pathOf(m.id),
    words: [...new Set([...words(m.title), ...words(m.purpose), ...m.id.split(/[.-]/)])],
    commandForms: m.commandForms ?? [],
    inputs: m.inputs.map(({ name, type, options }) => ({ name, type, ...(options ? { options } : {}) })),
  }));
}

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
  for (const entry of index) {
    const values = parseCommand(q, entry);
    let score = values ? 1000 : 0;
    const titleWords = new Set(words(entry.title));
    for (const w of qWords) {
      if (titleWords.has(w)) score += 2;
      else if (entry.words.some((e) => e === w)) score += 1;
      else if (w.length >= 3 && entry.words.some((e) => e.startsWith(w))) score += 0.5;
    }
    if (score > 0) scored.push({ ...entry, score, values });
  }
  return scored.sort((a, b) => b.score - a.score || a.title.localeCompare(b.title)).slice(0, limit);
}
