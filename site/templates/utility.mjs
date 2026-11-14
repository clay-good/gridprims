// One page per electric utility (add-public-grid-data: utility pages): what it
// sells and charges, how reliable it is, what it operates, and its peak.
// Average price appears only for bundled service; delivery-only and
// energy-only revenue per kWh is labeled as not a full price.

import { html } from '../lib/html.mjs';
import { layout } from './layout.mjs';
import { sourceStamp } from '../ui/source-stamp.mjs';
import { lineChart, tableView } from '../lib/chart.mjs';
import { SECTORS } from '../entities/utilities.mjs';
import { plantPath } from './plant.mjs';
import { DESCRIPTION_MAX, titleOr } from '../lib/meta.mjs';

export const utilityPath = (id) => `/utilities/${id}/`;

const whole = (x) => Math.round(x).toLocaleString('en-US');
const cents = (x) => x.toFixed(2);
const mw = (x) => x.toLocaleString('en-US', { maximumFractionDigits: 1 });
const dollars = (thousand) => `$${whole(thousand * 1000)}`;

/** "20% above the state average", or "within 1%" when the two round together. */
export function comparison(price, average, { t }, sector, state) {
  const pct = Math.round(((price - average) / average) * 100);
  const key = pct > 0 ? 'utility.compare.above' : pct < 0 ? 'utility.compare.below' : 'utility.compare.same';
  return t(key, { pct: Math.abs(pct), sector: t(`utility.sectorPlural.${sector}`), average: cents(average), state });
}

/** Price and customers for every year held, each chart with its summary and table. */
function trendSection(u, sources, i18n) {
  const { t } = i18n;
  const years = u.trend;
  if (years.length < 2) return '';
  const kind = years.some((y) => y.bundled !== null) ? 'bundled' : years.some((y) => y.delivery !== null) ? 'delivery' : null;
  const first = years[0].year;
  const last = years.at(-1).year;
  const priced = kind ? years.filter((y) => y[kind] !== null) : [];
  const price = priced.length >= 2 ? lineChart({
    title: t(`utility.trend.price.${kind}`), yUnit: '¢/kWh', xTick: (x) => String(Math.round(x)), width: 640, height: 220,
    summary: t('utility.trend.priceSummary', { from: priced[0].year, to: priced.at(-1).year, start: cents(priced[0][kind]), end: cents(priced.at(-1)[kind]) }),
    series: [{ label: t(`utility.trend.price.${kind}`), x: priced.map((y) => y.year), y: priced.map((y) => y[kind]) }],
  }) : '';
  const customers = lineChart({
    title: t('utility.trend.customers'), yUnit: t('utility.col.customers'), xTick: (x) => String(Math.round(x)), width: 640, height: 220,
    summary: t('utility.trend.customersSummary', { from: first, to: last, start: whole(years[0].customers), end: whole(years.at(-1).customers) }),
    series: [{ label: t('utility.trend.customers'), x: years.map((y) => y.year), y: years.map((y) => y.customers) }],
  });
  return html`<section><h2>${t('utility.trend', { from: first, to: last })}</h2>
${price}${customers}
<details class="panel"><summary>${t('utility.trend.table')}</summary>
${tableView([t('utility.col.year'), kind ? t(`utility.trend.price.${kind}`) : '', t('utility.col.customers')].filter(Boolean),
    years.map((y) => [y.year, ...(kind ? [y[kind] === null ? '' : cents(y[kind])] : []), whole(y.customers)]), t('utility.trend.table'))}
</details>
${sources.history ? sourceStamp(sources.history, sources.history.tables[0], i18n) : ''}
</section>`;
}

/**
 * @param {{utility: any, sources: any, i18n: any, plantHasPage?: (id: number) => boolean}} p
 */
/** The plants a utility operates. Past a dozen the list is longer than the rest of the page, so it folds. */
const PLANT_LIST_FOLD = 12;

function plantList(owned, { t }) {
  const items = html`<ul class="tool-list">${owned.map((p) => html`<li><a href="${plantPath(p.id)}">${p.name}</a> · ${p.state} · ${mw(p.nameplateMw)} MW</li>`)}</ul>`;
  return owned.length <= PLANT_LIST_FOLD
    ? html`<h3>${t('utility.plants')}</h3>${items}`
    : html`<details class="panel"><summary>${t('utility.plantsCount', { count: owned.length })}</summary>${items}</details>`;
}

export function utilityPage({ utility: u, sources, i18n, plantHasPage = () => false, titleName = u.name, extra = '' }) {
  const { t, has } = i18n;
  const fuel = (code) => (has(`fuel.${code}`) ? t(`fuel.${code}`) : code);
  const k = (kind) => u.kinds[kind];
  const bundled = k('bundled');
  const res = bundled && bundled.res.sales > 0 ? { revenue: bundled.res.revenue, sales: bundled.res.sales, price: u.prices.bundled.res } : null;
  const fuels = [...new Set([...Object.keys(u.fuelCapacity), ...Object.keys(u.fuelNet)])].sort((a, b) => (u.fuelCapacity[b] ?? 0) - (u.fuelCapacity[a] ?? 0));
  const owned = u.plants.filter((p) => plantHasPage(p.id));
  const sectorRows = (kind) => SECTORS.filter((s) => k(kind)[s].sales > 0 || k(kind)[s].customers > 0).map((s) => [t(`utility.sector.${s}`), whole(k(kind)[s].customers), whole(k(kind)[s].sales), dollars(k(kind)[s].revenue), u.prices[kind][s] === null ? '' : cents(u.prices[kind][s])]);
  const priceHeader = (kind) => t(kind === 'bundled' ? 'utility.col.price' : `utility.col.perKwh.${kind}`);

  const body = html`<p class="cell-section">${t('utility.kicker', { id: u.id })}</p>
<h1>${u.name}</h1>
<dl class="facts">
  <div><dt>${t('utility.ownership')}</dt><dd>${u.ownership ?? t('plant.unknown')}</dd></div>
  <div><dt>${t('utility.states')}</dt><dd>${u.states.join(', ')}</dd></div>
  <div><dt>${t('utility.customers', { year: u.year })}</dt><dd class="mono">${whole(u.customers)}</dd></div>
  <div><dt>${t('utility.sales', { year: u.year })}</dt><dd class="mono">${whole(u.totalSales)} MWh</dd></div>
  <div><dt>${t('utility.revenue', { year: u.year })}</dt><dd class="mono">${dollars(u.totalRevenue)}</dd></div>
</dl>
${sourceStamp(sources.eia861, sources.eia861.tables[0], i18n)}
${k('bundled')?.res.customers > 0 || k('delivery')?.res.customers > 0 ? html`<section class="panel" data-customer-tools><h2>${t('utility.customerTools', { name: u.name })}</h2>
<ul><li><a href="/tools/household/bill-totals/check/">${t('utility.customerTools.bill')}</a></li>
<li><a href="/tools/household/usage-benchmark/compare/">${t('utility.customerTools.use')}</a></li>
<li><a href="/files/#plans">${t('utility.customerTools.plans')}</a></li></ul></section>` : ''}

<section><h2>${t('utility.charges')}</h2>
${['bundled', 'delivery', 'energy'].filter(k).map((kind) => html`<h3>${t(`utility.kind.${kind}`)}</h3>
${kind === 'bundled' ? '' : html`<p class="warning-chip">${t(`utility.notFullPrice.${kind}`)}</p>`}
${tableView([t('utility.col.sector'), t('utility.col.customers'), t('utility.col.sales'), t('utility.col.revenue'), priceHeader(kind)], sectorRows(kind), t(`utility.kind.${kind}`))}`)}
${res && u.stateAverage?.res ? html`<p data-compare>${comparison(res.price, u.stateAverage.res, i18n, 'res', u.homeState)}</p>` : ''}
${res ? html`<details class="panel"><summary>${t('utility.howWeGotThis')}</summary>
  <p class="mono" data-division>${t('utility.division', { revenue: dollars(res.revenue), kwh: whole(res.sales * 1000), cents: cents(res.price) })}</p>
  <p>${t('utility.priceMethod')}</p></details>` : ''}
</section>

${trendSection(u, sources, i18n)}

<section><h2>${t('utility.peak')}</h2>
${u.peak ? html`<p data-peak>${t('utility.peakValue', { mw: whole(u.peak.mw), year: u.peak.year })}</p>`
    : html`<p data-peak>${t('utility.peakNone')}</p>${u.baPeak ? html`<p>${t('utility.baPeak', { name: u.baPeak.name, mw: whole(u.baPeak.mw), year: u.baPeak.year })}</p>` : ''}`}
${sources.ferc714 ? sourceStamp(sources.ferc714, sources.ferc714.tables[0], i18n) : ''}
</section>

<section><h2>${t('utility.reliability')}</h2>
${u.reliability.length ? tableView([t('utility.col.state'), t('utility.col.standard'), t('utility.col.saidiWith'), t('utility.col.saifiWith'), t('utility.col.saidiWithout'), t('utility.col.saifiWithout')],
    u.reliability.map((r) => [r.state, t(r.ieee ? 'utility.standard.ieee' : 'utility.standard.other'), r.withMed.saidi ?? '', r.withMed.saifi ?? '', r.withoutMed.saidi ?? '', r.withoutMed.saifi ?? '']), t('utility.reliability'))
    : html`<p data-reliability>${t('utility.reliabilityNone', { year: u.year })}</p>`}
<p>${t('utility.reliabilityMethod')}</p>
${u.reliability.some((r) => r.peers) ? html`<h3>${t('utility.peers')}</h3>
${u.reliability.filter((r) => r.peers).map((r) => html`<div data-peers="${r.state}"><p>${r.state}: ${r.peers.status === 'ok' ? r.peers.sentence : r.peers.reason}</p>
${r.peers.status === 'ok' ? [r.peers.widenedNote, r.peers.methodNote, r.peers.coverageNote].filter(Boolean).map((n) => html`<p class="unit-hint">${n}</p>`) : ''}</div>`)}
<p class="unit-hint">${t('utility.peersChoices')} <a href="/reliability/cohorts.csv">${t('utility.peersDownload')}</a></p>` : ''}
</section>

<section><h2>${t('utility.generation')}</h2>
${fuels.length ? html`${tableView([t('utility.col.fuel'), t('utility.col.capacity'), t('utility.col.netGeneration', { year: u.year })],
    fuels.map((f) => [fuel(f), u.fuelCapacity[f] ? `${mw(u.fuelCapacity[f])} MW` : '', u.fuelNet[f] === undefined ? '' : `${whole(u.fuelNet[f])} MWh`]), t('utility.generation'))}
<p>${t('utility.generationScope')}</p>
${owned.length ? plantList(owned, i18n) : ''}`
    : html`<p data-generation>${t(Object.keys(u.kinds).every((x) => x === 'delivery') ? 'utility.deliversOnly' : 'utility.buysAll')}</p>`}
</section>

<section><h2>${t('utility.rates')}</h2>
<p data-rates>${u.rates ? t('utility.ratesCount', { count: u.rates.count, newest: u.rates.newest ? i18n.date(u.rates.newest) : t('plant.unknown') }) : t('utility.ratesNone')}</p>
${sources.urdb && u.rates ? sourceStamp(sources.urdb, sources.urdb.tables[0], i18n) : ''}
</section>
${extra}`;
  // Search snippets lead with the number people look for, the price a home pays, when the record has it.
  const homePrice = u.prices.bundled?.res ?? null;
  const priced = homePrice === null ? null : t('utility.descriptionPriced', { name: u.name, cents: cents(homePrice), year: u.year });
  const description = priced && priced.length <= DESCRIPTION_MAX ? priced : t('utility.description', { name: u.name, states: u.states.join(', ') });
  return layout({ i18n, title: titleOr(t('utility.pageTitle', { name: titleName }), titleName), description, path: utilityPath(u.id), body, section: 'bills', card: 'data' });
}
