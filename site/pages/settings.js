// The settings page: list what this device holds and erase it on request.
// The cached app shell (the public site files) is the one thing kept.

import { createI18n } from '../lib/i18n.mjs';
import strings from '../strings/en-US.mjs';

const { t } = createI18n(strings, 'en-US');
export const SHELL_CACHE_PREFIX = 'gridprims-shell';
const root = document.querySelector('[data-settings]');
const list = root.querySelector('[data-stored]');

function storedKeys() {
  const keys = [];
  try { for (let i = 0; i < localStorage.length; i++) keys.push(localStorage.key(i)); } catch { /* storage blocked */ }
  try { for (let i = 0; i < sessionStorage.length; i++) keys.push(sessionStorage.key(i)); } catch { /* storage blocked */ }
  return keys.sort();
}

function render() {
  const keys = storedKeys();
  list.replaceChildren(...keys.map((k) => Object.assign(document.createElement('li'), { textContent: k })));
  root.querySelector('[data-empty]').hidden = keys.length > 0;
}

async function eraseAll() {
  try { localStorage.clear(); } catch { /* storage blocked */ }
  try { sessionStorage.clear(); } catch { /* storage blocked */ }
  if (globalThis.indexedDB?.databases) {
    for (const db of await indexedDB.databases()) if (db.name) indexedDB.deleteDatabase(db.name);
  }
  if (globalThis.caches) {
    for (const name of await caches.keys()) if (!name.startsWith(SHELL_CACHE_PREFIX)) await caches.delete(name);
  }
  delete document.documentElement.dataset.theme;
}

root.querySelector('[data-erase]').addEventListener('click', () => { root.querySelector('[data-confirm]').hidden = false; });
root.querySelector('[data-erase-no]').addEventListener('click', () => { root.querySelector('[data-confirm]').hidden = true; });
root.querySelector('[data-erase-yes]').addEventListener('click', async () => {
  await eraseAll();
  root.querySelector('[data-confirm]').hidden = true;
  root.querySelector('[data-erased]').textContent = t('settings.erased');
  render();
});
render();
document.documentElement.dataset.ready = 'true';
