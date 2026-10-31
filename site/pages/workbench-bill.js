// The workbench's bill panel: find the utility from a ZIP, pick one of its
// URDB rates, and price the loaded series on it here. Requests go only for
// the lookup shards a ZIP needs and the chosen utility's rate file.

import { compareActual, intervalBills } from '../../core/lib/interval-bill.mjs';
import { compareRates, shiftLoad } from '../../core/lib/rate-compare.mjs';
import { findPlans } from '../../core/lib/plan-finder.mjs';
import { alignSolar, EXCLUDED, netLoad, payback, peakShave, readPvwatts, savings, UPPER_BOUND } from '../../core/lib/storage-screen.mjs';
import { readNumber } from '../../core/lib/bill-totals.mjs';
import { rateOption, renderBills, renderComparison, renderRanking, renderScreen } from '../ui/workbench-bill.mjs';
import { billCard, rankingCard, screenCard } from '../../core/lib/result-cards.mjs';

/** The workbench's version, printed on every result card. */
export const WORKBENCH_VERSION = '0.1.0';
import { getJson, utilitiesForZip } from './zip-utilities.js';

/**
 * @param {{i18n: any, view: () => any, when: (ms: number, zone: string) => string, showOnChart: (ms: number, kw: number) => void}} p
 *   view returns the workbench's current view of the loaded series, or null
 */
export function setupBill({ i18n, view, when, showOnChart }) {
  const { t } = i18n;
  const panel = document.querySelector('[data-bill]');
  const $ = (sel) => panel.querySelector(sel);
  const el = (tag, text, attrs = {}) => Object.assign(document.createElement(tag), { textContent: text ?? '' }, attrs);
  let utilities = [];
  let rates = [];
  let asOf = null;
  let priced = null; // {rec, bills}
  let utilityName = '';
  const last = { ranking: null, screen: null };
  /** The file's first and last local day, for the cards. */
  const period = (v) => { const f = new Intl.DateTimeFormat('en-CA', { timeZone: v.zone }); return `${f.format(new Date(v.series.startMs[0]))} to ${f.format(new Date(v.series.startMs[v.series.startMs.length - 1]))}`; };

  function price() {
    const rec = rates[Number($('[data-bill-rate]').value)];
    const v = view();
    if (!rec || !v) return;
    const received = v.result.series.find((s) => s.meter === v.series.meter && s.channel === 'received' && s !== v.series);
    const bills = intervalBills(v.series, rec, { zone: v.zone, received, holidays: $('[data-bill-holidays]').checked });
    const dataStart = new Intl.DateTimeFormat('en-CA', { timeZone: v.zone }).format(new Date(v.series.startMs[0]));
    $('[data-bill-result]').innerHTML = String(renderBills(rec, bills, i18n, { when: (ms) => when(ms, v.zone), dataStart }));
    priced = { rec, bills };
    panel.dataset.priced = rec.id;
    const same = rates.filter((r) => r.sector === rec.sector);
    $('[data-compare-run]').textContent = t('compare.run', { count: same.length, sector: (rec.sector ?? '').toLowerCase() });
    $('[data-compare-field]').hidden = same.length < 2;
    $('[data-conditions]').hidden = rec.sector !== 'Residential';
    $('[data-screen-field]').hidden = false;
    $('[data-compare-result]').replaceChildren();
  }

  /** Every rate of the current rate's class on the loaded file, optionally with a load shift applied. */
  function compare(shift) {
    const v = view();
    if (!v || !priced) return;
    const same = rates.filter((r) => r.sector === priced.rec.sector);
    const received = v.result.series.find((s) => s.meter === v.series.meter && s.channel === 'received' && s !== v.series);
    const series = shift ? shiftLoad(v.series, { ...shift, zone: v.zone }) : v.series;
    // Household plans: plans with a condition stay under "Requires" until the household checks it.
    const have = [...panel.querySelectorAll('[data-conditions] input:checked')].map((i) => i.value);
    const r = priced.rec.sector === 'Residential'
      ? findPlans(series, same, { zone: v.zone, currentId: priced.rec.id, received, have, asOf })
      : compareRates(series, same, { zone: v.zone, currentId: priced.rec.id, received, holidays: $('[data-bill-holidays]').checked, asOf });
    const shifted = shift && t('compare.shifted', { amount: shift.kwhPerDay !== undefined ? t('compare.shift.amountPerDay', { kwh: shift.kwhPerDay }) : `${shift.kw} kW`, from: $('#shift-from').selectedOptions[0].dataset.label, to: $('#shift-to').selectedOptions[0].dataset.label, hours: shift.from[1] - shift.from[0], days: shift.days });
    $('[data-compare-result]').innerHTML = String(renderRanking(r, i18n, { shifted }));
    last.ranking = r;
    panel.dataset.compared = String(Number(panel.dataset.compared ?? 0) + 1);
  }

  async function showUtility() {
    const u = utilities[Number($('[data-bill-utility]').value)];
    utilityName = u?.name ?? '';
    $('[data-bill-rate-field]').hidden = true;
    $('[data-bill-holidays-field]').hidden = true;
    $('[data-bill-result]').replaceChildren();
    if (!u) return;
    ({ rates = [], asOf = null } = await getJson(`/bills/rates/${u.id}.json`).catch(() => ({})));
    if (!rates.length) { $('[data-bill-result]').append(el('p', t('bill.none', { utility: u.name }))); return; }
    $('[data-bill-rate]').replaceChildren(...rates.map((r, i) => el('option', rateOption(r, i18n), { value: String(i) })));
    $('[data-bill-rate-field]').hidden = false;
    $('[data-bill-holidays-field]').hidden = false;
    price();
  }

  $('[data-bill-zip]').addEventListener('submit', async (e) => {
    e.preventDefault();
    $('[data-bill-utility-field]').hidden = true;
    const found = await utilitiesForZip(new FormData(e.target).get('zip'));
    const { parsed } = found;
    $('[data-bill-error]').textContent = parsed.ok ? '' : parsed.reason === 'four-digits' ? t('lookup.error.four', { suggestion: parsed.suggestion }) : t(`lookup.error.${parsed.reason}`);
    if (!parsed.ok) return;
    utilities = found.utilities;
    if (!utilities.length) { $('[data-bill-result]').replaceChildren(el('p', t('bill.picker.noUtility'))); return; }
    $('[data-bill-utility]').replaceChildren(...utilities.map((u, i) => el('option', `${u.name} · ${u.state}`, { value: String(i) })));
    $('[data-bill-utility-field]').hidden = false;
    await showUtility();
  });
  $('[data-bill-utility]').addEventListener('change', showUtility);
  $('[data-bill-rate]').addEventListener('change', price);
  // The battery and solar screen, on the rate priced above.
  $('[data-screen]').addEventListener('submit', async (e) => {
    e.preventDefault();
    const v = view();
    if (!v || !priced) return;
    const f = new FormData(e.target);
    const n = (k) => readNumber(String(f.get(k) ?? '').trim());
    const out = $('[data-screen-result]');
    let solar = null;
    let after = { delivered: v.series };
    const file = f.get('pvwatts');
    if (file && file.size) {
      const pv = readPvwatts(await file.text());
      if (pv.status !== 'ok') { out.replaceChildren(el('p', pv.reason, { className: 'errors' })); return; }
      solar = alignSolar(v.series, pv, { zone: v.zone, systemKw: n('solarKw') ?? undefined });
      after = netLoad(v.series, solar.kwh);
    }
    let shave = null;
    if (n('power') > 0 && n('energy') > 0) {
      shave = peakShave(after.delivered, { powerKw: n('power'), energyKwh: n('energy'), roundTrip: (n('roundTrip') ?? 85) / 100, socMin: (n('socMin') ?? 10) / 100, socMax: (n('socMax') ?? 90) / 100 }, v.zone);
      after = { ...after, delivered: shave.series };
    }
    if (!solar && !shave) { out.replaceChildren(el('p', t('screen.nothing'))); return; }
    const saved = savings(v.series, after, priced.rec, { zone: v.zone });
    const result = { shave, solar, saved, back: payback(n('cost'), saved.total * (12 / Math.max(1, saved.months))), excluded: EXCLUDED, upperBound: UPPER_BOUND };
    out.innerHTML = String(renderScreen(result, i18n));
    last.screen = { input: { ...(shave ? shave.assumptions : {}), solar: Boolean(solar) }, result };
    panel.dataset.screened = String(Number(panel.dataset.screened ?? 0) + 1);
  });
  $('[data-compare-run]').addEventListener('click', () => compare(null));
  $('[data-conditions]').addEventListener('change', () => { if ($('[data-compare-result]').childElementCount) compare(null); });
  $('[data-shift]').addEventListener('submit', (e) => {
    e.preventDefault();
    const f = new FormData(e.target);
    const kw = readNumber(String(f.get('kw')));
    const hours = Math.max(1, Math.min(12, Math.round(Number(f.get('hours')) || 1)));
    if (!(kw > 0)) return;
    const from = Number(f.get('from'));
    const to = Number(f.get('to'));
    const amount = f.get('unit') === 'kWh a day' ? { kwhPerDay: kw } : { kw };
    compare({ ...amount, from: [from, from + hours], to: [to, to + hours], days: f.get('days') });
  });
  $('[data-bill-holidays]').addEventListener('change', price);
  // An actual bill's total, typed into a month: the difference and its likely causes.
  $('[data-bill-result]').addEventListener('input', (e) => {
    const key = e.target.dataset.actual;
    if (!key || !priced) return;
    const box = $(`[data-compare="${key}"]`);
    const total = readNumber(e.target.value.replace(/^\$/, ''));
    const month = priced.bills.months.find((m) => m.month === key);
    if (total === null || !month) { box.replaceChildren(); return; }
    box.innerHTML = String(renderComparison(compareActual(month, { total }, priced.rec), month.total, total, i18n));
  });
  $('[data-bill-result]').addEventListener('click', (e) => {
    const b = e.target.closest('[data-show-ms]');
    if (b) showOnChart(Number(b.dataset.showMs), Number(b.dataset.showKw));
  });
  // Result cards: plain text with the result, inputs, method, sources, and version, never the file's readings.
  panel.addEventListener('click', async (e) => {
    const b = e.target.closest('[data-copy-card]');
    const v = view();
    if (!b || !v || !priced) return;
    const ctx = { utility: utilityName, period: period(v), version: WORKBENCH_VERSION, urdbAsOf: asOf, rate: priced.rec.name };
    const text = b.dataset.copyCard === 'bill' ? billCard(priced.rec, priced.bills, ctx)
      : b.dataset.copyCard === 'ranking' ? rankingCard(last.ranking, ctx)
        : screenCard(last.screen.input, last.screen.result, ctx);
    panel.dataset.card = text;
    await navigator.clipboard?.writeText(text).catch(() => {});
    b.textContent = t('answer.copied');
  });
  panel.dataset.ready = 'true';
  // A new file, or a new choice in the receipt, re-prices on the same rate.
  return {
    refresh: () => { if (rates.length) price(); },
    /** What the report needs from this panel. */
    state: () => ({ priced, ranking: last.ranking, screen: last.screen, urdbAsOf: asOf, period: view() ? period(view()) : '' }),
  };
}
