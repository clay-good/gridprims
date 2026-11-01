// The continuity ledger page (add-data-continuity-ledger): the on-time count
// first, then every dataset's row with its due date and basis, its notice,
// its URL's last check, our archived copy, any changed promise, and any
// publisher reply beside it, then the automation's own rows and dead links.
// Lateness and staleness are re-judged on the device by the shell script.

import { html } from '../lib/html.mjs';
import { layout } from './layout.mjs';
import { pageTitle } from '../lib/meta.mjs';

export const LEDGER_PATH = '/ledger/';

/** @param {{ledger: any, i18n: any}} p */
export function ledgerPage({ ledger: L, i18n }) {
  const { t, date } = i18n;
  const c = L.counts;
  const status = (r) => (r.status === 'discontinued' ? t('ledger.status.discontinued') : t(`ledger.status.${r.status}`));
  const row = (r) => html`<tr id="${r.id}" data-ledger-row="${r.status}">
    <th scope="row">${r.title}<br><span class="mono">${r.id}</span>${r.ours ? html` <span class="warning-chip">${t('ledger.ours')}</span>` : ''}</th>
    <td>${r.publisher}</td>
    <td>${r.vintage}<br><span class="unit-hint">${t('ledger.asOf', { date: date(r.asOf) })}</span></td>
    <td>${r.status === 'discontinued' ? '' : html`${date(r.due)}<br><span class="unit-hint">${r.basis}</span>`}</td>
    <td><strong>${status(r)}</strong>${r.status !== 'discontinued' && r.status !== 'late' ? html` <span class="warning-chip" data-late-from="${r.lateFrom}" hidden>${t('ledger.status.late')}</span>` : ''}
      ${r.status === 'discontinued' ? html`<br>${r.discontinued.notice ? html`<a href="${r.discontinued.notice}">${t('ledger.notice')}</a>` : ''}${r.discontinued.successor ? html` · ${t('ledger.successor', { name: r.discontinued.successor })}` : ''}` : ''}</td>
    <td><a href="${r.notice}">${t('ledger.notice')}</a>${r.urlCheck ? html`<br><span class="unit-hint">${t('ledger.urlCheck', { status: String(r.urlCheck.status), state: r.urlCheck.state })}</span>` : html`<br><span class="unit-hint">${t('ledger.urlUnchecked')}</span>`}
      ${r.moved ? html`<br><span class="unit-hint">${t('ledger.moved', { from: r.moved.from, to: r.moved.to, date: r.moved.date })}</span>` : ''}</td>
    <td>${r.archive ? html`<a href="${r.archive}">${t('ledger.archive')}</a>` : html`<span class="unit-hint">${t('ledger.noArchive')}</span>`}</td>
  </tr>
  ${r.promiseHistory.length ? html`<tr><td colspan="7" data-ledger-promises><strong>${t('ledger.promiseChanged')}</strong><ul>${r.promiseHistory.map((p) => html`<li>${t('ledger.promiseSeen', { date: date(p.seen), text: p.text ?? t('ledger.promiseNone') })}${p.archive ? html` <a href="${p.archive}">${t('ledger.archive')}</a>` : ''}</li>`)}</ul></td></tr>` : ''}
  ${r.replies.map((x) => html`<tr><td colspan="7" data-ledger-reply><strong>${t('ledger.reply', { from: x.from, date: date(x.date) })}</strong> ${x.text}</td></tr>`)}`;
  const body = html`<h1>${t('ledger.title')}</h1>
<p class="sentence" data-ledger-counts>${t('ledger.counts', { tracked: c.tracked, current: c.current, due: c.due, late: c.late, discontinued: c.discontinued })}</p>
<p>${t('ledger.intro', { grace: L.graceDays })}</p>
<p class="mono"><span data-age-from="${L.generatedAt}" data-age-one="${t('data.ageDays', { count: 1 })}" data-age-other="${t('data.ageDays', { count: 2 }).replace('2', '{count}')}"></span> ${t('ledger.generated', { date: date(L.generatedAt.slice(0, 10)) })} <a href="/ledger/ledger.json">${t('ledger.json')}</a></p>
<p data-ledger-invite>${t('ledger.invite')} <a href="${L.contact}">${t('ledger.reply.link')}</a></p>
<div class="table-wrap"><table data-ledger>
  <thead><tr><th scope="col">${t('ledger.col.dataset')}</th><th scope="col">${t('ledger.col.publisher')}</th><th scope="col">${t('ledger.col.holding')}</th><th scope="col">${t('ledger.col.due')}</th><th scope="col">${t('ledger.col.status')}</th><th scope="col">${t('ledger.col.notice')}</th><th scope="col">${t('ledger.col.archive')}</th></tr></thead>
  <tbody>${L.rows.map(row)}</tbody>
</table></div>
<section><h2>${t('ledger.automation')}</h2>
<p>${t('ledger.automationIntro')}</p>
<div class="table-wrap"><table data-ledger-automation>
  <thead><tr><th scope="col">${t('ledger.col.workflow')}</th><th scope="col">${t('ledger.col.lastSuccess')}</th><th scope="col">${t('ledger.col.threshold')}</th><th scope="col">${t('ledger.col.enabled')}</th><th scope="col">${t('ledger.col.state')}</th></tr></thead>
  <tbody>${L.automation.map((w) => html`<tr><th scope="row" class="mono">${w.workflow}</th><td class="mono">${w.lastSuccess ?? t('ledger.never')}</td><td>${t('ledger.hours', { hours: w.thresholdHours })}</td><td>${w.enabled === null ? '' : w.enabled ? t('ledger.yes') : t('ledger.no')}</td>
    <td data-health-row data-last-success="${w.lastSuccess ?? ''}" data-threshold-hours="${w.thresholdHours}" data-stalled="${t('ledger.stalled')}" data-ok="${t('ledger.running')}"></td></tr>
    ${w.events.map((e) => html`<tr><td colspan="5" class="unit-hint">${e.kind}: ${e.at}</td></tr>`)}`)}</tbody>
</table></div>
<p>${L.deposits.last ? t('ledger.deposit', { date: L.deposits.last }) : t('ledger.noDeposit')} ${L.deposits.restoreTest ? t('ledger.restore', { date: L.deposits.restoreTest }) : t('ledger.noRestore')}</p>
</section>
<section><h2>${t('ledger.links')}</h2>
<p data-ledger-links>${t('ledger.linksCount', { checked: L.linksChecked, dead: L.deadLinks.length })}</p>
${L.deadLinks.length ? html`<ul>${L.deadLinks.map((d) => html`<li class="mono">${t('ledger.dead', { url: d.url, status: String(d.status) })}${d.lastOk ? `, ${t('ledger.lastOk', { date: d.lastOk })}` : ''}: ${d.usedBy.join(', ')}${d.archive ? html` <a href="${d.archive}">${t('ledger.archive')}</a>` : ''}</li>`)}</ul>` : ''}
</section>`;
  return layout({ i18n, title: pageTitle(t('ledger.title')), description: t('ledger.description'), path: LEDGER_PATH, body, section: 'data' });
}
