// The ampacity tool's conductor picker (add-grid-calculators task 1.4): ACSR
// sizes from USDA RUS Bulletin 1724E-200 (public domain) fill the diameter
// with their citation; resistance stays the user's to enter, since no
// public-domain resistance table exists.

import { html } from '../lib/html.mjs';
import library from '../../data/curated/conductors-acsr.json' with { type: 'json' };

/** @param {{t: Function}} i18n */
export function conductorPicker({ t }) {
  return html`<section class="panel picker" data-conductor-picker aria-labelledby="conductor-title">
  <h2 id="conductor-title">${t('conductor.title')}</h2>
  <div class="field"><label for="conductor-name">${t('conductor.label')}</label>
    <select id="conductor-name" data-conductor><option value="">${t('conductor.none')}</option>
    ${library.conductors.map((c) => html`<option value="${c.name}" data-diameter-in="${c.diameterIn}">${t('conductor.option', { size: c.size, stranding: c.stranding, name: c.name })}</option>`)}</select></div>
  <p class="unit-hint" data-conductor-note>${t('conductor.unknown')} <a href="${library.url}">${t('conductor.bulletin')}</a></p>
</section>`;
}

export const CONDUCTOR_SOURCE = library.source;
