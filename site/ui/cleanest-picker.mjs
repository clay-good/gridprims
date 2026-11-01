// The cleanest-hours picker (add-hourly-carbon: cleanest-hours): a region and
// a month give the typical day's consumption-based CO2 intensity by local
// clock hour, its cleanest and dirtiest two-hour windows, and the year-round
// intensity of the hours a flexible load uses now and could move to, which
// fill the load-shift calculator. Works from a region alone, with no file.

import { html } from '../lib/html.mjs';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
export const clock = (h) => (h === 0 ? 'midnight' : h === 12 ? 'noon' : h < 12 ? `${h} am` : `${h - 12} pm`);
const hourOptions = (selected) => Array.from({ length: 24 }, (_, h) => html`<option value="${h}" ${h === selected ? 'selected' : ''}>${clock(h)}</option>`);

/** @param {{t: Function}} i18n */
export function cleanestPicker({ t }) {
  return html`<section class="panel picker" data-cleanest-picker aria-labelledby="cleanest-title">
  <h2 id="cleanest-title">${t('cleanest.title')}</h2>
  <p>${t('cleanest.intro')}</p>
  <div class="picker-row">
    <div class="field"><label for="cleanest-region">${t('cleanest.region')}</label><select id="cleanest-region" data-cleanest-region><option value="">${t('cleanest.choose')}</option></select></div>
    <div class="field"><label for="cleanest-month">${t('cleanest.month')}</label><select id="cleanest-month" data-cleanest-month>${MONTHS.map((m, i) => html`<option value="${i + 1}">${m}</option>`)}</select></div>
  </div>
  <fieldset class="picker-row"><legend>${t('cleanest.now')}</legend>
    <div class="field"><label for="cleanest-now-from">${t('cleanest.from')}</label><select id="cleanest-now-from" data-cleanest-window="now-from">${hourOptions(18)}</select></div>
    <div class="field"><label for="cleanest-now-to">${t('cleanest.to')}</label><select id="cleanest-now-to" data-cleanest-window="now-to">${hourOptions(22)}</select></div>
  </fieldset>
  <fieldset class="picker-row"><legend>${t('cleanest.move')}</legend>
    <div class="field"><label for="cleanest-move-from">${t('cleanest.from')}</label><select id="cleanest-move-from" data-cleanest-window="move-from">${hourOptions(11)}</select></div>
    <div class="field"><label for="cleanest-move-to">${t('cleanest.to')}</label><select id="cleanest-move-to" data-cleanest-window="move-to">${hourOptions(15)}</select></div>
  </fieldset>
  <div data-cleanest-note aria-live="polite"></div>
</section>`;
}

export { MONTHS };
