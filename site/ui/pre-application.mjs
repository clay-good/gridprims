// The pre-application report on the fast-track screens tool's page (add-interconnection-screens 5.1 and 5.2):
// its fee, deadline, what to send, what comes back and which screens each item informs, and the jurisdictions
// whose rules provide no such report.

import { html } from '../lib/html.mjs';
import REPORTS from '../../data/curated/pre-application/_index.mjs';
import { MODEL_ONLY, whatTheFeeBuys } from '../../core/lib/pre-application.mjs';

const cite = (f) => f.sources.filter((s) => !s.unreachable).map((s) => html`<a href="${s.url}">${s.locator}</a>, ${s.vintage}`);

/** @param {{t: Function}} i18n */
export function preApplicationPanel({ t }) {
  const fed = REPORTS.find((r) => r.jurisdiction === 'federal');
  const none = REPORTS.filter((r) => r.none);
  return html`<section class="panel" data-pre-application aria-labelledby="pre-application-title">
  <h2 id="pre-application-title">${t('preapp.title')}</h2>
  <p data-preapp-terms>${t('preapp.terms', { fee: fed.fields.fee.value, days: fed.fields.days.value })} <span class="unit-hint">${cite(fed.fields.fee)}</span></p>
  <p>${fed.fields.notAStudy.value}. <span class="unit-hint">${cite(fed.fields.notAStudy)}</span></p>
  <h3>${t('preapp.supply')}</h3>
  <ol>${fed.fields.supply.value.map((x) => html`<li>${x}</li>`)}</ol>
  <div class="table-wrap"><table data-preapp-items>
    <caption>${t('preapp.items')}</caption>
    <thead><tr><th scope="col">${t('preapp.col.item')}</th><th scope="col">${t('preapp.col.informs')}</th></tr></thead>
    <tbody>${whatTheFeeBuys(fed.fields.items.value).map((i) => html`<tr data-item="${i.n}"><th scope="row">§ ${i.n} ${i.text}</th><td>${i.settles.length ? i.settles.map((s) => (s === 'eligibility' ? t('preapp.eligibility') : `§ ${s}`)).join(', ') : t('preapp.context')}</td></tr>`)}</tbody>
  </table></div>
  <p class="unit-hint">${t('preapp.mapping')}</p>
  <p data-preapp-model>${t('preapp.model', { screens: MODEL_ONLY.map((s) => `§ ${s}`).join(', ') })}</p>
  ${none.map((r) => html`<p data-preapp-none="${r.jurisdiction}"><strong>${r.jurisdiction}:</strong> ${r.fields.requestPath.value} <span class="unit-hint">${cite(r.fields.requestPath)}</span></p>`)}
</section>`;
}
