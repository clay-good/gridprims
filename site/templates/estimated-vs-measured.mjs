// Our own estimate's error, published (add-measured-plant-emissions 3.2 and
// 3.5): for every region and year where the comparison can carry it, how far
// EIA's estimated hourly carbon sits from what EPA's monitors measured for the
// same units in the same hours, with the method, the coverage, and the
// downloads. Where the comparison cannot carry it, the page says so and why,
// rather than printing a small percentage.

import { html } from '../lib/html.mjs';
import { layout } from './layout.mjs';
import { pageTitle } from '../lib/meta.mjs';
import { sourceStamp } from '../ui/source-stamp.mjs';
import { COMPARISON_PATH, METHOD } from '../entities/estimated-vs-measured.mjs';
import { balancingPath } from './balancing.mjs';

const whole = (x) => Math.round(x).toLocaleString('en-US');
const pct = (x, places = 1) => (x === null || x === undefined || Number.isNaN(x) ? '' : `${(x * 100).toFixed(places)}%`);
const signed = (x) => (x === null || x === undefined ? '' : `${x > 0 ? '+' : ''}${(x * 100).toFixed(1)}%`);

/** @param {{comparison: any, i18n: any}} p */
export function estimatedVsMeasuredPage({ comparison, i18n }) {
  const { t } = i18n;
  const rows = comparison.rows;
  const informative = rows.filter((r) => r.informative);
  const over = informative.filter((r) => r.difference > 0).length;
  const magnitudes = informative.map((r) => Math.abs(r.difference)).sort((a, b) => a - b);
  const median = magnitudes.length ? magnitudes[Math.floor(magnitudes.length / 2)] : null;
  const camdTable = comparison.sources.camd.tables.find((x) => x.name === 'region_hourly');
  const gridTable = comparison.sources.grid.tables.find((x) => x.name === 'hourly');
  const body = html`<h1>${t('evm.title')}</h1>
<p class="purpose">${t('evm.intro')}</p>
<p class="strip" data-scope>${t('evm.scope')}</p>
${informative.length ? html`<p class="sentence" data-headline>${t('evm.headline', { cases: informative.length, total: rows.length, median: pct(median), over, under: informative.length - over })}</p>` : ''}
<p><a href="${COMPARISON_PATH}comparison.csv" download>${t('evm.downloadCsv')}</a> <a href="${COMPARISON_PATH}comparison.json">${t('evm.downloadJson')}</a> ${t('evm.downloadNote')}</p>

<section><h2 id="published">${t('evm.published')}</h2>
<div class="table-wrap"><table data-comparison><caption>${t('evm.caption')}</caption>
<thead><tr><th scope="col">${t('evm.region')}</th><th scope="col" class="num">${t('evm.year')}</th><th scope="col" class="num">${t('evm.coverage')}</th><th scope="col" class="num">${t('evm.difference')}</th><th scope="col" class="num">${t('evm.differenceTonnes')}</th><th scope="col">${t('evm.reading')}</th></tr></thead>
<tbody>${rows.map((r) => html`<tr data-region="${r.region}" data-year="${r.year}" data-informative="${String(r.informative)}">
<th scope="row"><a href="${balancingPath(r.region)}#estimated-vs-measured">${r.region}</a></th>
<td class="num mono">${r.year}</td>
<td class="num mono">${pct(r.coverage, 0)}</td>
<td class="num mono" data-difference>${r.informative ? signed(r.difference) : ''}</td>
<td class="num mono">${r.informative ? whole(r.differenceTonnes) : ''}</td>
<td>${r.informative ? t(r.difference > 0 ? 'evm.readsHigh' : 'evm.readsLow', { percent: pct(Math.abs(r.difference)) }) : t(`evm.not.${r.uninformativeBecause[0]}`, { coverage: pct(r.coverage, 0), floor: pct(comparison.floor, 0), fuels: r.fuelMismatch.map((f) => t(`evm.fuel.${f}`)).join(', '), r2: (r.fit.r2 ?? 0).toFixed(3), minR2: r.minR2 })}</td>
</tr>`)}</tbody>
</table></div>
<p>${t('evm.floor')}</p>
${sourceStamp(comparison.sources.camd, camdTable, i18n)}
${sourceStamp(comparison.sources.grid, gridTable, i18n)}
</section>

<section><h2 id="method">${t('evm.method')}</h2>
<dl class="facts">
  ${['measurement', 'estimate', 'attribution', 'alignment', 'mapping', 'excluded', 'floor'].map((k) => html`<div><dt>${t(`evm.method.${k}`)}</dt><dd>${METHOD[k]}</dd></div>`)}
</dl>
<p>${t('evm.reproduce')}</p>
</section>`;
  return layout({ i18n, title: pageTitle(t('evm.title')), description: t('evm.description'), path: COMPARISON_PATH, body, section: 'carbon', card: 'data' });
}
