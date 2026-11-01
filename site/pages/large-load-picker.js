// Fills the large-load request card from the chosen utility: its Form 714
// annual peak, the energy over its wires, and its average home use, from the
// same figures its utility page shows. The ZIP stays on this device.

import { getJson, utilitiesForZip } from './zip-utilities.js';
import { createI18n } from '../lib/i18n.mjs';
import { termsFor } from '../ui/large-load-picker.mjs';
import strings from '../strings/en-US.mjs';

const { t } = createI18n(strings, 'en-US');
const picker = document.querySelector('[data-large-load-picker]');
const form = document.querySelector('[data-inputs]');
const zipForm = picker.querySelector('[data-picker-zip]');
const zipError = picker.querySelector('[data-picker-error]');
const utilityField = picker.querySelector('[data-picker-utility-field]');
const utilitySelect = picker.querySelector('[data-picker-utility]');
const note = picker.querySelector('[data-picker-note]');
const el = (tag, text) => Object.assign(document.createElement(tag), { textContent: text ?? '' });
const whole = (x) => Math.round(x).toLocaleString('en-US');
let found = [];

const set = (name, value) => { form.elements.namedItem(name).value = String(value); };

async function showUtility() {
  const u = found[Number(utilitySelect.value)];
  note.replaceChildren();
  if (!u) return;
  const all = await getJson('/large-load/utilities.json');
  const f = all.utilities.find((x) => x.id === u.id);
  if (!f || !f.resKwh) { note.append(el('p', t('largeload.picker.none', { utility: u.name }))); return; }
  set('peakMw', f.peak ? f.peak.mw : 0);
  set('salesMwh', f.salesMwh);
  set('residentialKwh', f.resKwh);
  form.dispatchEvent(new Event('input', { bubbles: true }));
  note.append(el('p', f.peak
    ? t('largeload.picker.chosen', { utility: f.name, peak: whole(f.peak.mw), peakYear: f.peak.year, sales: whole(f.salesMwh), basis: f.basis, kwh: whole(f.resKwh), year: f.year })
    : t('largeload.picker.noPeak', { utility: f.name, sales: whole(f.salesMwh), basis: f.basis, kwh: whole(f.resKwh), year: f.year })));
  if (f.page) note.append(Object.assign(el('a', t('largeload.picker.page', { utility: f.name })), { href: `/utilities/${f.id}/` }));
  // Who pays if it leaves: the terms that apply, or where to look when none is on file.
  const terms = await getJson('/large-load/terms/terms.json').catch(() => ({ entries: [] }));
  const apply = termsFor(terms, { id: f.id, state: f.state, baCodes: u.bas ?? [] });
  const who = el('div');
  who.dataset.whoPays = apply.length ? 'terms' : 'none';
  who.append(el('p', t('llterms.whoPays')));
  if (apply.length) {
    who.append(el('p', t('llterms.forUtility', { utility: f.name })));
    const ul = el('ul');
    for (const e of apply) {
      const li = el('li');
      li.append(Object.assign(el('a', e.name), { href: `/large-load/terms/#${e.id}` }));
      ul.append(li);
    }
    who.append(ul);
  } else {
    const reg = all.regulators?.[f.state];
    who.append(el('p', t('llterms.noneForUtility', { utility: f.name })));
    if (reg) who.append(Object.assign(el('a', reg.name), { href: reg.docket }));
  }
  note.append(who);
  document.documentElement.dataset.largeLoadChosen = String(f.id);
}

zipForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  utilityField.hidden = true;
  note.replaceChildren();
  const r = await utilitiesForZip(new FormData(zipForm).get('zip'));
  if (!r.parsed.ok) {
    zipError.textContent = r.parsed.reason === 'four-digits' ? t('lookup.error.four', { suggestion: r.parsed.suggestion }) : t(`lookup.error.${r.parsed.reason}`);
    return;
  }
  zipError.textContent = '';
  found = r.utilities;
  if (!found.length) { note.append(el('p', t('largeload.picker.noUtility'))); return; }
  utilitySelect.replaceChildren(...found.map((u, i) => Object.assign(el('option', `${u.name} · ${u.state}`), { value: String(i) })));
  utilityField.hidden = false;
  await showUtility();
});
utilitySelect.addEventListener('change', showUtility);
