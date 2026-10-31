// The revenue requirement explainer's Form 1 prefill (add-ratepayer-tools:
// revenue-requirement): a ZIP finds the utility, and its FERC Form 1 figures,
// through PUDL, fill O&M, depreciation, taxes, and rate base, labeled
// total-company; its EIA-861 residential share and customers fill the
// per-home estimate. A utility that does not file Form 1 starts empty.

import { html } from '../lib/html.mjs';

/** @param {{t: Function}} i18n */
export function ferc1Picker({ t }) {
  return html`<section class="panel picker" data-ferc1-picker aria-labelledby="ferc1-title">
  <h2 id="ferc1-title">${t('ferc1.title')}</h2>
  <form class="picker-row" data-picker-zip novalidate>
    <div class="field"><label for="ferc1-zip">${t('bill.picker.zip')}</label>
      <input id="ferc1-zip" name="zip" class="mono" inputmode="numeric" autocomplete="postal-code" maxlength="10" aria-describedby="ferc1-zip-error">
      <p class="error" id="ferc1-zip-error" data-picker-error role="alert"></p></div>
    <button class="button" type="submit">${t('bill.picker.find')}</button>
  </form>
  <div class="field" data-picker-utility-field hidden><label for="ferc1-utility">${t('bill.picker.utility')}</label><select id="ferc1-utility" data-picker-utility></select></div>
  <div data-picker-note aria-live="polite"></div>
</section>`;
}
