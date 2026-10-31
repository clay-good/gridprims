// Fills the usage benchmark's averages from the chosen utility's EIA-861
// figures. The ZIP stays on this device.

import { utilitiesForZip } from './zip-utilities.js';
import { createI18n } from '../lib/i18n.mjs';
import strings from '../strings/en-US.mjs';

const { t } = createI18n(strings, 'en-US');
const picker = document.querySelector('[data-average-picker]');
const form = document.querySelector('[data-inputs]');
const zipForm = picker.querySelector('[data-picker-zip]');
const zipError = picker.querySelector('[data-picker-error]');
const utilityField = picker.querySelector('[data-picker-utility-field]');
const utilitySelect = picker.querySelector('[data-picker-utility]');
const note = picker.querySelector('[data-picker-note]');
const el = (tag, text, attrs = {}) => Object.assign(document.createElement(tag), { textContent: text ?? '' }, attrs);
let found = { utilities: [], shards: {} };

function set(name, value) {
  form.elements.namedItem(name).value = String(value);
}

function showUtility() {
  const u = found.utilities[Number(utilitySelect.value)];
  note.replaceChildren();
  if (!u) return;
  const shard = found.shards[u.state];
  if (!u.resKwh || !shard?.resKwh) { note.append(el('p', t('usage.picker.none', { utility: u.name }))); return; }
  set('utilityAverage', u.resKwh);
  set('stateAverage', shard.resKwh);
  set('dataYear', shard.resYear);
  form.dispatchEvent(new Event('input', { bubbles: true }));
  note.append(el('p', t('usage.picker.chosen', { utility: u.name, kwh: u.resKwh.toLocaleString('en-US'), state: u.state, stateKwh: shard.resKwh.toLocaleString('en-US'), year: shard.resYear })));
  document.documentElement.dataset.averagesChosen = String(u.id);
}

zipForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  utilityField.hidden = true;
  note.replaceChildren();
  found = await utilitiesForZip(new FormData(zipForm).get('zip'));
  const { parsed } = found;
  if (!parsed.ok) {
    zipError.textContent = parsed.reason === 'four-digits' ? t('lookup.error.four', { suggestion: parsed.suggestion }) : t(`lookup.error.${parsed.reason}`);
    return;
  }
  zipError.textContent = '';
  if (!found.utilities.length) { note.append(el('p', t('usage.picker.noUtility'))); return; }
  utilitySelect.replaceChildren(...found.utilities.map((u, i) => el('option', `${u.name} · ${u.state}`, { value: String(i) })));
  utilityField.hidden = false;
  showUtility();
});
utilitySelect.addEventListener('change', showUtility);

picker.dataset.ready = 'true';
