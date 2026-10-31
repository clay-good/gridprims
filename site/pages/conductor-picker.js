// Fills the ampacity tool's diameter from the RUS conductor library, in the
// units chosen, and asks for the manufacturer's resistance.

import { createI18n } from '../lib/i18n.mjs';
import strings from '../strings/en-US.mjs';

const { t } = createI18n(strings, 'en-US');
const picker = document.querySelector('[data-conductor-picker]');
const form = document.querySelector('[data-inputs]');
const select = picker.querySelector('[data-conductor]');
const note = picker.querySelector('[data-conductor-note]');

select.addEventListener('change', () => {
  const opt = select.selectedOptions[0];
  if (!opt?.dataset.diameterIn) return;
  const inches = Number(opt.dataset.diameterIn);
  const us = form.elements.namedItem('units').value === 'us';
  form.elements.namedItem('diameter').value = String(us ? inches : Math.round(inches * 25.4 * 1000) / 1000);
  form.dispatchEvent(new Event('input', { bubbles: true }));
  note.textContent = t('conductor.chosen', { name: opt.textContent, inches });
  picker.dataset.chosen = opt.value;
});
picker.dataset.ready = 'true';
