// The home page, the states index, and the tool catalog
// (site/home-and-navigation): the command bar first, two lanes of tool cells,
// and every published tool in one filterable list. All of it works without
// JavaScript; the catalog's filters only hide cells.

import { html } from '../lib/html.mjs';
import { ORIGIN } from '../config.mjs';
import { commandFields, layout } from './layout.mjs';
import { sitingReadout } from '../ui/siting.mjs';
import { LANES } from '../ui/home-lanes.mjs';
import { toolPath } from '../ui/tool-page.mjs';
import { PARKED, SECTIONS, sectionOf } from '../ui/sections.mjs';
import { STATE_NAMES } from '../entities/regions.mjs';
import { statePath } from './region.mjs';

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

/** The one route to everything else: the command bar, centred under the read-out, with its examples. */
function homeSearch({ t }) {
  return html`<section class="home-search command" role="search" aria-labelledby="home-search-title">
  <h2 id="home-search-title">${t('home.search.title')}</h2>
  ${commandFields({ t })}
  <p class="unit-hint">${t('home.search.examples')}</p>
</section>`;
}

/** The home page: the siting read-out and the one search bar, and nothing else (siting/home-and-shell). */
export function homePage({ i18n }) {
  const { t } = i18n;
  const body = html`${sitingReadout(i18n)}
${homeSearch(i18n)}`;
  return layout({ i18n, title: t('home.pageTitle'), description: t('home.description'), path: '/', body, modules: ['/site/pages/siting.js'], structured: [{ '@context': 'https://schema.org', '@type': 'WebApplication', name: t('site.name'), url: `${ORIGIN}/`, description: t('home.description'), applicationCategory: 'UtilitiesApplication', operatingSystem: 'Any', isAccessibleForFree: true, offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' } }], section: 'home', commandBar: false });
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
