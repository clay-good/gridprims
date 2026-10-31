// "What this file says" (add-load-and-bill-analyzer: interval-insights): the
// load's minimum and baseload, demand over a chosen window, the flags with
// links to their evidence, the data-quality report, the load duration curve,
// the weekday and weekend profiles, and the day-by-hour heatmap. Every number
// comes from core/lib/load-insights.mjs.

import { html } from '../lib/html.mjs';
import { heatmapChart, lineChart, tableView } from '../lib/chart.mjs';
import { formatNumber } from '../../core/lib/precision.mjs';
import { baseload, demandOver, durationCurve, flags, heatmap, profiles, quality } from '../../core/lib/load-insights.mjs';

const num = (x, sig = 3) => formatNumber(x, { sigFigs: sig });
const HOURS = Array.from({ length: 24 }, (_, h) => h);
const hourText = (h) => (h === 0 ? 'midnight' : h === 12 ? 'noon' : h < 12 ? `${h} am` : `${h - 12} pm`);

/**
 * @param {any} v the workbench's view of one series
 * @param {{t: Function}} i18n
 * @param {{when: (ms: number, zone: string) => string, window?: {minutes: number, mode: 'block' | 'rolling'}, aggregate?: {meters: any[], peakKw: number, diversityKw: number}}} opts
 */
export function renderInsights(v, { t }, { when, window: w, aggregate }) {
  const s = v.series;
  const b = baseload(s);
  const fl = flags(s, v.zone);
  const q = quality(s, v.zone);
  const demand = w && w.minutes !== s.intervalMinutes ? demandOver(s, w) : null;
  const curve = durationCurve(s);
  const p = profiles(s, v.zone);
  const heat = heatmap(s, v.zone);
  return html`<h2>${t('insights.title')}</h2>
  ${q.label ? html`<p class="strip" data-partial>${t('insights.partial', { label: q.label })}</p>` : ''}
  <dl class="receipt mono" data-metrics>
    <div><dt>${t('insights.loadFactor')}</dt><dd>${v.stats.loadFactor === null ? '–' : `${num(v.stats.loadFactor * 100)}%`}</dd></div>
    <div><dt>${t('insights.average')}</dt><dd>${num(v.stats.averageKw)} kW</dd></div>
    <div><dt>${t('insights.minimum')}</dt><dd>${num(b.minKw)} kW</dd></div>
    <div><dt>${t('insights.baseload')}</dt><dd>${num(b.baseloadKw)} kW</dd></div>
    <div><dt>${t('insights.demandFrom')}</dt><dd>${t('insights.demandFromLine', { minutes: s.intervalMinutes, factor: num(60 / s.intervalMinutes) })}</dd></div>
    ${aggregate ? html`<div><dt>${t('insights.diversity')}</dt><dd data-diversity>${t('insights.diversityLine', { sum: num(aggregate.meters.reduce((n, m) => n + m.peakKw, 0)), peak: num(aggregate.peakKw), kw: num(aggregate.diversityKw) })}</dd></div>` : ''}
  </dl>
  <form class="picker-row" data-window novalidate>
    <div class="field"><label for="window-minutes">${t('insights.window')}</label><select id="window-minutes" name="minutes">
      <option value="${s.intervalMinutes}">${t('insights.windowFile', { minutes: s.intervalMinutes })}</option>
      ${[15, 30, 60].filter((m) => m !== s.intervalMinutes).map((m) => html`<option value="${m}"${w?.minutes === m ? ' selected' : ''}>${t('insights.windowMinutes', { minutes: m })}</option>`)}</select></div>
    <div class="field"><label for="window-mode">${t('insights.windowMode')}</label><select id="window-mode" name="mode">
      <option value="block"${w?.mode !== 'rolling' ? ' selected' : ''}>${t('insights.block')}</option><option value="rolling"${w?.mode === 'rolling' ? ' selected' : ''}>${t('insights.rolling')}</option></select></div>
  </form>
  ${demand ? (demand.status === 'refused'
    ? html`<p class="errors" data-window-result>${demand.reason}</p>`
    : html`<p data-window-result>${t('insights.windowPeak', { minutes: demand.minutes, mode: t(`insights.${demand.mode}`).toLowerCase(), kw: num(demand.peakKw), when: when(demand.peakStartMs, v.zone) })}</p>`) : ''}
  <h3>${t('insights.flags')}</h3>
  ${fl.length ? html`<ul data-flags>${fl.map((f) => html`<li data-flag="${f.kind}">${f.text}${f.startMs !== undefined && f.kw !== undefined ? html` <button class="button link" type="button" data-show-ms="${f.startMs}" data-show-kw="${f.kw}">${t('insights.showOnChart')}</button>` : ''}</li>`)}</ul>` : html`<p data-flags>${t('insights.noFlags')}</p>`}
  <h3>${t('insights.quality')}</h3>
  <ul data-quality>
    <li>${t('insights.coverage', { pct: num(q.coverage * 100, 4), present: q.present.toLocaleString('en-US'), expected: q.expected.toLocaleString('en-US') })}</li>
    <li>${q.zeroRuns.length ? t('insights.zeroRuns', { count: q.zeroRuns.length, first: when(q.zeroRuns[0].startMs, v.zone) }) : t('insights.zeroRunsNone')}</li>
    <li>${q.negatives ? t('insights.negatives', { count: q.negatives }) : t('insights.negativesNone')}</li>
    ${q.affects.map((a) => html`<li>${a}</li>`)}
  </ul>
  <h3>${t('insights.duration')}</h3>
  ${lineChart({ title: t('insights.duration'), summary: t('insights.durationSummary', { peak: num(curve[0].kw), half: num(curve[50].kw), base: num(curve.at(-1).kw) }), yUnit: 'kW', xTick: (x) => `${Math.round(x * 100)}%`, series: [{ label: t('insights.duration'), x: curve.map((c) => c.share), y: curve.map((c) => c.kw) }] })}
  <h3>${t('insights.profile')}</h3>
  ${lineChart({ title: t('insights.profile'), summary: t('insights.profileSummary'), yUnit: 'kW', xTick: hourText, series: [{ label: t('insights.weekday'), x: HOURS, y: p.weekday.map((x) => x ?? 0) }, { label: t('insights.weekend'), x: HOURS, y: p.weekend.map((x) => x ?? 0), role: 'compare' }] })}
  <details class="panel"><summary>${t('insights.profileTable')}</summary>${tableView([t('insights.hour'), t('insights.weekday'), t('insights.weekend')], HOURS.map((h) => [hourText(h), p.weekday[h] === null ? '–' : num(p.weekday[h]), p.weekend[h] === null ? '–' : num(p.weekend[h])]), t('insights.profile'))}</details>
  <h3>${t('insights.heatmap')}</h3>
  ${heatmapChart({ title: t('insights.heatmap'), summary: t('insights.heatmapSummary', { days: heat.length }), unit: 'kW', rows: heat, rowLabel: (d) => d.slice(5) })}
  <details class="panel"><summary>${t('insights.heatmapTable')}</summary>${tableView([t('insights.day'), ...HOURS.map(hourText)], heat.map((r) => [r.day, ...r.kw.map((x) => (x === null ? '–' : num(x)))]), t('insights.heatmap'))}</details>`;
}
