// The home page is the instrument: a dropped file replaces the sample in place,
// on this page, parsed in the same worker the workbench uses. Nothing is
// uploaded. Without JavaScript the primary action stays a link to the workbench.

import { createI18n } from '../lib/i18n.mjs';
import strings from '../strings/en-US.mjs';
import { viewOf } from '../ui/workbench.mjs';

const { t } = createI18n(strings, 'en-US');
const proof = document.querySelector('[data-proof]');
const open = document.querySelector('[data-home-open]');
const picker = document.querySelector('[data-home-file]');
if (proof && open && picker) {
  const $ = (sel) => proof.querySelector(sel);
  const n = (x, d = 0) => x.toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });
  const day = (ms) => new Date(ms).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC' });
  const hour = (h) => `${((h + 11) % 12) + 1} ${h < 12 ? 'am' : 'pm'}`;

  /** The peak day's hourly demand, the same shape the build draws for the sample. */
  function curveOf(series, peakStartMs) {
    const date = new Date(peakStartMs).toISOString().slice(0, 10);
    const hours = Array.from({ length: 24 }, () => ({ kwh: 0, n: 0 }));
    for (let i = 0; i < series.startMs.length; i++) {
      const d = new Date(series.startMs[i]);
      if (d.toISOString().slice(0, 10) !== date) continue;
      const h = hours[d.getUTCHours()];
      h.kwh += series.kwh[i];
      h.n++;
    }
    const perHour = 60 / series.intervalMinutes;
    return hours.map((h, i) => ({ hour: i, kw: h.n ? (h.kwh / h.n) * perHour : 0 }));
  }

  function show(view, name) {
    const { stats, series } = view;
    const curve = curveOf(series, stats.peakStartMs);
    const top = Math.max(...curve.map((c) => c.kw)) || 1;
    const x = (h) => 4 + (h / 23) * 92;
    const y = (kw) => 92 - (kw / top) * 80;
    $('.number').firstChild.textContent = n(stats.peakKw, 1);
    $('.sentence').textContent = t('home.proof.yours', { file: name, when: day(stats.peakStartMs) });
    $('.source-tab').textContent = t('home.proof.basis', {
      file: name, intervals: n(stats.intervals), from: day(series.startMs[0]), to: day(series.startMs[series.startMs.length - 1]),
    });
    const values = proof.querySelectorAll('.figure-value');
    const peakHour = new Date(stats.peakStartMs).getUTCHours();
    [n(stats.totalKwh), n(stats.loadFactor * 100, 1), n(stats.intervals)].forEach((v, i) => {
      if (values[i]) values[i].firstChild.textContent = v;
    });
    const line = $('polyline');
    if (line) line.setAttribute('points', curve.flatMap((c, i) => [`${x(i)},${y(c.kw)}`, `${x(Math.min(23, i + 1))},${y(c.kw)}`]).join(' '));
    const mark = $('.peak-mark');
    if (mark) { mark.setAttribute('x1', x(peakHour)); mark.setAttribute('x2', x(peakHour)); }
    $('figcaption').textContent = t('home.proof.curveCaption', { day: day(stats.peakStartMs), when: hour(peakHour), peak: n(stats.peakKw, 1) });
    const body = $('.proof-table tbody');
    if (body) body.replaceChildren(...curve.map((c) => {
      const tr = document.createElement('tr');
      const th = Object.assign(document.createElement('th'), { scope: 'row', textContent: hour(c.hour) });
      const td = Object.assign(document.createElement('td'), { className: 'num', textContent: n(c.kw, 1) });
      tr.append(th, td);
      return tr;
    }));
    proof.dataset.source = 'yours';
  }

  function read(file) {
    if (!file) return;
    const status = $('.proof-title');
    status.textContent = t('files.reading', { name: file.name });
    const worker = new Worker(new URL('./intake-worker.js', import.meta.url), { type: 'module' });
    worker.onmessage = async (e) => {
      const m = e.data;
      if (m.type === 'progress') return;
      worker.terminate();
      if (m.type !== 'done') { status.textContent = t('home.proof.refused', { reason: m.message ?? '' }); return; }
      show(viewOf(m.result, 0), file.name);
      status.textContent = t('home.proof.yoursTitle');
    };
    worker.onerror = () => { worker.terminate(); status.textContent = t('home.proof.refused', { reason: '' }); };
    // The worker asks for a zone before it will read stamps; this device's is the honest default.
    const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    file.arrayBuffer().then((bytes) => worker.postMessage({ bytes, name: file.name, choices: { zone } }));
  }

  open.addEventListener('click', (e) => { e.preventDefault(); picker.click(); });
  picker.addEventListener('change', () => read(picker.files[0]));
  for (const type of ['dragover', 'drop']) {
    document.addEventListener(type, (e) => {
      e.preventDefault();
      if (type === 'drop') read(e.dataTransfer?.files?.[0]);
    });
  }
}
