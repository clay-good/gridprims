// The workbench's service headroom panel (add-electrification-tools:
// service-headroom): the room left on the existing service by the
// measured-demand method, from the loaded file, with every step shown and a
// one-page report to print for an electrician.

import { html } from '../lib/html.mjs';
import { BALANCED, INSPECTOR } from '../../core/lib/service-headroom.mjs';
import { reviewChip } from './workbench-review.mjs';

const n1 = (x) => x.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 });

/** The panel's form. The edition has no default: the user picks the one adopted locally. @param {{t: Function}} i18n @param {Set<string>} [reviewed] */
export function headroomPanel({ t }, reviewed = new Set()) {
  return html`<section class="panel picker" data-headroom aria-labelledby="headroom-title">
  <h2 id="headroom-title">${t('headroom.title')} ${reviewChip('electrify.service-headroom', reviewed, { t })}</h2>
  <p>${t('headroom.intro')}</p>
  <form data-headroom-form novalidate>
    <div class="picker-row">
    <div class="field"><label for="hr-volts">${t('headroom.volts')}</label><input id="hr-volts" name="volts" class="mono" inputmode="decimal" autocomplete="off" value="240"></div>
    <div class="field"><label for="hr-phase">${t('headroom.phase')}</label><select id="hr-phase" name="phase"><option value="1">${t('headroom.phase1')}</option><option value="3">${t('headroom.phase3')}</option></select></div>
    <div class="field"><label for="hr-rating">${t('headroom.rating')}</label><input id="hr-rating" name="rating" class="mono" inputmode="decimal" autocomplete="off" value="200"></div>
    <div class="field"><label for="hr-pf">${t('headroom.pf')}</label><input id="hr-pf" name="pf" class="mono" inputmode="decimal" autocomplete="off" value="1.0"></div>
    <div class="field"><label for="hr-edition">${t('headroom.edition')}</label><select id="hr-edition" name="edition"><option value="">${t('headroom.editionNone')}</option><option value="2023">${t('headroom.edition2023')}</option><option value="2026">${t('headroom.edition2026')}</option></select></div>
    </div>
    <p><label><input type="checkbox" name="generation"> ${t('headroom.generation')}</label></p>
    <p><button class="button" type="submit">${t('headroom.run')}</button></p>
  </form>
  <div data-headroom-result aria-live="polite"></div>
</section>`;
}

/**
 * @param {any} r from headroomReport(), or {status: 'refused', reason, bills?: boolean}
 * @param {{t: Function}} i18n
 * @param {{when: string, period: string, phase: number, toolUrl: string}} o
 */
export function renderHeadroom(r, { t }, o) {
  if (r.status === 'refused') return html`<p class="errors">${r.reason}</p>${r.bills ? html`<p>${t('headroom.bills')} <a href="${o.toolUrl}">${t('headroom.billsLink')}</a></p>` : ''}`;
  return html`<p class="number" data-headroom-amps>${n1(r.h.headroomA)} A</p>
  <p class="sentence">${r.h.fits ? t('headroom.fits', { amps: n1(r.h.headroomA), kva: n1(r.h.headroomKva), cite: r.cite }) : t('headroom.over', { amps: n1(r.h.amps), cite: r.cite })}</p>
  <p>${t('headroom.max', { kw: n1(r.maxKw), when: o.when, period: o.period })}${o.phase === 3 ? html` <span class="unit-hint" data-balanced>${BALANCED}</span>` : ''}</p>
  <ol data-headroom-steps>${r.steps.map((s) => html`<li>${s}</li>`)}</ol>
  <p class="strip">${t('headroom.disclaimer')} ${INSPECTOR}</p>
  <p><button class="button" type="button" data-headroom-print>${t('headroom.print')}</button> <a href="https://roughlogic.com/">${t('headroom.handoff')}</a></p>`;
}
