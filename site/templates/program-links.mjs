// The program links index (add-program-fact-pages: program links): every
// outside tool, map, dataset, and rule we link to instead of rebuilding,
// grouped by the question it answers, with who maintains it, what it covers,
// what it costs, why we link, and when we last checked it. An entry 12 months
// past its check shows "needs review", judged on the visitor's device so a
// stalled build cannot hide it.

import { html } from '../lib/html.mjs';
import { layout } from './layout.mjs';
import { pageTitle } from '../lib/meta.mjs';

export const LINKS_PATH = '/learn/links/';
export const REVIEW_MONTHS = 12;

/** The day an entry's check is 12 months old. */
export const reviewFrom = (iso) => {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCFullYear(d.getUTCFullYear() + 1);
  return d.toISOString().slice(0, 10);
};

/** @param {{links: any[], questions: Array<{id: string, title: string}>, i18n: any}} p */
export function programLinksPage({ links, questions, i18n }) {
  const { t, date } = i18n;
  const entry = (l) => html`<li class="panel" id="${l.id}" data-link-entry="${l.id}">
  <h3><a href="${l.url}">${l.name}</a> <span class="warning-chip" data-late-from="${reviewFrom(l.lastChecked)}" hidden>${t('links.needsReview')}</span></h3>
  <dl>
    <div><dt>${t('links.maintainer')}</dt><dd>${l.maintainer}</dd></div>
    <div><dt>${t('links.covers')}</dt><dd>${l.covers}</dd></div>
    <div><dt>${t('links.cost')}</dt><dd>${t(`links.cost.${l.cost}`)}${l.costNote ? ` ${l.costNote}` : ''}</dd></div>
    <div><dt>${t('links.why')}</dt><dd>${l.why}</dd></div>
  </dl>
  ${l.notes ? html`<p>${l.notes}</p>` : ''}
  <p class="unit-hint">${t(l.checkedBy === 'blocked' ? 'links.checkedBlocked' : 'links.checked', { date: date(l.lastChecked) })}</p>
</li>`;
  const body = html`<h1>${t('links.title')}</h1>
<p class="purpose">${t('links.intro')}</p>
<p>${t('links.noEndorsement')} <a href="${LINKS_PATH}links.json">${t('links.download')}</a></p>
${questions.filter((q) => links.some((l) => l.question === q.id)).map((q) => html`<section><h2 id="${q.id}">${q.title}</h2>
<ul class="link-list">${links.filter((l) => l.question === q.id).map(entry)}</ul></section>`)}`;
  return layout({ i18n, title: pageTitle(t('links.title')), description: t('links.intro'), path: LINKS_PATH, body, section: 'learn' });
}
