// The static site build (foundation design D3; docs/decisions-day-one.md §4).
// Renders every page from manifests and string files into dist/, copies the
// shared modules the pages import, and writes the deploy manifest.
// Usage: node site/build.mjs [outDir]

import { createHash } from 'node:crypto';
import { cpSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { TOOLS } from '../core/tools/index.mjs';
import { runTool } from '../core/contract/run.mjs';
import { buildCommandIndex } from '../core/contract/command.mjs';
import { limitsRecord } from '../core/contract/limits.mjs';
import { cannotDo, claims } from '../core/contract/limits-inputs.mjs';
import { execFileSync } from 'node:child_process';
import { createI18n, pseudoMessages } from './lib/i18n.mjs';
import { toolPath } from './ui/tool-page.mjs';
import { tokensCss } from './styles/tokens.mjs';
import { serviceWorkerSource } from './sw.mjs';
import { calculatorPage, changelogPage, datasetPage, developersPage, filesPage, homePage, limitsPage, notFoundPage, privacyPage, reportPage, sectionPage, settingsPage } from './templates/pages.mjs';
import changelog from '../data/curated/changelog.mjs';
import { THEME_SCRIPT } from './templates/layout.mjs';
import { walk } from '../verify/lib/walk.mjs';
import { redirectsFile } from './lib/redirects.mjs';
import redirects from '../data/curated/redirects.mjs';
import { readdirSync, existsSync } from 'node:fs';
import strings from './strings/en-US.mjs';

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

/** Folders the browser imports from, copied as-is: the same files the tests run. */
const SHARED = ['core', 'parsers', 'site/lib', 'site/ui', 'site/pages', 'site/strings', 'site/samples', 'site/styles/site.css'];

/** @param {string} s */
export const sha256 = (s) => createHash('sha256').update(s).digest('hex');

/**
 * @param {{outDir?: string, pseudo?: boolean}} [opts] pseudo renders every string in the pseudo-locale for the layout sweep
 * @returns {{outDir: string, pages: string[], files: number}}
 */
export async function build(opts = {}) {
  const outDir = opts.outDir ?? join(ROOT, 'dist');
  rmSync(outDir, { recursive: true, force: true });
  mkdirSync(outDir, { recursive: true });
  for (const p of SHARED) cpSync(join(ROOT, p), join(outDir, p), { recursive: true, filter: (src) => !src.endsWith('README.md') });
  writeFileSync(join(outDir, 'site/styles/tokens.css'), tokensCss());
  // In the pseudo-locale the browser modules read pseudo strings too, so nothing re-renders in English.
  if (opts.pseudo) writeFileSync(join(outDir, 'site/strings/en-US.mjs'), `export default ${JSON.stringify(pseudoMessages(strings), null, 2)};\n`);
  // Built dataset versions ship with the site (foundation design D5, D16); curated records feed the build only.
  cpSync(join(ROOT, 'data'), join(outDir, 'data'), { recursive: true, filter: (src) => !src.endsWith('README.md') && !src.includes(`${'/'}curated`) && !src.includes(`${'/'}health`) });

  const i18n = createI18n(opts.pseudo ? pseudoMessages(strings) : strings, 'en-US');
  const pages = [];
  const healthFile = join(ROOT, 'data/health/pipeline.json');
  const health = existsSync(healthFile) ? JSON.parse(readFileSync(healthFile, 'utf8')) : null;
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
  // The limits record: one object for the page, its JSON copy, and the MCP resource.
  const datasets = existsSync(join(ROOT, 'data')) ? readdirSync(join(ROOT, 'data')).filter((id) => existsSync(join(ROOT, 'data', id, 'current.json'))).map((id) => JSON.parse(readFileSync(join(ROOT, 'data', id, JSON.parse(readFileSync(join(ROOT, 'data', id, 'current.json'), 'utf8')).version, 'manifest.json'), 'utf8'))) : [];
  let describes = null;
  try { describes = execFileSync('git', ['rev-parse', '--short', 'HEAD'], { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim(); } catch { describes = null; }
  const limits = limitsRecord({ tools: TOOLS, cannotDo, claims, health, datasets, generatedAt: health?.generatedAt ?? null, describes, now: Date.parse(health?.generatedAt ?? '2026-10-31T00:00:00Z') });
  write('/limits/', limitsPage({ limits, i18n, health }));
  if (health) { mkdirSync(join(outDir, 'health'), { recursive: true }); cpSync(healthFile, join(outDir, 'health/pipeline.json')); }
  writeFileSync(join(outDir, 'limits/limits.json'), JSON.stringify(limits, null, 2) + '\n');
  write('/changelog/', changelogPage({ entries: changelog, i18n }));
  write('/settings/', settingsPage({ i18n }));
  write('/files/', filesPage({ i18n }));
  write('/privacy/', privacyPage({ i18n }));
  write('/developers/', developersPage({ i18n }));
  for (const id of existsSync(join(ROOT, 'data')) ? readdirSync(join(ROOT, 'data')) : []) {
    const cur = join(ROOT, 'data', id, 'current.json');
    if (!existsSync(cur)) continue;
    const { version } = JSON.parse(readFileSync(cur, 'utf8'));
    const entry = (await import(pathToFileURL(join(ROOT, 'pipeline/registry', `${id}.mjs`)).href)).default;
    const termsRow = health?.datasets.find((d) => d.id === id)?.terms;
    const posture = entry.takedown ? 'link' : termsRow?.posture ?? entry.posture;
    write(`/data/${id}/`, datasetPage({ manifest: JSON.parse(readFileSync(join(ROOT, 'data', id, version, 'manifest.json'), 'utf8')), i18n, posture, termsRow, takedown: entry.takedown }));
    // Under the link posture no values are published, so none of the dataset's files deploy.
    if (posture === 'link') rmSync(join(outDir, 'data', id), { recursive: true, force: true });
  }
  write('/report/', reportPage({ i18n }));
  write('/', homePage({ tools: TOOLS, i18n }));
  write('/404.html', notFoundPage({ tools: TOOLS, i18n }));
  for (const id of ['bills', 'data', 'carbon', 'grid', 'learn']) write(`/${id}/`, sectionPage({ id, tools: TOOLS, datasets, i18n }));

  writeFileSync(join(outDir, '_redirects'), redirectsFile(redirects));

  // The inline theme script's hash, for the Worker's CSP (task 5.1).
  writeFileSync(join(outDir, '_csp-hashes.json'), JSON.stringify({ 'script-src': [`sha256-${createHash('sha256').update(THEME_SCRIPT).digest('base64')}`] }, null, 2) + '\n');

  cpSync(join(ROOT, 'site/icon.svg'), join(outDir, 'icon.svg'));
  writeFileSync(join(outDir, 'manifest.webmanifest'), JSON.stringify({
    name: strings['site.name'], short_name: strings['site.name'], description: strings['site.tagline'],
    start_url: '/', scope: '/', display: 'standalone', background_color: '#f3f5f2', theme_color: '#00704a',
    icons: [{ src: '/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' }],
  }, null, 2) + '\n');

  // The service worker precaches the app shell and is versioned by the checksums of what it caches.
  // Dataset shards are cached as they are visited, not precached, so the shell stays small as data grows.
  const shell = walk(outDir).filter((f) => !f.startsWith('_') && !f.startsWith('data/'));
  const version = sha256(shell.map((f) => `${f}:${sha256(readFileSync(join(outDir, f)))}`).join('\n')).slice(0, 12);
  const urls = shell.map((f) => `/${f.replace(/(^|\/)index\.html$/, '$1')}`);
  writeFileSync(join(outDir, 'sw.js'), serviceWorkerSource({ version, files: urls }));

  const files = walk(outDir).filter((f) => f !== '_manifest.json');
  const manifest = files.map((f) => ({ path: f, sha256: sha256(readFileSync(join(outDir, f))) }));
  writeFileSync(join(outDir, '_manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
  return { outDir, pages, files: files.length + 1 };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const r = await build({ outDir: process.argv[2] });
  console.log(`built ${r.pages.length} pages, ${r.files} files in ${r.outDir}`);
}
