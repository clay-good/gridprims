// A small non-validating XML reader for Green Button ESPI files
// (platform/file-intake, "Parsers make no network requests"). It refuses any
// file with a DTD or an entity declaration, and any entity reference beyond the
// five XML predefines, so external-entity attacks cannot occur. It never
// fetches anything a file names.

/** Thrown for files we refuse on purpose (a DTD or entity), as opposed to broken files. */
export class XmlRefusal extends Error {
  /** @param {string} message @param {string} code */
  constructor(message, code) { super(message); this.name = 'XmlRefusal'; this.code = code; }
}

/** Thrown for files that are not well-formed XML. */
export class XmlSyntaxError extends Error {
  /** @param {string} message @param {number} line */
  constructor(message, line) { super(`${message} (line ${line})`); this.name = 'XmlSyntaxError'; this.line = line; }
}

export const DTD_MESSAGE = 'This file declares a DTD or an entity. Green Button files never need one, so we did not read it. Please download a fresh export from your utility.';

const PREDEFINED = { lt: '<', gt: '>', amp: '&', quot: '"', apos: "'" };
const MAX_DEPTH = 256;
const NAME = /^[A-Za-z_:][\w.:-]*$/;

/**
 * Replace character and predefined entity references. Any other entity is refused.
 * @param {string} s
 * @param {() => number} lineAt
 */
function decodeEntities(s, lineAt) {
  if (!s.includes('&')) return s;
  return s.replace(/&([^;\s&]*);?/g, (whole, ref) => {
    if (!whole.endsWith(';')) throw new XmlSyntaxError('Bare "&" in text', lineAt());
    if (ref.startsWith('#x') || ref.startsWith('#X')) return codePoint(parseInt(ref.slice(2), 16), lineAt);
    if (ref.startsWith('#')) return codePoint(parseInt(ref.slice(1), 10), lineAt);
    if (ref in PREDEFINED) return PREDEFINED[ref];
    throw new XmlRefusal(DTD_MESSAGE, 'entity');
  });
}

/** @param {number} n @param {() => number} lineAt */
function codePoint(n, lineAt) {
  if (!Number.isInteger(n) || n < 1 || n > 0x10ffff) throw new XmlSyntaxError('Invalid character reference', lineAt());
  return String.fromCodePoint(n);
}

/**
 * Read XML text and emit events in document order.
 * @param {string} text
 * @param {{
 *   open?: (name: string, attrs: Record<string, string>) => void,
 *   close?: (name: string) => void,
 *   text?: (value: string) => void,
 * }} on
 */
export function readXml(text, on) {
  // Refuse before reading anything: a DTD or entity declaration anywhere,
  // even inside a comment, means the file is not a plain Green Button export.
  if (/<!DOCTYPE/i.test(text) || /<!ENTITY/i.test(text)) throw new XmlRefusal(DTD_MESSAGE, 'dtd');

  const stack = [];
  let i = text.charCodeAt(0) === 0xfeff ? 1 : 0;
  let seenRoot = false;
  const lineAt = () => text.slice(0, i).split('\n').length;

  while (i < text.length) {
    const lt = text.indexOf('<', i);
    const end = lt === -1 ? text.length : lt;
    if (end > i) {
      const raw = text.slice(i, end);
      if (stack.length) on.text?.(decodeEntities(raw, lineAt));
      else if (raw.trim() !== '') throw new XmlSyntaxError('Text outside the root element', lineAt());
    }
    if (lt === -1) break;
    i = lt;

    if (text.startsWith('<!--', i)) {
      const close = text.indexOf('-->', i + 4);
      if (close === -1) throw new XmlSyntaxError('Unclosed comment', lineAt());
      i = close + 3;
    } else if (text.startsWith('<![CDATA[', i)) {
      const close = text.indexOf(']]>', i + 9);
      if (close === -1) throw new XmlSyntaxError('Unclosed CDATA section', lineAt());
      if (!stack.length) throw new XmlSyntaxError('CDATA outside the root element', lineAt());
      on.text?.(text.slice(i + 9, close));
      i = close + 3;
    } else if (text.startsWith('<?', i)) {
      const close = text.indexOf('?>', i + 2);
      if (close === -1) throw new XmlSyntaxError('Unclosed processing instruction', lineAt());
      i = close + 2;
    } else if (text.startsWith('<!', i)) {
      throw new XmlSyntaxError('Unsupported declaration', lineAt());
    } else if (text.startsWith('</', i)) {
      const close = text.indexOf('>', i + 2);
      if (close === -1) throw new XmlSyntaxError('Unclosed end tag', lineAt());
      const name = text.slice(i + 2, close).trim();
      const open = stack.pop();
      if (open !== name) throw new XmlSyntaxError(`End tag </${name}> does not match <${open ?? ''}>`, lineAt());
      on.close?.(name);
      i = close + 1;
    } else {
      const close = findTagEnd(text, i + 1);
      if (close === -1) throw new XmlSyntaxError('Unclosed start tag', lineAt());
      const selfClosing = text[close - 1] === '/';
      const body = text.slice(i + 1, selfClosing ? close - 1 : close);
      const m = /^([^\s/>]+)/.exec(body);
      if (!m || !NAME.test(m[1])) throw new XmlSyntaxError('Bad element name', lineAt());
      if (!stack.length && seenRoot) throw new XmlSyntaxError('More than one root element', lineAt());
      seenRoot = true;
      const name = m[1];
      const attrs = readAttributes(body.slice(name.length), lineAt);
      if (stack.length >= MAX_DEPTH) throw new XmlSyntaxError('Elements nested too deeply', lineAt());
      on.open?.(name, attrs);
      if (selfClosing) on.close?.(name);
      else stack.push(name);
      i = close + 1;
    }
  }
  if (stack.length) throw new XmlSyntaxError(`Element <${stack[stack.length - 1]}> is never closed`, lineAt());
  if (!seenRoot) throw new XmlSyntaxError('No root element', lineAt());
}

/** Find the ">" that ends a start tag, skipping quoted attribute values. */
function findTagEnd(text, from) {
  let quote = '';
  for (let j = from; j < text.length; j++) {
    const c = text[j];
    if (quote) { if (c === quote) quote = ''; }
    else if (c === '"' || c === "'") quote = c;
    else if (c === '>') return j;
    else if (c === '<') return -1;
  }
  return -1;
}

/** @param {string} s @param {() => number} lineAt */
function readAttributes(s, lineAt) {
  const attrs = {};
  const re = /\s*([^\s=]+)\s*=\s*("([^"]*)"|'([^']*)')/gy;
  let pos = 0;
  while (pos < s.length) {
    if (/^\s*$/.test(s.slice(pos))) break;
    re.lastIndex = pos;
    const m = re.exec(s);
    if (!m) throw new XmlSyntaxError('Bad attribute', lineAt());
    if (m[1] in attrs) throw new XmlSyntaxError(`Repeated attribute ${m[1]}`, lineAt());
    attrs[m[1]] = decodeEntities(m[3] ?? m[4], lineAt);
    pos = re.lastIndex;
  }
  return attrs;
}

/**
 * @typedef {{name: string, local: string, attrs: Record<string, string>, children: XmlNode[], text: string}} XmlNode
 */

/** The element name without its namespace prefix ("espi:IntervalBlock" → "IntervalBlock"). */
export const localName = (name) => name.slice(name.indexOf(':') + 1);

/**
 * Read XML text into a tree. Text is the concatenated, trimmed character data
 * directly inside each element.
 * @param {string} text
 * @returns {XmlNode}
 */
export function parseXml(text) {
  /** @type {XmlNode[]} */
  const stack = [];
  /** @type {XmlNode | undefined} */
  let root;
  readXml(text, {
    open(name, attrs) {
      const node = { name, local: localName(name), attrs, children: [], text: '' };
      if (stack.length) stack[stack.length - 1].children.push(node);
      else root = node;
      stack.push(node);
    },
    close() { const n = stack.pop(); n.text = n.text.trim(); },
    text(v) { stack[stack.length - 1].text += v; },
  });
  return /** @type {XmlNode} */ (root);
}

/**
 * Every descendant element with the given local name, in document order.
 * @param {XmlNode} node
 * @param {string} local
 * @returns {XmlNode[]}
 */
export function findAll(node, local) {
  const out = [];
  const visit = (n) => { for (const c of n.children) { if (c.local === local) out.push(c); visit(c); } };
  visit(node);
  return out;
}
