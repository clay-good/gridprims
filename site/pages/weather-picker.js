// Fills the weather tool's daily temperatures from the nearest NOAA station.
// The ZIP stays on this device: the requests are for the ZIP prefix table, the
// state lookup shard, and the station's state shards, none of which names the
// ZIP, the station, or a county.

import { stationsForZip, stationWeather } from './weather-stations.js';
import { coverage, GAP_FLOOR_DAYS } from '../../core/lib/weather-model.mjs';
import { parsePeriods } from '../../core/lib/bill-entry.mjs';
import { createI18n } from '../lib/i18n.mjs';
import strings from '../strings/en-US.mjs';

const { t } = createI18n(strings, 'en-US');
const picker = document.querySelector('[data-weather-picker]');
const form = document.querySelector('[data-inputs]');
const select = picker.querySelector('[data-weather-station]');
const note = picker.querySelector('[data-picker-note]');
const el = (tag, text, attrs = {}) => Object.assign(document.createElement(tag), { textContent: text ?? '' }, attrs);
let ranked = [];

/** The span the bills cover, or the latest two years of the station when no bills are entered yet. */
function span(lastDay) {
  const { periods } = parsePeriods(form.elements.namedItem('periods').value);
  const dates = periods.flatMap((p) => [p.start, p.end]).sort();
  if (dates.length) return [dates[0], dates.at(-1)];
  return [new Date(Date.parse(`${lastDay}T00:00:00Z`) - 729 * 86_400_000).toISOString().slice(0, 10), lastDay];
}

async function choose() {
  const s = ranked[Number(select.value)];
  note.replaceChildren();
  if (!s) return;
  const { meta, means, flagged, from, to, text } = await stationWeather(s, span);
  if (!text) { note.append(el('p', t('weather.none', { name: s.name }))); return; }
  form.elements.namedItem('weather').value = text;
  form.dispatchEvent(new Event('input', { bubbles: true }));
  const c = coverage(means, from, to);
  const next = ranked.find((x) => x !== s);
  note.append(
    el('p', t('weather.receipt', { name: s.name, id: s.station, miles: s.miles.toFixed(1), elevation: Math.round(s.elevation * 3.28084).toLocaleString('en-US'), first: s.first_year, last: s.last_year, share: (c.share * 100).toFixed(1), from, to }), { className: 'sentence' }),
    ...(flagged ? [el('p', t('weather.flagged', { count: flagged.toLocaleString('en-US') }), { className: 'unit-hint' })] : []),
    ...c.gaps.map((g) => el('p', t('weather.gap', { days: g.days, from: g.from, to: g.to, floor: GAP_FLOOR_DAYS, next: next ? next.name : '' }), { className: 'warning-chip' })),
    el('p', meta.attribution, { className: 'unit-hint' }),
  );
  picker.dataset.chosen = s.station;
}

picker.querySelector('[data-picker-zip]').addEventListener('submit', async (e) => {
  e.preventDefault();
  const { parsed, stations, noPoint } = await stationsForZip(new FormData(e.target).get('zip'));
  picker.querySelector('[data-picker-error]').textContent = parsed.ok ? '' : parsed.reason === 'four-digits' ? t('lookup.error.four', { suggestion: parsed.suggestion }) : t(`lookup.error.${parsed.reason}`);
  if (!parsed.ok) return;
  if (noPoint) { note.replaceChildren(el('p', t('weather.noZip'))); return; }
  ranked = stations;
  select.replaceChildren(...ranked.map((s, i) => el('option', t('weather.option', { name: s.name, miles: s.miles.toFixed(1) }), { value: String(i) })));
  picker.querySelector('[data-weather-station-field]').hidden = false;
  await choose();
});
select.addEventListener('change', choose);
picker.dataset.ready = 'true';
