// Escaped HTML templates (foundation design D3). Every interpolated value is
// escaped unless it is already Html, so data and user input can never become
// markup. Runs in the build (Node) and in pages (browser).

/** Markup that is already safe to insert. */
export class Html {
  /** @param {string} value */
  constructor(value) { this.value = value; }
  toString() { return this.value; }
}

const ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

/** @param {unknown} s */
export function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ESCAPES[c]);
}

/** @param {unknown} v */
function render(v) {
  if (v === null || v === undefined || v === false) return '';
  if (v instanceof Html) return v.value;
  if (Array.isArray(v)) return v.map(render).join('');
  return escapeHtml(v);
}

/**
 * Tagged template: html`<p>${text}</p>`. Arrays are joined; null, undefined,
 * and false render as nothing.
 * @param {TemplateStringsArray} strings
 * @param {...unknown} values
 * @returns {Html}
 */
export function html(strings, ...values) {
  let out = strings[0];
  for (let i = 0; i < values.length; i++) out += render(values[i]) + strings[i + 1];
  return new Html(out);
}

/**
 * Insert trusted markup without escaping. Only for markup this repository
 * wrote (for example an inline SVG glyph), never for data.
 * @param {string} markup
 */
export function raw(markup) {
  return new Html(markup);
}
