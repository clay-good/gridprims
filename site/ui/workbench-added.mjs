// The workbench's added-load panel (add-electrification-tools: added-load):
// a shape file or an hour-by-hour schedule added to the loaded file, with
// the receipt of how it was aligned and the combined load's peaks, bill, and
// headroom beside the file's own.

import { html } from '../lib/html.mjs';
import { reviewChip } from './workbench-review.mjs';

const n1 = (x) => x.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const money = (x) => `$${x.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/** The panel's form. @param {{t: Function}} i18n @param {Set<string>} [reviewed] */
export function addedPanel({ t }, reviewed = new Set()) {
  return html`<section class="panel picker" data-added aria-labelledby="added-title">
  <h2 id="added-title">${t('added.title')} ${reviewChip('electrify.added-load', reviewed, { t })}</h2>
  <p>${t('added.intro')}</p>
  <form data-added-form novalidate>
    <div class="picker-row">
      <div class="field"><label for="added-kind">${t('added.kind')}</label><select id="added-kind" name="kind"><option value="file">${t('added.kindFile')}</option><option value="schedule">${t('added.kindSchedule')}</option></select></div>
      <div class="field" data-added-file><label for="added-file">${t('added.file')}</label><input id="added-file" name="file" type="file" accept=".csv,.txt"></div>
      <div class="field" data-added-file><label for="added-unit">${t('added.unit')}</label><select id="added-unit" name="unit"><option value="">${t('added.unitHeader')}</option><option value="kW">${t('added.unitKw')}</option><option value="kWh">${t('added.unitKwh')}</option></select></div>
      <div class="field" data-added-file><label for="added-basis">${t('added.basis')}</label><select id="added-basis" name="basis"><option value="prevailing">${t('added.basisPrevailing')}</option><option value="standard">${t('added.basisStandard')}</option><option value="utc">${t('added.basisUtc')}</option></select></div>
    </div>
    <div class="field wide" data-added-schedule hidden><label for="added-schedule">${t('added.schedule')}</label><textarea id="added-schedule" name="schedule" class="mono" rows="3"></textarea><p class="unit-hint">${t('added.scheduleHint')}</p></div>
    <p><button class="button" type="submit">${t('added.run')}</button></p>
  </form>
  <div data-added-result aria-live="polite"></div>
</section>`;
}

/**
 * @param {any} r {status, reason?, steps, result, bills?, headroom?}
 * @param {{t: Function}} i18n
 */
export function renderAdded(r, { t }) {
  if (r.status === 'refused') return html`<p class="errors">${r.reason}</p>`;
  const c = r.result;
  return html`<p class="sentence">${t('added.sentence', { before: n1(c.before.kw), after: n1(c.after.kw) })}${c.moved ? html` <strong data-added-moved>${c.moved}</strong>` : ''}</p>
  ${r.bills ? html`<p data-added-bills>${t('added.bills', { before: money(r.bills.before), after: money(r.bills.after), diff: money(r.bills.after - r.bills.before) })}</p>` : html`<p class="unit-hint">${t('ev.priceFirst')}</p>`}
  ${r.headroom ? html`<p data-added-headroom>${r.headroom.status === 'ok' ? t('added.headroom', { before: n1(r.headroom.beforeA), after: n1(r.headroom.h.headroomA) }) : r.headroom.reason}</p>` : html`<p class="unit-hint">${t('ev.headroomFirst')}</p>`}
  <h3>${t('added.receipt')}</h3>
  <ol data-added-steps>${r.steps.map((s) => html`<li>${s}</li>`)}</ol>
  <table><thead><tr><th scope="col">${t('bill.col.month')}</th><th scope="col" class="num">${t('added.col.before')}</th><th scope="col" class="num">${t('added.col.after')}</th><th scope="col" class="num">${t('added.col.kwh')}</th></tr></thead>
  <tbody>${c.months.map((m) => html`<tr data-added-month><th scope="row">${m.month}</th><td class="num">${n1(m.beforeKw)}</td><td class="num">${n1(m.afterKw)}</td><td class="num">${n1(m.afterKwh - m.beforeKwh)}</td></tr>`)}</tbody></table>`;
}
