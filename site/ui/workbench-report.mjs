// The one-page report (add-load-and-bill-analyzer: handoff-and-report, task
// 7.3): the load summary, monthly peaks, the bill on the chosen rate, the best
// alternative, and the battery and solar screen, each with its sources and the
// screening label. Made on the device; the browser's own "Save as PDF" turns
// the print view into a file, so no PDF library is needed.

import { html } from '../lib/html.mjs';
import { formatNumber } from '../../core/lib/precision.mjs';
import { baseload } from '../../core/lib/load-insights.mjs';
import { SCREENING } from '../../core/lib/result-cards.mjs';

const money = (x) => `$${x.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const num = (x, sig = 3) => formatNumber(x, { sigFigs: sig });

/**
 * @param {{v: any, when: (ms: number) => string, period: string, priced?: {rec: any, bills: any} | null, ranking?: any, screen?: any, urdbAsOf?: string | null, version: string}} p
 * @param {{t: Function}} i18n
 */
export function renderReport(p, { t }) {
  const st = p.v.stats;
  const b = baseload(p.v.series);
  const source = (text) => html`<p class="unit-hint">${t('report.sources', { list: text })}</p>`;
  const urdb = t('report.urdb', { date: p.urdbAsOf ?? '–' });
  const best = p.ranking?.ranked?.[0];
  return html`<h2 id="report-view-title">${t('report.heading')}</h2>
  <p class="strip">${SCREENING} ${t('report.period', { period: p.period })}</p>
  <section><h3>${t('report.load')}</h3>
    <p>${t('report.loadLine', { kwh: num(st.totalKwh, 4), peak: num(st.peakKw), when: p.when(st.peakStartMs), lf: st.loadFactor === null ? '–' : num(st.loadFactor * 100), base: num(b.baseloadKw) })}</p>
    <table><thead><tr><th scope="col">${t('bill.col.month')}</th><th scope="col" class="num">${t('files.col.peak')}</th><th scope="col">${t('files.col.when')}</th><th scope="col" class="num">${t('files.col.kwh')}</th></tr></thead>
    <tbody>${st.monthly.map((m) => html`<tr><th scope="row">${m.month}</th><td class="num">${num(m.peakKw)} kW</td><td>${p.when(m.peakStartMs)}</td><td class="num">${num(m.kwh, 4)}</td></tr>`)}</tbody></table>
    ${source(t('report.yourFile'))}</section>
  <section><h3>${t('report.bill')}</h3>
    ${p.priced ? html`<p>${t('report.billLine', { rate: p.priced.rec.name, id: p.priced.rec.id, total: money(p.priced.bills.months.reduce((n, m) => n + m.total, 0)), months: p.priced.bills.months.length })}</p>
      <table><tbody>${p.priced.bills.months.map((m) => html`<tr><th scope="row">${m.month}</th><td class="num">${money(m.total)}</td></tr>`)}</tbody></table>
      ${p.priced.rec.unmodeled.length ? html`<p class="unit-hint">${t('bill.unmodeled', { list: p.priced.rec.unmodeled.join(', ') })}</p>` : ''}
      ${source(urdb)}` : html`<p>${t('report.notRun')}</p>`}</section>
  <section><h3>${t('report.alternative')}</h3>
    ${best ? html`<p>${best === p.ranking.current ? t('report.currentBest') : t('report.bestLine', { rate: best.rec.name, total: money(best.annual), diff: money(Math.abs(best.diff ?? 0)) })} ${t('compare.pastUse')}</p>${source(urdb)}` : html`<p>${t('report.notRun')}</p>`}</section>
  <section><h3>${t('report.cp')}</h3>${p.cp?.e?.status === 'ok' && p.cp.e.averageKw !== null
    ? html`<p>${t('report.cpLine', { name: p.cp.p.name, kw: num(p.cp.e.averageKw) })}${p.cp.cost?.annual ? ` ${t('cp.cost', { annual: money(p.cp.cost.annual), applies: p.cp.cost.applies })}` : ''}</p>${p.cp.e.approximate ? html`<p class="unit-hint">${p.cp.e.approximate}</p>` : ''}${source(p.cp.p.source)}`
    : html`<p>${t('report.notRun')}</p>`}</section>
  <section><h3>${t('report.screen')}</h3>
    ${p.screen ? html`<p>${t('report.screenLine', { total: money(p.screen.result.saved.total), demand: money(p.screen.result.saved.demand), energy: money(p.screen.result.saved.energy) })}${p.screen.result.back.years !== null ? ` ${t('screen.payback', { years: formatNumber(p.screen.result.back.years, { decimals: 1, fixed: true }) })}` : ''}</p>
      <p class="unit-hint">${p.screen.result.upperBound} ${t('screen.excluded', { list: p.screen.result.excluded.join(', ') })}</p>${source(urdb)}` : html`<p>${t('report.notRun')}</p>`}</section>
  <p class="unit-hint">${t('report.footer', { version: p.version })}</p>
  <p class="report-actions"><button class="button" type="button" data-print-report>${t('report.print')}</button></p>`;
}
