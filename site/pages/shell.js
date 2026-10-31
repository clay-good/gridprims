// Shell behavior on every page: the theme toggle. The command bar arrives with
// its index (foundation task 8.3).

import { createI18n } from '../lib/i18n.mjs';
import strings from '../strings/en-US.mjs';

const { t } = createI18n(strings, 'en-US');
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
