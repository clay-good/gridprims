// The source stamp (DESIGN.md "Source stamp"; platform/data-snapshots, "Source
// stamp wherever data appears"): publisher, dataset, period, as-of, retrieved,
// license, and a staleness chip the device reveals at view time.

import { html } from '../lib/html.mjs';
import { GLYPHS } from './glyphs.mjs';
import { lateness } from '../../core/lib/lateness.mjs';

/**
 * @param {any} manifest a dataset version manifest
 * @param {any} table one of its tables
 * @param {{t: Function, date: Function}} i18n
 */
export function sourceStamp(manifest, table, { t, date }) {
  const late = lateness(manifest);
  return html`<p class="source-stamp mono">${t('data.stamp', { publisher: manifest.publisher, title: manifest.title, period: table.dataPeriod, asOf: date(manifest.asOf), retrieved: date(manifest.retrieved), license: table.license })}
  <span class="warning-chip" data-late-from="${late.lateFrom}" hidden>${GLYPHS.diamond} ${t('data.stale', { due: date(late.due), checked: date(manifest.retrieved) })}</span></p>`;
}
