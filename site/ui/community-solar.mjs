// The community solar section of state pages: projects serving customers and
// their capacity, by who markets the subscriptions, with the capacity in
// queue shown apart as market tracking. No provider, savings, or signup.

import { html } from '../lib/html.mjs';
import { tableView } from '../lib/chart.mjs';

const mw = (x) => x.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 });

/** @param {{data: any, manifest: any, i18n: any, stateName: string}} p */
export function communitySolarSection({ data, manifest, i18n, stateName }) {
  const { t } = i18n;
  const o = data.operating;
  const snapshot = manifest.release ?? manifest.version;
  return html`<section data-community-solar><h2>${t('cs.title')}</h2>
${o.projects ? html`<p class="sentence" data-cs-operating>${t('cs.operating', { name: stateName, projects: o.projects.toLocaleString('en-US'), mw: mw(o.mw), snapshot })}</p>
${tableView([t('cs.col.marketer'), t('cs.col.projects'), t('cs.col.mw')], o.byMarketer.map((r) => [r.marketer, r.projects.toLocaleString('en-US'), mw(r.mw_ac)]), t('cs.caption', { name: stateName, snapshot }))}`
    : html`<p data-cs-none>${t('cs.none', { name: stateName, snapshot })}</p>`}
${data.queueMw ? html`<h3>${t('cs.queueTitle')}</h3><p data-cs-queue>${t('cs.queue', { mw: mw(data.queueMw), snapshot })}</p><p class="unit-hint">${t('cs.queueNote')}</p>` : ''}
<p class="unit-hint">${t('cs.derived')} <a href="/data/${manifest.dataset}/">${t('cs.datasetLink')}</a></p>
<p class="unit-hint" data-cs-credit>${manifest.attribution}</p>
</section>`;
}
