// The hosting-capacity directory page (add-interconnection-screens 5.3 and 5.4; interconnect/feeder-data-paths):
// what a map figure is and is not, stated before any link; the federal atlas with its date and condition; and
// per utility, whether a map exists, whether its data downloads, whether it publishes per-feeder minimum load
// and how to find a feeder's figure, what its terms say about reuse, and when we last checked, with a "needs
// review" chip a year after. Links only: no value from any map is on the page.

import { html } from '../lib/html.mjs';
import { layout } from './layout.mjs';
import { pageTitle } from '../lib/meta.mjs';
import { reviewFrom } from './program-links.mjs';

export const HC_PATH = '/interconnect/hosting-capacity/';

/** @param {{entries: any[], atlas: any, i18n: any}} p */
export function hostingCapacityPage({ entries, atlas, i18n }) {
  const { t, date } = i18n;
  const minimum = entries.filter((e) => e.minimumLoad);
  const row = (e) => html`<tr id="${e.id}" data-hc-entry="${e.id}" data-access="${e.access}">
  <th scope="row">${e.url ? html`<a href="${e.url}">${e.utility}</a>` : e.utility}${e.mapUrl ? html`<br><a class="unit-hint" href="${e.mapUrl}">${t('hc.openMap')}</a>` : ''}</th>
  <td>${e.states.join(', ')}</td>
  <td>${t(`hc.access.${e.access}`)}</td>
  <td>${e.minimumLoad ? html`<span data-minimum-load>${t('hc.minimumYes')}</span> ${e.minimumLoad.how}` : t('hc.minimumNo')}</td>
  <td>${e.reuse ?? ''}</td>
  <td>${e.note ?? ''}</td>
  <td>${date(e.lastChecked)} <span class="warning-chip" data-late-from="${reviewFrom(e.lastChecked)}" hidden>${t('hc.needsReview', { date: date(e.lastChecked) })}</span></td>
</tr>`;
  const body = html`<h1>${t('hc.title')}</h1>
<p class="purpose">${t('hc.intro')}</p>
<div class="strip" data-hc-caveat><p>${t('hc.caveatLead')}</p><ul><li>${t('hc.caveat.estimate')}</li><li>${t('hc.caveat.reservation')}</li><li>${t('hc.caveat.changes')}</li></ul></div>
<p data-hc-atlas>${t('hc.atlas', { updated: date(atlas.updated), checked: date(atlas.lastChecked) })} <a href="${atlas.url}">${atlas.title}</a>. ${atlas.note}</p>
<h2 id="minimum-load">${t('hc.minimumTitle')}</h2>
<p>${t('hc.minimumIntro', { n: minimum.length })}</p>
<ul>${minimum.map((e) => html`<li><a href="#${e.id}">${e.utility}</a>: ${e.minimumLoad.how}</li>`)}</ul>
<h2 id="directory">${t('hc.directory')}</h2>
<div class="table-wrap"><table data-hc-table><caption>${t('hc.caption')}</caption>
<thead><tr><th scope="col">${t('hc.col.utility')}</th><th scope="col">${t('hc.col.states')}</th><th scope="col">${t('hc.col.access')}</th><th scope="col">${t('hc.col.minimum')}</th><th scope="col">${t('hc.col.reuse')}</th><th scope="col">${t('hc.col.note')}</th><th scope="col">${t('hc.col.checked')}</th></tr></thead>
<tbody>${entries.map(row)}</tbody>
</table></div>
<p class="unit-hint">${t('hc.linksOnly')}</p>`;
  return layout({ i18n, title: pageTitle(t('hc.title')), description: t('hc.description'), path: HC_PATH, body, section: 'grid' });
}
