// The workbench's bill panel: find the utility from a ZIP, pick one of its
// URDB rates, and price the loaded series on it here. Requests go only for
// the lookup shards a ZIP needs and the chosen utility's rate file.

import { intervalBills } from '../../core/lib/interval-bill.mjs';
import { rateOption, renderBills } from '../ui/workbench-bill.mjs';
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

  function price() {
    const rec = rates[Number($('[data-bill-rate]').value)];
    const v = view();
    if (!rec || !v) return;
    const received = v.result.series.find((s) => s.meter === v.series.meter && s.channel === 'received' && s !== v.series);
    const bills = intervalBills(v.series, rec, { zone: v.zone, received, holidays: $('[data-bill-holidays]').checked });
    const dataStart = new Intl.DateTimeFormat('en-CA', { timeZone: v.zone }).format(new Date(v.series.startMs[0]));
    $('[data-bill-result]').innerHTML = String(renderBills(rec, bills, i18n, { when: (ms) => when(ms, v.zone), dataStart }));
    panel.dataset.priced = rec.id;
  }

  async function showUtility() {
    const u = utilities[Number($('[data-bill-utility]').value)];
    $('[data-bill-rate-field]').hidden = true;
    $('[data-bill-holidays-field]').hidden = true;
    $('[data-bill-result]').replaceChildren();
    if (!u) return;
    rates = await getJson(`/bills/rates/${u.id}.json`).catch(() => []);
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
  $('[data-bill-holidays]').addEventListener('change', price);
  $('[data-bill-result]').addEventListener('click', (e) => {
    const b = e.target.closest('[data-show-ms]');
    if (b) showOnChart(Number(b.dataset.showMs), Number(b.dataset.showKw));
  });
  panel.dataset.ready = 'true';
  // A new file, or a new choice in the receipt, re-prices on the same rate.
  return { refresh: () => { if (rates.length) price(); } };
}
