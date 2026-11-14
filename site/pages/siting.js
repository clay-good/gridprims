// The siting read-out, computed on the device (siting/where-and-how-long).
// Requests go only for the ZIP prefix table, the state shards that ZIP needs,
// the utility prefill, and that state's queue summaries. The ZIP and the size
// are never sent anywhere.

import { sitingReadout } from '../../core/lib/siting.mjs';
import { lookupZip, parseZip, statesFor } from '../../core/lib/zip-lookup.mjs';
import { createI18n } from '../lib/i18n.mjs';
import strings from '../strings/en-US.mjs';
import { getJson } from './zip-utilities.js';

const { t } = createI18n(strings, 'en-US');
const root = document.querySelector('[data-siting]');
const form = root?.querySelector('[data-siting-form]');
const out = root?.querySelector('[data-siting-answer]');
const zipError = root?.querySelector('[data-siting-error]');

const el = (tag, text, attrs = {}) => Object.assign(document.createElement(tag), { textContent: text ?? '' }, attrs);
const n0 = (x) => Math.round(x).toLocaleString('en-US');
const n1 = (x) => x.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
/** A share small enough to round to zero still has to read as a real number. */
const pct = (x) => (x >= 1 ? `${n1(x)}%` : x >= 0.01 ? `${x.toFixed(2)}%` : 'under 0.01%');

/** The measured plate: the one number this page exists to give, with its basis stamped under it. */
function plate(label, value, unit, sentence, basis) {
  const sign = el('div', null, { className: 'sign' });
  sign.append(el('p', label, { className: 'label' }));
  const num = el('p', value, { className: 'number' });
  num.append(el('span', unit, { className: 'unit' }));
  sign.append(num, el('p', sentence, { className: 'sentence' }), el('span', basis, { className: 'source-tab' }));
  const wrap = el('div', null, { className: 'answer' });
  wrap.append(sign);
  return wrap;
}

function utilityBlock(u) {
  const li = el('li', null, { className: 'siting-utility' });
  li.append(el('h3', u.name));
  const lines = [];
  if (u.salesShare !== null) {
    lines.push(t('siting.out.sales', {
      pct: pct(u.salesShare), energy: n0(u.energyMwh), sales: n0(u.salesMwh), year: String(u.salesYear), lf: String(u.loadFactor),
    }));
  }
  if (u.homes !== null) lines.push(t('siting.out.homes', { homes: n0(u.homes) }));
  if (u.peakShare !== null) {
    // Whose peak this is of is part of the sentence, never an unlabelled percentage.
    lines.push(t(u.peakBasis === 'utility' ? 'siting.out.peakOwn' : 'siting.out.peakBa', {
      pct: pct(u.peakShare), owner: u.peakOwner, mw: n0(u.peakMw), year: String(u.peakYear),
    }));
  } else {
    lines.push(t('siting.out.noPeak'));
  }
  for (const line of lines) li.append(el('p', line));
  return li;
}

function queueBlock(q, negatives) {
  const sec = el('section', null, { className: 'panel siting-queue' });
  sec.append(el('h3', t('siting.out.queueTitle', { county: q.county ?? '' })));
  if (!q.found) {
    sec.append(el('p', t('siting.out.queueNone')));
    return sec;
  }
  sec.append(el('p', t('siting.out.queueActive', { mw: n0(q.activeMw), n: String(q.activeCount) })));
  const types = Object.entries(q.byType).sort((a, b) => b[1].mw - a[1].mw);
  if (types.length) sec.append(el('p', t('siting.out.queueMix', { mix: types.map(([k, v]) => `${k} ${n0(v.mw)} MW (${v.count})`).join(', ') })));
  if (q.medianYears !== null) sec.append(el('p', t('siting.out.queueMedian', { years: n1(q.medianYears), through: q.through })));
  if (q.withdrawnShare !== null) {
    sec.append(el('p', t('siting.out.withdrawnCounty', { pct: n0(q.withdrawnShare * 100), n: String(q.withdrawnCohort) })));
  } else if (q.stateWithdrawnShare !== null) {
    sec.append(el('p', t('siting.out.withdrawnState', { state: q.state, pct: n0(q.stateWithdrawnShare * 100), n: String(q.stateWithdrawnCohort) })));
  }
  // The publisher's own negative capacities are named, never quietly corrected.
  if (negatives.length) {
    sec.append(el('p', t('siting.out.negative', {
      n: String(q.negative?.count ?? negatives.length), types: negatives.join(', '), mw: n0(q.negative?.mw ?? 0),
    }), { className: 'unit-hint' }));
  }
  sec.append(el('p', t('siting.out.queueBasis', { release: q.release ?? '', asOf: q.asOf ?? '', through: q.through }), { className: 'unit-hint' }));
  return sec;
}

function processBlock(p, mw) {
  const sec = el('section', null, { className: 'panel' });
  sec.append(el('h3', t('siting.out.processTitle')));
  if (!p.applies) {
    sec.append(el('p', t('siting.out.processLoad')));
    return sec;
  }
  sec.append(el('p', p.reason));
  if (p.process === 'large') sec.append(el('p', t('siting.out.processLarge', { mw: n0(mw) })));
  else {
    const a = el('a', t('siting.out.processScreens'), { href: '/tools/interconnect/fast-track/screens/' });
    const para = el('p');
    para.append(a);
    sec.append(para);
  }
  return sec;
}

async function run(zipText, mw, direction) {
  const parsed = parseZip(zipText);
  if (!parsed.ok) {
    zipError.textContent = parsed.reason === 'four-digits' ? t('lookup.error.four', { suggestion: parsed.suggestion }) : t(`lookup.error.${parsed.reason}`);
    return;
  }
  if (!(mw > 0)) {
    zipError.textContent = t('siting.error.mw');
    return;
  }
  zipError.textContent = '';
  out.replaceChildren(el('p', t('siting.working')));

  const states = statesFor(parsed.zip, await getJson('/lookup/zip3.json'));
  const shards = Object.fromEntries(await Promise.all(states.map(async (st) => [st, await getJson(`/lookup/${st}.json`)])));
  const found = states.length ? lookupZip(parsed.zip, shards) : null;
  if (!found || !found.utilities.length) {
    out.replaceChildren(el('p', t('siting.out.noPlace', { zip: parsed.zip })));
    return;
  }
  const county = found.counties[0] ?? null;
  const prefill = await getJson('/large-load/utilities.json');
  const byId = new Map(prefill.utilities.map((u) => [u.id, u]));
  // A state with no queued requests has no file; that is not an error.
  const stateQueue = county ? await getJson(`/queue/${county.state.toLowerCase()}.json`).catch(() => null) : null;

  const r = sitingReadout(
    { mw, direction },
    { state: county?.state ?? states[0], county: county && { fips: county.fips, name: county.name }, utilities: found.utilities, bas: found.bas, subregions: found.subregions },
    byId,
    stateQueue,
  );

  const shares = r.utilities.map((u) => u.salesShare).filter((x) => x !== null);
  const frag = document.createDocumentFragment();
  if (shares.length) {
    const low = Math.min(...shares);
    const high = Math.max(...shares);
    const smallest = r.utilities.find((u) => u.salesShare === high);
    frag.append(plate(
      t('siting.out.label', { direction: t(`siting.direction.${direction}`).toLowerCase() }),
      pct(high).replace('%', ''),
      '% of sales',
      shares.length > 1
        ? t('siting.out.leadRange', { mw: n0(mw), low: pct(low), high: pct(high), name: smallest.name })
        : t('siting.out.lead', { mw: n0(mw), name: smallest.name, pct: pct(high), homes: n0(smallest.homes ?? 0) }),
      t('siting.out.basis', { county: county?.name ?? '', state: county?.state ?? '', ba: r.bas.join(', ') || '—' }),
    ));
  }
  const list = el('ul', null, { className: 'siting-utilities' });
  for (const u of r.utilities) list.append(utilityBlock(u));
  const utils = el('section');
  utils.append(el('h2', t('siting.out.utilitiesTitle', { n: String(r.utilities.length) })), list);
  frag.append(utils);
  if (r.queue) frag.append(queueBlock({ ...r.queue, county: county?.name ?? r.queue.county }, r.negativeTypes));
  frag.append(processBlock(r.process, mw));
  out.replaceChildren(frag);
  document.documentElement.dataset.sitingDone = parsed.zip;
}

form?.addEventListener('submit', (e) => {
  e.preventDefault();
  const data = new FormData(form);
  run(String(data.get('zip') ?? ''), Number(data.get('mw')), String(data.get('direction')));
});

if (root) root.dataset.ready = 'true';
