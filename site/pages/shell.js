// Shell behavior on every page: the theme toggle and the command bar.

import { createI18n } from '../lib/i18n.mjs';
import { searchCommands } from '../../core/contract/command.mjs';
import strings from '../strings/en-US.mjs';
import './report.js';

const { t } = createI18n(strings, 'en-US');

// Theme: a saved choice wins over the device setting (applied before paint in the layout).
const KEY = 'gridprims-theme';
const toggle = document.querySelector('[data-theme-toggle]');
const current = () => document.documentElement.dataset.theme
  ?? (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
const label = () => { toggle.textContent = current() === 'dark' ? t('theme.light') : t('theme.night'); };
toggle?.addEventListener('click', () => {
  const next = current() === 'dark' ? 'light' : 'dark';
  document.documentElement.dataset.theme = next;
  try { localStorage.setItem(KEY, next); } catch { /* storage blocked: the choice lasts for this page */ }
  label();
});
if (toggle) label();

// Command bar: runs on the device against the prebuilt index; nothing typed is sent anywhere.
const input = document.querySelector('#command-input');
const list = document.querySelector('#command-results');
let index = null;
let results = [];
let selected = 0;

const loadIndex = async () => (index ??= await (await fetch('/command-index.json')).json());

const hrefOf = (r) => (r.values ? `${r.url}#${new URLSearchParams(r.values)}` : r.url);

/** The answer a parsed query would give, computed here with the same core the tool page uses. */
async function preview(r) {
  if (!r.values || Object.keys(r.values).length < r.inputs.filter((i) => i.type !== 'file').length) return '';
  const [{ default: manifest }, impl, { runTool }] = await Promise.all([
    import(`../../core/tools/${r.id}/manifest.mjs`), import(`../../core/tools/${r.id}/tool.mjs`), import('../../core/contract/run.mjs'),
  ]);
  const out = runTool(manifest, impl, r.values);
  if (out.status !== 'ok') return '';
  const first = Object.values(out.outputs)[0];
  return `= ${first.display} ${first.unit}`;
}

function render() {
  list.replaceChildren();
  if (!input.value.trim()) { list.hidden = true; input.setAttribute('aria-expanded', 'false'); return; }
  if (!results.length) {
    const li = document.createElement('li');
    li.className = 'hint';
    li.textContent = t('command.noMatch');
    list.append(li);
  }
  results.forEach((r, i) => {
    const li = document.createElement('li');
    li.id = `command-option-${i}`;
    li.setAttribute('role', 'option');
    li.setAttribute('aria-selected', String(i === selected));
    const a = document.createElement('a');
    a.href = hrefOf(r);
    a.tabIndex = -1;
    a.textContent = r.title;
    const hint = document.createElement('span');
    hint.className = 'hint';
    a.append(' ', hint);
    li.append(a);
    list.append(li);
    if (i === 0) preview(r).then((p) => { hint.textContent = p; }, () => {});
  });
  list.hidden = false;
  input.setAttribute('aria-expanded', 'true');
  input.setAttribute('aria-activedescendant', results.length ? `command-option-${selected}` : '');
}

input?.addEventListener('focus', loadIndex, { once: true });
input?.addEventListener('input', async () => {
  results = searchCommands(input.value, await loadIndex());
  selected = 0;
  render();
});
input?.addEventListener('keydown', (e) => {
  if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
    e.preventDefault();
    if (!results.length) return;
    selected = (selected + (e.key === 'ArrowDown' ? 1 : results.length - 1)) % results.length;
    render();
  } else if (e.key === 'Enter' && results[selected]) {
    e.preventDefault();
    location.assign(hrefOf(results[selected]));
  } else if (e.key === 'Escape') {
    input.value = '';
    results = [];
    render();
  }
});
addEventListener('keydown', (e) => {
  const typing = /^(INPUT|SELECT|TEXTAREA)$/.test(document.activeElement?.tagName ?? '');
  if (((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') || (e.key === '/' && !typing)) {
    e.preventDefault();
    input?.focus();
  }
});
// Staleness is computed here, on the device, at view time: a stalled pipeline
// cannot hide it by not rebuilding the page.
const today = new Date().toISOString().slice(0, 10);
for (const chip of document.querySelectorAll('[data-late-from]')) chip.hidden = today < chip.dataset.lateFrom;

// Offline after the first visit: the service worker caches the app shell.
if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js').catch(() => { /* offline use is a bonus, never a requirement */ });

document.documentElement.dataset.shellReady = 'true';
