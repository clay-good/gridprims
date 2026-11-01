// The home page, the states index, and the tool catalog
// (site/home-and-navigation): the command bar first, two lanes of tool cells,
// and every published tool in one filterable list. All of it works without
// JavaScript; the catalog's filters only hide cells.

import { html } from '../lib/html.mjs';
import { ORIGIN } from '../config.mjs';
import { layout } from './layout.mjs';
import { LANES } from '../ui/home-lanes.mjs';
import { toolPath } from '../ui/tool-page.mjs';
import { PARKED, SECTIONS, sectionOf } from '../ui/sections.mjs';
import { STATE_NAMES } from '../entities/regions.mjs';
import { statePath } from './region.mjs';
import { LOOKUP_PATH } from './lookup.mjs';

export const CATALOG_PATH = '/tools/';
export const STATES_PATH = '/states/';

/** A cell: name, the question it answers, what you need, and the data's as-of date (DESIGN.md "Tool cell"). */
function cell({ href, name, question, needs, asOf, stable, section }, { t, date }) {
  return html`<li class="tool-cell" data-section="${section}" data-needs="${needs}" data-stability="${stable ? 'stable' : 'experimental'}">
  ${stable ? '' : html`<p class="work-zone">${t('catalog.preview')}</p>`}<a href="${href}">${name}</a><p class="question">${question}</p>
  <p class="unit-hint">${t('section.needs', { what: t(`section.needs.${needs}`) })}${asOf ? html`<span class="as-of"> · ${t('home.asOf', { date: date(asOf) })}</span>` : ''}</p></li>`;
}

/** The cells of a lane whose tool or page exists. @param {{tools: any[], exists: (path: string) => boolean, asOf: (ids: string[]) => string | null}} ctx */
export function laneCells(lane, { tools, exists, asOf }, { t }) {
  return LANES[lane].map((c) => {
    const tool = c.tool && tools.find((x) => x.manifest.id === c.tool);
    if (c.tool && !tool) return null;
    if (c.path && !exists(c.path)) return null;
    const m = tool?.manifest;
    return {
      href: m ? toolPath(m.id) : c.path, name: m?.title ?? t(`home.cell.${c.id}`), question: m?.purpose ?? t(`home.cell.${c.id}.question`),
      needs: c.needs, asOf: c.data ? asOf(c.data) : null, stable: m ? m.stability === 'stable' : true, section: m ? sectionOf(m.id) : 'data',
    };
  }).filter(Boolean);
}

/** The two things a visitor can give this site, side by side: a ZIP code, or a meter file. */
function startDoors({ t }) {
  return html`<section class="start" aria-labelledby="start-title">
  <p id="start-title" class="start-sub">${t('home.start.sub')}</p>
  <div class="doors">
    <div class="door">
      <h2>${t('home.start.zip')}</h2>
      <p>${t('home.start.zipWhat')}</p>
      <form class="door-form" action="${LOOKUP_PATH}" method="get">
        <div><label for="home-zip">${t('home.start.zipLabel')}</label>
          <input id="home-zip" name="zip" class="mono" inputmode="numeric" autocomplete="postal-code" maxlength="10" required></div>
        <button class="button primary" type="submit">${t('home.start.zipAction')}</button>
      </form>
    </div>
    <div class="door">
      <h2>${t('home.start.file')}</h2>
      <p>${t('home.start.fileWhat')}</p>
      <p><a class="button primary" href="/files/" data-home-open>${t('home.start.fileAction')}</a>
        <input type="file" hidden data-home-file aria-label="${t('home.start.fileAction')}" accept=".csv,.txt,.tsv,.xml,.xlsx,.zip"></p>
      <p class="unit-hint">${t('home.start.filePrivacy')}</p>
    </div>
  </div>
  <p class="start-else">${t('home.start.elseNoFile')}
    <a href="/tools/household/bill-totals/check/">${t('home.start.billsAction')}</a> ·
    <a href="/tools/household/usage-benchmark/compare/">${t('home.start.useAction')}</a></p>
</section>`;
}

/** What a meter file does for someone who manages energy for a building, fleet, or utility: three workbench jobs, each opening at its panel. */
function proDoor({ t }) {
  const job = (id, href) => html`<li class="pro-job"><h3><a href="${href}">${t(`home.pro.${id}`)}</a></h3><p>${t(`home.pro.${id}.what`)}</p></li>`;
  return html`<section class="pro" aria-labelledby="pro-title">
  <h2 id="pro-title">${t('home.pro.title')}</h2>
  <p class="pro-sub">${t('home.pro.sub')}</p>
  <ul class="pro-jobs">
    ${job('bill', '/files/#plans')}
    ${job('peaks', '/files/#peaks')}
    ${job('battery', '/files/#battery')}
  </ul>
</section>`;
}

/** The worked plate: the shipped sample, already read, so the page proves the product before it lists it. */
function proofPlate(p, { t, date }) {
  const n = (x, d = 0) => x.toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });
  const figure = (label, value, unit) => html`<div class="figure"><p class="legend">${label}</p><p class="figure-value">${value}<span class="figure-unit">${unit}</span></p></div>`;
  const top = Math.max(...p.curve.map((c) => c.kw)) || 1;
  const x = (h) => 4 + (h / 23) * 92;
  const y = (kw) => 92 - (kw / top) * 80;
  // A stepped line: demand holds across each hour rather than sloping between them.
  const steps = p.curve.flatMap((c, i) => [`${x(i)},${y(c.kw)}`, `${x(Math.min(23, i + 1))},${y(c.kw)}`]).join(' ');
  const hour = (h) => `${((h + 11) % 12) + 1} ${h < 12 ? 'am' : 'pm'}`;
  return html`<section class="proof" data-proof aria-labelledby="proof-title">
  <h2 id="proof-title" class="proof-title">${t('home.proof.title')}</h2>
  <div class="answer"><div class="sign">
    <p class="label">${t('home.proof.peak')}</p>
    <p class="number">${n(p.peakKw, 1)}<span class="unit">kW</span></p>
    <p class="sentence">${t('home.proof.sentence', { when: date(new Date(p.peakStartMs).toISOString().slice(0, 10)) })}</p>
    <span class="source-tab">${t('home.proof.basis', { file: p.file, intervals: n(p.intervals), from: date(new Date(p.fromMs).toISOString().slice(0, 10)), to: date(new Date(p.toMs).toISOString().slice(0, 10)) })}</span>
  </div></div>
  <figure class="chart proof-chart">
    <svg viewBox="0 0 100 100" preserveAspectRatio="none" role="img" aria-label="${t('home.proof.curveAlt', { day: date(p.peakDay), peak: n(p.peakKw, 1) })}">
      <polyline class="series series-measured" points="${steps}"></polyline>
      <line class="peak-mark" x1="${x(p.peakHour)}" y1="8" x2="${x(p.peakHour)}" y2="92"></line>
    </svg>
    <figcaption>${t('home.proof.curveCaption', { day: date(p.peakDay), when: hour(p.peakHour), peak: n(p.peakKw, 1) })}</figcaption>
  </figure>
  <details class="panel proof-table"><summary>${t('home.proof.curveTable')}</summary>
    <table><caption>${t('home.proof.curveCaptionShort', { day: date(p.peakDay) })}</caption>
    <thead><tr><th scope="col">${t('home.proof.hour')}</th><th scope="col" class="num">${t('home.proof.demand')}</th></tr></thead>
    <tbody>${p.curve.map((c) => html`<tr><th scope="row">${hour(c.hour)}</th><td class="num">${n(c.kw, 1)}</td></tr>`)}</tbody></table>
  </details>
  <div class="figures">
    ${figure(t('home.proof.energy'), n(p.totalKwh), 'kWh')}
    ${figure(t('home.proof.loadFactor'), n(p.loadFactor * 100, 1), '%')}
    ${figure(t('home.proof.intervals'), n(p.intervals), '')}
  </div>
  <p class="proof-actions"><a class="button primary" href="/files/">${t('home.proof.open')}</a></p>
</section>`;
}

/** @param {{tools: any[], i18n: any, exists: (p: string) => boolean, asOf: (ids: string[]) => string | null, proof?: any}} p */
export function homePage({ tools, i18n, exists, asOf, proof = null }) {
  const { t } = i18n;
  const lane = (id) => {
    const cells = laneCells(id, { tools, exists, asOf }, i18n);
    return cells.length ? html`<section class="lane" data-lane="${id}"><h2>${t(`home.lane.${id}`)}</h2><ul class="tool-list">${cells.map((c) => cell(c, i18n))}</ul></section>` : '';
  };
  // The rail already carries the wordmark, so the heading is the tagline: both lanes fit a 360 × 640 first screen.
  const body = html`<h1 class="home-title">${t('home.start.title')}</h1>
${startDoors(i18n)}
${proDoor(i18n)}
${proof ? proofPlate(proof, i18n) : ''}
<p class="home-more"><a href="${CATALOG_PATH}">${t('home.allTools')}</a></p>`;
  return layout({ i18n, title: t('home.pageTitle'), description: t('home.description'), path: '/', body, modules: ['/site/pages/home.js'], structured: [{ '@context': 'https://schema.org', '@type': 'WebApplication', name: t('site.name'), url: `${ORIGIN}/`, description: t('home.description'), applicationCategory: 'UtilitiesApplication', operatingSystem: 'Any', isAccessibleForFree: true, offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' } }], section: 'home', commandBar: false });
}

/** Tools built as pages rather than manifests (the lookup and the workbench), with their sections. */
const PAGE_TOOLS = [['find-utility', 'bills'], ['workbench', 'bills'], ['cheapest-plan', 'bills']];

/** The tool catalog: every published tool, filterable by section, what you need, and stability. */
export function catalogPage({ tools, i18n, exists, asOf }) {
  const { t } = i18n;
  const pageTools = [...LANES.home, ...LANES.work].filter((c) => PAGE_TOOLS.some(([id]) => id === c.id) && exists(c.path)).map((c) => ({
    href: c.path, name: t(`home.cell.${c.id}`), question: t(`home.cell.${c.id}.question`), needs: c.needs, stable: true, section: PAGE_TOOLS.find(([id]) => id === c.id)[1], asOf: c.data ? asOf(c.data) : null,
  }));
  const cells = [
    ...tools.filter(({ manifest: m }) => !PARKED.has(m.id)).map(({ manifest: m }) => ({ href: toolPath(m.id), name: m.title, question: m.purpose, needs: [...LANES.home, ...LANES.work].find((c) => c.tool === m.id)?.needs ?? (m.inputs.some((x) => x.type === 'file') ? 'file' : 'none'), stable: m.stability === 'stable', section: sectionOf(m.id), asOf: null })),
    ...pageTools,
  ].sort((a, b) => a.name.localeCompare(b.name));
  const select = (name, options) => html`<label>${t(`catalog.filter.${name}`)}<select name="${name}" data-filter="${name}"><option value="">${t('catalog.any')}</option>${options.map(([v, label]) => html`<option value="${v}">${label}</option>`)}</select></label>`;
  const body = html`<h1>${t('catalog.title')}</h1>
<p class="purpose">${t('catalog.intro')}</p>
<form class="panel" data-catalog-filters>
  ${select('section', SECTIONS.filter((s) => cells.some((c) => c.section === s.id)).map((s) => [s.id, t(`nav.${s.id}`)]))}
  ${select('needs', ['none', 'zip', 'bill', 'file'].map((n) => [n, t(`section.needs.${n}`)]))}
  ${select('stability', [['stable', t('catalog.stable')], ['experimental', t('catalog.preview')]])}
</form>
<ul class="tool-list" data-catalog>${cells.map((c) => cell(c, i18n))}</ul>
<p data-catalog-empty hidden>${t('catalog.empty')}</p>`;
  return layout({ i18n, title: `${t('catalog.title')} · ${t('site.name')}`, description: t('catalog.intro'), path: CATALOG_PATH, body, modules: ['/site/pages/catalog.js'] });
}

/** Every state, as the way into its utility and plant pages. */
export function statesIndexPage({ i18n }) {
  const { t } = i18n;
  const body = html`<h1>${t('states.title')}</h1><p class="purpose">${t('states.intro')}</p>
<ul class="tool-list">${Object.entries(STATE_NAMES).map(([code, name]) => html`<li class="tool-cell"><a href="${statePath(code)}">${name}</a></li>`)}</ul>`;
  return layout({ i18n, title: `${t('states.title')} · ${t('site.name')}`, description: t('states.intro'), path: STATES_PATH, body, section: 'grid' });
}
