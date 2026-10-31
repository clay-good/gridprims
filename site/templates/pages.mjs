// Page templates generated from manifests (platform/tool-contract, "Every
// surface is generated from the manifest").

import { html, raw } from '../lib/html.mjs';
import { layout } from './layout.mjs';
import { renderAnswer, renderWork, toolPath } from '../ui/tool-page.mjs';
import { VALIDATION_LEVELS } from '../../core/contract/manifest.mjs';
import { sourceStamp } from '../ui/source-stamp.mjs';
import { lateness } from '../../core/lib/lateness.mjs';
import { CLONE, DATA_DIR, snippets } from '../../mcp/clients.mjs';
import { SECTIONS, sectionOf } from '../ui/sections.mjs';

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
      <a class="button" href="/report/" data-report data-report-answer>${t('strip.report')}</a>
    </div>
    <p class="skip" aria-live="polite" data-announce></p>
  </section>
  <form class="inputs" data-inputs aria-label="${t('tool.inputs')}" novalidate>
    ${manifest.inputs.filter((i) => i.type !== 'file').map((i) => field(i, example.inputs[i.name] ?? i.example, i18n))}
  </form>
  <details class="panel" data-work-panel>
    <summary><h2 class="summary-heading">${t('work.title')}</h2></summary>
    <div data-work>${renderWork(manifest, result, i18n)}</div>
  </details>
  <section class="panel">
    <h2>${t('tool.limitations')}</h2>
    <ul>${manifest.limitations.map((l) => html`<li>${l}</li>`)}</ul>
  </section>
  ${manifest.handoffs.length ? html`<section><h2>${t('tool.handoffs')}</h2>${manifest.handoffs.map((h) => html`<p><a class="handoff" href="${h.url}">${h.label} ${raw('&rarr;')}</a></p>`)}</section>` : ''}
</article>`;
  return layout({ i18n, title: `${manifest.title} · ${t('site.name')}`, description: manifest.purpose, path: toolPath(manifest.id), body, modules: ['/site/pages/calculator.js'], section: sectionOf(manifest.id) });
}

/**
 * The limits page (site/limitations), rendered from the limits record, which
 * is also published as JSON and served to agents by the MCP server.
 * @param {{limits: any, i18n: any, health?: any}} p
 */
export function limitsPage({ limits: L, i18n, health }) {
  const { t, date } = i18n;
  const counts = L.levels.map((l) => `${t(`validation.${l.level}`)} ${L.counts[l.name]}`).join(', ');
  const body = html`
<h1>${t('limits.title')}</h1>
<p class="strip">${t('limits.summary')} <a href="/report/" data-report>${t('limits.summaryReport')}</a></p>
<p>${t('limits.counts', { counts })} ${t('limits.launch')}</p>
<p class="mono">${L.generatedAt ? t('limits.generated', { date: date(L.generatedAt.slice(0, 10)), commit: L.describes ?? '' }) : ''} <a href="/limits/limits.json">${t('limits.json')}</a></p>

<h2>${t('limits.toolsTitle')}</h2>
<p>${t('limits.axes')}</p>
${L.tools.length ? html`<div class="table-wrap"><table>
  <thead><tr><th scope="col">${t('limits.col.tool')}</th><th scope="col">${t('limits.col.stability')}</th><th scope="col">${t('limits.col.level')}</th><th scope="col">${t('limits.col.review')}</th><th scope="col">${t('limits.col.evidence')}</th><th scope="col">${t('limits.col.raise')}</th><th scope="col">${t('limits.col.limitations')}</th></tr></thead>
  <tbody>${L.tools.map((m) => html`<tr id="${m.id}">
    <th scope="row"><a href="${toolPath(m.id)}">${m.title}</a><br><span class="mono">${m.id}</span></th>
    <td>${t(`tool.stability.${m.stability}`)}</td>
    <td>${m.validationLevel} · ${t(`validation.${m.validationLevel}`)}</td>
    <td>${t(`limits.review.${m.review}`)}</td>
    <td>${m.evidence.map((e) => e.summary).join(' ')}${m.evidencePassed ? html` <span class="mono">${t('limits.evidencePassed', { date: date(m.evidencePassed.slice(0, 10)) })}</span>` : ''}${m.needsFreshRun ? html` <span class="warning-chip">${t('limits.freshRun')}</span>` : ''}</td>
    <td>${m.toRaise ?? ''}</td>
    <td><ul>${m.limitations.map((l) => html`<li>${l}</li>`)}</ul></td>
  </tr>`)}</tbody>
</table></div>` : html`<p>${t('limits.noTools')}</p>`}

<h2 id="cannot">${t('limits.cannot')}</h2>
<p>${t('limits.cannotIntro')}</p>
${L.cannotDo.map((c) => html`<section class="panel" id="${c.id}">
  <h3>${c.title}</h3>
  ${c.detail ? html`<p>${c.detail}</p>` : ''}
  <p>${c.reason}</p>
  ${c.verified ? '' : html`<p class="warning-chip">${t('limits.unverifiedNote', { note: c.note ?? '' })}</p>`}
  <ul class="mono">${c.sources.map((x) => html`<li>${x}</li>`)}</ul>
</section>`)}

<h2>${t('limits.problems')}</h2>
${health ? healthSection(health, i18n) : ''}
<h3>${t('limits.lateDatasets')}</h3>
${L.problems.lateDatasets.length ? html`<ul>${L.problems.lateDatasets.map((d) => html`<li>${t('limits.lateLine', { title: d.title, due: date(d.due), posted: d.posted ? t('limits.posted') : t('limits.inferred'), days: d.daysLate })}</li>`)}</ul>` : html`<p>${t('limits.lateNone')}</p>`}
${L.problems.failingDatasets.length ? '' : html`<p>${t('limits.failingNone')}</p>`}
${L.problems.postureLimited.map((d) => html`<p>${t('limits.postureLine', { id: d.id, posture: d.posture, changed: d.termsChanged ? t('limits.postureChanged') : '' })}</p>`)}
<p><strong>${t('limits.notPopulated')}:</strong> ${L.problems.corrections.note}</p>
<p><strong>${t('limits.notPopulated')}:</strong> ${L.problems.referenceEngineGaps.note}</p>

<h2 id="claims">${t('limits.claims')}</h2>
<p>${t('limits.claimsIntro')}</p>
<div class="table-wrap"><table>
  <thead><tr><th scope="col">${t('limits.col.claim')}</th><th scope="col">${t('limits.col.usedBy')}</th><th scope="col">${t('limits.col.confirm')}</th></tr></thead>
  <tbody>${L.unverifiedClaims.map((c) => html`<tr id="claim-${c.id}"><td>${c.claim}<br><span class="mono">${c.brief}</span></td><td>${c.usedBy.join(', ')}</td><td>${c.wouldConfirm}</td></tr>`)}</tbody>
</table></div>

<h2>${t('limits.levels')}</h2>
<dl>${L.levels.map((l) => html`<dt>${l.level} · ${t(`validation.${l.level}`)}</dt><dd>${l.meaning}</dd>`)}</dl>`;
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

/**
 * The 404 page (site/home-and-navigation, "Helpful 404"): without script it
 * lists the sections and every tool; with script it suggests up to five close
 * matches computed on the device, sending the requested path nowhere.
 * @param {{tools: any[], i18n: any}} p
 */
export function notFoundPage({ tools = [], i18n }) {
  const { t } = i18n;
  const body = html`<h1>${t('notFound.title')}</h1><p>${t('notFound.body')}</p>
<section data-suggest hidden><h2>${t('notFound.suggest')}</h2><ul data-suggestions></ul></section>
<h2>${t('notFound.sections')}</h2>
<ul>${SECTIONS.map((x) => html`<li><a href="${x.path}">${t(`nav.${x.id}`)}</a></li>`)}</ul>
<h2>${t('notFound.catalog')}</h2>
<ul>${tools.map(({ manifest: m }) => html`<li><a href="${toolPath(m.id)}">${m.title}</a></li>`)}</ul>`;
  return layout({ i18n, title: `${t('notFound.title')} · ${t('site.name')}`, description: t('notFound.body'), path: '/404.html', body, modules: ['/site/pages/not-found.js'] });
}

/** A tool cell (DESIGN.md "Tool cell"): section, name, the question it answers, and what you need. */
function toolCell({ href, section, name, question, needs }, { t }) {
  return html`<li class="tool-cell"><p class="cell-section">${t(`nav.${section}`)}</p><a href="${href}">${name}</a><p>${question}</p><p class="unit-hint">${t('section.needs', { what: t(`section.needs.${needs}`) })}</p></li>`;
}

/**
 * A section landing page: only tools and pages that exist, never "coming soon".
 * @param {{id: string, tools: any[], datasets: any[], i18n: any}} p
 */
export function sectionPage({ id, tools, datasets = [], i18n }) {
  const { t } = i18n;
  const cells = tools.filter(({ manifest: m }) => sectionOf(m.id) === id).map(({ manifest: m }) => ({ href: toolPath(m.id), section: id, name: m.title, question: m.purpose, needs: m.inputs.some((x) => x.type === 'file') ? 'file' : 'none' }));
  if (id === 'bills') cells.unshift({ href: '/files/', section: 'bills', name: t('section.workbench'), question: t('section.workbench.what'), needs: 'file' });
  const body = html`<h1>${t(`section.${id}`)}</h1><p class="purpose">${t(`section.${id}.intro`)}</p>
${cells.length || (id === 'data' && datasets.length) ? '' : html`<p>${t('section.empty')}</p>`}
${cells.length ? html`<ul class="tool-list">${cells.map((c) => toolCell(c, i18n))}</ul>` : ''}
${id === 'data' && datasets.length ? html`<ul class="tool-list">${datasets.map((d) => html`<li class="tool-cell"><p class="cell-section">${d.publisher}</p><a href="/data/${d.dataset}/">${d.title}</a><p>${t('data.stamp', { publisher: d.publisher, title: d.title, period: d.tables[0].dataPeriod, asOf: i18n.date(d.asOf), retrieved: i18n.date(d.retrieved), license: d.tables[0].license })}</p></li>`)}</ul>` : ''}`;
  const path = SECTIONS.find((x) => x.id === id).path;
  return layout({ i18n, title: `${t(`section.${id}`)} · ${t('site.name')}`, description: t(`section.${id}.intro`), path, body, section: id });
}

/** @param {{entries: any[], i18n: any}} p */
export function changelogPage({ entries, i18n }) {
  const { t } = i18n;
  const body = html`<h1>${t('changelog.title')}</h1><p class="purpose">${t('changelog.intro')}</p>
<div class="table-wrap"><table>
  <thead><tr><th scope="col">${t('changelog.col.date')}</th><th scope="col">${t('changelog.col.tool')}</th><th scope="col">${t('changelog.col.version')}</th><th scope="col">${t('changelog.col.reason')}</th></tr></thead>
  <tbody>${entries.map((e) => html`<tr><td class="mono">${e.date}</td><td>${e.toolId ? html`<a href="${toolPath(e.toolId)}">${e.toolId}</a>` : ''}</td><td class="mono">${e.version}</td><td>${e.kind === 'security' ? html`${t('changelog.security')} ` : ''}${e.reason}${e.sample ? html` ${t('changelog.sample', { old: e.sample.old, new: e.sample.new })}` : ''}${e.credit ? html` ${t('changelog.credit', { name: e.credit })}` : ''}</td></tr>`)}</tbody>
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
      <input type="file" data-file hidden accept=".csv,.txt,.tsv,.xml,.xlsx,.zip" aria-label="${t('files.choose')}"></p>
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
  return layout({ i18n, title: `${t('files.title')} · ${t('site.name')}`, description: t('files.purpose'), path: '/files/', body, modules: ['/site/pages/workbench.js'], section: 'bills' });
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
export function datasetPage({ manifest: m, i18n, posture = m.posture, termsRow, takedown }) {
  const { t, date } = i18n;
  const late = lateness(m);
  const publishes = posture !== 'link';
  const body = html`<h1>${m.title}</h1>
<p class="purpose">${m.publisher}</p>
${m.tables.map((tb) => sourceStamp(m, tb, i18n))}
<p class="mono">${t('data.age', { date: date(m.generatedAt.slice(0, 10)) })} <span data-age-from="${m.generatedAt}" data-age-one="${t('data.ageDays', { count: 1 })}" data-age-other="${t('data.ageDays', { count: 2 }).replace('2', '{count}')}"></span></p>
${takedown ? html`<p class="warning-chip">${t('data.takedownApplied', { date: date(takedown.date) })}</p>` : termsRow?.changed ? html`<p class="warning-chip">${t('data.termsChanged', { date: date(termsRow.checked) })}</p>` : ''}
<p>${late.posted ? t('data.duePosted', { due: date(late.due) }) : t('data.dueInferred', { due: date(late.due) })}</p>
<section class="panel"><h2>${t('data.posture')}</h2>
  <p><strong>${t(`data.posture.${posture}`)}</strong></p>
  <p>${t('data.terms', { date: date(m.terms.captured) })}</p>
  <blockquote class="mono">${m.terms.text}</blockquote>
  <p><a href="${m.terms.url}">${t('data.termsLink')}</a></p>
  <h3>${t('data.attribution')}</h3><p>${m.attribution}</p>
  <p>${t('data.takedown')}</p>
</section>
${publishes ? html`<section><h2>${t('data.download')}</h2>
  <ul>${m.tables.map((tb) => html`<li><a href="/data/${m.dataset}/${m.version}/${tb.download.path}" download>${t('data.downloadLine', { table: tb.name, rows: tb.rows.toLocaleString('en-US'), size: tb.download.bytes.toLocaleString('en-US') })}</a><br><span class="mono">${t('data.sha')} ${tb.download.sha256}</span></li>`)}</ul>
  <h3>${t('data.raw')}</h3>
  <ul>${m.raw.map((r) => html`<li class="mono"><a href="${r.release ?? r.url}">${t('data.rawLine', { name: r.name, size: r.bytes.toLocaleString('en-US'), sha: r.sha256 })}</a></li>`)}</ul>
</section>` : ''}
${m.tables.map((tb) => html`<section><h2>${t('data.columns')}</h2><div class="table-wrap"><table>
  <thead><tr><th scope="col">${t('data.col.name')}</th><th scope="col">${t('data.col.type')}</th><th scope="col">${t('data.col.unit')}</th></tr></thead>
  <tbody>${tb.columns.map((c) => html`<tr><th scope="row" class="mono">${c.name}</th><td class="mono">${c.type}</td><td>${c.unit ?? ''}</td></tr>`)}</tbody>
</table></div></section>`)}`;
  return layout({ i18n, title: `${m.title} · ${t('site.name')}`, description: `${m.title}, ${m.publisher}`, path: `/data/${m.dataset}/`, body, section: 'data' });
}

/**
 * The pipeline's health on the limits page (platform/automation): each
 * workflow's last success, with "stalled" judged on the visitor's device.
 */
function healthSection(h, i18n) {
  const { t, date } = i18n;
  return html`<h3 id="pipeline">${t('health.title')}</h3>
<p>${t('health.intro')}</p>
${h.datasets.filter((d) => d.failure).map((d) => html`<p class="warning-chip">${t('health.failing', { dataset: d.id, since: date(d.failure.since.slice(0, 10)), reason: d.failure.reason })}</p>`)}
<div class="table-wrap"><table>
  <thead><tr><th scope="col">${t('health.col.workflow')}</th><th scope="col">${t('health.col.every')}</th><th scope="col">${t('health.col.last')}</th><th scope="col">${t('health.col.state')}</th></tr></thead>
  <tbody>${h.workflows.map((w) => html`<tr>
    <th scope="row" class="mono">${w.id}</th>
    <td>${t('health.hours', { count: w.intervalHours })}</td>
    <td class="mono">${w.lastSuccess ? w.lastSuccess.slice(0, 16).replace('T', ' ') + ' UTC' : t('health.never')}</td>
    <td data-health-row data-last-success="${w.lastSuccess ?? ''}" data-threshold-hours="${w.thresholdHours}" data-ok="${t('health.ok')}" data-stalled="${t('health.stalled', { hours: w.thresholdHours })}"></td>
  </tr>`)}</tbody>
</table></div>
<p><a href="/health/pipeline.json">${t('health.record')}</a></p>`;
}

/** The developer page: the MCP client snippets, generated from mcp/clients.mjs. */
export function developersPage({ i18n }) {
  const { t } = i18n;
  const body = html`<h1>${t('dev.title')}</h1><p class="purpose">${t('dev.intro')}</p>
<p>${t('dev.steps', { clone: CLONE, dir: DATA_DIR })}</p>
${snippets().map((s) => html`<h2>${s.client}</h2><p class="mono">${s.file}</p><pre class="mono report-preview" data-snippet="${s.client}">${s.text}</pre>`)}
<p>${t('dev.tools')}</p>`;
  return layout({ i18n, title: `${t('dev.title')} · ${t('site.name')}`, description: t('dev.intro'), path: '/developers/', body });
}

/** The disclosure policy (trust/security-disclosure). */
export function securityPage({ i18n }) {
  const { t } = i18n;
  const body = html`<h1>${t('security.title')}</h1><p class="purpose">${t('security.intro')}</p>
<p><a class="button" href="/report/" data-report>${t('security.report')}</a></p>
<h2>${t('security.scope')}</h2><p>${t('security.inScope')}</p><p>${t('security.outScope')}</p>
<h2>${t('security.harbor')}</h2><p>${t('security.harborBody')}</p><p>${t('security.rules')}</p>
<h2>${t('security.times')}</h2><p>${t('security.timesBody')}</p>
<p>${t('security.notLegal')}</p>`;
  return layout({ i18n, title: `${t('security.title')} · ${t('site.name')}`, description: t('security.intro'), path: '/security/', body });
}
