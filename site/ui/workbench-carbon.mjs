// The workbench's carbon panel (add-hourly-carbon: hourly-emissions and
// hourly-matching): the loaded file's CO2 hour by hour in its balancing
// authority, beside the same load at the year's flat average and at the eGRID
// subregion rate, and, with a clean supply profile, the hourly against the
// annual matched share and the combined score.

import { html } from '../lib/html.mjs';
import { RATES } from '../../core/tools/calc.energy-units.emissions/rates.mjs';
import { reviewChip } from './workbench-review.mjs';
import { clock } from './cleanest-picker.mjs';

const t1 = (x) => x.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const whole = (x) => Math.round(x).toLocaleString('en-US');
const pc = (x) => `${(x * 100).toFixed(1)}%`;
const signed = (x) => `${x >= 0 ? '+' : '−'}${Math.abs(x).toFixed(1)}%`;
const hourOptions = (selected) => Array.from({ length: 24 }, (_, h) => html`<option value="${h}" ${h === selected ? 'selected' : ''}>${clock(h)}</option>`);

/** The panel's form. @param {{t: Function}} i18n @param {Set<string>} [reviewed] */
export function carbonPanel({ t }, reviewed = new Set()) {
  return html`<section class="panel picker" data-carbon aria-labelledby="carbon-title">
  <h2 id="carbon-title">${t('carbon.title')} ${reviewChip('carbon.hourly-emissions', reviewed, { t })}</h2>
  <p>${t('carbon.intro')}</p>
  <form data-carbon-form novalidate>
    <div class="picker-row">
      <div class="field"><label for="carbon-region">${t('carbon.region')}</label><select id="carbon-region" name="region"><option value="">${t('cleanest.choose')}</option></select></div>
      <div class="field"><label for="carbon-subregion">${t('carbon.subregion')}</label><select id="carbon-subregion" name="subregion"><option value="">${t('carbon.subregionNone')}</option>${Object.entries(RATES).map(([k, r]) => html`<option value="${k}">${k} · ${r.name}</option>`)}</select></div>
    </div>
    <p class="unit-hint" data-carbon-assigned></p>
    <div class="picker-row">
      <div class="field"><label for="carbon-supply">${t('carbon.supply')}</label><select id="carbon-supply" name="supply">
        <option value="none">${t('carbon.supplyNone')}</option><option value="pvwatts">${t('carbon.supplyPvwatts')}</option><option value="file">${t('carbon.supplyFile')}</option><option value="block">${t('carbon.supplyBlock')}</option></select></div>
      <div class="field" data-carbon-supply="pvwatts file" hidden><label for="carbon-file">${t('carbon.file')}</label><input id="carbon-file" name="file" type="file" accept=".csv,.txt"></div>
      <div class="field" data-carbon-supply="pvwatts" hidden><label for="carbon-system">${t('carbon.systemKw')}</label><input id="carbon-system" name="systemKw" inputmode="decimal" class="mono"></div>
      <div class="field" data-carbon-supply="file" hidden><label for="carbon-unit">${t('carbon.unit')}</label><select id="carbon-unit" name="unit"><option value="">${t('added.unitHeader')}</option><option value="kWh">kWh</option><option value="MWh">MWh</option></select></div>
      <div class="field" data-carbon-supply="file" hidden><label for="carbon-basis">${t('added.basis')}</label><select id="carbon-basis" name="basis"><option value="prevailing">${t('added.basisPrevailing')}</option><option value="standard">${t('added.basisStandard')}</option><option value="utc">${t('added.basisUtc')}</option></select></div>
      <div class="field" data-carbon-supply="block" hidden><label for="carbon-mw">${t('carbon.blockMw')}</label><input id="carbon-mw" name="mw" inputmode="decimal" class="mono" value="1"></div>
      <div class="field" data-carbon-supply="block" hidden><label for="carbon-from">${t('cleanest.from')}</label><select id="carbon-from" name="from">${hourOptions(0)}</select></div>
      <div class="field" data-carbon-supply="block" hidden><label for="carbon-to">${t('cleanest.to')}</label><select id="carbon-to" name="to">${hourOptions(0)}</select></div>
    </div>
    <p><button class="button" type="submit">${t('carbon.run')}</button></p>
  </form>
  <div data-carbon-result aria-live="polite"></div>
</section>`;
}

/**
 * @param {any} r {status, reason?, steps, e?, m?, egridOnly?, notes}
 * @param {{t: Function}} i18n
 */
export function renderCarbon(r, { t }) {
  if (r.status === 'refused') return html`<p class="errors">${r.reason}</p>`;
  if (r.egridOnly) {
    const e = r.egridOnly;
    return html`<p class="sentence" data-carbon-egrid-only>${t('carbon.egridOnly', { t: t1(e.t), subregion: e.subregion, edition: e.edition })}</p><p>${r.reason}</p>`;
  }
  const { e, m } = r;
  return html`<p class="sentence" data-carbon-sentence>${t('carbon.sentence', { t: t1(e.t), lb: whole(e.lb), ba: e.ba })}</p>
  <table data-carbon-compare><thead><tr><th scope="col">${t('carbon.col.basis')}</th><th scope="col" class="num">${t('carbon.col.t')}</th><th scope="col">${t('carbon.col.gap')}</th></tr></thead><tbody>
    <tr><th scope="row">${t('carbon.row.hourly', { ba: e.ba })}</th><td class="num">${t1(e.t)}</td><td></td></tr>
    <tr data-carbon-flat><th scope="row">${t('carbon.row.flat', { ba: e.ba })}</th><td class="num">${t1(e.flat.t)}</td><td>${t('carbon.gap.timing', { pct: signed(e.timing.pct) })}</td></tr>
    ${e.egrid ? html`<tr data-carbon-egrid><th scope="row">${t('carbon.row.egrid', { subregion: e.egrid.subregion, label: e.egrid.label })}</th><td class="num">${t1(e.egrid.t)}</td><td>${t('carbon.gap.egrid', { pct: signed(e.egrid.pct) })}</td></tr>` : ''}
  </tbody></table>
  ${e.timing.drivers.length ? html`<p data-carbon-drivers>${t('carbon.drivers', { pct: signed(e.timing.pct), hours: e.timing.drivers.map(clock).join(', ') })}</p>` : ''}
  ${e.evening ? html`<p>${t('carbon.evening', { pct: signed(e.evening.pct) })}</p>` : ''}
  ${e.egrid ? html`<p class="unit-hint">${t('carbon.egridNote')}</p>` : ''}
  ${e.excluded.hours ? html`<p data-carbon-excluded>${t('carbon.excluded', { hours: whole(e.excluded.hours), share: pc(e.excluded.share) })}</p>` : ''}
  <p class="unit-hint">${e.whyFactor}</p>
  <p class="strip">${e.caveat}</p>
  ${m ? html`<h3>${t('carbon.matchTitle')}</h3>
  <p class="sentence" data-carbon-match>${t('carbon.match', { annual: pc(m.annualShare), hourly: pc(m.hourlyShare) })}</p>
  <p>${t('carbon.surplus', { surplus: whole(m.surplus), shortfall: whole(m.shortfall) })}</p>
  ${m.grid?.combined !== null && m.grid?.combined !== undefined ? html`<details data-carbon-combined><summary>${t('carbon.combined', { combined: pc(m.grid.combined) })}</summary>
    <p>${t('carbon.combinedHow', { hourly: pc(m.hourlyShare), unmatched: whole(m.grid.unmatchedKwh), clean: pc(m.grid.cleanShare), load: whole(m.load), combined: pc(m.grid.combined) })}</p></details>
  <p class="unit-hint">${m.productionLabel}</p>` : ''}
  ${r.notes.map((n) => html`<p class="unit-hint" data-carbon-note>${n}</p>`)}
  <p class="strip">${m.label}</p>` : ''}
  <h3>${t('added.receipt')}</h3>
  <ol data-carbon-steps>${r.steps.map((s) => html`<li>${s}</li>`)}</ol>
  <table><thead><tr><th scope="col">${t('bill.col.month')}</th><th scope="col" class="num">kWh</th><th scope="col" class="num">${t('carbon.col.t')}</th></tr></thead>
  <tbody>${e.months.map((x) => html`<tr data-carbon-month><th scope="row">${x.month}</th><td class="num">${whole(x.kwh)}</td><td class="num">${t1(x.t)}</td></tr>`)}</tbody></table>
  <p><button class="button" type="button" data-copy-card="carbon">${t('cards.copyCarbon')}</button></p>`;
}
