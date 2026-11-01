// The qualifying-facility checklist page (add-program-fact-pages: qualifying
// facility): what the federal rules say, each statement cited by section with
// the date we checked it. No input, no calculator, and no determination.

import { html } from '../lib/html.mjs';
import { layout } from './layout.mjs';
import { pageTitle } from '../lib/meta.mjs';

export const QF_PATH = '/learn/qualifying-facility/';

/** @param {{checklist: any, i18n: any}} p */
export function qualifyingFacilityPage({ checklist: c, i18n }) {
  const { t, date } = i18n;
  const body = html`<p class="cell-section">${t('qf.kicker')}</p>
<h1>${t('qf.title')}</h1>
<p class="purpose">${t('qf.intro')}</p>
<p class="strip" data-qf-decides>${t('qf.decides')}</p>
${c.groups.map((g) => html`<section><h2>${g.heading}</h2><ul>${g.items.map((x) => html`<li data-qf-exemption="${x.exemption ? 'yes' : 'no'}">${x.text} <a href="${x.cite.url}">${x.cite.section}</a></li>`)}</ul></section>`)}
<section><h2>${t('qf.formTitle')}</h2><p>${t('qf.form')} <a href="${c.form.url}">${c.form.name}</a></p></section>
<p class="unit-hint" data-qf-checked>${t('qf.checked', { date: date(c.checked) })}</p>`;
  return layout({ i18n, title: pageTitle(t('qf.title')), description: t('qf.description'), path: QF_PATH, body, section: 'learn' });
}
