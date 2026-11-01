// The terms page's filters and comparison, on the device: state, status, and
// a threshold ceiling hide entries; up to four checked entries appear side by
// side, with every field whose values differ marked.

import { html, raw } from '../lib/html.mjs';
import { createI18n } from '../lib/i18n.mjs';
import strings from '../strings/en-US.mjs';

const { t } = createI18n(strings, 'en-US');
const panel = document.querySelector('[data-terms-filters]');
const entries = [...document.querySelectorAll('[data-term-entry]')];
const shown = panel.querySelector('[data-terms-shown]');
const out = panel.querySelector('[data-terms-compare]');
const MAX = 4;

function filter() {
  const state = panel.querySelector('[name="state"]').value;
  const status = panel.querySelector('[name="status"]').value;
  const max = Number(panel.querySelector('[name="threshold"]').value);
  let n = 0;
  for (const e of entries) {
    const mw = e.dataset.thresholdMw === '' ? null : Number(e.dataset.thresholdMw);
    const hide = (state && e.dataset.state !== state) || (status && e.dataset.status !== status) || (max > 0 && mw !== null && mw > max);
    e.hidden = Boolean(hide);
    if (!hide) n++;
  }
  shown.textContent = t('llterms.shown', { count: n, total: entries.length });
}

function compare() {
  const chosen = entries.filter((e) => e.querySelector('[data-compare]').checked);
  if (chosen.length > MAX) { out.innerHTML = String(html`<p class="errors">${t('llterms.compareTooMany')}</p>`); return; }
  if (chosen.length < 2) { out.innerHTML = ''; panel.dataset.compared = '0'; return; }
  const fields = [...chosen[0].querySelectorAll('[data-field]')].map((d) => d.dataset.field);
  // The cells carry the entries' own built markup, citations included.
  const text = (e, f) => e.querySelector(`[data-field="${f}"]`).firstChild?.textContent.trim() ?? '';
  out.innerHTML = String(html`<div class="table-wrap"><table data-compare-table><thead><tr><th scope="col"></th>${chosen.map((e) => html`<th scope="col">${e.querySelector('h2').firstChild.textContent.trim()}</th>`)}</tr></thead>
  <tbody>${fields.map((f) => { const vals = chosen.map((e) => text(e, f)); const differs = new Set(vals).size > 1; return html`<tr data-row="${f}" data-differs="${String(differs)}"><th scope="row">${chosen[0].querySelector(`[data-field="${f}"]`).previousElementSibling.textContent}${differs ? html` <span class="warning-chip">${t('llterms.differs')}</span>` : ''}</th>${chosen.map((e) => html`<td>${raw(e.querySelector(`[data-field="${f}"]`).innerHTML)}</td>`)}</tr>`; })}</tbody></table></div>`);
  panel.dataset.compared = String(chosen.length);
}

panel.addEventListener('input', filter);
panel.addEventListener('change', filter);
for (const e of entries) e.querySelector('[data-compare]').addEventListener('change', compare);
filter();
