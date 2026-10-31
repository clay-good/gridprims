// The workbench's bill on a meter file (add-load-and-bill-analyzer:
// bill-explainer): a utility's rate, chosen from its URDB rates, prices the
// loaded series month by month with core/lib/interval-bill.mjs. Each line
// shows its quantity, unit, rate, and amount; each demand line names the
// interval that set it and can show it on the chart.

import { html } from '../lib/html.mjs';
import { formatNumber } from '../../core/lib/precision.mjs';

const money = (x) => `$${x.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const qty = (x) => formatNumber(x, { decimals: 2 });
const rateText = (r, unit) => (unit === 'kWh' ? `$${formatNumber(r, { decimals: 5 })}/kWh` : unit === 'kW' || unit === 'kVA' ? `$${formatNumber(r, { decimals: 2 })}/${unit}` : money(r));

/** The empty panel the page script fills. @param {{t: Function}} i18n */
export function billPanel({ t }) {
  return html`<section class="panel picker" data-bill aria-labelledby="bill-title">
  <h2 id="bill-title">${t('bill.title')}</h2>
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
  <p class="strip">${t('bill.privacy')}</p>
</section>`;
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
    ${m.excluded.length ? html`<ul class="unit-hint">${m.excluded.map((x) => html`<li>${x}</li>`)}</ul>` : ''}</details>`;
  return html`<p class="stamp mono">${t('bill.source', { id: rec.id, effective: rec.effective ?? t('bill.picker.noDate'), revised: rec.lastRevised ?? t('bill.picker.noDate') })}${rec.source ? html` <a href="${rec.source}">${t('bill.picker.source')}</a>` : ''}</p>
  ${stale ? html`<p class="warning-chip" data-bill-stale>${t('bill.stale', { date: rec.end })}</p>` : ''}
  <p class="number" data-bill-total>${money(total)}</p>
  <p class="sentence">${t('bill.sentence', { count: bills.months.length, total: money(total) })}</p>
  ${[...bills.notes, ...rec.conversions].map((n) => html`<p class="unit-hint">${n}</p>`)}
  ${rec.unmodeled.length ? html`<p class="strip">${t('bill.unmodeled', { list: rec.unmodeled.join(', ') })}</p>` : ''}
  ${bills.months.map(month)}
  <p class="unit-hint">${t('bill.months')}</p>`;
}
