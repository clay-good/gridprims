// SVG charts per DESIGN.md "Charts": one scale per axis, ticks inside the
// data's range, measured data in guide green and what-ifs in orange (by class,
// so both themes and the style lint apply), the most important point labeled,
// and a text summary plus a table view for every chart.

import { html } from './html.mjs';

/**
 * Keep the lowest and highest point of every bucket, in time order, so a year
 * of 15-minute data draws in a few hundred points and no peak is lost.
 * @param {ArrayLike<number>} x ascending
 * @param {ArrayLike<number>} y
 * @param {number} buckets
 * @returns {{x: number[], y: number[]}}
 */
export function downsampleMinMax(x, y, buckets) {
  const n = x.length;
  if (n <= buckets * 2) return { x: Array.from(x), y: Array.from(y) };
  const ox = [];
  const oy = [];
  const x0 = x[0];
  const span = x[n - 1] - x0 || 1;
  let i = 0;
  for (let b = 0; b < buckets; b++) {
    const end = b === buckets - 1 ? Infinity : x0 + ((b + 1) * span) / buckets;
    let lo = -1;
    let hi = -1;
    for (; i < n && x[i] < end; i++) {
      if (lo < 0 || y[i] < y[lo]) lo = i;
      if (hi < 0 || y[i] > y[hi]) hi = i;
    }
    if (lo < 0) continue;
    for (const k of lo === hi ? [lo] : lo < hi ? [lo, hi] : [hi, lo]) { ox.push(x[k]); oy.push(y[k]); }
  }
  return { x: ox, y: oy };
}

/**
 * Tick values on a 1, 2, or 5 step that fall inside [min, max].
 * @param {number} min
 * @param {number} max
 * @param {number} [target] about how many ticks
 */
export function niceTicks(min, max, target = 5) {
  if (!(max > min)) return [min];
  const raw = (max - min) / target;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 5, 10].map((m) => m * mag).find((s) => s >= raw);
  const out = [];
  for (let v = Math.ceil(min / step) * step; v <= max + step * 1e-9; v += step) out.push(Number(v.toPrecision(12)));
  return out;
}

/**
 * @typedef {{label: string, x: ArrayLike<number>, y: ArrayLike<number>, role?: 'measured' | 'whatif' | 'compare'}} ChartSeries
 * @typedef {{
 *   title: string, summary: string, yUnit: string, series: ChartSeries[],
 *   width?: number, height?: number, xTick: (x: number) => string, yTick?: (y: number) => string,
 *   highlight?: {x: number, y: number, label: string},
 * }} LineChart
 */

/**
 * A line chart as an accessible SVG figure with its summary.
 * @param {LineChart} c
 */
export function lineChart(c) {
  const W = c.width ?? 720;
  const H = c.height ?? 280;
  const pad = { l: 56, r: 16, t: 16, b: 32 };
  const plotW = W - pad.l - pad.r;
  const plotH = H - pad.t - pad.b;
  const drawn = c.series.map((s) => ({ ...s, ...downsampleMinMax(s.x, s.y, Math.floor(plotW / 2)) }));
  const xs = drawn.flatMap((s) => s.x);
  const ys = drawn.flatMap((s) => s.y);
  const x0 = Math.min(...xs);
  const x1 = Math.max(...xs);
  const y0 = Math.min(0, ...ys);
  const y1 = Math.max(...ys) || 1;
  const sx = (v) => pad.l + ((v - x0) / (x1 - x0 || 1)) * plotW;
  const sy = (v) => pad.t + plotH - ((v - y0) / (y1 - y0 || 1)) * plotH;
  const yTicks = niceTicks(y0, y1);
  const xTicks = niceTicks(x0, x1, 4);
  const yFmt = c.yTick ?? ((v) => new Intl.NumberFormat('en-US', { maximumSignificantDigits: 3 }).format(v));
  const path = (s) => s.x.map((v, i) => `${i ? 'L' : 'M'}${sx(v).toFixed(1)},${sy(s.y[i]).toFixed(1)}`).join('');
  const h = c.highlight;
  return html`<figure class="chart">
  <svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${c.title}. ${c.summary}" preserveAspectRatio="none">
    <g class="chart-grid">${yTicks.map((v) => html`<line x1="${pad.l}" x2="${W - pad.r}" y1="${sy(v).toFixed(1)}" y2="${sy(v).toFixed(1)}"/>`)}</g>
    <g class="chart-axis">
      ${yTicks.map((v) => html`<text x="${pad.l - 6}" y="${sy(v).toFixed(1)}" text-anchor="end" dominant-baseline="middle">${yFmt(v)}</text>`)}
      ${xTicks.map((v) => html`<text x="${sx(v).toFixed(1)}" y="${H - 8}" text-anchor="middle">${c.xTick(v)}</text>`)}
      <text x="4" y="${pad.t - 4}" class="chart-unit">${c.yUnit}</text>
    </g>
    ${drawn.map((s) => html`<path class="series series-${s.role ?? 'measured'}" d="${path(s)}"><title>${s.label}</title></path>`)}
    ${h ? html`<g class="chart-highlight"><circle cx="${sx(h.x).toFixed(1)}" cy="${sy(h.y).toFixed(1)}" r="5"/><text x="${Math.min(sx(h.x) + 8, W - pad.r - 4).toFixed(1)}" y="${Math.max(sy(h.y) - 8, pad.t + 10).toFixed(1)}" text-anchor="${sx(h.x) > W * 0.7 ? 'end' : 'start'}">${h.label}</text></g>` : ''}
  </svg>
  <figcaption>${c.summary}</figcaption>
</figure>`;
}

/**
 * A day-by-hour heatmap on the sequential ramp, with a labeled scale (DESIGN.md: SVG up to 10,000 cells).
 * @param {{title: string, summary: string, unit: string, rows: Array<{day: string, kw: Array<number | null>}>, rowLabel: (day: string) => string}} c
 */
export function heatmapChart(c) {
  const values = c.rows.flatMap((r) => r.kw).filter((v) => v !== null);
  const max = Math.max(...values, 0) || 1;
  const step = (v) => Math.min(5, Math.floor((v / max) * 6));
  const cell = 6;
  const rowH = Math.max(2, Math.min(8, Math.floor(520 / Math.max(1, c.rows.length))));
  const W = 40 + 24 * cell * 3;
  const H = 18 + c.rows.length * rowH + 28;
  const every = Math.ceil(c.rows.length / 12);
  return html`<figure class="chart heatmap">
  <svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${c.title}. ${c.summary}">
    <g class="chart-axis">${[0, 6, 12, 18].map((h) => html`<text x="${40 + h * cell * 3}" y="12">${h === 0 ? 'midnight' : h === 12 ? 'noon' : h < 12 ? `${h} am` : `${h - 12} pm`}</text>`)}
      ${c.rows.map((r, i) => (i % every ? '' : html`<text x="36" y="${18 + i * rowH + rowH}" text-anchor="end">${c.rowLabel(r.day)}</text>`))}</g>
    ${c.rows.map((r, i) => r.kw.map((v, h) => (v === null ? '' : html`<rect class="heat-${step(v)}" x="${40 + h * cell * 3}" y="${18 + i * rowH}" width="${cell * 3}" height="${rowH}"/>`)))}
    <g class="chart-axis">${[0, 1, 2, 3, 4, 5].map((k) => html`<rect class="heat-${k}" x="${40 + k * 36}" y="${H - 18}" width="36" height="8"/>`)}
      <text x="40" y="${H - 2}">0</text><text x="${40 + 6 * 36}" y="${H - 2}" text-anchor="end">${new Intl.NumberFormat('en-US', { maximumSignificantDigits: 3 }).format(max)} ${c.unit}</text></g>
  </svg>
  <figcaption>${c.summary}</figcaption>
</figure>`;
}

/**
 * The table view every chart offers.
 * @param {string[]} headers
 * @param {Array<Array<string | number>>} rows
 * @param {string} caption
 */
export function tableView(headers, rows, caption) {
  return html`<div class="table-wrap"><table>
  <caption>${caption}</caption>
  <thead><tr>${headers.map((h) => html`<th scope="col">${h}</th>`)}</tr></thead>
  <tbody>${rows.map((r) => html`<tr>${r.map((v, i) => (i === 0 ? html`<th scope="row">${v}</th>` : typeof v === 'number' ? html`<td class="num">${v}</td>` : html`<td>${v}</td>`))}</tr>`)}</tbody>
</table></div>`;
}
