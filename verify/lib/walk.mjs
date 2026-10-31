// Recursive file listing and Markdown table reading for the gates.

import { readdirSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

export const SKIP_DIRS = new Set(['.git', 'dist']);

/**
 * List files under root as forward-slash paths relative to root.
 * @param {string} root
 * @param {{dirs?: boolean}} [opts] dirs lists directories too, with a trailing slash
 * @returns {string[]}
 */
export function walk(root, opts = {}) {
  const out = [];
  const visit = (dir) => {
    for (const ent of readdirSync(dir, { withFileTypes: true })) {
      const abs = join(dir, ent.name);
      const rel = relative(root, abs).split(sep).join('/');
      if (ent.isDirectory()) {
        if (SKIP_DIRS.has(ent.name)) continue;
        if (opts.dirs) out.push(rel + '/');
        visit(abs);
      } else if (ent.isFile()) out.push(rel);
    }
  };
  visit(root);
  return out.sort();
}

/**
 * Read the rows of every Markdown table whose first cell is a backticked path or name.
 * @param {string} markdown
 * @returns {Map<string, string[]>} first cell (without backticks) to the remaining cells
 */
export function tableRows(markdown) {
  const rows = new Map();
  for (const line of markdown.split('\n')) {
    const m = /^\|\s*`([^`]+)`\s*\|(.*)\|\s*$/.exec(line);
    if (m) rows.set(m[1], m[2].split('|').map((c) => c.trim()));
  }
  return rows;
}

// Static imports and re-exports at the start of a line, side-effect imports,
// dynamic imports, and require calls. String literals elsewhere are ignored.
const SPECIFIERS = [
  /^\s*(?:import|export)\s[^;'"]*?\bfrom\s*['"]([^'"]+)['"]/gm,
  /^\s*import\s*['"]([^'"]+)['"]/gm,
  /\bimport\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
  /\brequire\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
];

/**
 * Every module specifier a source file imports.
 * @param {string} src
 * @returns {string[]}
 */
export function importSpecifiers(src) {
  return SPECIFIERS.flatMap((re) => [...src.matchAll(re)].map((m) => m[1]));
}
