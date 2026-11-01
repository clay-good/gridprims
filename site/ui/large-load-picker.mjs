// The large-load pickers (add-large-load-screen): the request card's utility
// picker, where a ZIP finds the utility and its Form 714 peak, the energy over
// its wires, and its average home use fill the tool's inputs (the ZIP never
// leaves the device); which terms-table entries apply to a utility; and the
// take-or-pay calculator's tariff picker.

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

/**
 * The entries that apply to a utility: its own tariffs, and every statewide rule whose scope covers it.
 * @param {{entries: any[]}} data the terms table @param {{id: number, state: string, baCodes?: string[]}} u
 */
export function termsFor(data, u) {
  const inRegion = (e) => !e.region || (e.region === 'ERCOT' && (u.baCodes ?? []).includes('ERCO'));
  return data.entries.filter((e) => (e.type === 'tariff' ? e.eiaId === u.id : e.state === u.state && inRegion(e)));
}

/** The take-or-pay calculator's tariff picker: every entry with a prefill. @param {{t: Function}} i18n */
export function termsPicker({ t }) {
  return html`<section class="panel picker" data-terms-picker aria-labelledby="terms-picker-title">
  <h2 id="terms-picker-title">${t('llterms.prefill.title')}</h2>
  <div class="field"><label for="terms-picker-entry">${t('llterms.prefill.choose')}</label>
    <select id="terms-picker-entry" data-terms-picker-entry><option value="">${t('llterms.prefill.none')}</option></select></div>
  <div data-picker-note aria-live="polite"></div>
</section>`;
}
