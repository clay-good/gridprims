// The literal-copy lint (site/translation-ready): visitor-facing text in
// templates must come from a string file or a manifest, never be typed into
// the markup, so a translation is a new string file and nothing else.

import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const TEXT_ATTRS = /\b(aria-label|title|alt|placeholder)\s*=\s*"([^"]*)"/g;

/**
 * The static parts of every html`...` template in a source file, with
 * \u0000 standing in for each ${...} expression, and the line each starts on.
 * @param {string} src
 * @returns {Array<{text: string, line: number}>}
 */
export function templates(src) {
  const out = [];
  const nested = [];
  let i = 0;
  for (;;) {
    const start = src.indexOf('html`', i);
    if (start < 0) break;
    let j = start + 5;
    let text = '';
    while (j < src.length && src[j] !== '`') {
      if (src[j] === '\\') { text += src[j + 1]; j += 2; continue; }
      if (src[j] === '$' && src[j + 1] === '{') {
        // Skip the expression, including nested braces and nested templates.
        let depth = 1;
        j += 2;
        const exprStart = j;
        while (j < src.length && depth > 0) {
          if (src[j] === '{') depth++;
          else if (src[j] === '}') depth--;
          else if (src[j] === '`') { j++; while (j < src.length && src[j] !== '`') j += src[j] === '\\' ? 2 : 1; }
          else if (src[j] === "'" || src[j] === '"') { const q = src[j]; j++; while (j < src.length && src[j] !== q) j += src[j] === '\\' ? 2 : 1; }
          j++;
        }
        // Templates nested inside the expression are checked too, on their own lines.
        const before = src.slice(0, exprStart).split('\n').length - 1;
        for (const t of templates(src.slice(exprStart, j - 1))) nested.push({ text: t.text, line: t.line + before });
        text += '\u0000';
        continue;
      }
      text += src[j++];
    }
    out.push({ text, line: src.slice(0, start).split('\n').length });
    i = j + 1;
  }
  return [...out, ...nested];
}

/**
 * @param {string} dir a folder of template modules
 * @param {string} label path prefix for messages
 * @returns {string[]}
 */
export function checkLiteralCopy(dir, label) {
  const errors = [];
  for (const f of readdirSync(dir).filter((n) => /\.(mjs|js)$/.test(n))) {
    for (const { text, line } of templates(readFileSync(join(dir, f), 'utf8'))) {
      for (const [, attr, value] of text.matchAll(TEXT_ATTRS)) {
        if (/[A-Za-z]{2,}/.test(value) && !value.includes('\u0000')) errors.push(`${label}/${f}:${line}: literal ${attr} "${value}"; put it in site/strings/en-US.mjs and use t()`);
      }
      const visible = text.replace(/<[^>]*>/g, ' ').replace(/&[#\w]+;/g, ' ');
      for (const m of visible.matchAll(/[A-Za-z][A-Za-z' ]*[A-Za-z]/g)) {
        errors.push(`${label}/${f}:${line}: literal text "${m[0].trim()}"; put it in site/strings/en-US.mjs and use t()`);
      }
    }
  }
  return errors;
}

/** @param {string} root */
export function checkCopy(root) {
  return ['site/templates', 'site/ui'].flatMap((d) => checkLiteralCopy(join(root, d), d));
}
