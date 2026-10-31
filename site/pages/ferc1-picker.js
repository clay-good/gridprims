// Fills the explainer from the chosen utility's FERC Form 1 figures (through
// PUDL) and its EIA-861 residential share. The ZIP stays on this device.

import { getJson, utilitiesForZip } from './zip-utilities.js';
import { createI18n } from '../lib/i18n.mjs';
import strings from '../strings/en-US.mjs';

const { t } = createI18n(strings, 'en-US');
const picker = document.querySelector('[data-ferc1-picker]');
const form = document.querySelector('[data-inputs]');
const select = picker.querySelector('[data-picker-utility]');
const note = picker.querySelector('[data-picker-note]');
const el = (tag, text, attrs = {}) => Object.assign(document.createElement(tag), { textContent: text ?? '' }, attrs);
const set = (name, v) => { form.elements.namedItem(name).value = String(Math.round(v)); };
let utilities = [];

async function choose() {
  const u = utilities[Number(select.value)];
  note.replaceChildren();
  if (!u) return;
  const data = await getJson('/bills/ferc1.json').catch(() => ({ utilities: {} }));
  const f = data.utilities[u.id];
  if (u.resShare !== null && u.resShare !== undefined) form.elements.namedItem('residentialShare').value = String(u.resShare);
  if (u.resCustomers) set('residentialCustomers', u.resCustomers);
  if (!f) {
    for (const n of ['om', 'depreciation', 'otherTaxes', 'rateBase']) form.elements.namedItem(n).value = '';
    note.append(el('p', t('ferc1.none', { utility: u.name })));
  } else {
    set('om', f.om); set('depreciation', f.depreciation); set('otherTaxes', f.otherTaxes); set('rateBase', f.rateBase);
    note.append(el('p', t('ferc1.filled', { name: f.name, year: f.year })),
      el('p', t('ferc1.rateBase', { year: f.year, plant: Math.round(f.plantAndOther).toLocaleString('en-US'), adit: Math.round(f.adit ?? 0).toLocaleString('en-US'), wc: Math.round(f.workingCapital ?? 0).toLocaleString('en-US') }), { className: 'unit-hint' }));
  }
  if (u.resShare !== null && u.resShare !== undefined) note.append(el('p', t('ferc1.residential', { share: u.resShare, customers: (u.resCustomers ?? 0).toLocaleString('en-US') }), { className: 'unit-hint' }));
  form.dispatchEvent(new Event('input', { bubbles: true }));
  picker.dataset.chosen = String(u.id);
}

picker.querySelector('[data-picker-zip]').addEventListener('submit', async (e) => {
  e.preventDefault();
  const found = await utilitiesForZip(new FormData(e.target).get('zip'));
  const { parsed } = found;
  picker.querySelector('[data-picker-error]').textContent = parsed.ok ? '' : parsed.reason === 'four-digits' ? t('lookup.error.four', { suggestion: parsed.suggestion }) : t(`lookup.error.${parsed.reason}`);
  if (!parsed.ok) return;
  utilities = found.utilities;
  if (!utilities.length) { note.replaceChildren(el('p', t('bill.picker.noUtility'))); return; }
  select.replaceChildren(...utilities.map((u, i) => el('option', `${u.name} · ${u.state}`, { value: String(i) })));
  picker.querySelector('[data-picker-utility-field]').hidden = false;
  await choose();
});
select.addEventListener('change', choose);
picker.dataset.ready = 'true';
