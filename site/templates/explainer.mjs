// A Learn explainer page (add-learn-and-data-guides: guides): a short summary,
// sections of at most 300 words, a "Try it" link, every generated number's
// source, every hand-typed number's citation and date, and the last-reviewed
// date with a "Needs review" chip a year on, judged on the visitor's device.

import { html } from '../lib/html.mjs';
import { layout } from './layout.mjs';
import { pageTitle } from '../lib/meta.mjs';

export const explainerPath = (id) => `/learn/${id}/`;
const yearOn = (iso) => { const d = new Date(`${iso}T00:00:00Z`); d.setUTCFullYear(d.getUTCFullYear() + 1); return d.toISOString().slice(0, 10); };

/** @param {{explainer: any, resolved: ReturnType<typeof import('../entities/explainers.mjs').resolveExplainer>, i18n: any}} p */
export function explainerPage({ explainer: e, resolved: r, i18n }) {
  const { t, date } = i18n;
  const body = html`<article data-explainer="${e.id}">
<h1>${e.title}</h1>
<p class="purpose" data-summary>${r.summary}</p>
<p class="unit-hint">${t('explainer.reviewed', { date: date(e.reviewed) })} <span class="warning-chip" data-late-from="${yearOn(e.reviewed)}" hidden>${t('explainer.needsReview', { date: date(e.reviewed) })}</span></p>
${r.sections.map((s) => html`<section><h2>${s.heading}</h2>${s.paragraphs.map((p) => html`<p>${p}</p>`)}</section>`)}
<p><a class="button primary" href="${r.tryIt.href}" data-try-it>${t('explainer.tryIt')}: ${r.tryIt.label}</a></p>
<section><h2>${t('explainer.sources')}</h2><ul data-explainer-sources>
${r.sources.map((s) => html`<li>${s.display}: ${s.source}.</li>`)}
${e.cited.map((c) => html`<li>${c.text}: ${c.example ? t('explainer.example') : t('explainer.cited', { source: c.source, date: date(c.date) })}</li>`)}
</ul></section>
</article>`;
  return layout({ i18n, title: pageTitle(e.title), description: r.summary, path: explainerPath(e.id), body, section: 'learn' });
}
