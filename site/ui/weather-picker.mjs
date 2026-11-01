// The weather station picker (add-weather-normalization: degree-day data): a
// ZIP finds the nearest first-order NOAA stations on the device, the visitor
// can choose another, and the station's daily temperatures fill the tool.

import { html } from '../lib/html.mjs';

/** @param {{t: Function}} i18n */
export function weatherPicker({ t }) {
  return html`<section class="panel picker" data-weather-picker aria-labelledby="weather-title">
  <h2 id="weather-title">${t('weather.title')}</h2>
  <p>${t('weather.intro')}</p>
  <form class="picker-row" data-picker-zip novalidate>
    <div class="field"><label for="weather-zip">${t('bill.picker.zip')}</label>
      <input id="weather-zip" name="zip" class="mono" inputmode="numeric" autocomplete="postal-code" maxlength="10" aria-describedby="weather-zip-error">
      <p class="error" id="weather-zip-error" data-picker-error role="alert"></p></div>
    <button class="button" type="submit">${t('weather.find')}</button>
  </form>
  <div class="field" data-weather-station-field hidden><label for="weather-station">${t('weather.station')}</label><select id="weather-station" data-weather-station></select></div>
  <div data-picker-note aria-live="polite"></div>
</section>`;
}
