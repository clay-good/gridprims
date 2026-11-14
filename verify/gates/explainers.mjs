// The explainers gate (add-learn-and-data-guides tasks 3.1 and 3.2). A summary
// of at most three sentences at grade 8 or below; sections of at most 300
// words; a "Try it" link that stays on the site and never uses a query string;
// a valid last-reviewed date; and every number either generated from a
// dataset, labeled an example value, or cited with a source and a date, with a
// hand-cited number older than 24 months flagged for review.

import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { fleschKincaid } from '../../core/lib/readability.mjs';

export const SUMMARY_SENTENCES = 3;
export const SUMMARY_GRADE = 8;
export const SECTION_WORDS = 300;
export const CITED_MONTHS = 24;

const sentencesOf = (text) => text.replace(/(\d)\.(\d)/g, '$1$2').split(/(?<=[.!?])\s+(?=[A-Z{])/).filter((s) => s.trim()).length;
/** Names that hold digits but state no quantity: a form, an order, a rule, a peak count, or a name like EV2 (Form 714, EIA-930, Order No. 2023, 4CP). */
const NAMES = /\b(?:Form\s+(?:EIA-)?\d+|EIA-\d+|Order\s+No\.\s*\d+|\d+\s?TAC\s+§\s?[\d.]+|Project\s+\d+|\d+CP|[A-Za-z]+[\w-]*\d[\w-]*)\b/g;
/** A year is a date, not a quantity: 2025, 1996. */
const YEARS = /\b(?:19|20)\d{2}\b/g;
/** Numbers in prose, outside {placeholders} and names: digit runs with their commas and decimal points. */
const numbersIn = (text) => text.replace(/\{\w+\}/g, '').replace(NAMES, '').replace(YEARS, '').match(/\d{1,3}(?:,\d{3})+(?:\.\d+)?|\d+(?:\.\d+)?/g) ?? [];
const monthsBefore = (iso, months) => { const d = new Date(`${iso}T00:00:00Z`); d.setUTCMonth(d.getUTCMonth() - months); return d.toISOString().slice(0, 10); };

/**
 * @param {any[]} explainers @param {string} today YYYY-MM-DD
 * @returns {string[]} errors
 */
export function checkExplainerRecords(explainers, today) {
  const errors = [];
  const ids = new Set();
  for (const e of explainers) {
    const at = e.id ?? '(no id)';
    if (ids.has(e.id)) errors.push(`${at}: id is used twice`);
    ids.add(e.id);
    for (const k of ['id', 'title', 'reviewed', 'summary', 'sections', 'cited', 'tryIt']) if (e[k] === undefined) errors.push(`${at}: missing ${k}`);
    if (e.reviewed && (!/^\d{4}-\d{2}-\d{2}$/.test(e.reviewed) || e.reviewed > today)) errors.push(`${at}: reviewed "${e.reviewed}" is not a date on or before ${today}`);
    if (typeof e.summary === 'string') {
      const n = sentencesOf(e.summary);
      if (n > SUMMARY_SENTENCES) errors.push(`${at}: the summary has ${n} sentences; at most ${SUMMARY_SENTENCES}`);
      const grade = fleschKincaid(e.summary.replace(/\{\w+\}/g, 'many')).grade;
      if (grade > SUMMARY_GRADE) errors.push(`${at}: the summary reads at grade ${grade.toFixed(1)}; at most ${SUMMARY_GRADE}`);
    }
    for (const s of e.sections ?? []) {
      const words = s.paragraphs.join(' ').split(/\s+/).filter(Boolean).length;
      if (words > SECTION_WORDS) errors.push(`${at}: section "${s.heading}" has ${words} words; at most ${SECTION_WORDS}`);
    }
    const href = e.tryIt?.href ?? '';
    if (!(href.startsWith('/') || /^\{\w+\}$/.test(href)) || href.includes('?')) errors.push(`${at}: "Try it" must open a page on the site, with any example in the fragment, never a query string`);
    // Every number in the prose is generated, an example, or cited and dated.
    const cited = new Map((e.cited ?? []).map((c) => [c.text, c]));
    for (const c of e.cited ?? []) {
      if (c.example) continue;
      if (!c.source || !/^\d{4}-\d{2}-\d{2}$/.test(c.date ?? '')) errors.push(`${at}: the cited number "${c.text}" needs a source and a date`);
      else if (c.date < monthsBefore(today, CITED_MONTHS)) errors.push(`${at}: the cited number "${c.text}" (${c.source}) is from ${c.date}, more than ${CITED_MONTHS} months ago; review it`);
    }
    const prose = [e.summary ?? '', ...(e.sections ?? []).flatMap((s) => [s.heading, ...s.paragraphs])];
    for (const n of new Set(prose.flatMap(numbersIn))) if (!cited.has(n)) errors.push(`${at}: the number "${n}" is typed by hand; generate it from a dataset, or cite it with a source and a date`);
  }
  return errors;
}

/** @param {string} root */
export async function checkExplainers(root, today = new Date().toISOString().slice(0, 10)) {
  const { default: explainers } = await import(pathToFileURL(join(root, 'data/curated/explainers/index.mjs')).href);
  return checkExplainerRecords(explainers, today);
}
