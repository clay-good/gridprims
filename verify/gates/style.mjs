// The style lint (platform/app-shell, "Page archetypes conform to DESIGN.md"):
// component rules use tokens, never literal colors, and every token pairing
// DESIGN.md promises clears its contrast threshold in both themes.

import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { contrastRatio } from '../lib/contrast.mjs';

const LITERAL_COLOR = /#[0-9a-f]{3,8}\b|\b(?:rgba?|hsla?|hwb|lab|lch|oklab|oklch)\(/gi;

/**
 * @param {string} cssDir folder of hand-written stylesheets (tokens.css is generated, so it is not here)
 * @returns {string[]}
 */
export function checkLiteralColors(cssDir) {
  const errors = [];
  for (const f of readdirSync(cssDir).filter((n) => n.endsWith('.css'))) {
    readFileSync(join(cssDir, f), 'utf8').split('\n').forEach((line, i) => {
      const code = line.replace(/\/\*.*?\*\//g, '');
      for (const m of code.matchAll(LITERAL_COLOR)) errors.push(`${f}:${i + 1}: literal color "${m[0]}"; use a token from site/styles/tokens.mjs`);
    });
  }
  return errors;
}

/** The pairings DESIGN.md states, with their thresholds. Fields are theme-invariant, so legends are checked on the light field values. */
export function contrastPairs(theme, T) {
  const pairs = [];
  for (const text of ['ink', 'muted', 'guide-text', 'service', 'learn-text', 'work-zone-text', 'warning-text', 'stop', 'ok']) {
    for (const surface of ['bg', 'panel', 'raise']) pairs.push([`${text} on ${surface}`, T[text], T[surface], 4.5]);
  }
  for (const surface of ['bg', 'panel', 'raise']) pairs.push([`field-border on ${surface}`, T['field-border'], T[surface], 3]);
  pairs.push(['focus on bg', T.focus, T.bg, 7]);
  pairs.push(['ink on panel-hover', T.ink, T['panel-hover'], 4.5], ['ink on panel-active', T.ink, T['panel-active'], 4.5]);
  if (theme === 'light') {
    for (const field of ['guide', 'guide-hover', 'guide-active', 'service-field', 'learn-field', 'stop']) pairs.push([`legend-white on ${field}`, T['legend-white'], T[field], 4.5]);
    for (const field of ['work-zone', 'warning']) pairs.push([`legend-black on ${field}`, T['legend-black'], T[field], 4.5]);
  }
  return pairs;
}

/**
 * @param {{LIGHT: Record<string, string>, NIGHT: Record<string, string>}} tokens
 * @returns {string[]}
 */
export function checkContrast(tokens) {
  const errors = [];
  for (const [theme, T] of [['light', tokens.LIGHT], ['night', tokens.NIGHT]]) {
    for (const [name, fg, bg, min] of contrastPairs(theme, T)) {
      const r = contrastRatio(fg, bg);
      if (r < min) errors.push(`${theme}: ${name} is ${r.toFixed(2)}:1, below ${min}:1`);
    }
  }
  return errors;
}

/** @param {string} root */
export async function checkStyle(root) {
  const tokens = await import(pathToFileURL(join(root, 'site/styles/tokens.mjs')).href);
  return [...checkLiteralColors(join(root, 'site/styles')), ...checkContrast(tokens)];
}
