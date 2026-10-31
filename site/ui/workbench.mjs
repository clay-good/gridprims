// The parts of a file workbench that show a parsed file: the answer sign, the
// editable parse receipt, the chart, and the monthly table. Every number comes
// from core/lib/load-stats.mjs, the same module the MCP server reports from.

import { html, raw } from '../lib/html.mjs';
import { GLYPHS } from './glyphs.mjs';
import { formatNumber } from '../../core/lib/precision.mjs';
import { intervalKw, loadStats } from '../../core/lib/load-stats.mjs';
import { lineChart, tableView } from '../lib/chart.mjs';

export const ZONES = ['America/New_York', 'America/Chicago', 'America/Denver', 'America/Phoenix', 'America/Los_Angeles', 'America/Anchorage', 'Pacific/Honolulu', 'America/Puerto_Rico'];

const num = (x, sig = 3) => formatNumber(x, { sigFigs: sig });

/**
 * "Jun 10, 2026 at 2:30 pm" in the file's zone.
 * @param {number} ms
 * @param {string} zone
 */
export function when(ms, zone) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-US', { timeZone: zone, year: 'numeric', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true }).formatToParts(new Date(ms)).map((p) => [p.type, p.value]));
  return `${parts.month} ${parts.day}, ${parts.year} at ${parts.hour}:${parts.minute} ${parts.dayPeriod.toLowerCase()}`;
}
const day = (ms, zone) => new Intl.DateTimeFormat('en-US', { timeZone: zone, month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(ms));

/** Everything the page shows for one series of a parsed result. */
export function viewOf(result, index) {
  const s = result.series[index] ?? result.series[0];
  const zone = result.receipt.time.zone;
  return { result, series: s, index, zone, stats: loadStats(s, zone) };
}

/**
 * @param {ReturnType<typeof viewOf>} v
 * @param {{t: Function}} i18n
 * @param {{sample: boolean}} opts
 */
export function renderAnswer(v, { t }, { sample }) {
  const st = v.stats;
  const peak = num(st.peakKw);
  return html`<div class="sign">
    <p class="label">${t('files.peakLabel')}</p>
    <p class="number" data-output="peak" data-ms="${st.peakStartMs}">${peak}<span class="unit">kW</span></p>
    <p class="sentence" data-sentence>${t('files.peakSentence', { kw: peak, when: when(st.peakStartMs, v.zone) })}</p>
  </div>
  <dl class="facts mono">
    <div><dt>${t('files.statsTotal')}</dt><dd>${num(st.totalKwh, 4)} kWh</dd></div>
    <div><dt>${t('files.statsFactor')}</dt><dd>${st.loadFactor === null ? '' : `${num(st.loadFactor * 100, 2)}%`}</dd></div>
    <div><dt>${t('files.statsIntervals')}</dt><dd>${st.intervals.toLocaleString('en-US')}</dd></div>
  </dl>
  ${sample ? html`<p class="strip" data-strip>${GLYPHS.diamond} ${t('files.sample')}</p>` : ''}`;
}

/** A select whose options are value/label pairs, with the current choice selected. */
const select = (name, label, options, current) => html`<label class="receipt-choice"><span>${label}</span>
  <select name="${name}" data-choice="${name}">${options.map(([value, text]) => html`<option value="${value}"${value === current ? raw(' selected') : ''}>${text}</option>`)}</select></label>`;

/**
 * The parse receipt: one row per fact, every detected choice editable inline.
 * @param {ReturnType<typeof viewOf>} v
 * @param {{t: Function}} i18n
 */
export function renderReceipt(v, { t }) {
  const rc = v.result.receipt;
  const tm = rc.time;
  const q = rc.quality;
  const skipped = rc.file.rowsSkipped.reduce((n, s) => n + s.count, 0);
  const zones = ZONES.includes(tm.zone) ? ZONES : [tm.zone, ...ZONES];
  return html`<h2>${t('receipt.title')}</h2>
  <p class="receipt-privacy">${GLYPHS.check} ${t('receipt.privacy')}</p>
  <dl class="receipt mono">
    <div><dt>${t('receipt.file')}</dt><dd>${rc.file.name} · ${t('receipt.bytes', { count: rc.file.size.toLocaleString('en-US') })}</dd></div>
    <div><dt>${t('receipt.rows')}</dt><dd>${rc.file.rowsRead.toLocaleString('en-US')}</dd></div>
    ${skipped ? html`<div><dt>${t('receipt.skipped')}</dt><dd>${rc.file.rowsSkipped.map((s) => `${s.count} ${s.reason}`).join('; ')}</dd></div>` : ''}
    <div><dt>${t('receipt.interval')}</dt><dd>${t('receipt.minutes', { count: tm.intervalMinutes })}</dd></div>
    <div><dt>${t('receipt.stamps')}</dt><dd>${select('stampsMark', tm.stampsReason, [['start', t('receipt.stamps.start')], ['end', t('receipt.stamps.end')]], tm.stampsMark)}</dd></div>
    <div><dt>${t('receipt.quantity')}</dt><dd>${select('quantity', rc.values.assumption ?? rc.values.unitsRead.join(', '), [['auto', t('receipt.quantity.auto')], ['energy', t('receipt.quantity.energy')], ['demand', t('receipt.quantity.demand')]], rc.choices.quantity)}</dd></div>
    <div><dt>${t('receipt.zone')}</dt><dd>${select('zone', tm.zoneFromFile ? t('receipt.zoneFromFile') : '', zones.map((z) => [z, z]), tm.zone)}</dd></div>
    ${v.result.series.length > 1 ? html`<div><dt>${t('receipt.series')}</dt><dd>${select('series', '', v.result.series.map((s, i) => [String(i), `${s.meter || '—'} · ${s.channel}`]), String(v.index))}</dd></div>` : ''}
    <div><dt>${t('receipt.range')}</dt><dd>${day(tm.firstMs, tm.zone)} – ${day(tm.lastMs, tm.zone)} · ${t('receipt.months', { count: tm.months })}</dd></div>
    <div><dt>${t('receipt.gaps')}</dt><dd>${q.gaps.length ? q.gaps.map((g) => t('receipt.gapLine', { hours: num(g.intervals * tm.intervalMinutes / 60), start: when(g.startMs, tm.zone) })).join('; ') : t('receipt.gapsNone')}</dd></div>
    <div><dt>${t('receipt.duplicates')}</dt><dd>${t('receipt.duplicatesLine', { identical: q.duplicates.identical, conflicting: q.duplicates.conflicting, rule: q.duplicates.rule })}</dd></div>
    <div><dt>${t('receipt.dst')}</dt><dd>${q.dst.repeatedKept ? t('receipt.dstRepeat', { count: q.dst.repeatedKept }) : t('receipt.dstNone')}</dd></div>
    ${rc.parseMs !== undefined ? html`<div><dt>${t('receipt.parse')}</dt><dd>${t('receipt.ms', { count: rc.parseMs })}</dd></div>` : ''}
  </dl>`;
}

/**
 * The demand chart with the peak labeled, and the monthly table.
 * @param {ReturnType<typeof viewOf>} v
 * @param {{t: Function}} i18n
 */
export function renderChart(v, { t }) {
  const st = v.stats;
  const s = v.series;
  const kw = intervalKw(s);
  const tick = (ms) => new Intl.DateTimeFormat('en-US', { timeZone: v.zone, month: 'short', day: 'numeric' }).format(new Date(ms));
  const summary = t('files.chartSummary', { start: day(s.startMs[0], v.zone), end: day(s.startMs[s.startMs.length - 1], v.zone), kw: num(st.peakKw), when: when(st.peakStartMs, v.zone) });
  return html`${lineChart({
    title: t('files.chartTitle'), summary, yUnit: 'kW', xTick: tick,
    series: [{ label: t('files.peakLabel'), x: s.startMs, y: kw }],
    highlight: { x: st.peakStartMs, y: st.peakKw, label: `${num(st.peakKw)} kW` },
  })}
  <details class="panel"><summary>${t('files.monthly')}</summary>
  ${tableView([t('files.col.month'), t('files.col.peak'), t('files.col.when'), t('files.col.kwh')],
    st.monthly.map((m) => [m.month, num(m.peakKw), when(m.peakStartMs, v.zone), num(m.kwh, 4)]), t('files.monthly'))}
  </details>`;
}
