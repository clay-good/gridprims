// The ambient-adjusted rating table on the ampacity tool's page
// (add-grid-calculators task 1.3): a range of air temperatures, day and night,
// downloaded as CSV with its assumptions.

import { html } from '../lib/html.mjs';

/** @param {{t: Function}} i18n */
export function ratingTablePanel({ t }) {
  return html`<section class="panel picker" data-rating-table aria-labelledby="rating-table-title">
  <h2 id="rating-table-title">${t('lineTable.title')}</h2>
  <p>${t('lineTable.intro')}</p>
  <div class="picker-row">
    <div class="field"><label for="table-from">${t('lineTable.from')}</label><input id="table-from" name="from" class="mono" inputmode="decimal" value="-20" autocomplete="off"></div>
    <div class="field"><label for="table-to">${t('lineTable.to')}</label><input id="table-to" name="to" class="mono" inputmode="decimal" value="45" autocomplete="off"></div>
    <button class="button" type="button" data-table-make>${t('lineTable.make')}</button>
  </div>
  <p class="unit-hint">${t('lineTable.widen')}</p>
  <div data-table-result aria-live="polite"></div>
</section>`;
}
