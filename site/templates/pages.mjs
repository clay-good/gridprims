// Page templates generated from manifests (platform/tool-contract, "Every
// surface is generated from the manifest").

import { html, raw } from '../lib/html.mjs';
import { layout } from './layout.mjs';
import { renderAnswer, renderWork, toolPath } from '../ui/tool-page.mjs';
import { VALIDATION_LEVELS } from '../../core/contract/manifest.mjs';
import { sourceStamp } from '../ui/source-stamp.mjs';
import { lateness } from '../../core/lib/lateness.mjs';

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
<article data-tool="${manifest.id}" data-tool-version="${manifest.version}">
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

/** The settings page: what this device holds, and erasing it (platform/privacy-and-security). */
export function settingsPage({ i18n }) {
  const { t } = i18n;
  const body = html`<h1>${t('settings.title')}</h1><p class="purpose">${t('settings.intro')}</p>
<section class="panel" data-settings>
  <h2>${t('settings.stored')}</h2>
  <ul class="mono" data-stored></ul>
  <p data-empty hidden>${t('settings.none')}</p>
  <p><button class="button" type="button" data-erase>${t('settings.erase')}</button></p>
  <div data-confirm hidden>
    <p>${t('settings.confirmText')}</p>
    <p class="answer-actions"><button class="button" type="button" data-erase-yes>${t('settings.confirm')}</button><button class="button" type="button" data-erase-no>${t('settings.cancel')}</button></p>
  </div>
  <p role="status" data-erased></p>
</section>`;
  return layout({ i18n, title: `${t('settings.title')} · ${t('site.name')}`, description: t('settings.intro'), path: '/settings/', body, modules: ['/site/pages/settings.js'] });
}

/** The file workbench: a dropzone, the receipt, and the answer for the loaded file. */
export function filesPage({ i18n }) {
  const { t } = i18n;
  const body = html`<article data-workbench>
  <h1>${t('files.title')}</h1>
  <p class="purpose">${t('files.purpose')}</p>
  <noscript><p class="panel">${t('files.needsJs')}</p></noscript>
  <div class="dropzone" data-dropzone>
    <p><strong>${t('files.drop')}</strong></p>
    <p class="mono">${t('files.formats')}</p>
    <p><button class="button" type="button" data-choose>${t('files.choose')}</button>
      <input type="file" data-file hidden accept=".csv,.txt,.tsv,.xml,.xlsx,.zip"></p>
    <p><a href="/learn/get-your-data/">${t('files.noFile')}</a></p>
  </div>
  <div class="progress" data-progress hidden><p data-progress-label></p><progress max="1" value="0"></progress>
    <button class="button" type="button" data-cancel>${t('files.cancel')}</button></div>
  <p class="errors" role="alert" data-error hidden></p>
  <section class="answer" aria-live="polite" data-answer></section>
  <p><label><input type="checkbox" data-keep> ${t('files.keep')}</label> <span class="unit-hint">${t('files.keepNote')}</span></p>
  <div data-chart></div>
  <section class="panel" data-receipt></section>
</article>
<div class="drag-overlay" data-overlay hidden><p>${t('files.dragging')}</p></div>`;
  return layout({ i18n, title: `${t('files.title')} · ${t('site.name')}`, description: t('files.purpose'), path: '/files/', body, modules: ['/site/pages/workbench.js'] });
}

/** The privacy page (platform/problem-reports, "Retention"; platform/privacy-and-security). */
export function privacyPage({ i18n }) {
  const { t } = i18n;
  const body = html`<h1>${t('privacy.title')}</h1><p class="purpose">${t('privacy.intro')}</p>
<h2>${t('privacy.storage')}</h2><p>${t('privacy.storageBody')}</p>
<h2>${t('privacy.reports')}</h2><p>${t('privacy.reportsBody')}</p><p>${t('privacy.retention')}</p><p>${t('privacy.deletion')}</p>
<h2>${t('privacy.counts')}</h2><p>${t('privacy.countsBody')}</p>`;
  return layout({ i18n, title: `${t('privacy.title')} · ${t('site.name')}`, description: t('privacy.intro'), path: '/privacy/', body });
}

/** The report page: the dialog opens on arrival, with a payload an agent prepared if the address carries one. */
export function reportPage({ i18n }) {
  const { t } = i18n;
  const body = html`<h1>${t('report.title')}</h1><p class="purpose">${t('report.intro')}</p><div data-report-page></div>`;
  return layout({ i18n, title: `${t('report.title')} · ${t('site.name')}`, description: t('report.intro'), path: '/report/', body });
}

/** A dataset page, generated from its version manifest (platform/data-snapshots). */
export function datasetPage({ manifest: m, i18n }) {
  const { t, date } = i18n;
  const late = lateness(m);
  const body = html`<h1>${m.title}</h1>
<p class="purpose">${m.publisher}</p>
${m.tables.map((tb) => sourceStamp(m, tb, i18n))}
<p>${late.posted ? t('data.duePosted', { due: date(late.due) }) : t('data.dueInferred', { due: date(late.due) })}</p>
<section class="panel"><h2>${t('data.posture')}</h2>
  <p><strong>${t(`data.posture.${m.posture}`)}</strong></p>
  <p>${t('data.terms', { date: date(m.terms.captured) })}</p>
  <blockquote class="mono">${m.terms.text}</blockquote>
  <p><a href="${m.terms.url}">${t('data.termsLink')}</a></p>
  <h3>${t('data.attribution')}</h3><p>${m.attribution}</p>
  <p>${t('data.takedown')}</p>
</section>
<section><h2>${t('data.download')}</h2>
  <ul>${m.tables.map((tb) => html`<li><a href="/data/${m.dataset}/${m.version}/${tb.download.path}" download>${t('data.downloadLine', { table: tb.name, rows: tb.rows.toLocaleString('en-US'), size: tb.download.bytes.toLocaleString('en-US') })}</a><br><span class="mono">${t('data.sha')} ${tb.download.sha256}</span></li>`)}</ul>
  <h3>${t('data.raw')}</h3>
  <ul>${m.raw.map((r) => html`<li class="mono"><a href="${r.url}">${t('data.rawLine', { name: r.name, size: r.bytes.toLocaleString('en-US'), sha: r.sha256 })}</a></li>`)}</ul>
</section>
${m.tables.map((tb) => html`<section><h2>${t('data.columns')}</h2><div class="table-wrap"><table>
  <thead><tr><th scope="col">${t('data.col.name')}</th><th scope="col">${t('data.col.type')}</th><th scope="col">${t('data.col.unit')}</th></tr></thead>
  <tbody>${tb.columns.map((c) => html`<tr><th scope="row" class="mono">${c.name}</th><td class="mono">${c.type}</td><td>${c.unit ?? ''}</td></tr>`)}</tbody>
</table></div></section>`)}`;
  return layout({ i18n, title: `${m.title} · ${t('site.name')}`, description: `${m.title}, ${m.publisher}`, path: `/data/${m.dataset}/`, body });
}
