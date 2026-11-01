// The large-load terms page (add-large-load-screen: tariff terms): every entry
// with each field's value or "Not public", its citations and archived copies,
// any unreachable second source, and its freshness; filters and a side-by-side
// comparison of up to four, run on the device; and the downloads.

import { html } from '../lib/html.mjs';
import { layout } from './layout.mjs';
import { pageTitle } from '../lib/meta.mjs';
import { toolPath } from '../ui/tool-page.mjs';
import { TERM_FIELDS } from '../entities/large-load-terms.mjs';

export const TERMS_PATH = '/large-load/terms/';

/** @param {{data: any, i18n: any}} p */
export function largeLoadTermsPage({ data, i18n }) {
  const { t, date } = i18n;
  const states = [...new Set(data.entries.map((e) => e.state))].sort();
  const statuses = [...new Set(data.entries.map((e) => e.fields.status.value).filter(Boolean))].sort();
  const cell = (f) => (f.value === null ? html`<span class="unit-hint" data-not-public>${t('llterms.notPublic')}</span>` : html`${f.value}${f.label ? html` <span class="warning-chip" data-single-source>${f.label.split(':')[0]}</span>` : ''}
    <details><summary>${t('llterms.sources')}</summary><ul>${f.citations.map((c) => html`<li><a href="${c.url}">${c.publisher}</a>${c.locator ? `, ${c.locator}` : ''} (<a href="${c.archive}">${t('llterms.archive')}</a>, <span class="mono">${c.sha256.slice(0, 12)}</span>)</li>`)}${f.unreachable.map((u) => html`<li class="unit-hint">${t('llterms.unreachable', { date: date(u.checked), response: u.response })} <a href="${u.url}">${u.publisher}</a></li>`)}</ul></details>`);
  const entry = (e) => html`<section class="panel" id="${e.id}" data-term-entry="${e.id}" data-state="${e.state}" data-status="${e.fields.status.value ?? ''}" data-threshold-mw="${thresholdMw(e)}">
  <h2>${e.name} <span class="mono">${e.state}</span> <span class="unit-hint">${t(`llterms.entry.${e.type}`)}</span>${e.needsReview ? html` <span class="warning-chip" data-needs-review>${t('llterms.needsReview')}</span>` : ''}</h2>
  <p><label><input type="checkbox" data-compare value="${e.id}"> ${t('llterms.compare')}</label></p>
  <dl>${TERM_FIELDS.map((k) => html`<dt>${t(`llterms.field.${k}`)}</dt><dd data-field="${k}">${cell(e.fields[k])}</dd>`)}</dl>
  <p class="unit-hint">${t('llterms.checked', { date: date(e.lastChecked) })}${e.prefill ? html` <a href="${toolPath('grid.large-load.take-or-pay')}">${t('llterms.calculator')}</a>` : ''}</p>
</section>`;
  const body = html`<h1>${t('llterms.title')}</h1>
<p class="sentence">${t('llterms.intro', { utilities: data.utilities, rules: data.rules })}</p>
<p>${t('llterms.whoPays')}</p>
<p class="strip">${t('llterms.facts')}</p>
<section class="panel" data-terms-filters><h2>${t('llterms.filters')}</h2>
  <div class="picker-row">
    <div class="field"><label for="terms-state">${t('llterms.state')}</label><select id="terms-state" name="state"><option value="">${t('llterms.any')}</option>${states.map((s) => html`<option value="${s}">${s}</option>`)}</select></div>
    <div class="field"><label for="terms-status">${t('llterms.status')}</label><select id="terms-status" name="status"><option value="">${t('llterms.any')}</option>${statuses.map((s) => html`<option value="${s}">${s}</option>`)}</select></div>
    <div class="field"><label for="terms-threshold">${t('llterms.thresholdMax')}</label><input id="terms-threshold" name="threshold" inputmode="decimal" class="mono"></div>
  </div>
  <p class="unit-hint">${t('llterms.compareHint')}</p>
  <p data-terms-shown aria-live="polite"></p>
  <div data-terms-compare aria-live="polite"></div>
</section>
${data.entries.map(entry)}
<p><a href="${TERMS_PATH}terms.csv" download>${t('llterms.download')}</a> <a href="${TERMS_PATH}terms.json">${t('llterms.downloadJson')}</a></p>
<p class="unit-hint">${t('llterms.further')}</p>`;
  return layout({ i18n, title: pageTitle(t('llterms.title')), description: t('llterms.description'), path: TERMS_PATH, body, section: 'grid', modules: ['/site/pages/large-load-terms.js'] });
}

/** The smallest MW figure in an entry's threshold, for the filter; blank when none is stated. */
export function thresholdMw(e) {
  const v = e.fields.threshold.value;
  if (!v) return '';
  const m = [...v.matchAll(/(\d[\d,]*(?:\.\d+)?)\s*(kW|MW)/g)].map((x) => Number(x[1].replace(/,/g, '')) / (x[2] === 'kW' ? 1000 : 1));
  return m.length ? String(Math.min(...m)) : '';
}
