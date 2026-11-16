// Runs the pole list panel: read the chosen file on this device, check it in
// a worker with progress and cancel, show one line per pole, export CSV, and
// open any pole in the page above. Nothing is sent or kept.

import { linesKind, readPoleList, readStandardsWorkbook, poleInputs } from '../../core/lib/lines-files.mjs';
import { chooseRow, parseRules } from '../../core/lib/attachment.mjs';
import { poleBatchCsv } from '../../core/lib/pole-batch.mjs';
import { createI18n } from '../lib/i18n.mjs';
import strings from '../strings/en-US.mjs';

const { t } = createI18n(strings, 'en-US');
const root = document.querySelector('[data-tool]');
const panel = document.querySelector('[data-pole-list]');
const form = document.querySelector('[data-inputs]');
const out = panel.querySelector('[data-pole-result]');
const progress = panel.querySelector('[data-pole-progress]');
const el = (tag, props = {}, ...kids) => { const n = Object.assign(document.createElement(tag), props); n.append(...kids); return n; };
let worker = null;
let text = '';

function stop() { worker?.terminate(); worker = null; progress.hidden = true; }

// Your rules from a file: a PDF is not read; a workbook's first sheet with the template header is.
const rulesOut = panel.querySelector('[data-rules-result]');
const pdfAnswer = () => [el('p', { className: 'errors', textContent: t('poles.pdf') }), el('a', { href: '/lines/standards-template.csv', textContent: t('poles.template') })];
panel.querySelector('[data-rules-file]').addEventListener('change', async (e) => {
  const file = e.target.files?.[0];
  if (!file) return;
  if (/\.pdf$/i.test(file.name) || file.type === 'application/pdf') { rulesOut.replaceChildren(...pdfAnswer()); return; }
  const bytes = new Uint8Array(await file.arrayBuffer());
  let read;
  if (bytes[0] === 0x50 && bytes[1] === 0x4b) {
    try { read = await readStandardsWorkbook(bytes); } catch (err) { read = { error: err.message }; }
  } else {
    const text = new TextDecoder().decode(bytes);
    read = linesKind(text) === 'lines-standards' ? { text: text.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n').trim() } : { error: t('poles.rulesNot') };
  }
  if (read.error) { rulesOut.replaceChildren(el('p', { className: 'errors', textContent: read.error })); return; }
  const box = form.elements.namedItem('rules');
  box.value = read.text;
  box.dispatchEvent(new Event('input', { bubbles: true }));
  const count = read.text.split('\n').length - 1;
  rulesOut.replaceChildren(el('p', { textContent: read.sheet ? t('poles.rulesSheet', { count, sheet: read.sheet }) : t('poles.rulesRead', { count }) }), ...conflictPickers(box));
});

// Two rows that set one rule differently: offer each, and a pick rewrites the one rule record the checks read.
function conflictPickers(box) {
  return parseRules(box.value).conflicts.map((c) => {
    const p = el('p', { textContent: t('poles.conflict', { rows: c.rows.join(' and '), id: c.id, values: c.values.join(' and ') }) });
    c.rows.forEach((row, k) => {
      const b = el('button', { type: 'button', className: 'linkish', textContent: t('poles.useRow', { row, value: c.values[k] }) });
      b.addEventListener('click', () => {
        box.value = chooseRow(box.value, row);
        box.dispatchEvent(new Event('input', { bubbles: true }));
        p.replaceChildren(t('poles.picked', { row, id: c.id }));
      });
      p.append(' ', b);
    });
    return p;
  });
}

panel.querySelector('[data-pole-cancel]').addEventListener('click', () => { stop(); out.replaceChildren(el('p', { textContent: t('poles.cancelled') })); });

panel.querySelector('[data-pole-file]').addEventListener('change', async (e) => {
  const file = e.target.files?.[0];
  if (!file) return;
  stop();
  // A PDF of standards is not read: the template is the way in.
  if (/\.pdf$/i.test(file.name) || file.type === 'application/pdf') {
    out.replaceChildren(...pdfAnswer());
    return;
  }
  text = await file.text();
  if (linesKind(text) !== 'lines-pole-list') { out.replaceChildren(el('p', { className: 'errors', textContent: t('poles.notList') })); return; }
  const values = Object.fromEntries(new FormData(form).entries());
  progress.hidden = false;
  const bar = progress.querySelector('progress');
  const count = progress.querySelector('[data-pole-count]');
  const started = performance.now();
  worker = new Worker(new URL('./pole-list-worker.js', import.meta.url), { type: 'module' });
  worker.addEventListener('message', (m) => {
    if (m.data.type === 'progress') { bar.max = m.data.total; bar.value = m.data.done; count.textContent = t('poles.progress', { done: m.data.done.toLocaleString('en-US'), total: m.data.total.toLocaleString('en-US') }); return; }
    const ms = performance.now() - started;
    stop();
    show(m.data.batch, values, ms);
  });
  worker.postMessage({ text, values });
});

function show(batch, values, ms) {
  const checked = batch.poles.filter((p) => p.status === 'checked').length;
  const sources = [...new Set(parseRules(values.rules ?? '').rules.map((r) => r.source).filter(Boolean))];
  const csv = poleBatchCsv(batch, { source: sources.length ? `Your rules: ${sources.join('; ')}` : 'Your rules', edition: '' });
  panel.dataset.poles = String(batch.poles.length);
  panel.dataset.ms = String(Math.round(ms));
  panel.dataset.csv = csv;
  const table = el('table');
  table.append(el('caption', { textContent: t('poles.caption') }));
  table.append(el('thead', {}, el('tr', {}, ...[t('poles.col.pole'), t('poles.col.status'), t('poles.col.answer')].map((h) => el('th', { scope: 'col', textContent: h })))));
  const body = el('tbody');
  for (const [k, p] of batch.poles.entries()) {
    const open = el('button', { type: 'button', className: 'linkish', textContent: p.id });
    open.dataset.pole = String(k);
    const answer = p.status === 'checked'
      ? [p.instruction, ...p.shortfalls].join(' ')
      : p.reasons.map((r) => (r.row ? t(r.rules ? 'poles.rulesRowReason' : 'poles.rowReason', { row: r.row, reason: r.reason }) : r.reason)).join(' ');
    body.append(el('tr', {}, el('th', { scope: 'row' }, open), el('td', { textContent: p.status === 'checked' ? t('poles.checked') : t('poles.notChecked') }), el('td', { textContent: answer })));
  }
  table.append(body);
  const download = el('a', { className: 'button', textContent: t('poles.download'), download: 'gridprims-pole-list.csv', href: URL.createObjectURL(new Blob([csv], { type: 'text/csv' })) });
  const notRead = batch.problems.length ? el('p', { className: 'errors', textContent: t('poles.rowsNotRead', { rows: batch.problems.map((x) => t('poles.missing', { row: x.row, field: x.missing.replace('_', ' ') })).join('; ') }) }) : '';
  out.replaceChildren(el('p', { textContent: t('poles.summary', { poles: batch.poles.length.toLocaleString('en-US'), checked: checked.toLocaleString('en-US'), rows: batch.rowsRead.toLocaleString('en-US') }) }), download, notRead, el('div', { className: 'table-wrap' }, table));
}

// Open one pole above: its rows fill the form, and links name the file instead of holding them.
out.addEventListener('click', (e) => {
  const b = e.target.closest?.('[data-pole]');
  if (!b) return;
  const pole = readPoleList(text).poles[Number(b.dataset.pole)];
  const { attachments, poleLength } = poleInputs(pole);
  const inputs = { attachments, poleLength };
  root.dataset.fromFile = 'attachments,poleLength';
  for (const [name, value] of Object.entries(inputs)) form.elements.namedItem(name).value = value;
  form.dispatchEvent(new Event('input', { bubbles: true }));
  form.scrollIntoView({ block: 'start' });
});
panel.dataset.ready = 'true';
