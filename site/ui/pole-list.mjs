// The pole list on the attachment height tool's page (add-overhead-line-checks
// 3.5): a field file of poles, checked on this device in a worker with
// progress and cancel, one instruction per pole, exported as CSV, each pole
// opening in the page above.

import { html } from '../lib/html.mjs';

/** @param {{t: Function}} i18n */
export function poleListPanel({ t }) {
  return html`<section class="panel picker" data-pole-list aria-labelledby="pole-list-title">
  <h2 id="pole-list-title">${t('poles.title')}</h2>
  <p>${t('poles.intro')}</p>
  <p class="unit-hint">${t('poles.consent')}</p>
  <div class="picker-row">
    <div class="field"><label for="rules-file">${t('poles.rulesFile')}</label><input id="rules-file" type="file" accept=".csv,.txt,.xlsx,.pdf,text/csv,text/plain,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" data-rules-file></div>
  </div>
  <div data-rules-result aria-live="polite"></div>
  <div class="picker-row">
    <div class="field"><label for="pole-file">${t('poles.choose')}</label><input id="pole-file" type="file" accept=".csv,.txt,text/csv,text/plain" data-pole-file></div>
  </div>
  <div data-pole-progress hidden><progress max="1" value="0"></progress> <span data-pole-count></span> <button class="button" type="button" data-pole-cancel>${t('poles.cancel')}</button></div>
  <div data-pole-result aria-live="polite"></div>
</section>`;
}
