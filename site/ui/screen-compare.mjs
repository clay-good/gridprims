// The same screen across the federal procedures and each state we hold, side by side on the fast-track screens
// tool's page (add-interconnection-screens 3.6), from the curated records with every threshold cited.

import { html } from '../lib/html.mjs';
import RECORDS from '../../data/curated/interconnect/_index.mjs';
import { compareScreens, reviewDue } from '../../core/lib/screen-compare.mjs';

/** @param {{t: Function, date: Function}} i18n */
export function comparePanel({ t, date }) {
  return html`<section class="panel" data-screen-compare aria-labelledby="compare-title">
  <h2 id="compare-title">${t('compare.title')}</h2>
  <p>${t('compare.intro')}</p>
  <p>${t('compare.download')} <a href="/interconnect/screens.csv" download>${t('compare.csv')}</a> · <a href="/interconnect/screens.json" download>${t('compare.json')}</a></p>
  ${compareScreens(RECORDS).map((f) => html`<div class="table-wrap"><table data-family="${f.family}">
    <caption>${t(`compare.family.${f.family}`)}</caption>
    <thead><tr><th scope="col">${t('compare.col.where')}</th><th scope="col">${t('compare.col.threshold')}</th><th scope="col">${t('compare.col.versus')}</th></tr></thead>
    <tbody>${f.rows.map((r) => html`<tr data-row="${r.id}">
      <th scope="row">${r.jurisdiction === 'federal' ? t('compare.federal') : r.jurisdiction}<br><span class="unit-hint">${r.screen}</span></th>
      <td>${r.threshold}<ul class="unit-hint">${r.cites.map((c) => html`<li><a href="${c.url}">${c.publisher}</a>, ${c.locator}, ${c.vintage}</li>`)}${r.unreachable.map((u) => html`<li>${t('compare.unreachable', { publisher: u.publisher, date: date(u.checked) })}</li>`)}</ul></td>
      <td>${t(`compare.versus.${r.versusFederal}`)}<br><span class="unit-hint">${t('compare.checked', { date: date(r.lastChecked) })}</span> <span class="warning-chip" data-late-from="${reviewDue(r.lastChecked)}" hidden>${t('compare.review')}</span></td>
    </tr>`)}</tbody>
  </table></div>`)}
</section>`;
}
