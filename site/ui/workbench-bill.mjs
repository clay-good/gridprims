// The workbench's bill on a meter file (add-load-and-bill-analyzer:
// bill-explainer): a utility's rate, chosen from its URDB rates, prices the
// loaded series month by month with core/lib/interval-bill.mjs. Each line
// shows its quantity, unit, rate, and amount; each demand line names the
// interval that set it and can show it on the chart.

import { html } from '../lib/html.mjs';
import { formatNumber } from '../../core/lib/precision.mjs';
import { reviewChip } from './workbench-review.mjs';

const money = (x) => `$${x.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const qty = (x) => formatNumber(x, { decimals: 2 });
/** The conditions a household can say it meets, in the order the checkboxes show them. */
export const CONDITION_BOXES = ['electric-vehicle', 'space-heating', 'net-metering', 'all-electric', 'water-heating', 'low-income', 'elderly-or-disabled', 'seasonal-or-farm'];

export const hourText = (h) => (h % 24 === 0 ? 'midnight' : h === 12 ? 'noon' : h < 12 ? `${h} am` : `${h - 12} pm`);
const rateText = (r, unit) => (unit === 'kWh' ? `$${formatNumber(r, { decimals: 5 })}/kWh` : unit === 'kW' || unit === 'kVA' ? `$${formatNumber(r, { decimals: 2 })}/${unit}` : money(r));

/** The empty panel the page script fills. @param {{t: Function}} i18n @param {Set<string>} [reviewed] */
export function billPanel({ t }, reviewed = new Set()) {
  return html`<section class="panel picker" id="plans" data-bill aria-labelledby="bill-title">
  <h2 id="bill-title">${t('bill.title')} ${reviewChip('load.bill-explainer', reviewed, { t })}</h2>
  <p>${t('bill.intro')}</p>
  <form class="picker-row" data-bill-zip novalidate>
    <div class="field"><label for="bill-zip">${t('bill.picker.zip')}</label>
      <input id="bill-zip" name="zip" class="mono" inputmode="numeric" autocomplete="postal-code" maxlength="10" aria-describedby="bill-zip-error">
      <p class="error" id="bill-zip-error" data-bill-error role="alert"></p></div>
    <button class="button" type="submit">${t('bill.picker.find')}</button>
  </form>
  <div class="field" data-bill-utility-field hidden><label for="bill-utility">${t('bill.picker.utility')}</label><select id="bill-utility" data-bill-utility></select></div>
  <div class="field" data-bill-rate-field hidden><label for="bill-rate">${t('bill.rate')}</label><select id="bill-rate" data-bill-rate></select></div>
  <p data-bill-holidays-field hidden><label><input type="checkbox" data-bill-holidays> ${t('bill.holidays')}</label></p>
  <div data-bill-result aria-live="polite"></div>
  <div data-compare-field hidden>
    <h3>${t('compare.title')} ${reviewChip('load.tariff-comparison', reviewed, { t })}</h3>
    <fieldset data-conditions hidden><legend>${t('plans.conditions')}</legend>
      ${CONDITION_BOXES.map((c) => html`<label class="check"><input type="checkbox" name="have" value="${c}"> ${t(`plans.have.${c}`)}</label>`)}
    </fieldset>
    <p><button class="button" type="button" data-compare-run></button></p>
    <form class="picker-row" data-shift novalidate>
      <div class="field"><label for="shift-kw">${t('compare.shift.kw')}</label><input id="shift-kw" name="kw" class="mono" inputmode="decimal" autocomplete="off"></div>
      <div class="field"><label for="shift-unit">${t('compare.shift.unit')}</label><select id="shift-unit" name="unit"><option value="kW">kW</option><option value="kWh a day">${t('compare.shift.perDay')}</option></select></div>
      ${['from', 'to'].map((w) => html`<div class="field"><label for="shift-${w}">${t(`compare.shift.${w}`)}</label><select id="shift-${w}" name="${w}">${Array.from({ length: 24 }, (_, h) => html`<option value="${h}" data-label="${hourText(h)}">${t('compare.shift.hourRange', { from: hourText(h), to: hourText(h + 1) })}</option>`)}</select></div>`)}
      <div class="field"><label for="shift-hours">${t('compare.shift.hours')}</label><input id="shift-hours" name="hours" class="mono" inputmode="numeric" autocomplete="off" value="4"></div>
      <div class="field"><label for="shift-days">${t('compare.shift.days')}</label><select id="shift-days" name="days"><option value="weekdays">${t('compare.shift.weekdays')}</option><option value="every day">${t('compare.shift.everyDay')}</option></select></div>
      <button class="button" type="submit">${t('compare.shift.run')}</button>
    </form>
    <div data-compare-result aria-live="polite"></div>
  </div>
  <div data-screen-field hidden>
    <h3>${t('screen.title')} ${reviewChip('load.storage-screen', reviewed, { t })}</h3>
    <p>${t('screen.intro')}</p>
    <form class="picker-row" data-screen novalidate>
      ${[['power', 'screen.power'], ['energy', 'screen.energy'], ['roundTrip', 'screen.roundTrip', '85'], ['socMin', 'screen.socMin', '10'], ['socMax', 'screen.socMax', '90'], ['cost', 'screen.cost'], ['solarKw', 'screen.solarKw']].map(([name, label, value]) => html`<div class="field"><label for="screen-${name}">${t(label)}</label><input id="screen-${name}" name="${name}" class="mono" inputmode="decimal" autocomplete="off" value="${value ?? ''}"></div>`)}
      <div class="field"><label for="screen-pvwatts">${t('screen.pvwatts')}</label><input id="screen-pvwatts" name="pvwatts" type="file" accept=".csv,text/csv"></div>
      <button class="button" type="submit">${t('screen.run')}</button>
    </form>
    <p class="unit-hint">${t('screen.pvwattsHint')} <a href="https://pvwatts.nlr.gov/">${t('screen.pvwattsLink')}</a></p>
    <div data-screen-result aria-live="polite"></div>
  </div>
  <p class="strip">${t('bill.privacy')}</p>
</section>`;
}

/**
 * The battery and solar screen's result.
 * @param {{shave: any, solar: any, saved: any, back: any, excluded: string[], upperBound: string}} r
 * @param {{t: Function}} i18n
 */
export function renderScreen(r, { t }) {
  return html`${r.shave ? html`<table data-screen-months><thead><tr><th scope="col">${t('bill.col.month')}</th><th scope="col" class="num">${t('screen.col.peak')}</th><th scope="col" class="num">${t('screen.col.newPeak')}</th><th scope="col">${t('screen.col.limit')}</th></tr></thead>
    <tbody>${r.shave.months.map((m) => html`<tr><th scope="row">${m.month}</th><td class="num">${qty(m.peakKw)} kW</td><td class="num">${qty(m.newPeakKw)} kW</td><td>${t(`screen.limit.${m.limit}`)}</td></tr>`)}</tbody></table>
    <p>${r.shave.limitText} ${t('screen.cycles', { cycles: formatNumber(r.shave.cycles, { decimals: 1 }) })}</p>` : ''}
  ${r.solar ? html`<ul class="unit-hint">${r.solar.notes.map((n) => html`<li>${n}</li>`)}</ul>` : ''}
  <p class="number" data-screen-savings>${money(r.saved.total)}</p>
  <p class="sentence">${t('screen.savings', { demand: money(r.saved.demand), energy: money(r.saved.energy), months: r.saved.months })}</p>
  ${r.solar && r.saved.lateMonths === r.saved.months && r.saved.demand < 1 ? html`<p>${t('screen.lateSolar')}</p>` : ''}
  <p class="strip" data-upper-bound>${r.upperBound}</p>
  ${r.saved.limits.map((x) => html`<p class="warning-chip">${x}</p>`)}
  ${r.back.years !== null && r.saved.months < 12 ? html`<p class="unit-hint">${t('screen.annualized', { months: r.saved.months })}</p>` : ''}
  <p data-payback>${r.back.years === null ? html`${r.back.prompt}${r.back.atbUrl ? html` <a href="${r.back.atbUrl}">${t('screen.atb')}</a>` : ''}` : t('screen.payback', { years: formatNumber(r.back.years, { decimals: 1, fixed: true }) })}</p>
  <p class="unit-hint" data-excluded>${t('screen.excluded', { list: r.excluded.join(', ') })}</p>
  <p><button class="button" type="button" data-copy-card="screen">${t('cards.copyScreen')}</button></p>
  <p><a class="handoff" href="https://reopt.nlr.gov/tool">${t('screen.reopt')}</a></p>`;
}

/** One rate's option text: name, sector, and dates. */
export function rateOption(rec, { t }) {
  return [rec.name, rec.sector, rec.effective && t('bill.picker.effective', { date: rec.effective }), rec.end && t('bill.ended', { date: rec.end })].filter(Boolean).join(' · ');
}

/**
 * The bills for the loaded series.
 * @param {any} rec the tariff record
 * @param {{months: any[], notes: string[]}} bills from intervalBills
 * @param {{t: Function}} i18n
 * @param {{when: (ms: number) => string, dataStart: string}} opts dataStart is the first day of the file, YYYY-MM-DD
 */
export function renderBills(rec, bills, { t }, { when, dataStart }) {
  const total = bills.months.reduce((n, m) => n + m.total, 0);
  const stale = rec.end && rec.end < dataStart;
  const month = (m) => html`<details class="bill-month" data-bill-month="${m.month}"><summary><strong>${m.month}</strong> · ${money(m.total)} · ${formatNumber(m.kwh, { decimals: 0 })} kWh</summary>
    <table><thead><tr><th scope="col">${t('bill.col.charge')}</th><th scope="col" class="num">${t('bill.col.quantity')}</th><th scope="col" class="num">${t('bill.col.rate')}</th><th scope="col" class="num">${t('bill.col.amount')}</th></tr></thead>
    <tbody>${m.lines.map((l) => html`<tr data-line="${l.kind}"><td>${l.label}${l.note ? html`<br><span class="unit-hint">${l.note}</span>` : ''}${l.setting && Number.isFinite(l.setting.startMs) ? html`<br><button class="button link" type="button" data-show-ms="${l.setting.startMs}" data-show-kw="${l.setting.kw}">${t('bill.setBy', { when: when(l.setting.startMs), kw: qty(l.setting.kw) })}</button>` : ''}</td>
      <td class="num">${qty(l.quantity)} ${l.unit}</td><td class="num">${rateText(l.rate, l.unit)}</td><td class="num">${money(l.amount)}</td></tr>`)}</tbody></table>
    ${m.holidays.length ? html`<p class="unit-hint">${t('bill.holidaysUsed', { list: m.holidays.join(', ') })}</p>` : ''}
    ${m.excluded.length ? html`<ul class="unit-hint">${m.excluded.map((x) => html`<li>${x}</li>`)}</ul>` : ''}
    <div class="field"><label for="actual-${m.month}">${t('bill.actual')}</label><input id="actual-${m.month}" class="mono" inputmode="decimal" autocomplete="off" data-actual="${m.month}"></div>
    <div data-compare="${m.month}" aria-live="polite"></div></details>`;
  return html`<p class="stamp mono">${t('bill.source', { id: rec.id, effective: rec.effective ?? t('bill.picker.noDate'), revised: rec.lastRevised ?? t('bill.picker.noDate') })}${rec.source ? html` <a href="${rec.source}">${t('bill.picker.source')}</a>` : ''}</p>
  ${stale ? html`<p class="warning-chip" data-bill-stale>${t('bill.stale', { date: rec.end })}</p>` : ''}
  <p class="number" data-bill-total>${money(total)}</p>
  <p class="sentence">${t('bill.sentence', { count: bills.months.length, total: money(total) })}</p>
  ${[...bills.notes, ...rec.conversions].map((n) => html`<p class="unit-hint">${n}</p>`)}
  ${rec.unmodeled.length ? html`<p class="strip">${t('bill.unmodeled', { list: rec.unmodeled.join(', ') })}</p>` : ''}
  ${bills.months.map(month)}
  <p class="unit-hint">${t('bill.months')}</p>
  <p><button class="button" type="button" data-copy-card="bill">${t('cards.copyBill')}</button></p>`;
}

/** The comparison with an actual bill, in plain words. @param {{diff: number, pct: number | null, causes: string[]}} c */
export function renderComparison(c, computed, actual, { t }) {
  const sign = c.diff > 0 ? '+' : c.diff < 0 ? '−' : '';
  return html`<p>${t('bill.compare', { actual: money(actual), computed: money(computed), diff: `${sign}${money(Math.abs(c.diff))}`, pct: c.pct === null ? '' : ` (${sign}${Math.abs(c.pct)}%)` })}</p>
  ${c.diff !== 0 ? html`<p>${t('bill.causes')}</p><ul>${c.causes.map((x) => html`<li>${x}</li>`)}</ul>` : ''}`;
}

/**
 * The ranking of a utility's rates on the loaded file.
 * @param {ReturnType<typeof import('../../core/lib/rate-compare.mjs').compareRates>} r
 * @param {{t: Function, date: Function}} i18n
 * @param {{shifted?: string}} [opts] a description of the load shift applied, if any
 */
export function renderRanking(r, { t, date }, { shifted } = {}) {
  const pct = (x) => `${x > 0 ? '+' : x < 0 ? '−' : ''}${Math.abs(x)}%`;
  const diff = (x) => `${x > 0 ? '+' : x < 0 ? '−' : ''}${money(Math.abs(x))}`;
  return html`${shifted ? html`<p class="strip">${shifted}</p>` : ''}
  ${r.headline ? html`<p class="sentence" data-plans-headline>${r.headline}</p>` : ''}
  <p>${r.label ?? t('compare.pastUse')}</p>
  <table data-ranking><thead><tr><th scope="col">${t('compare.col.rate')}</th><th scope="col" class="num">${t('compare.col.year')}</th><th scope="col" class="num">${t('compare.col.diff')}</th></tr></thead>
  <tbody>${r.ranked.map((p) => html`<tr data-rate-id="${p.rec.id}" data-current="${p === r.current ? 'yes' : 'no'}"><td>${p.rec.name}${p === r.current ? html` <span class="chip">${t('compare.current')}</span>` : ''}
    <br><span class="unit-hint mono">${t('compare.meta', { id: p.rec.id, revised: p.rec.lastRevised ?? p.rec.effective ?? t('bill.picker.noDate') })}${p.rec.source ? html` · <a href="${p.rec.source}">${t('bill.picker.source')}</a>` : ''}</span>${p.sentence ? html`<br><span class="unit-hint">${p.sentence}</span>` : ''}${p.unmodeled.length ? html`<br><span class="unit-hint">${t('compare.excludes', { list: p.unmodeled.join(', ') })}</span>` : ''}${p.outsideLimits ? html`<br><span class="unit-hint">${t('compare.outside', { reason: p.outsideLimits })}</span>` : ''}</td>
    <td class="num">${money(p.annual)}</td><td class="num">${p.diff === undefined ? '' : `${diff(p.diff)} (${pct(p.pct)})`}</td></tr>`)}</tbody></table>
  ${r.requires?.length ? html`<h4>${t('plans.requires')}</h4><table data-requires><tbody>${r.requires.map((p) => html`<tr data-rate-id="${p.rec.id}"><td>${p.rec.name}<br><span class="unit-hint">${t('plans.requiresWhat', { list: p.conditions.map((c) => t(`bill.condition.${c}`)).join(', ') })}</span></td><td class="num">${money(p.annual)}</td></tr>`)}</tbody></table>` : ''}
  ${r.notEligible.length ? html`<h4>${t('compare.notEligible')}</h4><ul>${r.notEligible.map((x) => html`<li>${x.rec.name}: ${x.reason}</li>`)}</ul>` : ''}
  <p class="unit-hint">${t('compare.data', { count: r.data.count, oldest: r.data.oldest ? date(r.data.oldest) : '–', newest: r.data.newest ? date(r.data.newest) : '–' })} ${r.data.note} <a href="${r.data.reportUrl}">${t('compare.report')}</a></p>
  <p><button class="button" type="button" data-copy-card="ranking">${t('cards.copyRanking')}</button></p>
  ${r.data.stale ? html`<p class="warning-chip" data-compare-stale>${t('compare.stale')}${r.data.tariffPage ? html` <a href="${r.data.tariffPage}">${t('bill.picker.source')}</a>` : ''}</p>` : ''}`;
}
