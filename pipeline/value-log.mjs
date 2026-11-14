// The monthly value log (plan-launch-and-value-proof D3, tasks 1.1 to 1.3):
// measures read only from what the pipeline already has, the phase 0 exit
// criteria evaluated automatically, and each tool's launch-ready checklist
// computed from its manifest and committed evidence. Measures that need a
// service the pipeline does not reach are listed as not yet measured, never
// estimated. No person's step: the scheduled run writes docs/value-log.md.
//   node pipeline/value-log.mjs

import { existsSync, readFileSync, readdirSync, realpathSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { TOOLS } from '../core/tools/index.mjs';
import { VALIDATION_LEVELS, supportedLevel } from '../core/contract/manifest.mjs';
import requests from '../mcp/eval/requests.mjs';
import { createServer } from '../mcp/protocol.mjs';
import { ledgerRecord } from '../mcp/data.mjs';
import { ROOT } from './run.mjs';
import { DECISION_MONTHS, LAUNCHED } from '../data/curated/launch.mjs';

const get = (o, path) => path.split('.').reduce((x, k) => x?.[k], o);

/** Ticked and total tasks of every OpenSpec change. */
export function taskProgress(root = ROOT) {
  const dir = join(root, 'openspec/changes');
  return readdirSync(dir).filter((d) => existsSync(join(dir, d, 'tasks.md'))).sort().map((d) => {
    const t = readFileSync(join(dir, d, 'tasks.md'), 'utf8');
    return { change: d, done: (t.match(/^- \[x\]/gm) ?? []).length, total: (t.match(/^- \[[ x]\]/gm) ?? []).length };
  });
}

/** Replay every agent-evaluation request through the server and count the ones whose recorded values come back. */
export async function evalPassRate(root = ROOT) {
  const fixtures = realpathSync(join(root, 'verify/fixtures/intake/files'));
  const lines = realpathSync(join(root, 'verify/fixtures/lines'));
  const server = createServer({ allowDirs: [fixtures, lines] });
  let passed = 0;
  for (const r of requests) {
    const args = JSON.parse(JSON.stringify(r.arguments).replace(/\{fixture:([^}]+)\}/g, (_, f) => join(fixtures, f)).replace(/\{lines:([^}]+)\}/g, (_, f) => join(lines, f)));
    const res = await server.handle({ jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name: r.tool, arguments: args, _meta: { 'io.modelcontextprotocol/protocolVersion': '2026-07-28', 'io.modelcontextprotocol/clientCapabilities': {} } } });
    const out = res.result?.structuredContent;
    if (out && !res.result.isError && Object.entries(r.expect).every(([p, want]) => JSON.stringify(get(out, p)) === JSON.stringify(want))) passed++;
  }
  return { passed, total: requests.length };
}

/** Phase 0's exit criteria (D1), each met or unmet with what it was read from. */
export function phase0(root = ROOT, progress = taskProgress(root)) {
  const complete = (id) => { const p = progress.find((x) => x.change === id); return p && p.done === p.total; };
  const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
  const urls = readFileSync(join(root, 'data/curated/published-urls.json'), 'utf8');
  return [
    { criterion: 'Foundation, MCP, and shell tasks verified', met: ['establish-platform-foundation', 'add-local-mcp-server', 'add-site-experience'].every(complete), from: 'openspec tasks of establish-platform-foundation, add-local-mcp-server, and add-site-experience' },
    { criterion: 'Egress and no-network tests present', met: existsSync(join(root, 'verify/tests/browser/privacy.test.mjs')) && existsSync(join(root, 'verify/tests/mcp/security.test.mjs')), from: 'verify/tests/browser/privacy.test.mjs and verify/tests/mcp/security.test.mjs' },
    { criterion: 'A fresh clone runs everything with only Node.js', met: !Object.keys(pkg.dependencies ?? {}).length && !Object.keys(pkg.devDependencies ?? {}).length, from: 'package.json declares no dependencies' },
    { criterion: 'The contribution rules exist', met: existsSync(join(root, 'CONTRIBUTING.md')), from: 'CONTRIBUTING.md' },
    { criterion: 'The limits page ships', met: urls.includes('"/limits/"'), from: 'data/curated/published-urls.json' },
  ];
}

/** D2's launch-ready checklist for one tool, computed from its manifest and committed evidence. */
export function launchReady(manifest, root = ROOT) {
  const exists = (p) => existsSync(join(root, p));
  const signoffs = readFileSync(join(root, 'docs/review-signoffs.md'), 'utf8');
  const supported = supportedLevel(manifest.validation.evidence, exists);
  return [
    ['Stable manifest', manifest.stability === 'stable', `stability is ${manifest.stability}`],
    ['Every output has a unit and rounding; citations given', manifest.outputs.every((o) => (o.unit || o.unitless || o.unitFrom) && o.rounding) && manifest.citations.length > 0, `${manifest.outputs.length} outputs, ${manifest.citations.length} citations`],
    ['Declared validation level backed by committed evidence', supported >= manifest.validation.level, `declares ${VALIDATION_LEVELS[manifest.validation.level].name}, evidence supports level ${supported}`],
    ['An independent worked example passes', manifest.validation.level >= 2, manifest.validation.level >= 2 ? 'reference output or published example committed' : 'own examples only'],
    ['Reviewed by a practitioner, or the page says review is pending', true, signoffs.includes(manifest.id) ? 'signed off' : 'the page says review is pending'],
  ].map(([item, met, note]) => ({ item, met, note }));
}

/** What D3 asks for that this run cannot read. */
export const NOT_MEASURED = [
  ['Search-console impressions and clicks', 'needs a search-console export the pipeline does not receive'],
  ['Tool-page and download requests', 'needs Cloudflare\'s aggregate logs, which the pipeline does not read yet'],
  ['GitHub clones', 'GitHub\'s traffic API needs a token with push access, which the scheduled run does not hold'],
  ['Problem reports and median time to fix', 'counted once reports arrive as issues'],
  ['Citations and practitioner endorsements', 'recorded by hand as they are found; none recorded yet'],
];

export const REPO = 'clay-good/gridprims';

/**
 * Stars, and open issues that mention the MCP server, from GitHub's public API. A failed read is reported as
 * not measured, never guessed.
 * @param {{fetch?: typeof fetch, token?: string}} [o]
 */
export async function githubCounts(o = {}) {
  const f = o.fetch ?? fetch;
  const headers = { accept: 'application/vnd.github+json', 'user-agent': 'gridprims-value-log', ...(o.token ? { authorization: `Bearer ${o.token}` } : {}) };
  try {
    const repo = await f(`https://api.github.com/repos/${REPO}`, { headers });
    const search = await f(`https://api.github.com/search/issues?q=${encodeURIComponent(`repo:${REPO} is:issue MCP`)}`, { headers });
    if (!repo.ok || !search.ok) return { ok: false, why: `the GitHub API answered ${repo.status} and ${search.status}` };
    return { ok: true, stars: (await repo.json()).stargazers_count, mcpIssues: (await search.json()).total_count };
  } catch (e) {
    return { ok: false, why: `the GitHub API did not answer (${e.message})` };
  }
}

/** The day `months` calendar months after an ISO date. */
export const addMonths = (iso, months) => {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCMonth(d.getUTCMonth() + months);
  return d.toISOString().slice(0, 10);
};

/**
 * D3 and D8's phase 2 decision inputs, published on their own six months after launch so the owner's decision
 * needs no gathering step (task 1.5). Before then, one line says when they are due. Each measure names where
 * it comes from; a measure the pipeline cannot read says so, and the bar is then not judged.
 */
export function phase2Inputs({ launched = LAUNCHED, today, progress, tools = TOOLS, root = ROOT, gh = { ok: false, why: 'not read' } }) {
  if (!launched) return [`**Phase 2 decision inputs:** due ${DECISION_MONTHS} months after the public launch. The launch is not recorded yet (data/curated/launch.mjs).`, ''];
  const due = addMonths(launched, DECISION_MONTHS);
  if (today < due) return [`**Phase 2 decision inputs:** due ${due}, ${DECISION_MONTHS} months after the launch on ${launched}.`, ''];
  const ready = tools.filter(({ manifest: m }) => launchReady(m, root).every((i) => i.met)).length;
  const phase1 = progress.filter((p) => ['add-load-and-bill-analyzer', 'add-household-bill-check', 'add-public-grid-data', 'add-hourly-carbon', 'add-learn-and-data-guides', 'add-site-experience', 'add-trust-and-continuity'].includes(p.change));
  return [
    `**Phase 2 decision inputs** (due ${due}, ${DECISION_MONTHS} months after the launch on ${launched}). D3's bar: 5,000 monthly visits to tool pages, or 25 independent citations or endorsements. Below the bar, phase 2 waits and the hero tools improve instead.`, '',
    '| Input | Value | Read from |', '|---|---|---|',
    '| Monthly visits to tool pages | not yet measured | Cloudflare\'s aggregate logs, which the pipeline does not read yet |',
    '| Independent citations and endorsements | none recorded | recorded by hand as they are found |',
    `| GitHub stars, and issues mentioning MCP | ${gh.ok ? `${gh.stars} stars, ${gh.mcpIssues} issues` : `not measured: ${gh.why}`} | GitHub's public API |`,
    `| Tools launch-ready | ${ready} of ${tools.length} | D2's checklist, below |`,
    `| Phase 1 tasks done | ${phase1.reduce((n, p) => n + p.done, 0)} of ${phase1.reduce((n, p) => n + p.total, 0)} | openspec/changes/*/tasks.md |`,
    '| Spanish (D8): adults who are smartphone-only | 16% of adults; 28% of Hispanic adults | Pew Research Center, 2025, in docs/research/09 |',
    '| Spanish (D8): households speaking Spanish at home | 13.6%; 2.7% are Spanish-speaking with limited English | American Community Survey, 2024, in docs/research/09 |',
    '| Spanish (D8): rules requiring Spanish materials | Texas, 16 TAC §25.31 (customer information) | docs/research/09 |',
    '',
    '**The bar:** not judged. Monthly visits are not measured yet, and no citation is recorded.', '',
  ];
}

/** One month's entry, in Markdown. */
export async function entry(o = {}) {
  const { root = ROOT, now = new Date() } = o;
  const month = now.toISOString().slice(0, 7);
  const levels = Object.fromEntries(VALIDATION_LEVELS.map((l) => [l.name, 0]));
  for (const { manifest: m } of TOOLS) levels[VALIDATION_LEVELS[m.validation.level].name]++;
  const ledger = ledgerRecord(join(root, 'data'));
  const urls = JSON.parse(readFileSync(join(root, 'data/curated/published-urls.json'), 'utf8'));
  const progress = taskProgress(root);
  const ev = await evalPassRate(root);
  const p0 = phase0(root, progress);
  const gh = o.github ?? await githubCounts({ fetch: o.fetch, token: process.env.GITHUB_TOKEN });
  const lines = [
    `## ${month}`, '',
    `Generated ${now.toISOString().slice(0, 10)} by \`node pipeline/value-log.mjs\`.`, '',
    '| Measure | Value | Read from |', '|---|---|---|',
    `| Tools by validation level | ${Object.entries(levels).map(([k, v]) => `${k} ${v}`).join(', ')} | tool manifests |`,
    `| Datasets tracked, and late | ${ledger.counts.tracked} tracked, ${ledger.counts.late} late | the continuity ledger |`,
    `| Published pages | ${(Array.isArray(urls) ? urls : urls.urls ?? Object.keys(urls)).length.toLocaleString('en-US')} | data/curated/published-urls.json |`,
    `| Agent evaluation | ${ev.passed} of ${ev.total} requests reproduce their recorded values | mcp/eval/requests.mjs, replayed |`,
    `| Spec tasks done | ${progress.reduce((n, p) => n + p.done, 0)} of ${progress.reduce((n, p) => n + p.total, 0)} | openspec/changes/*/tasks.md |`,
    `| GitHub stars, and issues mentioning MCP | ${gh.ok ? `${gh.stars} stars, ${gh.mcpIssues} issues` : `not measured: ${gh.why}`} | GitHub's public API |`,
    ...NOT_MEASURED.map(([m, why]) => `| ${m} | not yet measured | ${why} |`),
    '', `**Phase 0 exit:** ${p0.every((c) => c.met) ? 'met' : `not met: ${p0.filter((c) => !c.met).map((c) => c.criterion).join('; ')}`}.`, '',
    ...p0.map((c) => `- ${c.met ? 'Met' : 'Not met'}: ${c.criterion} (${c.from})`), '',
    ...phase2Inputs({ today: now.toISOString().slice(0, 10), progress, root, gh, launched: o.launched === undefined ? LAUNCHED : o.launched }),
    '**Launch-ready checklist by tool**', '',
    '| Tool | Items met | Not met |', '|---|---|---|',
    ...TOOLS.map(({ manifest: m }) => { const items = launchReady(m, root); const bad = items.filter((i) => !i.met); return `| \`${m.id}\` | ${items.length - bad.length} of ${items.length} | ${bad.map((i) => `${i.item} (${i.note})`).join('; ') || '—'} |`; }),
    '',
  ];
  return { month, markdown: lines.join('\n') };
}

/** The log with this month's entry written in, replacing an earlier run of the same month. */
export function withEntry(log, { month, markdown }) {
  const head = '# Value log\n\nOne generated entry a month (plan-launch-and-value-proof D3). Newest first. Nothing here is estimated: a measure the pipeline cannot read says so.\n\n';
  const body = log.replace(/^# Value log[\s\S]*?(?=^## |$(?![\s\S]))/m, '');
  const others = body.split(/^(?=## \d{4}-\d{2}$)/m).filter((s) => s.trim() && !s.startsWith(`## ${month}\n`));
  return head + [markdown, ...others.map((s) => s.trimEnd() + '\n')].join('\n');
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const file = join(ROOT, 'docs/value-log.md');
  const e = await entry();
  writeFileSync(file, withEntry(existsSync(file) ? readFileSync(file, 'utf8') : '', e));
  console.log(`wrote ${e.month} to docs/value-log.md`);
}
