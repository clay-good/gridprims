// The glossary page (add-learn-and-data-guides: glossary): every term with its
// one-line definition, longer explanation, unit, worked example, related
// terms, the tools that use it, and its citation, adapted-from-EIA noted.

import { html } from '../lib/html.mjs';
import { layout } from './layout.mjs';
import { pageTitle } from '../lib/meta.mjs';
import { toolPath } from '../ui/tool-page.mjs';

export const GLOSSARY_PATH = '/learn/glossary/';

/** @param {{entries: any[], tools: any[], i18n: any}} p */
export function glossaryPage({ entries, tools, i18n }) {
  const { t } = i18n;
  const byId = new Map(entries.map((e) => [e.id, e]));
  const usedBy = (id) => tools.filter(({ manifest: m }) => (m.glossary ?? []).includes(id)).map(({ manifest: m }) => m);
  const sorted = [...entries].sort((a, b) => a.term.localeCompare(b.term, 'en', { sensitivity: 'base' }));
  const entry = (e) => html`<section class="panel glossary-entry" id="${e.id}" data-glossary-entry="${e.id}">
  <h2>${e.term}</h2>
  <p class="sentence" data-glossary-short>${e.short}</p>
  ${e.aliases.length ? html`<p class="unit-hint">${t('glossary.aliases', { list: e.aliases.join(', ') })}</p>` : ''}
  <p>${e.long}</p>
  <dl>${e.unit ? html`<dt>${t('glossary.unit')}</dt><dd class="mono">${e.unit}</dd>` : ''}<dt>${t('glossary.example')}</dt><dd data-glossary-example>${e.example}</dd>
  ${e.related.length ? html`<dt>${t('glossary.related')}</dt><dd>${e.related.map((r, i) => html`${i ? ', ' : ''}<a href="#${r}">${byId.get(r).term}</a>`)}</dd>` : ''}
  ${usedBy(e.id).length ? html`<dt>${t('glossary.tools')}</dt><dd data-glossary-tools>${usedBy(e.id).map((m, i) => html`${i ? ', ' : ''}<a href="${toolPath(m.id)}">${m.title}</a>`)}</dd>` : ''}
  <dt>${t('glossary.source')}</dt><dd data-glossary-citation><a href="${e.citation.url}">${e.citation.source}</a>, ${e.citation.locator}${e.adapted ? html`<br><span class="unit-hint">${t('glossary.adapted', { from: e.adapted })}</span>` : ''}</dd></dl>
</section>`;
  const body = html`<h1>${t('glossary.title')}</h1>
<p class="purpose">${t('glossary.intro', { count: entries.length })}</p>
<nav aria-label="${t('glossary.title')}"><p>${sorted.map((e, i) => html`${i ? ' · ' : ''}<a href="#${e.id}">${e.term}</a>`)}</p></nav>
${sorted.map(entry)}
<p><a href="${GLOSSARY_PATH}glossary.json">${t('glossary.json')}</a></p>`;
  return layout({ i18n, title: pageTitle(t('glossary.title')), description: t('glossary.description'), path: GLOSSARY_PATH, body, section: 'learn' });
}
