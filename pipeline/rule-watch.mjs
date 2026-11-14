// The weekly rule-status recheck (plan-launch-and-value-proof task 1.4). Every
// source the rule-status brief cites (docs/research/06, its "Sources" list) is
// fetched and compared with what the last check saw: whether it still
// resolves, whether it moved, and whether its text changed. Each run appends a
// dated note to the brief and records itself on the health record. It reads,
// flags, and waits on nobody: a flagged item is one to reread before the next
// phase gate, and the build never blocks on it.
//   node pipeline/rule-watch.mjs

import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { recordRun } from './lib/health.mjs';
import { ROOT } from './run.mjs';

export const BRIEF = 'docs/research/06-rules-status-2026-10.md';
/** What each source looked like at the last check: the baseline the next check compares with. */
export const SEEN = 'data/curated/captures/rule-status/seen.json';
export const NOTES_HEADING = '## Scheduled rechecks';

/**
 * The brief's sources, one item per bullet of its "Sources" list.
 * @param {string} md the brief
 * @returns {Array<{item: string, urls: string[]}>}
 */
export function ruleSources(md) {
  const start = md.indexOf('\n## Sources');
  if (start < 0) return [];
  const rest = md.slice(start + 1);
  const end = rest.indexOf('\n## ', 3);
  const section = end < 0 ? rest : rest.slice(0, end);
  return section.split('\n').filter((l) => l.startsWith('- ')).map((l) => ({
    item: l.slice(2).split(':')[0].trim(),
    urls: [...new Set(l.match(/https?:\/\/[^\s;)]+/g) ?? [])],
  })).filter((s) => s.urls.length);
}

/**
 * A page's text, without markup, scripts, or whitespace, so a change of layout
 * alone does not read as a change of substance.
 * @param {Uint8Array} bytes @param {string} type the content type
 */
export function fingerprint(bytes, type = '') {
  if (!/html|xml|text|json/.test(type)) return createHash('sha256').update(bytes).digest('hex');
  const text = new TextDecoder().decode(bytes)
    .replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>|<!--[\s\S]*?-->/gi, ' ')
    .replace(/<[^>]+>/g, ' ').replace(/\s+/g, '');
  return createHash('sha256').update(text).digest('hex');
}

/**
 * Check one source against what the last check saw.
 * @returns {Promise<{url: string, state: 'ok'|'changed'|'moved'|'broken'|'blocked'|'new', status: number, finalUrl?: string, hash: string | null}>}
 */
async function checkOne(url, before, f) {
  let res;
  try {
    res = await f(url, { redirect: 'follow', headers: { 'user-agent': 'gridprims-rule-watch (+https://gridprims.com)' } });
  } catch {
    return { url, state: 'broken', status: 0, hash: before?.hash ?? null };
  }
  const status = res.status;
  // Some agencies refuse automated readers; that is not a moved rule, and the last fingerprint stands.
  if (status === 403 || status === 429) return { url, state: 'blocked', status, hash: before?.hash ?? null };
  if (!res.ok) return { url, state: 'broken', status, hash: before?.hash ?? null };
  const finalUrl = res.url || url;
  const hash = fingerprint(new Uint8Array(await res.arrayBuffer()), res.headers?.get?.('content-type') ?? '');
  const moved = finalUrl.replace(/\/$/, '') !== url.replace(/\/$/, '');
  const state = moved ? 'moved' : !before?.hash ? 'new' : before.hash !== hash ? 'changed' : 'ok';
  return { url, state, status, ...(moved ? { finalUrl } : {}), hash };
}

/**
 * The dated note a run appends to the brief: what it checked and which items need rereading.
 * @param {string} day YYYY-MM-DD
 * @param {Array<{item: string, results: any[]}>} items
 */
export function noteFor(day, items) {
  const all = items.flatMap((i) => i.results);
  const flagged = (state) => items.filter((i) => i.results.some((r) => r.state === state)).map((i) => i.item);
  const parts = [`${all.length} sources for ${items.length} items checked`];
  for (const [state, words] of [['moved', 'moved'], ['broken', 'no longer resolve'], ['changed', 'changed since the last check']]) {
    const names = flagged(state);
    if (names.length) parts.push(`${names.length} ${names.length === 1 ? 'item' : 'items'} whose source ${words}: ${names.join('; ')}`);
  }
  const blocked = flagged('blocked');
  if (blocked.length) parts.push(`${blocked.length} refused an automated reader and keep their last reading: ${blocked.join('; ')}`);
  const reread = new Set([...flagged('moved'), ...flagged('broken'), ...flagged('changed')]);
  return `- **${day}.** ${parts.join('. ')}. ${reread.size ? 'Reread the flagged items before stating them at the next phase gate.' : 'Nothing to reread.'}`;
}

/** Append a note under the brief's rechecks heading, adding the heading on the first run. */
export function appendNote(md, note) {
  const body = md.endsWith('\n') ? md : `${md}\n`;
  if (!body.includes(`\n${NOTES_HEADING}\n`)) {
    return `${body}\n${NOTES_HEADING}\n\nWritten by \`pipeline/rule-watch.mjs\` each week. Each source is compared with what the previous check saw; a moved, dead, or changed source flags its item for rereading. Nothing here is a finding until a person rereads it.\n\n${note}\n`;
  }
  return `${body}${note}\n`;
}

/** @param {{root?: string, fetch?: typeof fetch, now?: () => string}} [o] */
export async function runRuleWatch(o = {}) {
  const root = o.root ?? ROOT;
  const now = o.now ?? (() => new Date().toISOString());
  const f = o.fetch ?? fetch;
  const started = now();
  const briefPath = join(root, BRIEF);
  const seenPath = join(root, SEEN);
  const md = readFileSync(briefPath, 'utf8');
  const seen = existsSync(seenPath) ? JSON.parse(readFileSync(seenPath, 'utf8')) : {};
  const items = [];
  for (const { item, urls } of ruleSources(md)) {
    const results = [];
    for (const url of urls) results.push(await checkOne(url, seen[url], f));
    items.push({ item, results });
  }
  const day = started.slice(0, 10);
  const next = { ...seen };
  for (const r of items.flatMap((i) => i.results)) next[r.url] = { hash: r.hash, status: r.status, state: r.state, checked: day, ...(r.finalUrl ? { finalUrl: r.finalUrl } : {}) };
  mkdirSync(dirname(seenPath), { recursive: true });
  writeFileSync(seenPath, JSON.stringify(Object.fromEntries(Object.entries(next).sort()), null, 2) + '\n');
  const note = noteFor(day, items);
  writeFileSync(briefPath, appendNote(md, note));
  recordRun(root, { workflow: 'rule-watch', started, finished: now(), ok: true, notes: [note.replace(/^- \*\*[\d-]+\.\*\* /, '')] });
  return { items, note };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const { items, note } = await runRuleWatch();
  for (const { item, results } of items) for (const r of results) console.log(`${r.state.padEnd(7)} ${r.status} ${item}: ${r.url}`);
  console.log(note);
}
