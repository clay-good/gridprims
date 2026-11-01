// Fills the take-or-pay calculator from a large-load tariff in the terms
// table: each charge's minimum, the ramp, the term, the ratchet, and the exit
// rule. The demand rates are not on the cited pages, so each charge line asks
// for its rate.

import { getJson } from './zip-utilities.js';
import { createI18n } from '../lib/i18n.mjs';
import strings from '../strings/en-US.mjs';

const { t } = createI18n(strings, 'en-US');
const picker = document.querySelector('[data-terms-picker]');
const form = document.querySelector('[data-inputs]');
const select = picker.querySelector('[data-terms-picker-entry]');
const note = picker.querySelector('[data-picker-note]');
const set = (name, value) => { form.elements.namedItem(name).value = String(value); };
let entries = [];

getJson('/large-load/terms/terms.json').then((d) => {
  entries = d.entries.filter((e) => e.prefill);
  for (const e of entries) select.append(Object.assign(document.createElement('option'), { value: e.id, textContent: `${e.name} · ${e.state}` }));
  picker.dataset.ready = 'true';
}).catch(() => {});

select.addEventListener('change', () => {
  note.replaceChildren();
  const e = entries.find((x) => x.id === select.value);
  if (!e) return;
  const p = e.prefill;
  set('components', p.components.split('\n').map((l) => `${l} at $/kW-month`).join('\n'));
  set('ramp', p.ramp);
  set('years', p.years);
  set('ratchetPct', p.ratchetPct);
  set('exitRule', p.exitRule);
  form.dispatchEvent(new Event('input', { bubbles: true }));
  const filled = ['minimum', 'ramp', 'term', 'exitFee'].filter((k) => e.fields[k].value).map((k) => t(`llterms.field.${k}`).toLowerCase());
  note.append(Object.assign(document.createElement('p'), { textContent: t('llterms.prefill.filled', { name: e.name, fields: filled.join(', ') }) }));
  const a = Object.assign(document.createElement('a'), { href: `/large-load/terms/#${e.id}`, textContent: t('llterms.title') });
  note.append(a);
  picker.dataset.chosen = e.id;
});
