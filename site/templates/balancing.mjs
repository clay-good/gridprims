// Balancing authority pages (add-public-grid-data: region pages): the latest
// 13 months of daily peak demand and energy, monthly generation by fuel and
// net interchange, the record peak in our data with the period searched, the
// utilities and plants in the region, and links to the hourly dataset and the
// region's cleanest hours. Built from daily and monthly rollups of the
// EIA-930 hourly snapshot.

import { html } from '../lib/html.mjs';
import { layout } from './layout.mjs';
import { sourceStamp } from '../ui/source-stamp.mjs';
import { lineChart, tableView } from '../lib/chart.mjs';
import { utilityPath } from './utility.mjs';
import { plantPath } from './plant.mjs';
import { pageTitle } from '../lib/meta.mjs';
import { toolPath } from '../ui/tool-page.mjs';
import { FUELS } from '../../core/lib/grid-rollups.mjs';
import { COMPARISON_PATH, worstHours } from '../entities/estimated-vs-measured.mjs';

export const balancingPath = (code) => `/balancing-authorities/${code.toLowerCase()}/`;

const whole = (x) => Math.round(x).toLocaleString('en-US');
const gwh = (x) => (x / 1000).toLocaleString('en-US', { maximumFractionDigits: 1, minimumFractionDigits: 1 });
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const longDate = (iso) => `${MONTHS[Number(iso.slice(5, 7)) - 1]} ${Number(iso.slice(8, 10))}, ${iso.slice(0, 4)}`;
const monthName = (ym) => `${MONTHS[Number(ym.slice(5, 7)) - 1].slice(0, 3)} ${ym.slice(0, 4)}`;

const pct = (x, places = 1) => (x === null || x === undefined || Number.isNaN(x) ? '' : `${(x * 100).toFixed(places)}%`);
const signed = (x) => (x === null || x === undefined ? '' : `${x > 0 ? '+' : ''}${(x * 100).toFixed(1)}%`);
const clockHour = (h) => `${String(h).padStart(2, '0')}:00`;

/**
 * Our estimated hourly carbon against what EPA's monitors measured in this
 * region (add-measured-plant-emissions 3.2): the year's gap, where in the day
 * it runs furthest off, and the months behind it. A year the comparison cannot
 * speak about says so and why.
 */
function comparisonSection(comparison, source, { t, date }, regionName) {
  if (!comparison?.length) return '';
  const latest = comparison[0];
  const hours = worstHours(latest, { count: 3 });
  return html`<section data-estimated-vs-measured><h2 id="estimated-vs-measured">${t('evm.region.title')}</h2>
${comparison.map((c) => html`<p data-comparison-year="${c.year}">${c.informative
    ? t('evm.region.informative', { year: c.year, percent: pct(Math.abs(c.difference)), direction: t(c.difference > 0 ? 'evm.region.more' : 'evm.region.less'), coverage: pct(c.coverage, 0) })
    : t('evm.region.uninformative', { year: c.year, why: t(`evm.not.${c.uninformativeBecause[0]}`, { coverage: pct(c.coverage, 0), floor: pct(c.floor, 0), fuels: c.fuelMismatch.map((f) => t(`evm.fuel.${f}`)).join(', '), r2: (c.fit.r2 ?? 0).toFixed(3), minR2: c.minR2 }) })}</p>`)}
${latest.informative && hours.length ? html`<p data-worst-hours>${t('evm.region.hours', { hours: hours.map((h) => t('evm.region.hour', { hour: clockHour(h.key), percent: signed(h.difference) })).join(', ') })}</p>
<details><summary>${t('evm.region.byMonth', { year: latest.year })}</summary>
${tableView([t('evm.region.month'), t('evm.region.measured'), t('evm.region.estimated'), t('evm.region.gap')],
    latest.byMonth.map((m) => [MONTHS[m.key - 1], whole(m.measured_tonnes), whole(m.estimated_tonnes), signed(m.difference)]), t('evm.region.byMonthCaption', { region: regionName, year: latest.year }))}</details>
<details><summary>${t('evm.region.byHour', { year: latest.year })}</summary>
${tableView([t('evm.region.hourColumn'), t('evm.region.measured'), t('evm.region.estimated'), t('evm.region.gap')],
    latest.byHourOfDay.map((h) => [clockHour(h.key), whole(h.measured_tonnes), whole(h.estimated_tonnes), signed(h.difference)]), t('evm.region.byHourCaption', { region: regionName, year: latest.year }))}</details>` : ''}
<p><a href="${COMPARISON_PATH}">${t('evm.region.link')}</a></p>
${source ? sourceStamp(source, source.tables.find((x) => x.name === 'region_hourly'), { t, date }) : ''}
</section>`;
}

/**
 * @param {{region: any, manifest: any, utilities: any[], plants: any[], i18n: any, comparison?: any[], comparisonSource?: any}} p
 */
export function balancingPage({ region: r, manifest, utilities, plants, i18n, comparison = [], comparisonSource = null }) {
  const { t } = i18n;
  const fuels = FUELS.filter((f) => r.months.some((m) => m.generation[f]));
  const spikes = r.days.reduce((n, d) => n + d.spikes, 0);
  const days = r.days;
  const chart = days.length > 1 && lineChart({
    title: t('ba.chartTitle', { name: r.name }),
    summary: t('ba.chartSummary', { from: longDate(days[0].date), to: longDate(days.at(-1).date), high: whole(Math.max(...days.map((d) => d.peakMw))), low: whole(Math.min(...days.map((d) => d.peakMw))) }),
    yUnit: 'MW',
    series: [{ label: t('ba.dailyPeak'), x: days.map((d) => Date.parse(`${d.date}T00:00:00Z`)), y: days.map((d) => d.peakMw) }],
    xTick: (x) => monthName(new Date(x).toISOString().slice(0, 7)),
  });
  const body = html`<p class="cell-section">${t('ba.kicker', { code: r.ba })}</p>
<h1>${r.name}</h1>
${r.record ? html`<p class="sentence" data-record>${t('ba.record', { mw: whole(r.record.mw), date: longDate(r.record.date), from: longDate(r.record.from), to: longDate(r.record.to) })}</p>` : html`<p>${t('ba.noDemand')}</p>`}
${days.length ? html`<section><h2>${t('ba.daily')}</h2>
${chart || ''}
<details><summary>${t('cleanest.table')}</summary>${tableView([t('ba.col.date'), t('ba.col.peak'), t('ba.col.energy')], days.map((d) => [d.date, whole(d.peakMw), whole(d.energyMwh)]), t('ba.daily'))}</details>
<p class="unit-hint">${t('ba.dayBasis', { zone: r.zone })}${spikes ? ` ${t('ba.spikes', { count: whole(spikes) })}` : ''}</p>
</section>` : ''}
<section><h2>${t('ba.monthly')}</h2>
<div class="table-wrap"><table data-monthly>
  <thead><tr><th scope="col">${t('ba.col.month')}</th>${r.record ? html`<th scope="col" class="num">${t('ba.col.demandGwh')}</th>` : ''}<th scope="col" class="num">${t('ba.col.interchangeGwh')}</th>${fuels.map((f) => html`<th scope="col" class="num">${t(`ba.fuel.${f}`)}</th>`)}</tr></thead>
  <tbody>${r.months.map((m) => html`<tr><th scope="row">${monthName(m.month)}</th>${r.record ? html`<td class="num">${gwh(m.energyMwh)}</td>` : ''}<td class="num">${gwh(m.interchangeMwh)}</td>${fuels.map((f) => html`<td class="num">${m.generation[f] === undefined ? '' : gwh(m.generation[f])}</td>`)}</tr>`)}</tbody>
</table></div>
<p class="unit-hint">${t('ba.monthlyNote')}</p>
${sourceStamp(manifest, manifest.tables[0], i18n)}
</section>
${comparisonSection(comparison, comparisonSource, i18n, r.name)}
<section><h2>${t('ba.inside')}</h2>
${utilities.length ? html`<p>${t('ba.utilities', { count: whole(utilities.length) })}</p><ul>${utilities.map((u) => html`<li><a href="${utilityPath(u.id)}">${u.name}</a></li>`)}</ul>` : html`<p>${t('ba.noUtilities')}</p>`}
${plants.length ? html`<p>${t('ba.plants', { count: whole(plants.length) })}</p><ul>${plants.slice(0, 25).map((p) => html`<li><a href="${plantPath(p.id)}">${p.name}</a>, ${whole(p.nameplateMw)} MW</li>`)}</ul>` : ''}
</section>
<section><h2>${t('ba.more')}</h2>
<ul><li><a href="/data/eia-930/">${t('ba.dataset')}</a></li>${comparison.length ? html`<li><a href="${COMPARISON_PATH}">${t('evm.region.link')}</a></li>` : ''}${r.record && !r.generationOnly ? html`<li><a href="${toolPath('carbon.load-shift.estimate')}?region=${r.ba}">${t('ba.cleanest', { name: r.name })}</a></li>` : ''}</ul>
</section>`;
  return layout({ i18n, title: pageTitle(`${r.name} (${r.ba})`), description: t('ba.description', { name: r.name, code: r.ba }), path: balancingPath(r.ba), body, section: 'grid', card: 'grid' });
}
