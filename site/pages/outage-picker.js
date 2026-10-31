// Fills the outage length from the county's EAGLE-I history and shows the
// battery for each duration. The ZIP stays on this device.

import { getJson, utilitiesForZip } from './zip-utilities.js';
import { lookupZip } from '../../core/lib/zip-lookup.mjs';
import { battery, COUNTY_PROXY, parseLoads, profile } from '../../core/lib/backup-power.mjs';
import { createI18n } from '../lib/i18n.mjs';
import strings from '../strings/en-US.mjs';

const { t } = createI18n(strings, 'en-US');
const picker = document.querySelector('[data-outage-picker]');
const form = document.querySelector('[data-inputs]');
const select = picker.querySelector('[data-picker-county]');
const note = picker.querySelector('[data-picker-note]');
const el = (tag, text, attrs = {}) => Object.assign(document.createElement(tag), { textContent: text ?? '' }, attrs);
const h1 = (x) => x.toLocaleString('en-US', { maximumFractionDigits: 2 });
let counties = [];

async function choose() {
  const c = counties[Number(select.value)];
  note.replaceChildren();
  if (!c) return;
  const data = await getJson(`/outages/${c.state}.json`).catch(() => null);
  const h = data?.counties[c.fips];
  if (!h || !h.count) { note.append(el('p', t('outage.none', { county: c.name ?? c.fips }))); picker.dataset.chosen = c.fips; return; }
  form.elements.namedItem('hours').value = String(h.p90);
  form.dispatchEvent(new Event('input', { bubbles: true }));
  const usable = Number(form.elements.namedItem('usable').value) / 100 || 0.8;
  const { loads } = parseLoads(form.elements.namedItem('loads').value);
  const kw = profile(loads);
  const rows = [['p50', h.p50], ['p90', h.p90], ['longest', h.longest]].map(([k, hours]) => {
    const b = battery(kw, hours, usable);
    const tr = document.createElement('tr');
    tr.append(el('th', t(`outage.${k}`), { scope: 'row' }), ...[hours, b.usableKwh, b.nameplateKwh].map((x) => el('td', h1(x), { className: 'num' })));
    return tr;
  });
  const table = document.createElement('table');
  table.dataset.outageTable = '';
  const head = document.createElement('tr');
  head.append(...['duration', 'hours', 'usable', 'nameplate'].map((k, i) => el('th', t(`outage.col.${k}`), { scope: 'col', className: i ? 'num' : '' })));
  table.createTHead().append(head);
  table.createTBody().append(...rows);
  note.append(
    el('p', t('outage.summary', { county: c.name ?? c.fips, count: h.count.toLocaleString('en-US'), p50: h1(h.p50), p90: h1(h.p90), longest: h1(h.longest), from: h.years[0], to: h.years.at(-1) }), { className: 'sentence' }),
    table,
    el('p', COUNTY_PROXY, { className: 'strip' }),
    el('p', [t('outage.years', { years: h.years.join(', ') }), h.dropped.length ? t('outage.dropped', { years: h.dropped.map((d) => `${d.year} (${d.pct}%)`).join(', ') }) : '', h.unpublished.length ? t('outage.unpublished', { years: h.unpublished.join(', ') }) : ''].filter(Boolean).join(' '), { className: 'unit-hint' }),
    el('p', t('outage.source', { release: data.release }), { className: 'unit-hint' }),
  );
  picker.dataset.chosen = c.fips;
}

picker.querySelector('[data-picker-zip]').addEventListener('submit', async (e) => {
  e.preventDefault();
  const found = await utilitiesForZip(new FormData(e.target).get('zip'));
  const { parsed } = found;
  picker.querySelector('[data-picker-error]').textContent = parsed.ok ? '' : parsed.reason === 'four-digits' ? t('lookup.error.four', { suggestion: parsed.suggestion }) : t(`lookup.error.${parsed.reason}`);
  if (!parsed.ok) return;
  counties = lookupZip(parsed.zip, found.shards).counties;
  if (!counties.length) { note.replaceChildren(el('p', t('outage.noCounty'))); return; }
  select.replaceChildren(...counties.map((c, i) => el('option', `${c.name ?? c.fips} · ${c.state}`, { value: String(i) })));
  picker.querySelector('[data-picker-county-field]').hidden = false;
  await choose();
});
select.addEventListener('change', choose);
picker.dataset.ready = 'true';
