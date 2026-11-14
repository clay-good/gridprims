// The weekly outbound link check (platform/data-operations, "Outbound link
// checks"): every link in manifests, registry entries, and dataset terms is
// fetched, and so is every curated regulator link; broken, moved, and blocked
// links go to the health record and an issue, and nothing is blocked. A 403
// or 429 is "blocked": some state sites refuse automated checks, so a person
// checks those by hand.
//   node pipeline/link-check.mjs

import { spawnSync } from 'node:child_process';
import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { TOOLS } from '../core/tools/index.mjs';
import REGULATORS from '../data/curated/regulators.mjs';
import QF from '../data/curated/qf-checklist.mjs';
import LARGE_LOAD from '../data/curated/large-load-tariffs/_index.mjs';
import PROGRAM_LINKS from '../data/curated/program-links.mjs';
import { readHealth, recordRun } from './lib/health.mjs';
import { github } from './lib/github.mjs';
import { ROOT } from './run.mjs';

/** Every outbound link and the places that use it. */
export async function outboundLinks(root = ROOT) {
  const links = new Map();
  const add = (url, where) => { if (/^https?:\/\//.test(url ?? '')) links.set(url, [...(links.get(url) ?? []), where]); };
  for (const { manifest: m } of TOOLS) {
    for (const c of m.citations) add(c.url, `${m.id} citation`);
    for (const h of m.handoffs) add(h.url, `${m.id} handoff`);
  }
  const reg = join(root, 'pipeline/registry');
  for (const f of existsSync(reg) ? readdirSync(reg) : []) {
    const e = (await import(pathToFileURL(join(reg, f)).href)).default;
    add(e.sourceUrl, `${e.id} source`);
    add(e.terms.url, `${e.id} terms`);
    if (e.releaseCalendar) add(e.releaseCalendar.url, `${e.id} release calendar`);
  }
  for (const r of REGULATORS) for (const k of ['home', 'docket', 'comment']) add(r[k], `${r.state} regulator ${k}`);
  // Every other place the site cites a URL: the net metering pages' policy database, the qualifying-facility
  // checklist, and each dataset's release calendar.
  for (const r of REGULATORS) add(`https://programs.dsireusa.org/system/program?state=${r.state}`, `${r.state} net metering rules link`);
  for (const g of QF.groups) for (const x of g.items) add(x.cite.url, `qualifying-facility checklist (${x.cite.section})`);
  add(QF.form.url, 'qualifying-facility checklist form');
  // Large-load sources that served a capture; the unreachable ones are recorded as such on their records.
  for (const r of LARGE_LOAD) for (const u of new Set(Object.values(r.fields).flatMap((f) => f.sources.filter((x) => !x.unreachable).map((x) => x.url)))) add(u, `large-load terms (${r.id})`);
  // The program links index: every outside tool we send people to, named so a moved target shows who links it.
  for (const l of PROGRAM_LINKS) add(l.url, `program links: ${l.name} (/learn/links/#${l.id})`);
  return links;
}

/**
 * Hosts that answer an automated check with a wall of their own instead of the
 * page asked for. eCFR and the Federal Register send one to unblock.federalregister.gov;
 * Minnesota's PUC sends one to a ShieldSquare challenge. The redirect is an
 * interception, not a move: following it would store a URL that cites nothing.
 */
const INTERSTITIALS = new Set(['unblock.federalregister.gov', 'validate.perfdrive.com']);

/**
 * Resolvers whose whole job is to redirect. A DOI is the stable name of a dataset
 * or a paper; where it points is the publisher's business and may change again.
 * Storing what it resolved to today would replace a permanent citation with a
 * perishable one, so a DOI that resolves is simply working.
 */
const RESOLVERS = new Set(['doi.org', 'dx.doi.org']);

const hostOf = (u) => { try { return new URL(u).host; } catch { return ''; } };
/** Two addresses for comparison: the fragment is ours, not the server's, and `fetch` drops it. */
const same = (a, b) => a.replace(/#.*$/, '').replace(/\/$/, '') === b.replace(/#.*$/, '').replace(/\/$/, '');

/**
 * What one answer means. A 403 or 429 is "blocked": some state sites refuse
 * automated checks, so a person checks those by hand, and a redirect onto an
 * interstitial is the same refusal wearing a 200.
 * @param {{url: string, status: number, finalUrl: string}} r
 */
export function classify({ url, status, finalUrl }) {
  if (status === 403 || status === 429) return 'blocked';
  if (status === 0 || status >= 400) return 'broken';
  if (INTERSTITIALS.has(hostOf(finalUrl)) && hostOf(finalUrl) !== hostOf(url)) return 'blocked';
  if (RESOLVERS.has(hostOf(url))) return 'ok';
  return same(finalUrl, url) ? 'ok' : 'moved';
}

/**
 * @param {{fetch?: typeof fetch, host?: any, root?: string, now?: () => Date}} [o]
 */
export async function linkCheck(o = {}) {
  const f = o.fetch ?? fetch;
  const root = o.root ?? ROOT;
  const now = o.now ?? (() => new Date());
  const host = o.host ?? github();
  const started = now().toISOString();
  // What each link answered last time, so this run can tell a lasting change from a blip.
  const previous = new Map((readHealth(root).links ?? []).map((l) => [l.url, l]));
  const results = [];
  for (const [url, usedBy] of await outboundLinks(root)) {
    let status = 0;
    let finalUrl = url;
    try {
      const res = await f(url, { method: 'GET', redirect: 'follow', headers: { 'user-agent': 'gridprims-link-check (+https://gridprims.com)' } });
      status = res.status;
      finalUrl = res.url || url;
    } catch {
      // Some state servers leave out an intermediate certificate or drop Node's TLS handshake; browsers and curl manage.
      if (!o.fetch) {
        const curl = spawnSync('curl', ['-s', '-o', '/dev/null', '-L', '--max-time', '30', '-w', '%{http_code}\\n%{url_effective}', url], { encoding: 'utf8' });
        const [code, effective] = (curl.stdout ?? '').split('\n');
        status = Number(code) || 0;
        if (effective) finalUrl = effective;
      } else status = 0;
    }
    const state = classify({ url, status, finalUrl });
    // Since when this link has been answering this way. One bad check is usually the
    // network or a moment's load, and a site that hands out a fresh session URL every
    // visit (Wyoming's and Montana's dockets) "moves" every week; both look the same
    // twice running only when something really changed. Publishing a live citation as
    // a dead one is the worse mistake, so a result counts only once it is confirmed.
    const was = previous.get(url);
    const sameAnswer = Boolean(was && was.state === state && (state !== 'moved' || same(was.finalUrl ?? '', finalUrl)));
    results.push({ url, state, status, ...(state === 'moved' ? { finalUrl } : {}), held: sameAnswer && was.since ? was.since : null, usedBy });
  }
  const finished = now().toISOString();
  for (const r of results) {
    r.since = r.state === 'ok' ? null : r.held ?? finished;
    r.confirmed = r.state !== 'ok' && r.since !== finished;
    delete r.held;
  }
  const bad = results.filter((r) => r.confirmed);
  if (bad.length && host.available) {
    try { await host.openIssue('Link check: broken or moved links', bad.map((b) => `- ${b.state}: ${b.url}${b.finalUrl ? ` → ${b.finalUrl}` : ''} (HTTP ${b.status}), unchanged since ${b.since}, used by ${b.usedBy.join(', ')}`).join('\n')); } catch { /* recorded below either way */ }
  }
  recordRun(root, { workflow: 'link-check', started, finished, ok: true, links: results, notes: bad.length ? [`${bad.length} broken or moved links`] : [] });
  return results;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  for (const r of await linkCheck()) console.log(`${r.state.padEnd(6)} ${r.status} ${r.url}${r.finalUrl ? ` → ${r.finalUrl}` : ''}`);
}
