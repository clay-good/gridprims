// The backup power size's county outage history (add-electrification-tools:
// backup-power): a ZIP finds the county, and its EAGLE-I events give the
// 50th, 90th-percentile, and longest outages, with the battery for each and
// the county-proxy label.

import { html } from '../lib/html.mjs';

/** @param {{t: Function}} i18n */
export function outagePicker({ t }) {
  return html`<section class="panel picker" data-outage-picker aria-labelledby="outage-title">
  <h2 id="outage-title">${t('outage.title')}</h2>
  <p>${t('outage.intro')}</p>
  <form class="picker-row" data-picker-zip novalidate>
    <div class="field"><label for="outage-zip">${t('bill.picker.zip')}</label>
      <input id="outage-zip" name="zip" class="mono" inputmode="numeric" autocomplete="postal-code" maxlength="10" aria-describedby="outage-zip-error">
      <p class="error" id="outage-zip-error" data-picker-error role="alert"></p></div>
    <button class="button" type="submit">${t('bill.picker.find')}</button>
  </form>
  <div class="field" data-picker-county-field hidden><label for="outage-county">${t('outage.county')}</label><select id="outage-county" data-picker-county></select></div>
  <div data-picker-note aria-live="polite"></div>
</section>`;
}
