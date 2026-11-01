// State and eGRID subregion pages (add-public-grid-data: region pages).
// Balancing authority pages come with the hourly EIA-930 snapshot.

import { html } from '../lib/html.mjs';
import { layout } from './layout.mjs';
import { sourceStamp } from '../ui/source-stamp.mjs';
import { tableView } from '../lib/chart.mjs';
import { utilityPath } from './utility.mjs';
import { plantPath } from './plant.mjs';
import { pageTitle } from '../lib/meta.mjs';

export const statePath = (code) => `/states/${code.toLowerCase()}/`;
export const subregionPath = (code) => `/subregions/${code.toLowerCase()}/`;

const whole = (x) => Math.round(x).toLocaleString('en-US');
const mw = (x) => x.toLocaleString('en-US', { maximumFractionDigits: 1 });
const pct = (part, total) => (total > 0 ? `${((part / total) * 100).toFixed(1)}%` : '');
const GROUPS = ['investor', 'cooperative', 'public', 'marketer', 'other'];
const QUEUE = ['solar', 'wind', 'storage', 'gas', 'hybrid', 'other'];

/** @param {{state: any, sources: any, i18n: any}} p */
export function statePage({ state: s, sources, i18n, plants = [], extra = '' }) {
  const { t, has } = i18n;
  const fuel = (code) => (has(`fuel.${code}`) ? t(`fuel.${code}`) : code);
  const byValue = (o) => Object.entries(o).filter(([, v]) => v).sort((a, b) => b[1] - a[1]);
  const qTotal = QUEUE.reduce((n, k) => n + (s.queue[k]?.mw ?? 0), 0);
  const body = html`<p class="cell-section">${t('state.kicker')}</p>
<h1>${s.name}</h1>
<section><h2>${t('state.ownership', { year: s.year })}</h2>
${tableView([t('state.col.ownership'), t('utility.col.customers'), t('state.col.share')],
    GROUPS.filter((g) => s.shares[g]).map((g) => [t(`state.group.${g}`), whole(s.shares[g]), pct(s.shares[g], s.customers)]), t('state.ownership', { year: s.year }))}
<p>${t('state.ownershipNote')}</p>
${sourceStamp(sources.eia861, sources.eia861.tables[0], i18n)}
</section>

<section><h2>${t('state.prices', { year: s.year })}</h2>
${tableView([t('utility.col.sector'), t('utility.col.price')], ['res', 'com', 'ind'].filter((k) => s.prices[k] !== null).map((k) => [t(`utility.sector.${k}`), s.prices[k].toFixed(2)]), t('state.prices', { year: s.year }))}
<p>${t('state.priceNote')}</p>
</section>

<section><h2>${t('state.supply')}</h2>
${tableView([t('utility.col.fuel'), t('utility.col.capacity'), t('utility.col.netGeneration', { year: s.year })],
    [...new Set([...Object.keys(s.capacity), ...Object.keys(s.generation)])].sort((a, b) => (s.capacity[b] ?? 0) - (s.capacity[a] ?? 0)).map((f) => [fuel(f), s.capacity[f] ? `${mw(s.capacity[f])} MW` : '', s.generation[f] === undefined ? '' : `${whole(s.generation[f])} MWh`]), t('state.supply'))}
<p>${t('state.bas', { list: s.baCodes.join(', ') || t('plant.unknown') })}</p>
${sources.eia860 ? sourceStamp(sources.eia860, sources.eia860.tables[0], i18n) : ''}
${sources.eia923 ? sourceStamp(sources.eia923, sources.eia923.tables[0], i18n) : ''}
</section>

<section><h2>${t('state.queue')}</h2>
${qTotal ? html`${tableView([t('state.col.type'), t('state.col.activeMw'), t('state.col.projects')], QUEUE.filter((k) => s.queue[k]).map((k) => [t(`state.queueType.${k}`), whole(s.queue[k].mw), whole(s.queue[k].count)]), t('state.queue'))}
<p>${t('state.queueNote')}</p>` : html`<p>${t('state.queueNone')}</p>`}
${sources.queue ? sourceStamp(sources.queue, sources.queue.tables[0], i18n) : ''}
</section>

<section><h2>${t('state.utilities')}</h2>
${tableView([t('state.col.utility'), t('utility.ownership'), t('utility.col.customers'), t('utility.col.sales')],
    s.utilities.map((u) => [u.page ? html`<a href="${utilityPath(u.id)}">${u.name}</a>` : u.name, u.ownership ?? '', whole(u.customers), whole(u.sales)]), t('state.utilities'))}
<p>${t('state.utilitiesNote')}</p>
</section>
${plants.length ? html`<section><h2>${t('state.plants', { count: plants.length.toLocaleString('en-US') })}</h2>
${tableView([t('state.col.plant'), t('queue.col.county'), t('plant.nameplate'), t('plant.operator')],
    [...plants].sort((a, b) => b.nameplateMw - a.nameplateMw || a.name.localeCompare(b.name)).map((p) => [html`<a href="${plantPath(p.id)}">${p.name}</a>`, p.county ?? '', `${mw(p.nameplateMw)} MW`, p.utilityName ?? '']), t('state.plantsCaption', { name: s.name }))}
</section>` : ''}
${extra}`;
  return layout({ i18n, title: pageTitle(t('state.title', { name: s.name })), description: t('state.description', { name: s.name }), path: statePath(s.code), body, section: 'grid', card: 'data' });
}

/** @param {{subregion: any, sources: any, i18n: any}} p */
export function subregionPage({ subregion: r, sources, i18n }) {
  const { t } = i18n;
  const edition = sources.egrid?.release;
  const rate = (x) => (x === null ? t('plant.notReported') : `${whole(x)} lb/MWh`);
  const body = html`<p class="cell-section">${t('subregion.kicker', { code: r.subregion })}</p>
<h1>${r.subregion_name}</h1>
<section><h2>${t('subregion.rates', { year: r.data_year })}</h2>
<dl class="facts">
  <div><dt>${t('subregion.total')}</dt><dd class="mono">${rate(r.co2_rate_lb_mwh)}</dd></div>
  <div><dt>${t('subregion.nonbaseload')}</dt><dd class="mono">${rate(r.nonbaseload_co2_rate_lb_mwh)}</dd></div>
  <div><dt>${t('subregion.totalCo2e')}</dt><dd class="mono">${rate(r.co2e_rate_lb_mwh)}</dd></div>
</dl>
<p data-guidance>${t('subregion.useTotal', { edition })}</p>
<p data-guidance>${t('subregion.useNonbaseload', { edition })}</p>
${sourceStamp(sources.egrid, sources.egrid.tables[0], i18n)}
</section>
<section><h2>${t('subregion.size', { year: r.data_year })}</h2>
<dl class="facts">
  <div><dt>${t('plant.nameplate')}</dt><dd class="mono">${r.nameplate_mw === null ? '' : `${mw(r.nameplate_mw)} MW`}</dd></div>
  <div><dt>${t('plant.netGeneration')}</dt><dd class="mono">${r.net_generation_mwh === null ? '' : `${whole(r.net_generation_mwh)} MWh`}</dd></div>
  <div><dt>${t('subregion.plants')}</dt><dd class="mono">${whole(r.plants)}</dd></div>
</dl>
</section>`;
  return layout({ i18n, title: pageTitle(`${r.subregion_name} (${r.subregion})`), description: t('subregion.description', { name: r.subregion_name, code: r.subregion }), path: subregionPath(r.subregion), body, section: 'carbon', card: 'data' });
}
