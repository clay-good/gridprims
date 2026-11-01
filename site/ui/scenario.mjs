// The scenario model's shared views (add-grid-scenario-model): the screening
// label and omissions, the backtest table with its definitions, candidate
// causes, a scenario's changes read against the backtest's bias, and the copy
// card. The build renders the backtest; the page re-renders it on the device
// before the controls open.

import { html } from '../lib/html.mjs';
import { DISPATCHED } from '../../core/lib/fleet.mjs';
import { OMISSIONS } from '../../core/lib/dispatch.mjs';
import { SCREENING } from '../../core/lib/result-cards.mjs';

export const scenarioPath = (code) => `/scenario/${code.toLowerCase()}/`;
export const SCENARIO_INDEX = '/scenario/';
export const MODELS = [
  ['ReEDS', 'https://github.com/NatLabRockies/ReEDS-2.0'], ['PyPSA-USA', 'https://pypsa-usa.readthedocs.io/'], ['GenX', 'https://github.com/GenXProject/GenX.jl'],
  ['GridPath', 'https://github.com/sylvan-energy/gridpath'], ['Sienna PowerSimulations', 'https://github.com/Sienna-Platform/PowerSimulations.jl'],
];
export const PUBLISHED_MARGINAL = 'https://scenarioviewer.nlr.gov/';

const gwh = (x) => (x / 1000).toLocaleString('en-US', { maximumFractionDigits: 0 });
const whole = (x) => Math.round(x).toLocaleString('en-US');
export const pct = (x) => (x === null || x === undefined ? null : `${x >= 0 ? '+' : '−'}${Math.abs(x * 100).toFixed(1)}%`);
export const share = (x) => `${(x * 100).toFixed(0)}%`;

/** The screening label and the omissions list, on every view. */
export function screeningBlock({ t }) {
  return html`<p class="strip" data-scenario-label>${t('scenario.label')}</p>
<details data-scenario-omissions open><summary>${t('scenario.omitted')}</summary><ul>${OMISSIONS.map((k) => html`<li>${t(`scenario.omit.${k}`)}</li>`)}</ul></details>
<p data-scenario-models>${t('scenario.modelsIntro')} ${MODELS.map(([name, url], i) => html`${i ? ', ' : ''}<a href="${url}">${name}</a>`)}.</p>`;
}

/** The backtest table, its definitions, and the marginal-fuel comparison. */
export function backtestTable(bt, { t }) {
  const row = (label, f, extra = true) => html`<tr><th scope="row">${label}</th><td class="num">${gwh(f.modeled_mwh)}</td><td class="num">${gwh(f.actual_mwh)}</td><td class="num">${gwh(f.modeled_mwh - f.actual_mwh)}</td>
    <td class="num">${pct(f.bias) ?? t('scenario.noPercent')}</td><td class="num">${f.mae === null ? t('scenario.noPercent') : share(f.mae)}</td>${extra ? html`<td class="num">${f.hourly ? `${whole(f.hourly.p10)} to ${whole(f.hourly.p90)}` : ''}</td>` : html`<td></td>`}</tr>`;
  return html`<div class="table-wrap"><table data-backtest>
  <thead><tr><th scope="col">${t('scenario.col.fuel')}</th><th scope="col" class="num">${t('scenario.col.modeled')}</th><th scope="col" class="num">${t('scenario.col.actual')}</th><th scope="col" class="num">${t('scenario.col.difference')}</th><th scope="col" class="num">${t('scenario.col.bias')}</th><th scope="col" class="num">${t('scenario.col.mae')}</th><th scope="col" class="num">${t('scenario.col.hourly')}</th></tr></thead>
  <tbody>${DISPATCHED.map((c) => row(t(`scenario.fuel.${c}`), bt.fuels[c]))}${row(t('scenario.overall'), bt.overall, false)}</tbody>
</table></div>
<p class="sentence" data-backtest-marginal>${bt.marginalMatch === null ? t('scenario.notMarginal') : t('scenario.marginal', { share: share(bt.marginalMatch), hours: whole(bt.marginalCompared) })}</p>
<ul class="unit-hint" data-backtest-definitions><li>${t('scenario.def.bias')}</li><li>${t('scenario.def.mae')}</li><li>${t('scenario.def.marginal')}</li></ul>`;
}

/** Candidate causes, each with its share, and the reference data's own limits. */
export function causesList(region, { t, date }) {
  const c = region.categories;
  return html`<h3>${t('scenario.causes')}</h3><p>${t('scenario.causesIntro')}</p>
<ul data-scenario-causes>${region.causes.map((x) => html`<li data-cause="${x.cause}">${t(`scenario.cause.${x.cause}`, { share: share(x.share) })}</li>`)}</ul>
${c.changed.length ? html`<p data-scenario-categories>${t('scenario.categories', { columns: c.changed.map((x) => x.column.replace('gen_', '')).join(', '), date: date(new Date(Math.min(...c.changed.map((x) => x.from)) * 3_600_000).toISOString().slice(0, 10)) })}</p>` : ''}
${c.gaps.length ? html`<p class="unit-hint">${t('scenario.gaps', { list: c.gaps.map((x) => `${x.column.replace('gen_', '')} (${whole(x.hours)})`).join(', ') })}</p>` : ''}
<p class="unit-hint">${t('scenario.imputed')}</p>`;
}

/** A scenario's changes by fuel beside the backtest bias, and what each may be read as. */
export function changeTable(cmp, { t }) {
  return html`<div class="table-wrap"><table data-scenario-changes>
  <thead><tr><th scope="col">${t('scenario.col.fuel')}</th><th scope="col" class="num">${t('scenario.col.change')}</th><th scope="col" class="num">${t('scenario.col.share')}</th><th scope="col" class="num">${t('scenario.col.bias')}</th><th scope="col">${t('scenario.col.finding')}</th></tr></thead>
  <tbody>${DISPATCHED.map((c) => html`<tr data-fuel="${c}" data-finding="${String(cmp[c].finding)}"><th scope="row">${t(`scenario.fuel.${c}`)}</th><td class="num">${gwh(cmp[c].change_mwh)}</td><td class="num">${pct(cmp[c].share) ?? t('scenario.noPercent')}</td><td class="num">${pct(cmp[c].bias) ?? t('scenario.noPercent')}</td><td>${cmp[c].finding ? t('scenario.finding') : t('scenario.withinError')}</td></tr>`)}</tbody>
</table></div>`;
}

/**
 * The copied text: the change, the backtest error for the same hours, the omissions, and the label.
 * @param {{region: any, cmp: any, edits: string[], co2: string, bt: any}} p @param {{t: Function}} i18n
 */
export function scenarioCard({ region, cmp, edits, co2, bt }, { t }) {
  return [
    `${t('scenario.pageTitle', { name: region.name })} ${t('scenario.copyLabel')}`,
    ...edits,
    ...DISPATCHED.filter((c) => bt.fuels[c].actual_mwh > 0 || cmp[c].change_mwh).map((c) => `${t(`scenario.fuel.${c}`)}: ${gwh(cmp[c].change_mwh)} GWh (${pct(cmp[c].share) ?? t('scenario.noPercent')} of recorded); the backtest's mean bias for the same hours is ${pct(bt.fuels[c].bias) ?? t('scenario.noPercent')}. ${cmp[c].finding ? t('scenario.finding') : t('scenario.withinError')}.`),
    co2,
    t('scenario.shares', { plant: share(region.summary.plant_rate_share), group: share(region.summary.derived_share), substituted: share(region.summary.substituted_share) }),
    `${t('scenario.omitted')}: ${OMISSIONS.map((k) => t(`scenario.omit.${k}`)).join(' ')}`,
    `${t('scenario.models')}: ${MODELS.map(([name, url]) => `${name} ${url}`).join(', ')}`,
    t('scenario.label'),
    SCREENING,
    `Sources: U.S. Energy Information Administration, Forms EIA-860 (${region.versions['eia-860']}), EIA-923 (${region.versions['eia-923']}), and EIA-930 (${region.versions['eia-930']}).`,
    `gridprims.com${scenarioPath(region.ba)}`,
  ].join('\n');
}
