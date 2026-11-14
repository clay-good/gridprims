// Runs the ZIP and county lookup on the device. The only requests are for the
// prefix table and the state shard (or shards) a ZIP needs; the ZIP, county,
// and results never leave the page.

import { countiesMatching, lookupCounty, lookupZip, parseZip, statesFor } from '../../core/lib/zip-lookup.mjs';
import { createI18n } from '../lib/i18n.mjs';
import strings from '../strings/en-US.mjs';

const { t } = createI18n(strings, 'en-US');
const zipForm = document.querySelector('[data-lookup-zip]');
// Arriving from the home page's ZIP door, or from the command bar's place
// entry: fill the fields and run them.
// The fragment first: a place typed into the command bar travels there, because
// a fragment is never sent to the host. A query string is still honoured.
const params = new URLSearchParams(location.hash.slice(1) || location.search);
const fromUrl = params.get('zip');
const countyForm = document.querySelector('[data-lookup-county]');
const out = document.querySelector('[data-lookup-result]');
const zipError = document.querySelector('[data-zip-error]');
const stateSelect = countyForm.querySelector('select[name=state]');
const countySelect = countyForm.querySelector('select[name=county]');

const cache = new Map();
const get = (path) => cache.get(path) ?? cache.set(path, fetch(path).then((r) => (r.ok ? r.json() : Promise.reject(new Error(`${r.status}`))))).get(path);
const shard = (st) => get(`/lookup/${st}.json`);

const el = (tag, text, attrs = {}) => Object.assign(document.createElement(tag), { textContent: text ?? '' }, attrs);
const number = (n) => Math.round(n).toLocaleString('en-US');

function utilityItem(u) {
  const li = el('li');
  const link = u.page ? el('a', u.name, { href: `/utilities/${u.id}/` }) : el('span', u.name);
  li.append(link, document.createTextNode(` · ${u.state} · ${t('lookup.customers', { count: number(u.customers) })}${u.ownership ? ` · ${u.ownership}` : ''}`));
  return li;
}

function render(r, heading) {
  out.replaceChildren(el('h2', heading));
  if (r.counties.length) out.append(el('p', t('lookup.counties', { list: r.counties.map((c) => `${c.name}, ${c.state}`).join('; ') })));
  if (r.utilities.length) {
    out.append(el('h3', t('lookup.utilities')));
    const ul = el('ul', '', { className: 'tool-list' });
    ul.append(...r.utilities.map(utilityItem));
    out.append(ul);
    if (r.utilities.length > 1) out.append(el('p', t('lookup.several'), { className: 'strip' }));
  } else out.append(el('p', t('lookup.none')));
  if (r.marketers.length) {
    out.append(el('h3', t('lookup.marketers')));
    const ul = el('ul', '', { className: 'tool-list' });
    ul.append(...r.marketers.map(utilityItem));
    out.append(ul, el('p', t('lookup.marketersNote')));
  }
  if (r.subregions.length) out.append(el('p', t(r.subregions.length > 1 ? 'lookup.subregionsMany' : 'lookup.subregion', { list: r.subregions.join(', ') })));
  if (r.bas.length) out.append(el('p', t('lookup.bas', { list: r.bas.join(', ') })));
}

/** Utility page flags: the shard does not carry them, so mark a utility linkable when its page exists. */
async function withPages(r) {
  const pages = await get('/lookup/pages.json');
  const mark = (u) => ({ ...u, page: pages.includes(u.id) });
  return { ...r, utilities: r.utilities.map(mark), marketers: r.marketers.map(mark) };
}

zipForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const parsed = parseZip(new FormData(zipForm).get('zip'));
  if (!parsed.ok) {
    zipError.textContent = parsed.reason === 'four-digits' ? t('lookup.error.four', { suggestion: parsed.suggestion }) : t(`lookup.error.${parsed.reason}`);
    out.replaceChildren();
    return;
  }
  zipError.textContent = '';
  const zip3 = await get('/lookup/zip3.json');
  const states = statesFor(parsed.zip, zip3);
  if (!states.length) { out.replaceChildren(el('p', t('lookup.unknownPrefix'))); return; }
  const shards = Object.fromEntries(await Promise.all(states.map(async (st) => [st, await shard(st)])));
  const r = await withPages(lookupZip(parsed.zip, shards));
  if (!r.hasZcta) {
    out.replaceChildren(el('h2', t('lookup.resultZip', { zip: parsed.zip })), el('p', t('lookup.noZcta')));
    if (r.subregions.length) out.append(el('p', t(r.subregions.length > 1 ? 'lookup.subregionsMany' : 'lookup.subregion', { list: r.subregions.join(', ') })));
  } else render(r, t('lookup.resultZip', { zip: parsed.zip }));
  out.append(el('p', t('lookup.zctaNote'), { className: 'strip' }));
  document.documentElement.dataset.lookupDone = parsed.zip;
});

/** Fill the county menu from a state's shard; the shard is fetched once and cached. */
async function fillCounties(st) {
  countySelect.replaceChildren(el('option', st ? t('lookup.chooseCounty') : t('lookup.chooseStateFirst'), { value: '' }));
  countySelect.disabled = !st;
  if (!st) return;
  const s = await shard(st);
  countySelect.append(...countiesMatching(s, '').map((c) => el('option', c.name, { value: c.fips })));
}

stateSelect.addEventListener('change', () => fillCounties(stateSelect.value));

countyForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const st = stateSelect.value;
  const fips = countySelect.value;
  if (!st || !fips) { out.replaceChildren(el('p', t('lookup.error.county'))); return; }
  const r = await withPages(lookupCounty(st, fips, await shard(st)));
  render(r, t('lookup.resultCounty', { county: r.counties[0].name, state: st }));
});

if (fromUrl) {
  zipForm.elements.namedItem('zip').value = fromUrl;
  zipForm.requestSubmit();
}

// A county from the command bar: pick the state, fill its counties, and run it.
const countyState = params.get('state');
const countyFips = params.get('county');
if (countyState && countyFips) {
  stateSelect.value = countyState;
  fillCounties(countyState).then(() => {
    countySelect.value = countyFips;
    // An unknown county leaves the picker ready rather than running an empty lookup.
    if (countySelect.value === countyFips) countyForm.requestSubmit();
  }, () => {});
}

document.documentElement.dataset.ready = '1';
