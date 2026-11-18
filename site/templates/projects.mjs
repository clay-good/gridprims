// The project pipeline (projects/pipeline-pages): what owners have reported to
// EIA as planned, waiting for approval, approved, being built, and recently
// finished, for the nation and each state. The full list is in the served HTML;
// site/pages/projects.js only narrows rows already on the page.

import { html } from '../lib/html.mjs';
import { pageTitle } from '../lib/meta.mjs';
import { layout } from './layout.mjs';
import { sourceStamp } from '../ui/source-stamp.mjs';
import { STATE_NAMES } from '../entities/regions.mjs';
import { STAGES } from '../../core/lib/project-stages.mjs';
import { NAMES } from '../../pipeline/registry/eia-930.mjs';

export const projectsPath = (st) => (st ? `/projects/${st.toLowerCase()}/` : '/projects/');
export const projectsJsonPath = (st) => `/projects/${st.toLowerCase()}.json`;

/** The filter value of a county EIA left blank or that names no county of the state. */
export const UNCONFIRMED = 'unconfirmed';
/** The filter value of a row with no balancing authority. */
export const NO_BA = 'none';
const SIZES = [20, 100, 500];
const whole = (x) => Math.round(x).toLocaleString('en-US');

const monthFormat = (locale, month) => new Intl.DateTimeFormat(locale, { year: 'numeric', month, timeZone: 'UTC' });
/** @param {string} d YYYY-MM, or YYYY when EIA gives no month */
const monthLabel = (d, locale, style = 'short') => (d.length === 4 ? d : monthFormat(locale, style).format(new Date(`${d}-01T00:00:00Z`)));

function numberTable(headers, rows, caption) {
  return html`<div class="table-wrap"><table>
  <caption>${caption}</caption>
  <thead><tr>${headers.map((h, i) => html`<th scope="col"${i ? html` class="num"` : ''}>${h}</th>`)}</tr></thead>
  <tbody>${rows.map(([name, ...values]) => html`<tr><th scope="row">${name}</th>${values.map((v) => html`<td class="num">${v}</td>`)}</tr>`)}</tbody>
</table></div>`;
}

const stageHeaders = ({ t }) => [t('projects.inProgress'), ...STAGES.map((s) => t(`projects.stage.${s}`))];
const stageValues = (s) => [whole(s.inProgress.mw), ...STAGES.map((k) => whole(s.stages[k].mw))];

function plate(summary, sentence, p, { t, locale }) {
  return html`<div class="answer"><div class="sign">
  <p class="label">${t('projects.inProgress')}</p>
  <p class="number">${whole(summary.inProgress.mw)}<span class="unit">MW</span></p>
  <p class="sentence">${sentence}</p>
  <span class="source-tab">${t('projects.basis', { month: monthLabel(p.period, locale, 'long') })}</span>
</div></div>`;
}

function stageTiles(summary, { t }) {
  return html`<section><h2>${t('projects.byStage')}</h2>
<ol class="stage-tiles">${STAGES.map((s) => {
    const e = summary.stages[s];
    return html`<li class="stage-tile${s === 'finished' ? ' done' : ''}"><h3>${t(`projects.stage.${s}`)}</h3>
  <p class="stage-mw">${whole(e.mw)} MW</p>
  <p class="unit-hint">${t('projects.tileCount', { generators: t('projects.generators', { count: e.generators, shown: whole(e.generators) }), plants: t('projects.plants', { count: e.plants, shown: whole(e.plants) }) })}</p>
  <p class="unit-hint">${t(`projects.stage.${s}.what`)}</p></li>`;
  })}</ol></section>`;
}

const limits = ({ t }) => html`<p class="strip" data-project-limits>${t('projects.limits')}</p>`;
const canceledNote = (c, { t }) => (c.generators ? html`<p class="unit-hint">${t('projects.canceled', { count: c.generators, shown: whole(c.generators), mw: whole(c.mw) })}</p>` : '');

/** @param {{p: any, i18n: any}} a */
export function projectsIndexPage({ p, i18n }) {
  const { t, locale } = i18n;
  const month = monthLabel(p.period, locale, 'long');
  const baName = (b) => (b === null ? t('projects.baNone') : NAMES[b]?.name ? `${NAMES[b].name} (${b})` : b);
  const body = html`<h1>${t('projects.title')}</h1>
<p class="purpose">${t('projects.purpose')}</p>
${plate(p.national, t('projects.national.sentence', { mw: whole(p.national.inProgress.mw), month }), p, i18n)}
${limits(i18n)}
${stageTiles(p.national, i18n)}
${canceledNote(p.canceled, i18n)}
<section><h2>${t('projects.byState')}</h2>
${numberTable([t('utility.col.state'), ...stageHeaders(i18n)], p.states.map((s) => [html`<a href="${projectsPath(s.state)}">${STATE_NAMES[s.state] ?? s.state}</a>`, ...stageValues(s.summary)]), t('projects.tableCaption', { place: t('projects.byState'), month }))}</section>
<section><h2>${t('projects.byBa')}</h2>
${numberTable([t('projects.col.ba'), ...stageHeaders(i18n)], p.bas.map((b) => [baName(b.ba), ...stageValues(b.summary)]), t('projects.tableCaption', { place: t('projects.byBa'), month }))}</section>
${sourceStamp(p.manifest, p.table, i18n)}`;
  return layout({ i18n, title: pageTitle(t('projects.title')), description: t('projects.description'), path: projectsPath(), body, section: 'grid' });
}

function dateCell(r, { t, locale }) {
  if (!r.dateFrom) return t('projects.dateNone');
  const from = monthLabel(r.dateFrom, locale);
  const shown = r.dateFrom === r.dateTo ? from : t('projects.dateRange', { from, to: monthLabel(r.dateTo, locale) });
  return html`${t(r.stage === 'finished' ? 'projects.dateOnline' : 'projects.datePlanned', { date: shown })}${r.datePassed ? html`<span class="project-sub">${t('projects.datePassed')}</span>` : ''}`;
}

function projectRow(r, plantHref, i18n) {
  const { t } = i18n;
  const href = plantHref(r.plantId);
  const county = r.countyConfirmed ? r.county : r.county ? t('projects.countyAsWritten', { county: r.county }) : t('projects.countyUnconfirmed');
  return html`<tr data-stage="${r.stage}" data-tech="${r.technologies.join('|')}" data-county="${r.countyConfirmed ? r.county : UNCONFIRMED}" data-ba="${r.ba ?? NO_BA}" data-mw="${r.mw}">
  <th scope="row">${href ? html`<a href="${href}">${r.plant}</a>` : r.plant}${r.entity ? html`<span class="project-sub">${r.entity}</span>` : ''}</th>
  <td data-label="${t('projects.col.stage')}">${t(`projects.stage.${r.stage}`)}<span class="project-sub">${r.status.join('; ')}</span></td>
  <td data-label="${t('projects.col.technology')}">${r.technologies.join(', ')}</td>
  <td class="num" data-label="MW">${whole(r.mw)}</td>
  <td data-label="${t('projects.col.place')}">${county}<span class="project-sub">${r.ba ?? t('projects.baNone')}</span></td>
  <td data-label="${t('projects.col.date')}">${dateCell(r, i18n)}</td>
</tr>`;
}

function filters(s, { t }) {
  const options = (values) => values.map(([v, label]) => html`<option value="${v}">${label}</option>`);
  const select = (name, label, values, all) => html`<div class="field"><label for="project-${name}">${label}</label><select id="project-${name}" name="${name}"><option value="">${all}</option>${options(values)}</select></div>`;
  const distinct = (xs) => [...new Set(xs)].sort((a, b) => a.localeCompare(b));
  const present = new Set(s.rows.map((r) => r.stage));
  const countyList = distinct(s.rows.filter((r) => r.countyConfirmed).map((r) => r.county)).map((c) => [c, c]);
  if (s.rows.some((r) => !r.countyConfirmed)) countyList.push([UNCONFIRMED, t('projects.countyUnconfirmed')]);
  const baList = distinct(s.rows.filter((r) => r.ba).map((r) => r.ba)).map((b) => [b, NAMES[b]?.name ? `${NAMES[b].name} (${b})` : b]);
  if (s.rows.some((r) => !r.ba)) baList.push([NO_BA, t('projects.baNone')]);
  return html`<form class="panel project-filters" data-project-filters hidden aria-label="${t('projects.filter.label')}">
${select('stage', t('projects.col.stage'), STAGES.filter((k) => present.has(k)).map((k) => [k, t(`projects.stage.${k}`)]), t('projects.filter.allStages'))}
${select('tech', t('projects.col.technology'), distinct(s.rows.flatMap((r) => r.technologies)).map((x) => [x, x]), t('projects.filter.allTech'))}
${select('county', t('projects.col.county'), countyList, t('projects.filter.allCounties'))}
${select('ba', t('projects.col.ba'), baList, t('projects.filter.allBa'))}
${select('size', t('projects.filter.size'), SIZES.map((mw) => [mw, t('projects.filter.atLeast', { mw })]), t('projects.filter.anySize'))}
</form>`;
}

/** @param {{p: any, state: any, i18n: any, plantHref: (id: number) => string | null, queue: {state: any, asOf: string, path: string} | null}} a */
export function projectsStatePage({ p, state: s, i18n, plantHref, queue }) {
  const { t, date, locale } = i18n;
  const name = STATE_NAMES[s.state] ?? s.state;
  const month = monthLabel(p.period, locale, 'long');
  const shownMw = s.rows.reduce((n, r) => n + r.mw, 0);
  const countLine = { count: s.rows.length, shown: whole(s.rows.length), mw: whole(shownMw) };
  const body = html`<p class="cell-section"><a href="${projectsPath()}">${t('projects.title')}</a></p>
<h1>${t('projects.stateTitle', { state: name })}</h1>
${plate(s.summary, t('projects.state.sentence', { mw: whole(s.summary.inProgress.mw), state: name, month }), p, i18n)}
${limits(i18n)}
${stageTiles(s.summary, i18n)}
${canceledNote(s.canceled, i18n)}
${queue ? html`<p data-project-queue>${t('projects.queueLine', { count: queue.state.summary.activeCount, shown: whole(queue.state.summary.activeCount), mw: whole(queue.state.summary.activeMw), state: name, asOf: date(queue.asOf) })} <a href="${queue.path}">${t('projects.queueLink', { state: name })}</a></p>` : ''}
<section><h2>${t('projects.byCounty')}</h2>
${numberTable([t('projects.col.county'), ...stageHeaders(i18n)], s.counties.map((c) => [c.county ?? t('projects.countyUnconfirmed'), ...stageValues(c.summary)]), t('projects.tableCaption', { place: name, month }))}</section>
<section data-projects><h2>${t('projects.list')}</h2>
<p>${t('projects.listNote')} <a href="${projectsJsonPath(s.state)}">${t('projects.json')}</a></p>
${filters(s, i18n)}
<div class="project-status"><p role="status" data-project-count data-one="${t('projects.count', { count: 1, shown: '{shown}', mw: '{mw}' })}" data-other="${t('projects.count', { count: 2, shown: '{shown}', mw: '{mw}' })}" data-none="${t('projects.countNone')}">${t('projects.count', countLine)}</p>
<button type="button" class="button" data-project-clear hidden>${t('projects.filter.clear')}</button></div>
<div class="table-wrap project-wrap" data-project-table><table class="project-table">
  <caption>${t('projects.listCaption', { state: name, month })}</caption>
  <thead><tr><th scope="col">${t('projects.col.project')}</th><th scope="col">${t('projects.col.stage')}</th><th scope="col">${t('projects.col.technology')}</th><th scope="col" class="num">MW</th><th scope="col">${t('projects.col.place')}</th><th scope="col">${t('projects.col.date')}</th></tr></thead>
  <tbody>${s.rows.map((r) => projectRow(r, plantHref, i18n))}</tbody>
</table></div></section>
${sourceStamp(p.manifest, p.table, i18n)}`;
  return layout({ i18n, title: pageTitle(t('projects.stateTitle', { state: name })), description: t('projects.description'), path: projectsPath(s.state), body, section: 'grid', modules: ['/site/pages/projects.js'] });
}
