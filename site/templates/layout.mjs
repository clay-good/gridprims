// The shell around every page (DESIGN.md Layout): top rail, command bar, main, footer.

import { html, raw } from '../lib/html.mjs';

/** Runs before first paint so a saved theme never flashes the wrong one. Its hash goes in the CSP. */
export const THEME_SCRIPT = "try{var t=localStorage.getItem('gridprims-theme');if(t==='light'||t==='dark')document.documentElement.dataset.theme=t}catch(e){}";

/**
 * @param {{
 *   i18n: {t: Function, locale: string},
 *   title: string, description: string, path: string,
 *   body: import('../lib/html.mjs').Html, modules?: string[], section?: string,
 * }} p
 */
export function layout({ i18n, title, description, path, body, modules = [], section }) {
  const { t } = i18n;
  const nav = [['home', '/'], ['files', '/files/'], ['limits', '/limits/']];
  return html`<!doctype html>
<html lang="${i18n.locale.split('-')[0]}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title}</title>
<meta name="description" content="${description}">
<link rel="canonical" href="https://gridprims.com${path}">
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
    <nav aria-label="${t('nav.label')}"><ul>
      ${nav.map(([id, href]) => html`<li><a href="${href}"${section === id ? raw(' aria-current="page"') : ''}>${t(`nav.${id}`)}</a></li>`)}
    </ul></nav>
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
    <ul><li><a href="/limits/">${t('nav.limits')}</a></li><li><a href="/changelog/">${t('nav.changelog')}</a></li><li><a href="/settings/">${t('nav.settings')}</a></li></ul>
    <p>${t('footer.privacy')}</p>
    <p>${t('footer.license')}</p>
  </div>
</footer>
<script type="module" src="/site/pages/shell.js"></script>
</body>
</html>
`;
}
