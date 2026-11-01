// The cleanest-hours picker: fetches the region list, then one region's
// typical hours, draws the month's typical day, names its cleanest and
// dirtiest two-hour windows, and fills the calculator with the year-round
// intensity of the two windows the visitor chose.

import { getJson } from './zip-utilities.js';
import { ATTRIBUTIONAL, CAVEAT, windows, yearWindowMean } from '../../core/lib/hourly-carbon.mjs';
import { lineChart, tableView } from '../lib/chart.mjs';
import { html } from '../lib/html.mjs';
import { MONTHS, clock } from '../ui/cleanest-picker.mjs';
import { createI18n } from '../lib/i18n.mjs';
import strings from '../strings/en-US.mjs';

const { t } = createI18n(strings, 'en-US');
const picker = document.querySelector('[data-cleanest-picker]');
const form = document.querySelector('[data-inputs]');
const region = picker.querySelector('[data-cleanest-region]');
const month = picker.querySelector('[data-cleanest-month]');
const note = picker.querySelector('[data-cleanest-note]');
const win = (k) => Number(picker.querySelector(`[data-cleanest-window="${k}"]`).value);
const lb = (x) => Math.round(x).toLocaleString('en-US');
const span = (w) => `${clock(w.from)} to ${clock(w.to)}`;
let regions = null;

async function show() {
  const r = regions?.regions.find((x) => x.ba === region.value);
  if (!r) { note.innerHTML = ''; return; }
  const typ = r.typicalYears.length ? await getJson(`/carbon/typical/${r.ba}.json`).catch(() => null) : null;
  if (!typ) { note.innerHTML = String(html`<p>${t('cleanest.none', { name: r.name })}</p>`); picker.dataset.chosen = r.ba; return; }
  const m = typ.months[Number(month.value) - 1];
  const w = windows(m);
  const hours = m.hours.filter((h) => h.median !== null);
  const dirtiest = hours.reduce((a, b) => (b.median > a.median ? b : a), hours[0]);
  const chart = lineChart({
    title: t('cleanest.chartTitle', { name: r.name, month: MONTHS[m.month - 1] }),
    summary: t('cleanest.chartSummary', { dirty: span(w.dirtiest), clean: span(w.cleanest) }),
    yUnit: 'lb CO₂/MWh',
    series: [
      { label: t('cleanest.median'), x: hours.map((h) => h.hour), y: hours.map((h) => h.median) },
      { label: t('cleanest.q1'), x: hours.map((h) => h.hour), y: hours.map((h) => h.q1), role: 'compare' },
      { label: t('cleanest.q3'), x: hours.map((h) => h.hour), y: hours.map((h) => h.q3), role: 'compare' },
    ],
    xTick: (x) => clock(Math.round(x)),
    highlight: { x: dirtiest.hour, y: dirtiest.median, label: t('cleanest.dirtiestHour', { hour: clock(dirtiest.hour) }) },
  });
  const table = tableView([t('cleanest.col.hour'), t('cleanest.median'), t('cleanest.q1'), t('cleanest.q3')], m.hours.map((h) => [clock(h.hour), h.median === null ? '' : lb(h.median), h.q1 === null ? '' : lb(h.q1), h.q3 === null ? '' : lb(h.q3)]), t('cleanest.tableCaption', { month: MONTHS[m.month - 1] }));
  const now = yearWindowMean(typ.months, [win('now-from'), win('now-to')]);
  const move = yearWindowMean(typ.months, [win('move-from'), win('move-to')]);
  if (now !== null && move !== null) {
    form.elements.namedItem('currentLbPerMwh').value = String(Math.round(now * 10) / 10);
    form.elements.namedItem('proposedLbPerMwh').value = String(Math.round(move * 10) / 10);
    form.dispatchEvent(new Event('input', { bubbles: true }));
  }
  const sentence = t('cleanest.sentence', { month: MONTHS[m.month - 1], name: r.name, clean: span(w.cleanest), cleanLb: lb(w.cleanest.mean), dirty: span(w.dirtiest), dirtyLb: lb(w.dirtiest.mean) });
  note.innerHTML = String(html`<p class="sentence" data-cleanest-sentence>${sentence}</p>
    ${chart}
    <details><summary>${t('cleanest.table')}</summary>${table}</details>
    ${now !== null && move !== null ? html`<p data-cleanest-filled>${t('cleanest.filled', { now: lb(now), move: lb(move) })}</p>` : ''}
    <p class="strip">${ATTRIBUTIONAL}</p>
    <p class="unit-hint">${t('cleanest.basis', { years: typ.years.join(', '), zone: typ.zone })} ${CAVEAT}</p>
    <p class="unit-hint">${regions.attribution}</p>`);
  picker.dataset.chosen = r.ba;
}

regions = await getJson('/carbon/regions.json').catch(() => null);
if (regions) {
  for (const r of [...regions.regions].filter((x) => x.typicalYears.length).sort((a, b) => a.name.localeCompare(b.name))) region.append(Object.assign(document.createElement('option'), { value: r.ba, textContent: `${r.name} (${r.ba})` }));
}
month.value = String(new Date().getMonth() + 1);
// A region page links here with ?region=PJM.
const asked = new URLSearchParams(location.search).get('region');
if (asked && region.querySelector(`option[value="${CSS.escape(asked)}"]`)) { region.value = asked; await show(); }
for (const el of [region, month, ...picker.querySelectorAll('[data-cleanest-window]')]) el.addEventListener('change', show);
picker.dataset.ready = 'true';
