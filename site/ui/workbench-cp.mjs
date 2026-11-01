// The workbench's coincident-peak panel (add-load-and-bill-analyzer:
// coincident-peak): pick a program and a year, see the load in each system
// peak interval and the resulting tag, and, with a rate, what it costs and what
// a reduction would save. ERCOT's intervals ship with the site; other
// operators' are entered from the operator's own list.

import { html } from '../lib/html.mjs';
import { formatNumber } from '../../core/lib/precision.mjs';
import { PROGRAMS } from '../../core/lib/coincident-peak.mjs';
import { reviewChip } from './workbench-review.mjs';

const num = (x) => formatNumber(x, { sigFigs: 4 });
const money = (x) => `$${x.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/** The panel's form. @param {{t: Function}} i18n @param {Set<string>} [reviewed] */
export function cpPanel({ t }, reviewed = new Set()) {
  return html`<section class="panel picker" id="peaks" data-cp aria-labelledby="cp-title">
  <h2 id="cp-title">${t('cp.title')} ${reviewChip('load.coincident-peak', reviewed, { t })}</h2>
  <p>${t('cp.intro')}</p>
  <form class="picker-row" data-cp-form novalidate>
    <div class="field"><label for="cp-program">${t('cp.program')}</label><select id="cp-program" name="program">${PROGRAMS.map((p) => html`<option value="${p.id}">${p.name}</option>`)}</select></div>
    <div class="field"><label for="cp-year">${t('cp.year')}</label><select id="cp-year" name="year"></select></div>
    <div class="field"><label for="cp-rate">${t('cp.rate')}</label><input id="cp-rate" name="rate" class="mono" inputmode="decimal" autocomplete="off"></div>
    <div class="field" data-cp-capacity hidden><label for="cp-scaling">${t('cp.scaling')}</label><input id="cp-scaling" name="scaling" class="mono" inputmode="decimal" autocomplete="off" value="1"></div>
    <div class="field"><label for="cp-reduction">${t('cp.reduction')}</label><input id="cp-reduction" name="reduction" class="mono" inputmode="decimal" autocomplete="off" value="100"></div>
    <div data-cp-stamps class="picker-row"></div>
    <button class="button" type="submit">${t('cp.run')}</button>
  </form>
  <div data-cp-result aria-live="polite"></div>
</section>`;
}

/** Date and hour fields for a program whose peaks the user enters. */
export function stampFields(p, { t }) {
  return html`<p class="unit-hint">${t('cp.enter', { count: p.peaks, label: p.label })} <a href="${p.listUrl}">${t('cp.list')}</a></p>
  ${Array.from({ length: p.peaks }, (_, i) => html`<div class="field"><label for="cp-date-${i}">${t('cp.peakN', { n: i + 1 })}</label><input id="cp-date-${i}" name="date-${i}" type="date"><input name="time-${i}" class="mono" placeholder="17:00" aria-label="${t('cp.peakTime', { n: i + 1 })}" autocomplete="off"></div>`)}`;
}

/**
 * @param {any} p the program
 * @param {any} e from exposure()
 * @param {any} cost from peakCost(), or null without a rate
 * @param {{t: Function}} i18n
 * @param {{when: (ms: number) => string, source?: string, note?: string, reductionKw?: number}} opts
 */
export function renderCp(p, e, cost, { t }, { when, source, note, reductionKw }) {
  if (e.status === 'refused') return html`<p class="errors">${e.reason}</p>`;
  if (e.status === 'not-posted') return html`<p>${t('cp.notPosted', { name: p.name, year: e.year })}</p>`;
  if (e.status === 'date-only') return html`<p class="warning-chip">${t('cp.dateOnly', { flag: e.flag })}</p><ul>${e.dates.map((d) => html`<li>${d}</li>`)}</ul>`;
  return html`<p class="unit-hint">${t('cp.rule', { name: p.name, count: p.peaks, minutes: p.minutes, label: p.label, source: p.source })}</p>
  ${e.approximate ? html`<p class="strip">${e.approximate}</p>` : ''}
  <table data-cp-intervals><thead><tr><th scope="col">${t('cp.interval')}</th><th scope="col" class="num">${t('cp.load')}</th></tr></thead>
  <tbody>${e.intervals.map((i) => html`<tr><td>${when(i.startMs)} – ${when(i.endMs)}</td><td class="num">${i.kw === null ? t('cp.noData') : `${num(i.kw)} kW`}</td></tr>`)}</tbody></table>
  <p class="number" data-cp-average>${e.averageKw === null ? '–' : `${num(e.averageKw)} kW`}</p>
  <p class="sentence">${e.averageKw === null ? t('cp.incomplete') : t(p.peaks > 1 ? 'cp.averageLine' : 'cp.tagLine', { kw: num(e.averageKw), name: p.name })}</p>
  ${cost?.annual !== null && cost?.annual !== undefined ? html`<p data-cp-cost>${t('cp.cost', { annual: money(cost.annual), applies: cost.applies })}${cost.savings !== null ? ` ${t('cp.savings', { savings: money(cost.savings), kw: reductionKw })}` : ''}</p>` : html`<p class="unit-hint">${t('cp.needRate')}</p>`}
  ${note ? html`<p class="unit-hint">${note}</p>` : ''}
  ${source ? html`<p class="unit-hint">${t('report.sources', { list: source })}</p>` : ''}`;
}
