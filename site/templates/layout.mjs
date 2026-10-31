// The shell around every page (DESIGN.md Layout): top rail, command bar, main, footer.

import { html, raw } from '../lib/html.mjs';
import { gridPulse } from '../ui/grid-pulse.mjs';
import { SECTIONS } from '../ui/sections.mjs';
import { DESCRIPTION_MAX, fit, jsonLd } from '../lib/meta.mjs';

const ORIGIN = 'https://gridprims.com';

/** Runs before first paint so a saved theme never flashes the wrong one. Its hash goes in the CSP. */
export const THEME_SCRIPT = "document.documentElement.dataset.js='1';try{var t=localStorage.getItem('gridprims-theme');if(t==='light'||t==='dark')document.documentElement.dataset.theme=t}catch(e){}";

/**
 * @param {{
 *   i18n: {t: Function, locale: string},
 *   title: string, description: string, path: string,
 *   body: import('../lib/html.mjs').Html, modules?: string[], section?: string, pulse?: any,
 *   structured?: object[], crumbs?: Array<[string, string]>,
 * }} p
 */
/** The trust page set every footer links (site/trust-pages). */
export const TRUST_PAGES = [['about', '/about/'], ['methods', '/methods/'], ['privacy', '/privacy/'], ['accessibility', '/accessibility/'], ['corrections', '/corrections/'], ['changelog', '/changelog/'], ['license', '/license/'], ['sources', '/sources/'], ['review', '/review-status/'], ['limits', '/limits/'], ['terms', '/terms/'], ['continuity', '/continuity/'], ['developers', '/developers/'], ['security', '/security/'], ['settings', '/settings/'], ['report', '/report/']];

/** The family of sites that share gridprims' ethos (PRODUCT.md, Brand Commitments). */
export const SISTERS = ['sophiewell.com', 'geoprims.com', 'roughlogic.com', 'enklayve.com', 'vaulytica.com', 'encryptalotta.com'];

export function layout({ i18n, title, description, path, body, modules = [], section, pulse = null, structured = [], crumbs = null }) {
  const { t } = i18n;
  const summary = fit(description, DESCRIPTION_MAX);
  // Breadcrumbs on every page: home, the section, then the page, as the page's own links show them.
  const sec = SECTIONS.find((x) => x.id === section);
  const trail = crumbs ?? [[t('nav.home'), '/'], ...(sec && sec.path !== '/' && sec.path !== path ? [[t(`nav.${sec.id}`), sec.path]] : []), ...(path !== '/' ? [[title.replace(/ · [^·]+$/, ''), path]] : [])];
  const breadcrumbs = { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: trail.map(([name, href], i) => ({ '@type': 'ListItem', position: i + 1, name, item: `${ORIGIN}${href}` })) };
  return html`<!doctype html>
<html lang="${i18n.locale.split('-')[0]}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title}</title>
<meta name="description" content="${summary}">
<link rel="canonical" href="${ORIGIN}${path}">
<meta property="og:type" content="website">
<meta property="og:site_name" content="${t('site.name')}">
<meta property="og:title" content="${title}">
<meta property="og:description" content="${summary}">
<meta property="og:url" content="${ORIGIN}${path}">
<meta name="twitter:card" content="summary">
<meta name="twitter:title" content="${title}">
<meta name="twitter:description" content="${summary}">
${[breadcrumbs, ...structured].map((o) => html`<script type="application/ld+json">${raw(jsonLd(o))}</script>`)}
<script>${raw(THEME_SCRIPT)}</script>
<link rel="manifest" href="/manifest.webmanifest">
<link rel="icon" href="/icon.svg" type="image/svg+xml">
<meta name="theme-color" content="#00704a">
<link rel="stylesheet" href="/site/styles/tokens.css">
<link rel="stylesheet" href="/site/styles/site.css">
${modules.map((m) => html`<script type="module" src="${m}"></script>`)}
</head>
<body>
<a class="skip" href="#main">${t('site.skip')}</a>
<header class="rail">
  <div class="wrap">
    <a class="wordmark" href="/">${t('site.name')}</a>
    <nav aria-label="${t('nav.label')}">
      <button class="menu-button" type="button" aria-expanded="false" aria-controls="nav-list" data-menu>${t('nav.menu')}</button>
      <ul id="nav-list">
      ${SECTIONS.map(({ id, path }) => html`<li><a href="${path}"${section === id ? raw(' aria-current="page"') : ''}>${t(`nav.${id}`)}</a></li>`)}
    </ul></nav>
    ${gridPulse(pulse, i18n)}
    <button class="theme-toggle" type="button" data-theme-toggle aria-label="${t('theme.toggle')}">${t('theme.night')}</button>
  </div>
</header>
<div class="command" role="search">
  <div class="wrap">
    <label for="command-input">${t('command.label')}</label>
    <input id="command-input" class="mono" type="search" autocomplete="off" spellcheck="false" placeholder="${t('command.placeholder')}" aria-controls="command-results" aria-expanded="false" aria-autocomplete="list" role="combobox">
    <ul id="command-results" class="command-results mono" role="listbox" aria-label="${t('command.results')}" hidden></ul>
  </div>
</div>
<main id="main" class="wrap">
${body}
</main>
<footer>
  <div class="wrap">
    <nav aria-label="${t('footer.trust')}"><ul>
      ${TRUST_PAGES.map(([id, href]) => html`<li><a href="${href}"${id === 'report' ? raw(' data-report') : ''}>${id === 'report' ? t('report.title') : t(`nav.${id}`)}</a></li>`)}
    </ul></nav>
    <nav aria-label="${t('footer.sisters')}"><ul>${SISTERS.map((d) => html`<li><a href="https://${d}">${d}</a></li>`)}</ul></nav>
    <p>${t('footer.privacy')}</p>
    <p>${t('footer.license')}</p>
  </div>
</footer>
<dialog class="report" data-report-dialog aria-labelledby="report-title">
  <h2 id="report-title">${t('report.title')}</h2>
  <p>${t('report.intro')}</p>
  <p class="strip" data-report-agent hidden>${t('report.fromAgent')}</p>
  <label class="field-block" for="report-message">${t('report.message')}</label>
  <textarea id="report-message" rows="4" maxlength="4000" data-report-message></textarea>
  <p data-report-attach-row hidden><label><input type="checkbox" data-report-attach> ${t('report.attach')}</label> <span class="unit-hint">${t('report.attachNote')}</span></p>
  <p class="hp" aria-hidden="true"><label>${t('report.honeypot')} <input type="text" name="website" tabindex="-1" autocomplete="off" data-report-hp></label></p>
  <h3>${t('report.preview')}</h3>
  <pre class="mono report-preview" data-report-preview></pre>
  <p class="answer-actions">
    <button class="button" type="button" data-report-send>${t('report.send')}</button>
    <button class="button" type="button" data-report-copy>${t('report.copy')}</button>
    <button class="button" type="button" data-report-close>${t('report.close')}</button>
  </p>
  <p role="status" data-report-status></p>
</dialog>
<script type="module" src="/site/pages/shell.js"></script>
</body>
</html>
`;
}
