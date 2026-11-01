// The large-load request card's utility picker (add-large-load-screen:
// request-context): a ZIP finds the utility, and its Form 714 peak, the
// energy over its wires, and its average home use fill the tool's inputs.
// The ZIP never leaves the device.

import { html } from '../lib/html.mjs';

/** @param {{t: Function}} i18n */
export function largeLoadPicker({ t }) {
  return html`<section class="panel picker" data-large-load-picker aria-labelledby="large-load-title">
  <h2 id="large-load-title">${t('largeload.picker.title')}</h2>
  <form class="picker-row" data-picker-zip novalidate>
    <div class="field"><label for="large-load-zip">${t('bill.picker.zip')}</label>
      <input id="large-load-zip" name="zip" class="mono" inputmode="numeric" autocomplete="postal-code" maxlength="10" aria-describedby="large-load-zip-error">
      <p class="error" id="large-load-zip-error" data-picker-error role="alert"></p></div>
    <button class="button" type="submit">${t('bill.picker.find')}</button>
  </form>
  <div class="field" data-picker-utility-field hidden><label for="large-load-utility">${t('bill.picker.utility')}</label>
    <select id="large-load-utility" data-picker-utility></select></div>
  <div data-picker-note aria-live="polite"></div>
  <p class="strip">${t('usage.picker.privacy')}</p>
</section>`;
}
