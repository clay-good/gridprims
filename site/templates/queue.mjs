// The queue explorer (add-public-grid-data: queue snapshot): an annual
// snapshot of interconnection requests from LBNL's Queued Up, summarized by
// state, county, type, status, and entry year, credited on every page, with
// live status handed off to Interconnection.fyi.

import { html } from '../lib/html.mjs';
import { layout } from './layout.mjs';
import { sourceStamp } from '../ui/source-stamp.mjs';
import { tableView } from '../lib/chart.mjs';
import { STATE_NAMES } from '../entities/regions.mjs';
import { WITHDRAWAL_COHORT } from '../entities/queue.mjs';
import { pageTitle } from '../lib/meta.mjs';

export const queuePath = (st) => (st ? `/queue/${st.toLowerCase()}/` : '/queue/');
export const LIVE_STATUS = 'https://www.interconnection.fyi/';
const TYPES = ['solar', 'wind', 'storage', 'gas', 'hybrid', 'other'];
const whole = (x) => Math.round(x).toLocaleString('en-US');
const years = (x) => (x === null ? '' : x.toFixed(1));
const share = (w) => (w ? `${Math.round(w.share * 100)}% of ${whole(w.n)}` : '');

function header(i18n, asOf, posture) {
  const { t, date } = i18n;
  return html`<p class="strip" data-credit>${t('queue.credit', { asOf: date(asOf) })}</p>
<p>${t('queue.snapshot')} <a href="${LIVE_STATUS}">${t('queue.live')}</a></p>
<p>${t(`queue.posture.${posture}`)}</p>`;
}

function summaryFacts(s, i18n) {
  const { t } = i18n;
  return html`<dl class="facts">
  <div><dt>${t('queue.activeMw')}</dt><dd class="mono">${whole(s.activeMw)} MW</dd></div>
  <div><dt>${t('queue.activeCount')}</dt><dd class="mono">${whole(s.activeCount)}</dd></div>
  <div><dt>${t('queue.medianYears')}</dt><dd class="mono">${years(s.medianYears)}</dd></div>
  <div><dt>${t('queue.withdrawn', { year: WITHDRAWAL_COHORT })}</dt><dd class="mono">${s.withdrawn ? `${Math.round(s.withdrawn.share * 100)}%` : t('queue.tooFew')}</dd></div>
</dl>
${tableView([t('state.col.type'), t('state.col.activeMw'), t('state.col.projects')], TYPES.filter((k) => s.byType[k]).map((k) => [t(`state.queueType.${k}`), whole(s.byType[k].mw), whole(s.byType[k].count)]), t('queue.byType'))}`;
}

/** @param {{q: any, i18n: any, posture: string}} p */
export function queueIndexPage({ q, i18n, posture }) {
  const { t } = i18n;
  const body = html`<h1>${t('queue.title')}</h1>
${header(i18n, q.asOf, posture)}
<section><h2>${t('queue.national')}</h2>${summaryFacts(q.national, i18n)}
<p>${t('queue.capacityNote')}</p></section>
<section><h2>${t('queue.byState')}</h2>
${tableView([t('utility.col.state'), t('state.col.activeMw'), t('state.col.projects'), t('queue.medianYears')],
    q.states.map((s) => [html`<a href="${queuePath(s.state)}">${STATE_NAMES[s.state] ?? s.state}</a>`, whole(s.summary.activeMw), whole(s.summary.activeCount), years(s.summary.medianYears)]), t('queue.byState'))}
<p>${t('queue.noState', { count: whole(q.noState) })}</p></section>
${sourceStamp(q.manifest, q.manifest.tables[0], i18n)}`;
  return layout({ i18n, title: `${t('queue.title')} · ${t('site.name')}`, description: t('queue.description'), path: queuePath(), body, section: 'grid' });
}

/** @param {{q: any, state: any, i18n: any, posture: string}} p */
export function queueStatePage({ q, state: s, i18n, posture }) {
  const { t, date } = i18n;
  const name = STATE_NAMES[s.state] ?? s.state;
  const body = html`<p class="cell-section"><a href="${queuePath()}">${t('queue.title')}</a></p>
<h1>${t('queue.stateTitle', { state: name })}</h1>
${header(i18n, q.asOf, posture)}
<section><h2>${t('queue.stateSummary')}</h2>${summaryFacts(s.summary, i18n)}</section>
<section><h2>${t('queue.byCounty')}</h2>
${tableView([t('queue.col.county'), t('state.col.activeMw'), t('state.col.projects'), ...TYPES.map((k) => t(`state.queueType.${k}`)), t('queue.medianYears'), t('queue.withdrawn', { year: WITHDRAWAL_COHORT })],
    s.counties.map((c) => [c.county ?? t('queue.noCounty'), whole(c.summary.activeMw), whole(c.summary.activeCount), ...TYPES.map((k) => (c.summary.byType[k] ? whole(c.summary.byType[k].mw) : '')), years(c.summary.medianYears), share(c.summary.withdrawn)]), t('queue.byCountyCaption', { state: name, asOf: date(q.asOf) }))}
<p>${t('queue.capacityNote')}</p></section>
${posture === 'mirror' ? html`<section><h2>${t('queue.projects')}</h2>
<p>${t('queue.projectsNote', { asOf: date(q.asOf) })} <a href="${LIVE_STATUS}">${t('queue.live')}</a></p>
${tableView([t('queue.col.project'), t('queue.col.county'), t('state.col.type'), 'MW', t('queue.col.entered'), t('queue.col.phase'), t('queue.col.utility'), t('queue.col.status')],
    s.projects.map((p) => [p.project_name ?? p.q_id, p.county ?? '', p.type_clean ?? '', p.mw_1 === null ? '' : whole(p.mw_1), p.q_date ?? '', p.ia_phase ?? '', p.utility ?? p.entity ?? '', html`<a href="${LIVE_STATUS}">${t('queue.liveShort')}</a>`]), t('queue.projectsCaption', { state: name }))}
</section>` : ''}
${sourceStamp(q.manifest, q.manifest.tables[0], i18n)}`;
  return layout({ i18n, title: pageTitle(t('queue.stateTitle', { state: name })), description: t('queue.description'), path: queuePath(s.state), body, section: 'grid' });
}
