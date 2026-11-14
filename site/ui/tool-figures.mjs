// The one chart a tool page may carry (add-overhead-line-checks 3.6 and 4.5),
// drawn from the figure a tool exports beside compute(). The figure never
// joins the contract's result, so recorded results and the MCP surface do
// not change. Each chart has a text summary and a table view.

import { html } from '../lib/html.mjs';
import { lineChart, niceTicks, tableView } from '../lib/chart.mjs';
import { checkInputs } from '../../core/contract/run.mjs';
import { feetInches } from '../../core/lib/field-length.mjs';

const down = (ft) => feetInches(ft, 'down');
const feet = (ft) => `${Math.round(ft).toLocaleString('en-US')} ft`;
// Lengths end in "in.", so a sentence ending on one keeps a single period.
const oneDot = (text) => text.replace(/\.\./g, '.');
const SAMPLES = 40;

/** The span profile: the line, the line above, the required clearance, and the lowest point, in feet above ground. */
export function spanProfile(f, i18n) {
  const { t } = i18n;
  const { span: S, line, above, required, lowest } = f;
  const at = (l, x) => { const u = x / S; return l.a * (1 - u) + l.b * u - 4 * l.sag * u * (1 - u); };
  const xs = Array.from({ length: SAMPLES + 1 }, (_, k) => (S * k) / SAMPLES);
  const series = [{ label: t('figure.span.line'), x: xs, y: xs.map((x) => at(line, x)) }];
  if (above) series.push({ label: t('figure.span.above'), x: xs, y: xs.map((x) => at(above, x)) });
  if (required !== null) series.push({ label: t('figure.span.required'), x: [0, S], y: [required, required], role: 'compare' });
  const summary = [
    t('figure.span.summary', { height: down(lowest.height), at: feet(lowest.at), span: feet(S) }),
    required === null ? '' : t(lowest.height >= required ? 'figure.span.clears' : 'figure.span.short', { required: down(required) }),
  ].filter(Boolean).join(' ').replace(/\.\./g, '.');
  const rows = xs.filter((_, k) => k % 5 === 0).map((x) => [feet(x), down(at(line, x)), ...(above ? [down(at(above, x))] : []), ...(required === null ? [] : [down(required)])]);
  return html`<section class="panel figure-panel" data-figure-chart="span-profile">
  <h2>${t('figure.span.title')}</h2>
  ${lineChart({
    title: t('figure.span.title'), summary, yUnit: 'ft', xTick: (v) => `${Math.round(v)} ft`,
    series, highlight: { x: lowest.at, y: lowest.height, label: t('figure.span.lowest', { height: down(lowest.height) }) },
  })}
  <details><summary>${t('figure.table')}</summary>${tableView([t('figure.span.col.from'), t('figure.span.line'), ...(above ? [t('figure.span.above')] : []), ...(required === null ? [] : [t('figure.span.required')])], rows, t('figure.span.caption'))}</details>
</section>`;
}

/** The pole elevation: every attachment, the communication space, planned moves, and where the new line goes. */
export function poleElevation(f, i18n) {
  const { t } = i18n;
  const W = 480;
  const H = 360;
  const pad = { t: 16, b: 28, l: 52 };
  const heights = [...f.attachments.flatMap((a) => [a.inches, a.to ?? a.inches]), f.top, f.at ?? 0, f.poleTopIn ?? 0];
  const yMax = Math.max(...heights) / 12 + 2;
  const sy = (inches) => pad.t + (H - pad.t - pad.b) * (1 - inches / 12 / yMax);
  const poleX = 120;
  const ticks = niceTicks(0, yMax, 6).filter((v) => v <= yMax);
  // Labels sit right of the pole, nudged apart so none overlap.
  const marks = [
    ...f.attachments.map((a) => ({ y: sy(a.to ?? a.inches), kind: a.to === undefined ? (a.supply ? 'supply' : 'comm') : 'moved', from: a.to === undefined ? null : sy(a.inches), text: a.to === undefined ? `${a.name} ${down(a.inches / 12)}` : t('figure.pole.moved', { name: a.name, from: down(a.inches / 12), to: down(a.to / 12) }) })),
    ...(f.at === null ? [] : [{ y: sy(f.at), kind: 'new', text: t('figure.pole.new', { height: down(f.at / 12) }) }]),
  ].sort((a, b) => a.y - b.y);
  let floor = -Infinity;
  for (const m of marks) { m.ly = Math.max(m.y, floor + 14); floor = m.ly; }
  const summary = oneDot([
    f.top >= f.bottom ? t('figure.pole.summary', { top: down(f.top / 12), bottom: down(f.bottom / 12) }) : t('figure.pole.closed', { top: down(f.top / 12), bottom: down(f.bottom / 12) }),
    f.at !== null ? t('figure.pole.answer', { height: down(f.at / 12) }) : t('figure.pole.noFit', { extra: feetInches(f.extra, 'up') }),
  ].join(' '));
  const rows = [
    ...f.attachments.map((a) => [`${a.row}`, a.name, a.owner, down(a.inches / 12), a.to === undefined ? '' : down(a.to / 12)]),
    ...(f.at === null ? [] : [['', t('figure.pole.newLine'), '', down(f.at / 12), '']]),
  ];
  return html`<section class="panel figure-panel" data-figure-chart="pole-elevation">
  <h2>${t('figure.pole.title')}</h2>
  <figure class="chart elevation">
  <svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${t('figure.pole.title')}. ${summary}">
    <g class="chart-grid">${ticks.map((v) => html`<line x1="${pad.l}" x2="${W - 8}" y1="${sy(v * 12).toFixed(1)}" y2="${sy(v * 12).toFixed(1)}"/>`)}</g>
    <g class="chart-axis">${ticks.map((v) => html`<text x="${pad.l - 6}" y="${sy(v * 12).toFixed(1)}" text-anchor="end" dominant-baseline="middle">${v}</text>`)}<text x="4" y="${pad.t - 4}" class="chart-unit">${t('figure.pole.unit')}</text></g>
    <rect class="elev-space" x="${pad.l}" width="${W - 8 - pad.l}" y="${sy(f.top).toFixed(1)}" height="${Math.max(0, sy(f.bottom) - sy(f.top)).toFixed(1)}"><title>${t('figure.pole.space')}</title></rect>
    <rect class="elev-pole" x="${poleX - 6}" width="12" y="${sy((f.poleTopIn ?? Math.max(...heights)) + 6).toFixed(1)}" height="${(sy(0) - sy((f.poleTopIn ?? Math.max(...heights)) + 6)).toFixed(1)}"/>
    <line class="elev-ground" x1="${pad.l}" x2="${W - 8}" y1="${sy(0).toFixed(1)}" y2="${sy(0).toFixed(1)}"/>
    ${marks.map((m) => html`<g class="elev-mark elev-${m.kind}">
      ${m.from === null || m.from === undefined ? '' : html`<line class="elev-was" x1="${poleX - 40}" x2="${poleX + 40}" y1="${m.from.toFixed(1)}" y2="${m.from.toFixed(1)}"/>`}
      <line x1="${poleX - 40}" x2="${poleX + 40}" y1="${m.y.toFixed(1)}" y2="${m.y.toFixed(1)}"/>
      <text x="${poleX + 48}" y="${m.ly.toFixed(1)}" dominant-baseline="middle">${m.text}</text>
    </g>`)}
  </svg>
  <figcaption>${summary}</figcaption>
  </figure>
  <details><summary>${t('figure.table')}</summary>${tableView([t('figure.pole.col.row'), t('figure.pole.col.kind'), t('figure.pole.col.owner'), t('figure.pole.col.height'), t('figure.pole.col.to')], rows, t('figure.pole.caption'))}</details>
</section>`;
}

const DRAW = { 'lines.midspan-clearance.check': spanProfile, 'lines.attachment-height.find': poleElevation };

/**
 * The tool's chart for these raw inputs, or nothing when the tool has none or the inputs give no answer.
 * @param {any} manifest @param {any} impl the tool module @param {Record<string, unknown>} raw @param {{t: Function}} i18n
 */
export function renderFigure(manifest, impl, raw, i18n) {
  const draw = DRAW[manifest.id];
  if (!draw || typeof impl.figure !== 'function') return '';
  const { values, errors } = checkInputs(manifest, raw);
  if (errors.length) return '';
  const f = impl.figure(values);
  return f ? draw(f, i18n) : '';
}
