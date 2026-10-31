// Fills the bill check's tariff input from a utility's URDB residential
// rates or from a tariff entered by hand. Requests go only for the ZIP
// prefix table and the state shards a ZIP needs; the ZIP stays here.

import { getJson as get, utilitiesForZip } from './zip-utilities.js';
import { createI18n } from '../lib/i18n.mjs';
import strings from '../strings/en-US.mjs';

const { t } = createI18n(strings, 'en-US');
const picker = document.querySelector('[data-tariff-picker]');
const tariffInput = document.querySelector('[data-inputs] [name=tariff]');
const zipForm = picker.querySelector('[data-picker-zip]');
const zipError = picker.querySelector('[data-picker-error]');
const utilityField = picker.querySelector('[data-picker-utility-field]');
const utilitySelect = picker.querySelector('[data-picker-utility]');
const rateField = picker.querySelector('[data-picker-rate-field]');
const rateSelect = picker.querySelector('[data-picker-rate]');
const note = picker.querySelector('[data-picker-note]');
const manual = picker.querySelector('[data-picker-manual]');
const retail = picker.querySelector('[data-picker-retail]');
const cca = picker.querySelector('[data-picker-cca]');

const el = (tag, text, attrs = {}) => Object.assign(document.createElement(tag), { textContent: text ?? '' }, attrs);
const cents = (rate) => `${(rate * 100).toLocaleString('en-US', { maximumFractionDigits: 3 })}¢`;
let utilities = [];
let rates = [];
let base = null; // the tariff chosen or entered, before any CCA charges are added

/** Write the tariff the tool reads and let the calculator recompute. CCA charges, when entered, ride on top. */
function setTariff(tariff, { keepBase = false } = {}) {
  if (!keepBase) base = tariff;
  const v = values(cca);
  const charges = [...(tariff.charges ?? [])];
  if (v.generation > 0) charges.push({ label: t('bill.cca.generationLine'), perKwh: v.generation / 100 });
  if (v.pcia > 0) charges.push({ label: t('bill.cca.pciaLine'), perKwh: v.pcia / 100 });
  tariffInput.value = JSON.stringify(charges.length ? { ...tariff, charges } : tariff);
  tariffInput.dispatchEvent(new Event('input', { bubbles: true }));
}

function describe(rate) {
  const parts = [rate.name];
  if (rate.effective) parts.push(t('bill.picker.effective', { date: rate.effective }));
  if (rate.conditions.length) parts.push(rate.conditions.map((c) => t(`bill.condition.${c}`)).join(', '));
  if (rate.tou) parts.push(t('bill.picker.tou'));
  if (!rate.tariff) parts.push(t('bill.picker.cannot', { reasons: rate.reasons.join(', ') }));
  return parts.join(' · ');
}

function showRate() {
  const rate = rates[Number(rateSelect.value)];
  note.replaceChildren();
  if (!rate?.tariff) return;
  note.append(el('p', t('bill.picker.chosen', { name: rate.name, date: rate.effective ?? t('bill.picker.noDate') })));
  if (rate.tou) {
    note.append(el('p', t('bill.picker.periods')));
    const ul = el('ul');
    for (const s of rate.tariff.seasons) for (const p of s.periods) ul.append(el('li', `${s.name}: ${p.name}, ${p.hours}, ${cents(p.rate)}`));
    note.append(ul);
  }
  for (const n of rate.notes) note.append(el('p', n, { className: 'unit-hint' }));
  if (rate.source) note.append(el('p', '', {}), el('a', t('bill.picker.source'), { href: rate.source, className: 'handoff' }));
  setTariff(rate.tariff);
  document.documentElement.dataset.tariffChosen = rate.label;
}

async function showUtility() {
  const u = utilities[Number(utilitySelect.value)];
  rateField.hidden = true;
  note.replaceChildren();
  if (!u) return;
  const shard = await get(`/bills/tariffs/${u.state}.json`).catch(() => ({}));
  rates = shard[u.id] ?? [];
  if (!rates.length) {
    // No residential rate on file: open the form for entering it by hand.
    note.append(el('p', t('bill.picker.none', { utility: u.name })));
    manual.open = true;
    return;
  }
  rateSelect.replaceChildren(...rates.map((r, i) => el('option', describe(r), { value: String(i), disabled: !r.tariff })));
  const first = rates.findIndex((r) => r.tariff);
  rateSelect.value = String(first);
  rateField.hidden = false;
  showRate();
}

zipForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  utilityField.hidden = true;
  rateField.hidden = true;
  note.replaceChildren();
  const found = await utilitiesForZip(new FormData(zipForm).get('zip'));
  const { parsed } = found;
  if (!parsed.ok) {
    zipError.textContent = parsed.reason === 'four-digits' ? t('lookup.error.four', { suggestion: parsed.suggestion }) : t(`lookup.error.${parsed.reason}`);
    return;
  }
  zipError.textContent = '';
  utilities = found.utilities;
  if (!utilities.length) { note.append(el('p', t('bill.picker.noUtility'))); manual.open = true; return; }
  utilitySelect.replaceChildren(...utilities.map((u, i) => el('option', `${u.name} · ${u.state}`, { value: String(i) })));
  utilityField.hidden = false;
  await showUtility();
});
utilitySelect.addEventListener('change', showUtility);
rateSelect.addEventListener('change', showRate);

/** The numbers typed into a group of inputs, by name; a blank is NaN. */
function values(group) {
  return Object.fromEntries([...group.querySelectorAll('input')].map((i) => [i.name, i.value.trim() === '' ? NaN : Number(i.value.replace(/[,$¢\s]/g, ''))]));
}

// A Texas plan from its Electricity Facts Label, plus the TDU's delivery charges from the bill.
retail.addEventListener('input', () => {
  const v = values(retail);
  if (!(v.energy >= 0)) return;
  const charges = [];
  if (v.tduMonthly > 0) charges.push({ label: t('bill.retail.tduMonthlyLine'), monthly: v.tduMonthly });
  if (v.tduKwh > 0) charges.push({ label: t('bill.retail.tduKwhLine'), perKwh: v.tduKwh / 100 });
  setTariff({
    ...(v.base > 0 ? { fixedMonthly: v.base } : {}),
    seasons: [{ name: t('bill.retail.energyLine'), from: '01-01', tiers: [{ rate: v.energy / 100 }] }],
    ...(charges.length ? { charges } : {}),
    ...(v.credit > 0 && v.creditKwh >= 0 ? { credits: [{ label: t('bill.retail.creditLine', { kwh: v.creditKwh.toLocaleString('en-US') }), atLeastKwh: v.creditKwh, amount: v.credit }] } : {}),
  });
  note.replaceChildren(el('p', t('bill.retail.used')));
});

// A CCA home: the CCA's generation rate and the PCIA on top of the utility's delivery rate.
cca.addEventListener('input', () => {
  if (!base) { note.replaceChildren(el('p', t('bill.cca.first'))); return; }
  setTariff(base, { keepBase: true });
  note.replaceChildren(el('p', t('bill.cca.used')));
});

// A tariff entered by hand: a fixed charge, one rate, and optionally a second rate above a monthly allowance.
manual.addEventListener('input', () => {
  const v = values(manual);
  if (!(v.rate >= 0) || manual.querySelector('[name=rate]').value.trim() === '') return;
  const tiers = v.tier > 0 && v.rate2 >= 0 ? [{ upTo: v.tier, rate: v.rate / 100 }, { rate: v.rate2 / 100 }] : [{ rate: v.rate / 100 }];
  setTariff({ ...(v.fixed > 0 ? { fixedMonthly: v.fixed } : {}), seasons: [{ name: 'all year', from: '01-01', tiers }] });
  note.replaceChildren(el('p', t('bill.picker.manualUsed')));
});

picker.dataset.ready = 'true';
