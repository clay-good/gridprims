// The bill check's tariff picker (add-household-bill-check: billing period
// entry): a ZIP finds the utility, the utility lists its URDB residential
// rates, and a chosen rate (or one entered by hand) fills the tool's tariff
// input. It sits outside the tool's form, so only the tariff it writes is an
// input; the ZIP never leaves the device.

import { html } from '../lib/html.mjs';

/** @param {{t: Function}} i18n */
export function tariffPicker({ t }) {
  return html`<section class="panel picker" data-tariff-picker aria-labelledby="picker-title">
  <h2 id="picker-title">${t('bill.picker.title')}</h2>
  <form class="picker-row" data-picker-zip novalidate>
    <div class="field"><label for="picker-zip">${t('bill.picker.zip')}</label>
      <input id="picker-zip" name="zip" class="mono" inputmode="numeric" autocomplete="postal-code" maxlength="10" aria-describedby="picker-zip-error">
      <p class="error" id="picker-zip-error" data-picker-error role="alert"></p></div>
    <button class="button" type="submit">${t('bill.picker.find')}</button>
  </form>
  <div class="field" data-picker-utility-field hidden><label for="picker-utility">${t('bill.picker.utility')}</label>
    <select id="picker-utility" data-picker-utility></select></div>
  <div class="field" data-picker-rate-field hidden><label for="picker-rate">${t('bill.picker.rate')}</label>
    <select id="picker-rate" data-picker-rate></select></div>
  <div data-picker-note aria-live="polite"></div>
  <details data-picker-manual>
    <summary>${t('bill.picker.manual')}</summary>
    <div class="picker-row">
      <div class="field"><label for="manual-fixed">${t('bill.manual.fixed')}</label><input id="manual-fixed" name="fixed" class="mono" inputmode="decimal" autocomplete="off"></div>
      <div class="field"><label for="manual-rate">${t('bill.manual.rate')}</label><input id="manual-rate" name="rate" class="mono" inputmode="decimal" autocomplete="off"></div>
      <div class="field"><label for="manual-tier">${t('bill.manual.tierKwh')}</label><input id="manual-tier" name="tier" class="mono" inputmode="numeric" autocomplete="off"></div>
      <div class="field"><label for="manual-rate2">${t('bill.manual.rate2')}</label><input id="manual-rate2" name="rate2" class="mono" inputmode="decimal" autocomplete="off"></div>
    </div>
  </details>
  <p class="strip">${t('bill.picker.privacy')}</p>
</section>`;
}
