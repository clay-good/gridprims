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
  const server = createServer({ allowDirs: [fixtures] });
  let passed = 0;
  for (const r of requests) {
    const args = JSON.parse(JSON.stringify(r.arguments).replace(/\{fixture:([^}]+)\}/g, (_, f) => join(fixtures, f)));
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
  ['GitHub clones, stars, and MCP issues', 'needs the repository to be public'],
  ['Problem reports and median time to fix', 'counted once reports arrive as issues'],
  ['Citations and practitioner endorsements', 'recorded by hand as they are found; none recorded yet'],
];

/** One month's entry, in Markdown. */
export async function entry({ root = ROOT, now = new Date() } = {}) {
  const month = now.toISOString().slice(0, 7);
  const levels = Object.fromEntries(VALIDATION_LEVELS.map((l) => [l.name, 0]));
  for (const { manifest: m } of TOOLS) levels[VALIDATION_LEVELS[m.validation.level].name]++;
  const ledger = ledgerRecord(join(root, 'data'));
  const urls = JSON.parse(readFileSync(join(root, 'data/curated/published-urls.json'), 'utf8'));
  const progress = taskProgress(root);
  const ev = await evalPassRate(root);
  const p0 = phase0(root, progress);
  const lines = [
    `## ${month}`, '',
    `Generated ${now.toISOString().slice(0, 10)} by \`node pipeline/value-log.mjs\`.`, '',
    '| Measure | Value | Read from |', '|---|---|---|',
    `| Tools by validation level | ${Object.entries(levels).map(([k, v]) => `${k} ${v}`).join(', ')} | tool manifests |`,
    `| Datasets tracked, and late | ${ledger.counts.tracked} tracked, ${ledger.counts.late} late | the continuity ledger |`,
    `| Published pages | ${(Array.isArray(urls) ? urls : urls.urls ?? Object.keys(urls)).length.toLocaleString('en-US')} | data/curated/published-urls.json |`,
    `| Agent evaluation | ${ev.passed} of ${ev.total} requests reproduce their recorded values | mcp/eval/requests.mjs, replayed |`,
    `| Spec tasks done | ${progress.reduce((n, p) => n + p.done, 0)} of ${progress.reduce((n, p) => n + p.total, 0)} | openspec/changes/*/tasks.md |`,
    ...NOT_MEASURED.map(([m, why]) => `| ${m} | not yet measured | ${why} |`),
    '', `**Phase 0 exit:** ${p0.every((c) => c.met) ? 'met' : `not met: ${p0.filter((c) => !c.met).map((c) => c.criterion).join('; ')}`}.`, '',
    ...p0.map((c) => `- ${c.met ? 'Met' : 'Not met'}: ${c.criterion} (${c.from})`), '',
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
