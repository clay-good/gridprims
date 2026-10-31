// The usage benchmark's averages picker (add-household-bill-check:
// usage-benchmark): a ZIP finds the utility, and its EIA-861 average home
// use and the state's fill the tool's inputs. It sits outside the tool's
// form; the ZIP never leaves the device.

import { html } from '../lib/html.mjs';

/** @param {{t: Function}} i18n */
export function averagePicker({ t }) {
  return html`<section class="panel picker" data-average-picker aria-labelledby="averages-title">
  <h2 id="averages-title">${t('usage.picker.title')}</h2>
  <form class="picker-row" data-picker-zip novalidate>
    <div class="field"><label for="averages-zip">${t('bill.picker.zip')}</label>
      <input id="averages-zip" name="zip" class="mono" inputmode="numeric" autocomplete="postal-code" maxlength="10" aria-describedby="averages-zip-error">
      <p class="error" id="averages-zip-error" data-picker-error role="alert"></p></div>
    <button class="button" type="submit">${t('bill.picker.find')}</button>
  </form>
  <div class="field" data-picker-utility-field hidden><label for="averages-utility">${t('bill.picker.utility')}</label>
    <select id="averages-utility" data-picker-utility></select></div>
  <div data-picker-note aria-live="polite"></div>
  <p class="strip">${t('usage.picker.privacy')}</p>
</section>`;
}
