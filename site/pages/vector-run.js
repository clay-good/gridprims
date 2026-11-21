// The bill test vectors run on the visitor's device (add-tariff-conformance-suite 2.6, "Runs in the
// browser"): the latest release is fetched as a file and every vector goes through the same function the
// release gate uses, core/lib/run-vector.mjs, showing pass, fail, or skipped with the expected and computed
// bills, so nobody has to take our word for the result.

import { html } from '../lib/html.mjs';
import { createI18n } from '../lib/i18n.mjs';
import strings from '../strings/en-US.mjs';
import { runVector } from '../../core/lib/run-vector.mjs';

const { t } = createI18n(strings, 'en-US');
const panel = document.querySelector('[data-vector-run]');
const button = panel?.querySelector('button');
const out = panel?.querySelector('[data-vector-results]');
const usd = (n) => (n === undefined ? '' : `$${n.toFixed(2)}`);

async function run() {
  button.disabled = true;
  out.textContent = t('gt.run.running');
  try {
    const release = await (await fetch(panel.dataset.src)).json();
    const started = performance.now();
    const results = release.vectors.map(runVector);
    const ms = Math.round(performance.now() - started);
    const count = (s) => results.filter((r) => r.status === s).length;
    out.innerHTML = String(html`<p data-run-summary aria-live="polite">${t('gt.run.summary', { version: release.version, pass: count('pass'), fail: count('fail'), skipped: count('skipped'), ms })}</p>
<div class="table-wrap"><table data-run-table><caption>${t('gt.run.caption')}</caption>
<thead><tr><th scope="col">${t('gt.run.vector')}</th><th scope="col">${t('gt.run.result')}</th><th scope="col" class="num">${t('gt.run.expected')}</th><th scope="col" class="num">${t('gt.run.computed')}</th><th scope="col" class="num">${t('gt.run.difference')}</th></tr></thead>
<tbody>${results.map((r) => html`<tr data-run="${r.id}" data-status="${r.status}"><th scope="row" class="mono">${r.id}</th><td>${t(`gt.run.${r.status}`)}${r.reason ? html` <span class="unit-hint">${r.reason}</span>` : ''}</td><td class="num mono">${usd(r.expected)}</td><td class="num mono">${usd(r.computed)}</td><td class="num mono">${usd(r.difference)}</td></tr>`)}</tbody>
</table></div>`);
    document.documentElement.dataset.vectorsRun = String(results.length);
  } catch {
    out.textContent = t('gt.run.failed');
  } finally {
    button.disabled = false;
  }
}

button?.addEventListener('click', run);
