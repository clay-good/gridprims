// The workbench's EV charging panel (add-electrification-tools:
// ev-fleet-charging): vehicle groups typed one a line, what unmanaged and
// managed charging do to each month's peak, and, with a priced rate and a
// headroom result, the bill difference and the service check.

import { html } from '../lib/html.mjs';
import { reviewChip } from './workbench-review.mjs';

const n1 = (x) => x.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const money = (x) => `$${x.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/** The panel's form. @param {{t: Function}} i18n @param {Set<string>} [reviewed] */
export function evPanel({ t }, reviewed = new Set()) {
  return html`<section class="panel picker" data-ev aria-labelledby="ev-title">
  <h2 id="ev-title">${t('ev.title')} ${reviewChip('electrify.ev-fleet', reviewed, { t })}</h2>
  <p>${t('ev.intro')}</p>
  <form data-ev-form novalidate>
    <div class="field wide"><label for="ev-groups">${t('ev.groups')}</label><textarea id="ev-groups" name="groups" class="mono" rows="3">${t('ev.groupsExample')}</textarea>
      <p class="unit-hint">${t('ev.groupsHint')}</p></div>
    <p><button class="button" type="submit">${t('ev.run')}</button></p>
  </form>
  <div data-ev-result aria-live="polite"></div>
</section>`;
}

/**
 * @param {any} r {errors?, fits, peaks, bills?, service?}
 * @param {{t: Function}} i18n
 */
export function renderEv(r, { t }) {
  if (r.errors?.length) return html`<ul class="errors">${r.errors.map((e) => html`<li>${e}</li>`)}</ul>`;
  if (!r.peaks.length) return html`<p class="errors">${t('ev.noSessions')}</p>`;
  const top = (k) => Math.max(...r.peaks.map((p) => p[k]));
  return html`${r.fits.map((f) => (f.shortfallKwh > 0
    ? html`<p class="warning-chip" data-ev-short>${t('ev.short', { label: f.label, max: n1(f.maxKwh), short: n1(f.shortfallKwh) })}</p>`
    : ''))}
  <p class="sentence">${t('ev.sentence', { building: n1(top('buildingKw')), unmanaged: n1(top('unmanagedKw')), managed: n1(top('managedKw')) })}</p>
  ${r.bills ? html`<p data-ev-bills>${t('ev.bills', { building: money(r.bills.building), unmanaged: money(r.bills.unmanaged), managed: money(r.bills.managed), demand: money(r.bills.demandSaved) })}</p>` : html`<p class="unit-hint">${t('ev.priceFirst')}</p>`}
  ${r.service ? html`<p data-ev-service>${r.service.map((s) => html`${t(`ev.service.${s.scenario}`, { kw: n1(s.continuousKw), headroom: n1(s.headroomKva) })} ${s.flag ? html`<strong class="warning-chip" data-ev-flag>${s.flag}</strong>` : ''} `)}</p>` : html`<p class="unit-hint">${t('ev.headroomFirst')}</p>`}
  <table><thead><tr><th scope="col">${t('bill.col.month')}</th><th scope="col" class="num">${t('ev.col.building')}</th><th scope="col" class="num">${t('ev.col.unmanaged')}</th><th scope="col" class="num">${t('ev.col.managed')}</th></tr></thead>
  <tbody>${r.peaks.map((p) => html`<tr data-ev-month><th scope="row">${p.month}</th><td class="num">${n1(p.buildingKw)}</td><td class="num">${n1(p.unmanagedKw)}</td><td class="num">${n1(p.managedKw)}</td></tr>`)}</tbody></table>
  <p class="unit-hint">${t('ev.method')}</p>`;
}
