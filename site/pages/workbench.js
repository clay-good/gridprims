// The file workbench: drop or choose a file, parse it in a worker, show the
// answer, the editable receipt, and the chart. Files stay in memory unless the
// user ticks "Keep this file on this device".

import { createI18n } from '../lib/i18n.mjs';
import { renderAnswer, renderChart, renderReceipt, viewOf, when } from '../ui/workbench.mjs';
import { setupBill } from './workbench-bill.js';
import { renderInsights } from '../ui/workbench-insights.mjs';
import { exportForReopt } from '../../core/lib/reopt-export.mjs';
import { renderReport } from '../ui/workbench-report.mjs';
import { WORKBENCH_VERSION } from './workbench-bill.js';
import { setupCp } from './workbench-cp.js';
import { setupProposal } from './workbench-proposal.js';
import { setupHeadroom } from './workbench-headroom.js';
import { preselect } from '../../core/lib/coincident-peak.mjs';
import { formatNumber } from '../../core/lib/precision.mjs';
import strings from '../strings/en-US.mjs';

const i18n = createI18n(strings, 'en-US');
const { t } = i18n;
const $ = (sel) => document.querySelector(sel);
const SAMPLE = { url: '/site/samples/sample-office-15min.csv', name: 'sample-office-15min.csv', zone: 'America/Chicago' };
const deviceZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
const KEPT_DB = 'gridprims-files';

let current = null; // {bytes, name, sample, choices, result, index}
let worker = null;

function newWorker() {
  worker?.terminate();
  worker = new Worker(new URL('./intake-worker.js', import.meta.url), { type: 'module' });
}

/** Parse bytes in the worker with the given choices; resolves with the result or a refusal. */
function parse(bytes, name, choices) {
  newWorker();
  $('[data-progress]').hidden = false;
  $('[data-progress-label]').textContent = t('files.reading', { name });
  const bar = $('[data-progress] progress');
  bar.value = 0;
  return new Promise((resolve) => {
    worker.onmessage = (e) => {
      const m = e.data;
      if (m.type === 'progress') { bar.value = m.fraction; return; }
      $('[data-progress]').hidden = true;
      resolve(m);
    };
    worker.onerror = (e) => { $('[data-progress]').hidden = true; resolve({ type: 'refused', message: e.message }); };
    worker.postMessage({ bytes: bytes.slice(0), name, choices });
  });
}

let bill = null;
let cp = null;

function render() {
  const v = viewOf(current.result, current.index);
  current.view = v;
  $('[data-answer]').innerHTML = String(renderAnswer(v, i18n, { sample: current.sample }));
  $('[data-receipt]').innerHTML = String(renderReceipt(v, i18n));
  $('[data-chart]').innerHTML = String(renderChart(v, i18n));
  $('[data-keep]').checked = Boolean(current.kept);
  $('[data-keep]').disabled = current.sample;
  renderInsightsPanel();
  bill?.refresh();
  cp?.refresh();
}

/** "What this file says", with the demand window the user picked. */
function renderInsightsPanel() {
  const v = current.view;
  const reviewed = new Set(($('[data-workbench]').dataset.reviewed ?? '').split(' ').filter(Boolean));
  $('[data-insights]').innerHTML = String(renderInsights(v, i18n, { when, window: current.window, aggregate: v.aggregate, reviewed }));
  $('[data-insights]').dataset.rendered = String(Number($('[data-insights]').dataset.rendered ?? 0) + 1);
}
$('[data-insights]').addEventListener('change', (e) => {
  if (!e.target.closest('[data-window]') || !current) return;
  const f = new FormData(e.target.form);
  current.window = { minutes: Number(f.get('minutes')), mode: f.get('mode') };
  renderInsightsPanel();
});
$('[data-insights]').addEventListener('click', (e) => {
  const b = e.target.closest('[data-show-ms]');
  if (b) showOnChart(Number(b.dataset.showMs), Number(b.dataset.showKw));
  if (e.target.closest('[data-reopt-export]')) reoptExport();
});

// The one-page report: made here from what is on the page, printed by the browser (its "Save as PDF" makes the file).
$('[data-make-report]').addEventListener('click', () => {
  const v = current?.view;
  if (!v) return;
  const view = $('[data-report-view]');
  view.innerHTML = String(renderReport({ v, when: (ms) => when(ms, v.zone), version: WORKBENCH_VERSION, ...bill.state(), cp: cp.state() }, i18n));
  view.hidden = false;
  view.scrollIntoView({ block: 'start' });
  document.documentElement.dataset.report = String(Number(document.documentElement.dataset.report ?? 0) + 1);
});
$('[data-report-view]').addEventListener('click', (e) => { if (e.target.closest('[data-print-report]')) print(); });

/** The REopt-ready load file and its notes, made here and offered as downloads. Filled values stay in the export. */
function reoptExport() {
  const v = current.view;
  const box = $('[data-reopt-result]');
  const r = exportForReopt(v.series, v.zone);
  if (r.status !== 'ok') { box.replaceChildren(Object.assign(document.createElement('p'), { className: 'errors', textContent: r.reason })); return; }
  const link = (text, name, body) => Object.assign(document.createElement('a'), { className: 'button', textContent: text, download: name, href: URL.createObjectURL(new Blob([body], { type: 'text/plain' })) });
  const list = Object.assign(document.createElement('ul'), { className: 'unit-hint' });
  list.append(...r.notes.map((n) => Object.assign(document.createElement('li'), { textContent: n })));
  box.replaceChildren(link(i18n.t('reopt.csv', { rows: r.rows.toLocaleString('en-US') }), r.fileName, r.csv), document.createTextNode(' '), link(i18n.t('reopt.notes'), r.fileName.replace('.csv', '-notes.txt'), r.notes.join('\n') + '\n'), list);
  box.dataset.rows = String(r.rows);
}

/** Move the chart's highlight to an interval, such as the one that set a demand charge. */
function showOnChart(ms, kw) {
  const v = current?.view;
  if (!v) return;
  $('[data-chart]').innerHTML = String(renderChart(v, i18n, { highlight: { x: ms, y: kw, label: `${formatNumber(kw, { sigFigs: 3 })} kW` } }));
  $('[data-chart]').dataset.highlight = String(ms);
  $('[data-chart]').scrollIntoView({ block: 'nearest' });
}
// The utility picked for the bill sets the coincident-peak program: ERCOT 4CP for a utility in ERCOT.
let proposal = null;
bill = setupBill({ i18n, view: () => current?.view ?? null, when, showOnChart, onUtility: (u) => cp?.preselect(preselect(u.bas ?? [])), onPriced: () => proposal?.refresh() });
proposal = setupProposal({ i18n, view: () => current?.view ?? null, priced: () => bill.state().priced, utility: () => bill.utility(), period: () => bill.state().period, version: WORKBENCH_VERSION });
cp = setupCp({ i18n, view: () => current?.view ?? null, when });
setupHeadroom({ i18n, view: () => current?.view ?? null, when });
// The home page's "Cheapest plan on my data" opens here, at the plan finder.
if (location.hash === '#plans') $('[data-bill]').scrollIntoView({ block: 'start' });

async function load(bytes, name, { sample = false, kept = false, choices } = {}) {
  $('[data-error]').hidden = true;
  const ch = choices ?? { zone: sample ? SAMPLE.zone : deviceZone, stampsMark: 'auto', quantity: 'auto' };
  const m = await parse(bytes, name, ch);
  if (m.type === 'canceled') return;
  if (m.type !== 'done') {
    $('[data-error]').hidden = false;
    $('[data-error]').innerHTML = '';
    const p = document.createElement('span');
    p.textContent = `${t('files.refused')} ${m.message} `;
    const a = Object.assign(document.createElement('a'), { href: m.learnUrl ?? '/learn/get-your-data/', textContent: t('files.noFile') });
    $('[data-error]').append(p, a);
    return;
  }
  current = { bytes, name, sample, kept, choices: ch, result: m.result, index: current?.name === name ? current.index : 0 };
  if (current.index >= m.result.series.length) current.index = 0;
  render();
  // Count finished reads, so anything waiting on a re-read can tell a new result from the last one.
  document.documentElement.dataset.loads = String(Number(document.documentElement.dataset.loads ?? 0) + 1);
  document.documentElement.dataset.ready = 'true';
}

async function fromFile(file) {
  if (!file) return;
  await load(new Uint8Array(await file.arrayBuffer()), file.name);
  await keep(false);
}

// Receipt choices re-run the read with the new choice.
$('[data-receipt]').addEventListener('change', async (e) => {
  const name = e.target.dataset.choice;
  if (!name || !current) return;
  if (name === 'series') { current.index = Number(e.target.value); render(); return; }
  const choices = { ...current.choices, [name]: e.target.value, ...(name === 'zone' ? { zoneSet: true } : {}) };
  await load(current.bytes, current.name, { sample: current.sample, kept: current.kept, choices });
});

$('[data-cancel]').addEventListener('click', () => {
  newWorker();
  $('[data-progress]').hidden = true;
  $('[data-error]').hidden = false;
  $('[data-error]').textContent = t('files.canceled');
});

$('[data-choose]').addEventListener('click', () => $('[data-file]').click());
$('[data-file]').addEventListener('change', (e) => fromFile(e.target.files[0]));

// Drop anywhere on the page; while dragging, say plainly that nothing is uploaded.
let depth = 0;
addEventListener('dragenter', (e) => { e.preventDefault(); depth++; $('[data-overlay]').hidden = false; });
addEventListener('dragleave', () => { depth = Math.max(0, depth - 1); if (!depth) $('[data-overlay]').hidden = true; });
addEventListener('dragover', (e) => e.preventDefault());
addEventListener('drop', (e) => { e.preventDefault(); depth = 0; $('[data-overlay]').hidden = true; fromFile(e.dataTransfer?.files?.[0]); });

// "Keep this file on this device": the only way a file outlives the tab.
function db() {
  return new Promise((resolve, reject) => {
    const r = indexedDB.open(KEPT_DB, 1);
    r.onupgradeneeded = () => r.result.createObjectStore('files');
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });
}
async function keep(on) {
  if (!current || current.sample) return;
  const d = await db();
  await new Promise((res) => {
    const tx = d.transaction('files', 'readwrite');
    if (on) tx.objectStore('files').put({ name: current.name, bytes: current.bytes, choices: current.choices }, 'current');
    else tx.objectStore('files').delete('current');
    tx.oncomplete = res;
  });
  d.close();
  current.kept = on;
}
async function keptFile() {
  if (!globalThis.indexedDB?.databases || !(await indexedDB.databases()).some((x) => x.name === KEPT_DB)) return null;
  const d = await db();
  const v = await new Promise((res) => { const r = d.transaction('files').objectStore('files').get('current'); r.onsuccess = () => res(r.result); r.onerror = () => res(null); });
  d.close();
  return v ?? null;
}
$('[data-keep]').addEventListener('change', (e) => keep(e.target.checked));

const kept = await keptFile().catch(() => null);
if (kept) await load(kept.bytes, kept.name, { kept: true, choices: kept.choices });
else await load(new Uint8Array(await (await fetch(SAMPLE.url)).arrayBuffer()), SAMPLE.name, { sample: true });
