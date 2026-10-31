// The proposed-rate panel: edit a copy of the priced rate, price both on the
// loaded file, and draft a comment. Copy and print only; nothing is sent.

import { copyTariff, impactOnIntervals, tariffDifferences } from '../../core/lib/rate-impact.mjs';
import { commentDraft } from '../../core/lib/comment-draft.mjs';
import { readNumber } from '../../core/lib/bill-totals.mjs';
import { chargeFields, renderImpact } from '../ui/workbench-proposal.mjs';

/** @param {{i18n: any, view: () => any, priced: () => any, utility: () => string, period: () => string, version: string}} p */
export function setupProposal({ i18n, view, priced, utility, period, version }) {
  const { t } = i18n;
  const panel = document.querySelector('[data-proposal]');
  const form = panel.querySelector('[data-proposal-form]');
  const draftForm = panel.querySelector('[data-draft-form]');
  let base = null;
  let last = null;

  /** The proposal: the copied rate with every edited field applied. */
  function proposal() {
    const p = copyTariff(base);
    for (const input of form.querySelectorAll('[data-path]')) {
      const v = readNumber(input.value);
      if (v === null) continue;
      const [key, i, k] = input.dataset.path.split('.');
      if (key === 'fixed') p.fixed = { amount: v, per: base.fixed?.per ?? 'month' };
      else if (key === 'minimum') p.minimum = { ...p.minimum, amount: v };
      else p[key].periods[Number(i)].tiers[Number(k)].rate = v;
    }
    return p;
  }

  panel.querySelector('[data-proposal-run]').addEventListener('click', () => {
    const v = view();
    if (!v || !base) return;
    const prop = proposal();
    last = impactOnIntervals(v.series, base, prop, { zone: v.zone });
    panel.querySelector('[data-proposal-result]').innerHTML = String(renderImpact(tariffDifferences(base, prop), last, i18n));
    draftForm.hidden = false;
    panel.dataset.compared = String(Number(panel.dataset.compared ?? 0) + 1);
  });

  // A state fills in its regulator's name and links; the person can still type their own.
  const stateSelect = draftForm.querySelector('[name=state]');
  const regulator = draftForm.querySelector('[name=regulator]');
  stateSelect.addEventListener('change', () => {
    const o = stateSelect.selectedOptions[0];
    if (o?.dataset.name && (!regulator.value || regulator.value === regulator.dataset.filled)) regulator.value = regulator.dataset.filled = o.dataset.name;
  });
  /** Links to the chosen regulator's own pages, where the person submits. */
  const regulatorLinks = () => {
    const o = stateSelect.selectedOptions[0];
    if (!o?.dataset.home) return [];
    const link = (href, text) => Object.assign(document.createElement('a'), { href, textContent: text, rel: 'noopener', target: '_blank' });
    const p = Object.assign(document.createElement('p'), { className: 'unit-hint' });
    p.dataset.regulatorLinks = '';
    const parts = [link(o.dataset.comment || o.dataset.home, o.dataset.comment ? t('draft.howToComment', { name: o.dataset.name }) : t('draft.regulatorSite', { name: o.dataset.name }))];
    if (o.dataset.docket) parts.push(document.createTextNode(' · '), link(o.dataset.docket, t('draft.docketSearch')));
    p.append(...parts);
    return [p];
  };

  draftForm.addEventListener('submit', (e) => {
    e.preventDefault();
    if (!last) return;
    const f = new FormData(draftForm);
    const text = commentDraft({ regulator: String(f.get('regulator') || t('draft.regulatorBlank')), docket: String(f.get('docket') || t('draft.docketBlank')), customerType: String(f.get('customerType')), utility: utility() || t('draft.utilityBlank'), period: period(), ownWords: String(f.get('ownWords') ?? '') }, last, { version, source: 'intervals' });
    const box = panel.querySelector('[data-draft-result]');
    const area = Object.assign(document.createElement('textarea'), { className: 'mono', rows: 14, readOnly: true, value: text });
    area.setAttribute('aria-label', t('draft.title'));
    const copy = Object.assign(document.createElement('button'), { type: 'button', className: 'button', textContent: t('draft.copy') });
    copy.addEventListener('click', async () => { await navigator.clipboard?.writeText(text).catch(() => {}); copy.textContent = t('answer.copied'); });
    const printBtn = Object.assign(document.createElement('button'), { type: 'button', className: 'button', textContent: t('draft.print') });
    printBtn.addEventListener('click', () => {
      // A page of its own, made here, so only the draft prints.
      const page = `<!doctype html><meta charset="utf-8"><title>${t('draft.title')}</title><pre style="white-space:pre-wrap;font:12pt/1.5 Georgia,serif">${text.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c])}</pre><script>print()</script>`;
      open(URL.createObjectURL(new Blob([page], { type: 'text/html' })));
    });
    box.replaceChildren(area, copy, document.createTextNode(' '), printBtn, ...regulatorLinks(), Object.assign(document.createElement('p'), { className: 'unit-hint', textContent: t('draft.yours') }));
    panel.dataset.draft = text;
  });

  return {
    /** Show the panel for the rate just priced. */
    refresh() {
      const p = priced();
      panel.hidden = !p;
      if (!p || p.rec === base) return;
      base = p.rec;
      form.innerHTML = String(chargeFields(base, i18n));
      panel.querySelector('[data-proposal-result]').replaceChildren();
      draftForm.hidden = true;
    },
  };
}
