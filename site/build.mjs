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
import { createI18n } from './lib/i18n.mjs';
import { toolPath } from './ui/tool-page.mjs';
import { tokensCss } from './styles/tokens.mjs';
import { calculatorPage, homePage, limitsPage, notFoundPage } from './templates/pages.mjs';
import { THEME_SCRIPT } from './templates/layout.mjs';
import { walk } from '../verify/lib/walk.mjs';
import strings from './strings/en-US.mjs';

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

/** Folders the browser imports from, copied as-is: the same files the tests run. */
const SHARED = ['core', 'parsers', 'site/lib', 'site/ui', 'site/pages', 'site/strings', 'site/styles/site.css'];

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
  write('/limits/', limitsPage({ tools: TOOLS, i18n }));
  write('/', homePage({ tools: TOOLS, i18n }));
  write('/404.html', notFoundPage({ i18n }));

  // The inline theme script's hash, for the Worker's CSP (task 5.1).
  writeFileSync(join(outDir, '_csp-hashes.json'), JSON.stringify({ 'script-src': [`sha256-${createHash('sha256').update(THEME_SCRIPT).digest('base64')}`] }, null, 2) + '\n');

  const files = walk(outDir).filter((f) => f !== '_manifest.json');
  const manifest = files.map((f) => ({ path: f, sha256: sha256(readFileSync(join(outDir, f))) }));
  writeFileSync(join(outDir, '_manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
  return { outDir, pages, files: files.length + 1 };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const r = build({ outDir: process.argv[2] });
  console.log(`built ${r.pages.length} pages, ${r.files} files in ${r.outDir}`);
}
