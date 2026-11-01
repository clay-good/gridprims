// Definition on first use (learn/glossary): the first time a page's text
// uses a term its tool lists, the word becomes a glossary term whose popover
// gives the one-line definition and links the entry. Later uses stay plain.
// Text inside links, buttons, labels, headings, options, and code is left alone.

const SKIP = new Set(['a', 'button', 'label', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'option', 'select', 'textarea', 'script', 'style', 'code', 'summary', 'title', 'dt', 'th']);
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const attr = (s) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');

/**
 * @param {string} markup the page's main content @param {any[]} entries the terms to mark, in priority order
 * @returns {{markup: string, marked: string[]}}
 */
export function markFirstUse(markup, entries) {
  const pending = entries.map((e) => ({ e, re: new RegExp(`(^|[^\\p{L}\\p{N}-])(${[e.term, ...e.aliases].sort((a, b) => b.length - a.length).map(esc).join('|')})(?![\\p{L}\\p{N}-])`, 'iu') }));
  const marked = [];
  const stack = [];
  const out = markup.replace(/(<[^>]+>)|([^<]+)/g, (m, tag, text) => {
    if (tag) {
      const name = /^<\/?\s*([a-z0-9]+)/i.exec(tag)?.[1]?.toLowerCase();
      if (name && SKIP.has(name) && !tag.endsWith('/>')) {
        if (tag.startsWith('</')) { const i = stack.lastIndexOf(name); if (i >= 0) stack.splice(i, 1); } else stack.push(name);
      }
      return tag;
    }
    if (stack.length || !pending.length) return text;
    let s = text;
    for (let i = 0; i < pending.length; i++) {
      const { e, re } = pending[i];
      const hit = re.exec(s);
      if (!hit) continue;
      const at = hit.index + hit[1].length;
      const word = hit[2];
      const id = `g-${e.id}`;
      s = `${s.slice(0, at)}<span class="glossary-term"><a href="/learn/glossary/#${e.id}" aria-describedby="${id}">${word}</a><span class="glossary-pop" role="tooltip" id="${id}">${attr(e.short)}</span></span>${s.slice(at + word.length)}`;
      marked.push(e.id);
      pending.splice(i--, 1);
      // The inserted markup is not text: stop searching this run so no term lands inside it.
      break;
    }
    return s;
  });
  return { markup: out, marked };
}

/** The markup with every glossary term back to its plain word, for comparing a page's text with its sources. */
export const unmark = (markup) => markup.replace(/<span class="glossary-term"><a href="[^"]*" aria-describedby="[^"]*">([^<]*)<\/a><span class="glossary-pop" role="tooltip" id="[^"]*">[^<]*<\/span><\/span>/g, '$1');
