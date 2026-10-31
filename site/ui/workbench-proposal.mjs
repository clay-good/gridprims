// The workbench's proposed-rate panel (add-ratepayer-tools): copy the priced
// rate, edit any charge, see what the proposal would have cost on this file,
// and draft a factual comment to copy or print. Nothing is submitted.

import { html } from '../lib/html.mjs';

const money = (x) => `$${Math.abs(x).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const signed = (x) => `${x >= 0 ? '+' : '−'}${money(x)}`;

/** The empty panel, with the curated regulators to choose from. @param {{t: Function}} i18n @param {any[]} regulators */
export function proposalPanel({ t }, regulators) {
  return html`<section class="panel picker" data-proposal hidden aria-labelledby="proposal-title">
  <h2 id="proposal-title">${t('proposal.title')}</h2>
  <p>${t('proposal.intro')}</p>
  <form data-proposal-form class="picker-row" novalidate></form>
  <p><button class="button" type="button" data-proposal-run>${t('proposal.run')}</button></p>
  <div data-proposal-result aria-live="polite"></div>
  <form data-draft-form hidden novalidate>
    <h3>${t('draft.title')}</h3>
    <p class="unit-hint">${t('draft.intro')}</p>
    <div class="picker-row">
      <div class="field"><label for="draft-state">${t('draft.state')}</label><select id="draft-state" name="state"><option value="">${t('draft.stateNone')}</option>${regulators.map((r) => html`<option value="${r.state}" data-name="${r.name}" data-home="${r.home}" data-docket="${r.docket ?? ''}" data-comment="${r.comment ?? ''}">${r.stateName}</option>`)}</select></div>
      <div class="field"><label for="draft-regulator">${t('draft.regulator')}</label><input id="draft-regulator" name="regulator" autocomplete="off"></div>
      <div class="field"><label for="draft-docket">${t('draft.docket')}</label><input id="draft-docket" name="docket" class="mono" autocomplete="off"></div>
      <div class="field"><label for="draft-type">${t('draft.customerType')}</label><select id="draft-type" name="customerType">${['residential', 'small business', 'commercial', 'industrial'].map((c) => html`<option value="${c}">${t(`draft.type.${c}`)}</option>`)}</select></div>
    </div>
    <div class="field wide"><label for="draft-own">${t('draft.own')}</label><textarea id="draft-own" name="ownWords" rows="4"></textarea></div>
    <p><button class="button" type="submit">${t('draft.make')}</button></p>
    <div data-draft-result></div>
  </form>
</section>`;
}

/** One editable field per charge of a tariff record, named by its path. */
export function chargeFields(rec, { t }) {
  const field = (path, label, value, unit) => html`<div class="field"><label for="p-${path}">${label} (${unit})</label><input id="p-${path}" data-path="${path}" class="mono" inputmode="decimal" autocomplete="off" value="${value}"></div>`;
  const periods = (key, label, unit) => (rec[key]?.periods ?? []).flatMap((p, i) => p.tiers.map((tier, k) => field(`${key}.${i}.${k}`, `${label}${rec[key].periods.length > 1 ? ` ${t('proposal.period', { n: i + 1 })}` : ''}${p.tiers.length > 1 ? ` ${t('proposal.tier', { n: k + 1 })}` : ''}`, tier.rate, unit)));
  return html`${field('fixed', t('proposal.fixed'), rec.fixed?.amount ?? 0, rec.fixed?.per === 'day' ? '$/day' : '$/month')}
  ${rec.minimum ? field('minimum', t('proposal.minimum'), rec.minimum.amount, `$/${rec.minimum.per}`) : ''}
  ${periods('energy', t('proposal.energy'), '$/kWh')}${periods('flatDemand', t('proposal.flatDemand'), '$/kW')}${periods('demand', t('proposal.touDemand'), '$/kW')}`;
}

/** The impact, with the differences that cause it. */
export function renderImpact(diffs, r, { t }) {
  return html`${diffs.length ? html`<ul data-differences>${diffs.map((d) => html`<li>${d}</li>`)}</ul>` : html`<p>${t('proposal.same')}</p>`}
  ${r.label ? html`<p class="strip">${t('proposal.partial', { label: r.label })}</p>` : ''}
  <p class="number" data-proposal-diff>${signed(r.diff)}</p>
  <p class="sentence">${t('proposal.sentence', { current: money(r.current), proposed: money(r.proposed), diff: signed(r.diff), pct: r.pct === null ? '' : ` (${r.pct >= 0 ? '+' : '−'}${Math.abs(r.pct)}%)`, span: r.label ?? t('proposal.year') })}</p>
  ${r.largest ? html`<p>${t('proposal.largest', { label: r.largest.label, diff: signed(r.largest.diff) })}</p>` : ''}
  <table><thead><tr><th scope="col">${t('bill.col.month')}</th><th scope="col" class="num">${t('proposal.col.current')}</th><th scope="col" class="num">${t('proposal.col.proposed')}</th><th scope="col" class="num">${t('proposal.col.diff')}</th></tr></thead>
  <tbody>${r.monthly.map((m) => html`<tr><th scope="row">${m.month}</th><td class="num">${money(m.current)}</td><td class="num">${money(m.proposed)}</td><td class="num">${signed(m.diff)}</td></tr>`)}</tbody></table>`;
}
