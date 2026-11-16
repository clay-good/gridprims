// The screen thresholds people misquote, on the fast-track screens tool's page (add-interconnection-screens
// 1.4): what is commonly said, what the rule contains, and the rule and vintage read for each.

import { html } from '../lib/html.mjs';
import MISQUOTES from '../../data/curated/screen-misquotes.mjs';

/** @param {{t: Function}} i18n */
export function misquotesPanel({ t }) {
  return html`<section class="panel" data-misquotes aria-labelledby="misquotes-title">
  <h2 id="misquotes-title">${t('misquotes.title')}</h2>
  <p>${t('misquotes.intro')}</p>
  ${MISQUOTES.map((m) => html`<div data-misquote="${m.id}">
    <p><strong>${t('misquotes.said')}</strong> ${m.said}</p>
    <p><strong>${t('misquotes.actual')}</strong> ${m.actual}</p>
    <ul class="unit-hint">${m.cites.map((c) => html`<li><a href="${c.url}">${c.rule}</a>, ${c.vintage}</li>`)}</ul>
  </div>`)}
</section>`;
}
