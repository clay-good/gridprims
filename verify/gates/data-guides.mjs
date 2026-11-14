// The get-your-data guides gate (add-learn-and-data-guides tasks 2.1 and 2.4).
// Every guide carries its verification level, the day it was checked, and its
// source; only the keys below are allowed, so no field can hold a screenshot,
// a file, or a stray description; no text holds an account number, a meter id,
// or a street address; the guides folder holds text only; and every format a
// guide names has a fixture gridprims parses with an expected receipt.

import { existsSync, readdirSync } from 'node:fs';
import { basename, join } from 'node:path';
import { pathToFileURL } from 'node:url';

export const GUIDES_DIR = 'data/curated/guides';
const REQUIRED = ['id', 'utilityIds', 'name', 'state', 'portal', 'computer', 'formats', 'interval', 'history', 'level', 'checked', 'source'];
const OPTIONAL = ['phone', 'choose', 'noDownload', 'notes'];
/** Eight or more digits in a run, allowing the spaces and dashes account numbers are printed with. */
export const LONG_NUMBER = /\d(?:[ -]?\d){7,}/;
/** A street address: a house number, a name, and a street word. */
export const STREET = /\b\d{1,6}\s+(?:[NSEW]\.?\s+)?(?:[A-Za-z]+\s+){1,3}(?:Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd|Drive|Dr|Lane|Ln|Way|Court|Ct|Place|Pl|Highway|Hwy)\b\.?/i;

const texts = (v, at) => (typeof v === 'string' ? [[at, v]] : Array.isArray(v) ? v.flatMap((x, i) => texts(x, `${at}[${i}]`)) : []);

/**
 * @param {any[]} guides @param {Record<string, {label: string, fixture: string, expected?: string}>} formats
 * @param {string[]} levels @param {{root: string, today: string, fixtures: Array<{file: string, expect?: any}>}} o
 * @returns {string[]} errors
 */
export function checkGuides(guides, formats, levels, { root, today, fixtures }) {
  const errors = [];
  const ids = new Set();
  for (const g of guides) {
    const at = g.id ?? '(no id)';
    for (const k of REQUIRED) if (g[k] === undefined || g[k] === null || g[k] === '') errors.push(`${at}: missing ${k}`);
    for (const k of Object.keys(g)) if (!REQUIRED.includes(k) && !OPTIONAL.includes(k)) errors.push(`${at}: "${k}" is not a guide field; guides hold steps and notes as text, and nothing else free-form`);
    if (ids.has(g.id)) errors.push(`${at}: id is used twice`);
    ids.add(g.id);
    if (g.level && !levels.includes(g.level)) errors.push(`${at}: level "${g.level}" is not one of ${levels.join(', ')}`);
    if (g.checked && (!/^\d{4}-\d{2}-\d{2}$/.test(g.checked) || g.checked > today)) errors.push(`${at}: checked "${g.checked}" is not a date on or before ${today}`);
    if (g.computer !== undefined && (!Array.isArray(g.computer) || !g.computer.length)) errors.push(`${at}: computer must list the steps`);
    if (!g.noDownload && g.formats?.length && !g.choose) errors.push(`${at}: names formats but not which one to choose`);
    for (const f of g.formats ?? []) if (!formats[f]) errors.push(`${at}: names the format "${f}", which has no fixture; add a synthetic fixture in that shape to the intake library and to FORMATS`);
    // Every text field is linted; the check date is validated as a date above, so it is not.
    for (const [field, text] of Object.keys(g).filter((k) => k !== 'checked').flatMap((k) => texts(g[k], k))) {
      if (LONG_NUMBER.test(text)) errors.push(`${at}.${field}: holds a run of 8 or more digits, which reads as an account number or meter id`);
      if (STREET.test(text)) errors.push(`${at}.${field}: holds what reads as a street address`);
    }
  }
  // Every named format parses: its fixture exists and has an expected receipt.
  const expected = new Set(fixtures.filter((f) => f.expect).map((f) => f.file));
  for (const [id, f] of Object.entries(formats)) {
    if (!existsSync(join(root, f.fixture))) { errors.push(`format ${id}: fixture ${f.fixture} is missing`); continue; }
    if (!(f.expected ? existsSync(join(root, f.expected)) : expected.has(basename(f.fixture)))) errors.push(`format ${id}: fixture ${f.fixture} has no expected receipt`);
  }
  // Text only: no screenshot, no downloaded file, in the guides folder.
  const dir = join(root, GUIDES_DIR);
  for (const name of existsSync(dir) ? readdirSync(dir) : []) if (!name.endsWith('.mjs')) errors.push(`${GUIDES_DIR}/${name}: guides are text only; screenshots and downloaded files are never committed`);
  return errors;
}

/** @param {string} root */
export async function checkDataGuides(root, today = new Date().toISOString().slice(0, 10)) {
  const mod = await import(pathToFileURL(join(root, GUIDES_DIR, 'index.mjs')).href);
  const { FIXTURES } = await import(pathToFileURL(join(root, 'verify/fixtures/intake/make.mjs')).href);
  return checkGuides(mod.default, mod.FORMATS, mod.LEVELS, { root, today, fixtures: FIXTURES });
}
