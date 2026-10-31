// Hydrates a calculator page: recompute on every change with no submit button,
// keep inputs in the URL fragment, and copy results with their validation level.

import { runTool } from '../../core/contract/run.mjs';
import { createI18n } from '../lib/i18n.mjs';
import { copyText, renderAnswer, renderWork } from '../ui/tool-page.mjs';
import { decodeState, encodeState, isExampleState } from '../ui/share-state.mjs';
import strings from '../strings/en-US.mjs';

const root = document.querySelector('[data-tool]');
const id = root.dataset.tool;
const [{ default: manifest }, impl] = await Promise.all([
  import(`../../core/tools/${id}/manifest.mjs`),
  import(`../../core/tools/${id}/tool.mjs`),
]);
const i18n = createI18n(strings, 'en-US');
const form = root.querySelector('[data-inputs]');
const answer = root.querySelector('[data-answer]');
const work = root.querySelector('[data-work]');
const announce = root.querySelector('[data-announce]');
let last = null;
let announceTimer = 0;

const readForm = () => Object.fromEntries(new FormData(form).entries());

function showErrors(errors) {
  for (const el of form.querySelectorAll('[name]')) {
    const err = errors.find((e) => e.field === el.name);
    const msg = form.querySelector(`#${el.id}-error`);
    el.setAttribute('aria-invalid', err ? 'true' : 'false');
    msg.hidden = !err;
    msg.textContent = err ? err.message : '';
  }
}

function update({ pushState = true } = {}) {
  const values = readForm();
  const result = runTool(manifest, impl, values);
  const isExample = isExampleState(manifest, values);
  last = result;
  answer.innerHTML = String(renderAnswer(manifest, result, i18n, { isExample }));
  work.innerHTML = String(renderWork(manifest, result, i18n));
  showErrors(result.status === 'invalid' ? result.errors : []);
  if (pushState) history.replaceState(null, '', isExample ? location.pathname : encodeState(manifest, values));
  // Announce once, 500 ms after the inputs settle, so screen readers are not flooded.
  clearTimeout(announceTimer);
  announceTimer = setTimeout(() => { announce.textContent = result.status === 'ok' ? result.sentence : i18n.t('answer.invalid'); }, 500);
}

/** Apply inputs carried in the fragment, from a shared link. */
function applyFragment() {
  const shared = decodeState(manifest, location.hash);
  for (const [name, value] of Object.entries(shared)) {
    const el = form.elements.namedItem(name);
    if (el) el.value = value;
  }
  if (Object.keys(shared).length) update({ pushState: false });
}
applyFragment();
// A link pasted while the page is open changes only the fragment, so no reload happens.
addEventListener('hashchange', applyFragment);

form.addEventListener('input', () => update());
form.addEventListener('change', () => update());
form.addEventListener('submit', (e) => e.preventDefault());

root.querySelector('[data-copy]').addEventListener('click', async (e) => {
  if (!last) last = runTool(manifest, impl, readForm());
  await navigator.clipboard?.writeText(copyText(manifest, last, i18n, location.href));
  e.currentTarget.textContent = i18n.t('answer.copied');
});
root.querySelector('[data-share]').addEventListener('click', async (e) => {
  const url = `${location.origin}${location.pathname}${encodeState(manifest, readForm())}`;
  await navigator.clipboard?.writeText(url);
  e.currentTarget.textContent = i18n.t('answer.copied');
});

document.documentElement.dataset.ready = 'true';
