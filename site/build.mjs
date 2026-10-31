// The static site build (foundation design D3; docs/decisions-day-one.md §4).
// Renders every page from manifests and string files into dist/, copies the
// shared modules the pages import, and writes the deploy manifest.
// Usage: node site/build.mjs [outDir]

import { createHash } from 'node:crypto';
import { cpSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { TOOLS } from '../core/tools/index.mjs';
import { runTool } from '../core/contract/run.mjs';
import { buildCommandIndex } from '../core/contract/command.mjs';
import { limitsRecord } from '../core/contract/limits.mjs';
import { createI18n } from './lib/i18n.mjs';
import { toolPath } from './ui/tool-page.mjs';
import { tokensCss } from './styles/tokens.mjs';
import { serviceWorkerSource } from './sw.mjs';
import { calculatorPage, changelogPage, filesPage, homePage, limitsPage, notFoundPage, privacyPage, reportPage, settingsPage } from './templates/pages.mjs';
import changelog from '../data/curated/changelog.mjs';
import { THEME_SCRIPT } from './templates/layout.mjs';
import { walk } from '../verify/lib/walk.mjs';
import strings from './strings/en-US.mjs';

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

/** Folders the browser imports from, copied as-is: the same files the tests run. */
const SHARED = ['core', 'parsers', 'site/lib', 'site/ui', 'site/pages', 'site/strings', 'site/samples', 'site/styles/site.css'];

/** @param {string} s */
export const sha256 = (s) => createHash('sha256').update(s).digest('hex');

/**
 * @param {{outDir?: string}} [opts]
 * @returns {{outDir: string, pages: string[], files: number}}
 */
export function build(opts = {}) {
  const outDir = opts.outDir ?? join(ROOT, 'dist');
  rmSync(outDir, { recursive: true, force: true });
  mkdirSync(outDir, { recursive: true });
  for (const p of SHARED) cpSync(join(ROOT, p), join(outDir, p), { recursive: true, filter: (src) => !src.endsWith('README.md') });
  writeFileSync(join(outDir, 'site/styles/tokens.css'), tokensCss());

  const i18n = createI18n(strings, 'en-US');
  const pages = [];
  const write = (path, html) => {
    const file = path.endsWith('/') ? join(outDir, path, 'index.html') : join(outDir, path);
    mkdirSync(dirname(file), { recursive: true });
    writeFileSync(file, String(html));
    pages.push(path);
  };

  for (const tool of TOOLS) {
    const { manifest } = tool;
    if (manifest.archetype !== 'calculator') continue;
    const example = manifest.examples[0];
    const result = runTool(manifest, tool.impl, example.inputs);
    if (result.status !== 'ok') throw new Error(`${manifest.id}: first worked example returned ${result.status}`);
    write(toolPath(manifest.id), calculatorPage({ manifest, example, result, i18n }));
  }
  writeFileSync(join(outDir, 'command-index.json'), JSON.stringify(buildCommandIndex(TOOLS, toolPath)) + '\n');
  write('/limits/', limitsPage({ tools: TOOLS, i18n }));
  writeFileSync(join(outDir, 'limits/limits.json'), JSON.stringify(limitsRecord(TOOLS), null, 2) + '\n');
  write('/changelog/', changelogPage({ entries: changelog, i18n }));
  write('/settings/', settingsPage({ i18n }));
  write('/files/', filesPage({ i18n }));
  write('/privacy/', privacyPage({ i18n }));
  write('/report/', reportPage({ i18n }));
  write('/', homePage({ tools: TOOLS, i18n }));
  write('/404.html', notFoundPage({ i18n }));

  // The inline theme script's hash, for the Worker's CSP (task 5.1).
  writeFileSync(join(outDir, '_csp-hashes.json'), JSON.stringify({ 'script-src': [`sha256-${createHash('sha256').update(THEME_SCRIPT).digest('base64')}`] }, null, 2) + '\n');

  cpSync(join(ROOT, 'site/icon.svg'), join(outDir, 'icon.svg'));
  writeFileSync(join(outDir, 'manifest.webmanifest'), JSON.stringify({
    name: strings['site.name'], short_name: strings['site.name'], description: strings['site.tagline'],
    start_url: '/', scope: '/', display: 'standalone', background_color: '#f3f5f2', theme_color: '#00704a',
    icons: [{ src: '/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' }],
  }, null, 2) + '\n');

  // The service worker precaches every deployed file and is versioned by their checksums.
  const shell = walk(outDir).filter((f) => !f.startsWith('_'));
  const version = sha256(shell.map((f) => `${f}:${sha256(readFileSync(join(outDir, f)))}`).join('\n')).slice(0, 12);
  const urls = shell.map((f) => `/${f.replace(/(^|\/)index\.html$/, '$1')}`);
  writeFileSync(join(outDir, 'sw.js'), serviceWorkerSource({ version, files: urls }));

  const files = walk(outDir).filter((f) => f !== '_manifest.json');
  const manifest = files.map((f) => ({ path: f, sha256: sha256(readFileSync(join(outDir, f))) }));
  writeFileSync(join(outDir, '_manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
  return { outDir, pages, files: files.length + 1 };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const r = build({ outDir: process.argv[2] });
  console.log(`built ${r.pages.length} pages, ${r.files} files in ${r.outDir}`);
}
