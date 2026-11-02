// The siting read-out's markup (siting/home-and-shell): a place, a size, and
// the answer. Server-rendered down to the inputs and the resolution statement,
// so the question and its limits are readable with scripting off; the answer
// itself is computed on the device, because the ZIP and the size never leave it.

import { html } from '../lib/html.mjs';

/** The question, the two inputs, and where the answer lands. */
export function sitingReadout({ t }) {
  return html`<section class="siting" data-siting aria-labelledby="siting-title">
  <h1 id="siting-title" class="home-title">${t('siting.title')}</h1>
  <p class="start-sub">${t('siting.sub')}</p>
  <form class="siting-form" data-siting-form novalidate>
    <div class="field">
      <label for="siting-zip">${t('siting.zip')}</label>
      <input id="siting-zip" name="zip" class="mono" inputmode="numeric" autocomplete="postal-code" maxlength="10" aria-describedby="siting-zip-error">
      <p class="error" id="siting-zip-error" data-siting-error role="alert"></p>
    </div>
    <div class="field">
      <label for="siting-mw">${t('siting.mw')}</label>
      <input id="siting-mw" name="mw" class="mono" inputmode="decimal" autocomplete="off">
    </div>
    <div class="field">
      <label for="siting-direction">${t('siting.direction')}</label>
      <select id="siting-direction" name="direction">
        <option value="load">${t('siting.direction.load')}</option>
        <option value="generation">${t('siting.direction.generation')}</option>
      </select>
    </div>
    <button class="button primary" type="submit">${t('siting.run')}</button>
  </form>
  <p class="unit-hint">${t('siting.privacy')}</p>
  <noscript><p class="panel">${t('siting.needsJs')}</p></noscript>
  <div class="siting-answer" data-siting-answer aria-live="polite"></div>
  <p class="panel siting-resolution">${t('siting.resolution')}</p>
</section>`;
}
