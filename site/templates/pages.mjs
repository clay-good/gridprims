// Page templates generated from manifests (platform/tool-contract, "Every
// surface is generated from the manifest").

import { html, raw } from '../lib/html.mjs';
import { layout } from './layout.mjs';
import { renderAnswer, renderWork, toolPath } from '../ui/tool-page.mjs';
import { VALIDATION_LEVELS } from '../../core/contract/manifest.mjs';

/** One input control, labeled from the manifest. */
function field(inp, value, i18n) {
  const id = `in-${inp.name}`;
  const errId = `${id}-error`;
  if (inp.type === 'enum') {
    return html`<div class="field"><label for="${id}">${inp.label}</label>
      <select id="${id}" name="${inp.name}" aria-describedby="${errId}">${inp.options.map((o) => html`<option value="${o.value}"${String(o.value) === String(value) ? raw(' selected') : ''}>${o.label}</option>`)}</select>
      <p class="error" id="${errId}" hidden></p></div>`;
  }
  const unit = inp.unit ?? '';
  return html`<div class="field"><label for="${id}">${inp.label}${unit ? html` <span class="unit-hint">(${unit})</span>` : ''}</label>
    <input id="${id}" name="${inp.name}" type="text" inputmode="decimal" value="${value}" autocomplete="off" aria-describedby="${errId}">
    <p class="error" id="${errId}" hidden></p></div>`;
}

/**
 * A calculator page, prerendered with its first worked example.
 * @param {{manifest: any, example: any, result: any, i18n: any}} p
 */
export function calculatorPage({ manifest, example, result, i18n }) {
  const { t } = i18n;
  const body = html`
<article data-tool="${manifest.id}">
  <div class="tool-head">
    <h1>${manifest.title}</h1>
    <span class="chip">${t(`tool.stability.${manifest.stability}`)}</span>
    <span class="chip mono">${t('tool.version', { version: manifest.version })}</span>
  </div>
  <p class="purpose">${manifest.purpose}</p>
  <noscript><p class="panel">${t('tool.needsJs')}</p></noscript>
  <section class="answer" aria-label="${t('answer.label')}">
    <div data-answer>${renderAnswer(manifest, result, i18n, { isExample: true })}</div>
    <div class="answer-actions">
      <button class="button" type="button" data-copy>${t('answer.copy')}</button>
      <button class="button" type="button" data-share>${t('answer.share')}</button>
    </div>
    <p class="skip" aria-live="polite" data-announce></p>
  </section>
  <form class="inputs" data-inputs aria-label="${t('tool.inputs')}" novalidate>
    ${manifest.inputs.filter((i) => i.type !== 'file').map((i) => field(i, example.inputs[i.name] ?? i.example, i18n))}
  </form>
  <details class="panel" data-work-panel>
    <summary>${t('work.title')}</summary>
    <div data-work>${renderWork(manifest, result, i18n)}</div>
  </details>
  <section class="panel">
    <h2>${t('tool.limitations')}</h2>
    <ul>${manifest.limitations.map((l) => html`<li>${l}</li>`)}</ul>
  </section>
  ${manifest.handoffs.length ? html`<section><h2>${t('tool.handoffs')}</h2>${manifest.handoffs.map((h) => html`<p><a class="handoff" href="${h.url}">${h.label} ${raw('&rarr;')}</a></p>`)}</section>` : ''}
</article>`;
  return layout({ i18n, title: `${manifest.title} · ${t('site.name')}`, description: manifest.purpose, path: toolPath(manifest.id), body, modules: ['/site/pages/calculator.js'] });
}

/**
 * The limits page, generated from every manifest (site/limitations). Phase 0
 * carries the validation table and the level definitions.
 * @param {{tools: any[], i18n: any}} p
 */
export function limitsPage({ tools, i18n }) {
  const { t } = i18n;
  const body = html`
<h1>${t('limits.title')}</h1>
<p class="purpose">${t('limits.intro')}</p>
<p class="strip">${t('limits.launch')}</p>
<h2>${t('limits.validationTable')}</h2>
<div class="table-wrap"><table>
  <thead><tr><th scope="col">${t('limits.col.tool')}</th><th scope="col">${t('limits.col.stability')}</th><th scope="col">${t('limits.col.level')}</th><th scope="col">${t('limits.col.evidence')}</th><th scope="col">${t('limits.col.limitations')}</th></tr></thead>
  <tbody>${tools.map(({ manifest: m }) => html`<tr id="${m.id}">
    <th scope="row"><a href="${toolPath(m.id)}">${m.title}</a><br><span class="mono">${m.id}</span></th>
    <td>${t(`tool.stability.${m.stability}`)}</td>
    <td>${m.validation.level} · ${t(`validation.${m.validation.level}`)}</td>
    <td>${m.validation.evidence.map((e) => e.summary).join(' ')}</td>
    <td><ul>${m.limitations.map((l) => html`<li>${l}</li>`)}</ul></td>
  </tr>`)}</tbody>
</table></div>
<h2>${t('limits.levels')}</h2>
<dl>${VALIDATION_LEVELS.map((l) => html`<dt>${l.level} · ${t(`validation.${l.level}`)}</dt><dd>${l.meaning}</dd>`)}</dl>
<h2>${t('limits.cannot')}</h2>
<p>${t('limits.cannotPending')}</p>`;
  return layout({ i18n, title: `${t('limits.title')} · ${t('site.name')}`, description: t('limits.intro'), path: '/limits/', body, section: 'limits' });
}

/** @param {{tools: any[], i18n: any}} p */
export function homePage({ tools, i18n }) {
  const { t } = i18n;
  const body = html`
<h1>${t('home.title')}</h1>
<p class="purpose">${t('site.tagline')}</p>
<p class="strip">${t('home.preview')}</p>
<h2>${t('home.tools')}</h2>
<ul class="tool-list">${tools.map(({ manifest: m }) => html`<li class="tool-cell"><a href="${toolPath(m.id)}">${m.title}</a><p>${m.purpose}</p></li>`)}</ul>`;
  return layout({ i18n, title: `${t('site.name')} · ${t('site.tagline')}`, description: t('site.tagline'), path: '/', body, section: 'home' });
}

/** @param {{i18n: any}} p */
export function notFoundPage({ i18n }) {
  const { t } = i18n;
  const body = html`<h1>${t('notFound.title')}</h1><p>${t('notFound.body')}</p>
<ul><li><a href="/">${t('nav.home')}</a></li><li><a href="/limits/">${t('nav.limits')}</a></li></ul>`;
  return layout({ i18n, title: `${t('notFound.title')} · ${t('site.name')}`, description: t('notFound.body'), path: '/404.html', body });
}

/** @param {{entries: any[], i18n: any}} p */
export function changelogPage({ entries, i18n }) {
  const { t } = i18n;
  const body = html`<h1>${t('changelog.title')}</h1><p class="purpose">${t('changelog.intro')}</p>
<div class="table-wrap"><table>
  <thead><tr><th scope="col">${t('changelog.col.date')}</th><th scope="col">${t('changelog.col.tool')}</th><th scope="col">${t('changelog.col.version')}</th><th scope="col">${t('changelog.col.reason')}</th></tr></thead>
  <tbody>${entries.map((e) => html`<tr><td class="mono">${e.date}</td><td><a href="${toolPath(e.toolId)}">${e.toolId}</a></td><td class="mono">${e.version}</td><td>${e.reason}${e.sample ? html` ${t('changelog.sample', { old: e.sample.old, new: e.sample.new })}` : ''}</td></tr>`)}</tbody>
</table></div>`;
  return layout({ i18n, title: `${t('changelog.title')} · ${t('site.name')}`, description: t('changelog.intro'), path: '/changelog/', body });
}
