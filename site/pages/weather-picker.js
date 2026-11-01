// Fills the weather tool's daily temperatures from the nearest NOAA station.
// The ZIP stays on this device: the requests are for the ZIP prefix table, the
// state lookup shard, and the station's state shards, none of which names the
// ZIP, the station, or a county.

import { getJson, utilitiesForZip } from './zip-utilities.js';
import { rankStations, dailyMeans, isoOfDay } from '../../core/lib/weather-stations.mjs';
import { coverage, GAP_FLOOR_DAYS } from '../../core/lib/weather-model.mjs';
import { readShard } from '../../core/lib/shard.mjs';
import { parsePeriods } from '../../core/lib/bill-entry.mjs';
import { createI18n } from '../lib/i18n.mjs';
import strings from '../strings/en-US.mjs';

const { t } = createI18n(strings, 'en-US');
const picker = document.querySelector('[data-weather-picker]');
const form = document.querySelector('[data-inputs]');
const select = picker.querySelector('[data-weather-station]');
const note = picker.querySelector('[data-picker-note]');
const el = (tag, text, attrs = {}) => Object.assign(document.createElement(tag), { textContent: text ?? '' }, attrs);
const shardCache = new Map();
const shard = (path) => shardCache.get(path) ?? shardCache.set(path, fetch(path).then((r) => (r.ok ? r.arrayBuffer() : Promise.reject(new Error(`${r.status}`)))).then((b) => readShard(b).rows())).get(path);
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
  const meta = await getJson('/weather/meta.json');
  const base = `/data/${meta.dataset}/${meta.version}`;
  const [daily, normals] = await Promise.all([shard(`${base}/daily/${s.state}.bin`), shard(`${base}/normals/${s.state}.bin`)]);
  const { means, flagged } = dailyMeans(daily, s.station);
  const days = [...means.keys()].sort();
  if (!days.length) { note.append(el('p', t('weather.none', { name: s.name }))); return; }
  const [from, to] = span(days.at(-1));
  const lines = [`station ${s.station} ${s.name}`];
  for (const d of days) if (d >= from && d <= to) lines.push(`${d} ${Math.round(means.get(d) * 10) / 10}`);
  for (const r of normals.filter((x) => x.station === s.station)) {
    lines.push(`normal ${String(r.month).padStart(2, '0')}-${String(r.day).padStart(2, '0')} ${Object.entries(r).filter(([k, v]) => /^(htdd|cldd)_/.test(k) && v !== null).map(([k, v]) => `${k}=${v}`).join(' ')}`);
  }
  form.elements.namedItem('weather').value = lines.join('\n');
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
  const found = await utilitiesForZip(new FormData(e.target).get('zip'));
  const { parsed } = found;
  picker.querySelector('[data-picker-error]').textContent = parsed.ok ? '' : parsed.reason === 'four-digits' ? t('lookup.error.four', { suggestion: parsed.suggestion }) : t(`lookup.error.${parsed.reason}`);
  if (!parsed.ok) return;
  const shards = Object.values(found.shards);
  const point = shards.map((s) => s.points?.[parsed.zip]).find(Boolean);
  if (!point) { note.replaceChildren(el('p', t('weather.noZip'))); return; }
  // Stations from every shard the ZIP needs, once each.
  const all = new Map();
  for (const s of shards) for (const [station, name, state, lat, lon, elevation, first, last] of s.stations ?? []) all.set(station, { station, name, state, lat, lon, elevation, first_year: first, last_year: last });
  ranked = rankStations({ lat: point[0], lon: point[1] }, [...all.values()], 5);
  select.replaceChildren(...ranked.map((s, i) => el('option', t('weather.option', { name: s.name, miles: s.miles.toFixed(1) }), { value: String(i) })));
  picker.querySelector('[data-weather-station-field]').hidden = false;
  await choose();
});
select.addEventListener('change', choose);
picker.dataset.ready = 'true';
