// Builds the ambient-adjusted rating table from the ampacity tool's current
// inputs, on this device, and offers it as CSV.

import { ratingTable, ratingTableCsv, US } from '../../core/lib/line-rating.mjs';
import { createI18n } from '../lib/i18n.mjs';
import strings from '../strings/en-US.mjs';

const { t } = createI18n(strings, 'en-US');
const panel = document.querySelector('[data-rating-table]');
const form = document.querySelector('[data-inputs]');
const out = panel.querySelector('[data-table-result]');
const num = (name) => Number(String(form.elements.namedItem(name)?.value ?? '').replace(/[,\s]/g, ''));

panel.querySelector('[data-table-make]').addEventListener('click', () => {
  const us = form.elements.namedItem('units').value === 'us';
  const date = String(form.elements.namedItem('date').value);
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  const from = Number(panel.querySelector('[name=from]').value);
  const to = Number(panel.querySelector('[name=to]').value);
  if (!m || !(to > from)) { out.replaceChildren(Object.assign(document.createElement('p'), { className: 'errors', textContent: t('lineTable.fix') })); return; }
  const doy = Math.round((Date.UTC(+m[1], +m[2] - 1, +m[3]) - Date.UTC(+m[1], 0, 1)) / 86_400_000) + 1;
  const c = { diameterM: us ? num('diameter') * US.inch : num('diameter') / 1000, r1: us ? num('r1') * US.ohmPerMile : num('r1') / 1000, t1: num('t1'), r2: us ? num('r2') * US.ohmPerMile : num('r2') / 1000, t2: num('t2'), emissivity: num('emissivity'), absorptivity: num('absorptivity') };
  const w = { windMps: us ? num('wind') * US.ftPerS : num('wind'), windAngleDeg: num('windAngle'), elevationM: us ? num('elevation') * US.ft : num('elevation'), latitude: num('latitude'), lineAzimuthDeg: num('lineAzimuth'), dayOfYear: doy, solarHour: num('solarHour') };
  const rows = ratingTable(c, w, num('maxTemp'), { fromC: from, toC: to });
  const assumptions = [
    `Conductor: diameter ${num('diameter')} ${us ? 'in' : 'mm'}; AC resistance ${num('r1')} at ${num('t1')} °C and ${num('r2')} at ${num('t2')} °C (${us ? 'Ω/mile' : 'Ω/km'}); emissivity ${num('emissivity')}, absorptivity ${num('absorptivity')}; maximum ${num('maxTemp')} °C.`,
    `Wind: ${num('wind')} ${us ? 'ft/s' : 'm/s'} at ${num('windAngle')} degrees to the conductor, held fixed.`,
    `Day rows: clear-sky sun on ${date} at solar hour ${num('solarHour')}, latitude ${num('latitude')}, line bearing ${num('lineAzimuth')} degrees, elevation ${num('elevation')} ${us ? 'ft' : 'm'}. Night rows: no sun.`,
  ];
  const csv = ratingTableCsv(rows, assumptions);
  const a = Object.assign(document.createElement('a'), { className: 'button', textContent: t('lineTable.download', { rows: rows.length }), download: 'gridprims-conductor-rating-table.csv', href: URL.createObjectURL(new Blob([csv], { type: 'text/csv' })) });
  out.replaceChildren(a, Object.assign(document.createElement('p'), { className: 'unit-hint', textContent: t('lineTable.summary', { from, to, low: Math.round(rows.at(-1).dayAmps), high: Math.round(rows[0].dayAmps) }) }));
  panel.dataset.rows = String(rows.length);
  panel.dataset.csv = csv;
});
panel.dataset.ready = 'true';
