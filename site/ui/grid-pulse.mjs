// The grid pulse in the top rail (platform/app-shell, "Grid pulse shows dated
// real data"): the 14 most recent daily peak demand values from our EIA-930
// snapshot, stamped "as of" with the source. Never animated, never called
// live, and hidden entirely until a snapshot exists.

import { html, raw } from '../lib/html.mjs';

/**
 * @param {{region: string, asOf: string, source: string, values: Array<{date: string, mw: number}>} | null} snapshot
 * @param {{t: Function, date: Function}} i18n
 */
export function gridPulse(snapshot, { t, date }) {
  const values = snapshot?.values?.slice(-14) ?? [];
  if (values.length < 2) return '';
  const w = 112;
  const h = 24;
  const lo = Math.min(...values.map((v) => v.mw));
  const hi = Math.max(...values.map((v) => v.mw));
  const pts = values.map((v, i) => `${((i / (values.length - 1)) * w).toFixed(1)},${(h - 2 - ((v.mw - lo) / (hi - lo || 1)) * (h - 4)).toFixed(1)}`).join(' ');
  const last = values[values.length - 1];
  const label = t('pulse.label', { region: snapshot.region, mw: Math.round(last.mw).toLocaleString('en-US'), asOf: date(snapshot.asOf) });
  return html`<p class="pulse" title="${t('pulse.source', { source: snapshot.source })}">
    <svg viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" role="img" aria-label="${label}">${raw(`<polyline fill="none" stroke="currentColor" stroke-width="1.5" points="${pts}"/>`)}</svg>
    <span class="mono">${t('pulse.asOf', { asOf: date(snapshot.asOf) })}</span>
  </p>`;
}
