// The value log (plan-launch-and-value-proof 1.1 to 1.3): a month's entry is
// generated with no person's step, a second run in the same month replaces
// it, phase 0's exit criteria read met or name what is unmet, each tool's
// launch-ready items are computed, and unmeasured measures say so.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { addMonths, entry, githubCounts, launchReady, phase0, phase2Inputs, taskProgress, withEntry } from '../../../pipeline/value-log.mjs';
import { TOOLS } from '../../../core/tools/index.mjs';

test('a month\'s entry carries every measure with its source, and unmeasured ones say so', async () => {
  const e = await entry({ now: new Date('2026-12-01T06:07:00Z'), github: { ok: true, stars: 12, mcpIssues: 1 } });
  assert.equal(e.month, '2026-12');
  assert.match(e.markdown, /\| GitHub stars, and issues mentioning MCP \| 12 stars, 1 issues \| GitHub's public API \|/);
  assert.doesNotMatch(e.markdown, /needs the repository to be public/);
  assert.match(e.markdown, /\| Agent evaluation \| (\d+) of \1 requests reproduce their recorded values \|/);
  assert.match(e.markdown, /\| Tools by validation level \| unvalidated \d+, self-checked \d+, cross-checked \d+, field-verified \d+ \| tool manifests \|/);
  assert.match(e.markdown, /\| Search-console impressions and clicks \| not yet measured \|/);
  assert.match(e.markdown, /\*\*Phase 0 exit:\*\* (met|not met: .+)\./);
});

test('a second run in the same month replaces that month; other months stay, newest first', () => {
  const one = withEntry('', { month: '2026-11', markdown: '## 2026-11\n\nfirst\n' });
  const two = withEntry(one, { month: '2026-12', markdown: '## 2026-12\n\nsecond\n' });
  const again = withEntry(two, { month: '2026-12', markdown: '## 2026-12\n\nthird\n' });
  assert.equal((again.match(/^## 2026-12$/gm) ?? []).length, 1);
  assert.match(again, /## 2026-12\n\nthird\n[\s\S]*## 2026-11\n\nfirst/);
  assert.doesNotMatch(again, /second/);
});

test('phase 0 criteria are each met or named, read from files', () => {
  const p = phase0();
  assert.equal(p.length, 5);
  for (const c of p) assert.ok(typeof c.met === 'boolean' && c.from, c.criterion);
  assert.equal(p.find((c) => c.criterion.startsWith('A fresh clone')).met, true);
});

test('each tool\'s launch-ready items are computed, not reviewed', () => {
  for (const { manifest: m } of TOOLS) {
    const items = launchReady(m);
    assert.equal(items.length, 5, m.id);
    assert.equal(items.find((i) => i.item.startsWith('Declared validation level')).met, true, `${m.id} claims no more than its evidence`);
  }
  const lcoe = launchReady(TOOLS.find((t) => t.manifest.id === 'calc.cost.lcoe').manifest);
  assert.equal(lcoe.find((i) => i.item.startsWith('An independent worked example')).met, true);
});

test('before launch, and before six months, the decision inputs say when they are due', async () => {
  const progress = taskProgress();
  assert.match(phase2Inputs({ launched: null, today: '2026-12-01', progress }).join('\n'), /due 6 months after the public launch\. The launch is not recorded yet/);
  assert.match(phase2Inputs({ launched: '2027-02-01', today: '2027-07-31', progress }).join('\n'), /^\*\*Phase 2 decision inputs:\*\* due 2027-08-01, 6 months after the launch on 2027-02-01\./);
  assert.equal(addMonths('2027-08-31', 6), '2028-03-02');
});

test('six months after launch the scheduled entry carries every decision input with its source, Spanish included', async () => {
  const e = await entry({ now: new Date('2027-08-01T06:07:00Z'), launched: '2027-02-01', github: { ok: false, why: 'the GitHub API answered 503 and 503' } });
  const md = e.markdown;
  assert.match(md, /\*\*Phase 2 decision inputs\*\* \(due 2027-08-01, 6 months after the launch on 2027-02-01\)\. D3's bar: 5,000 monthly visits to tool pages, or 25 independent citations or endorsements\./);
  for (const row of [
    /\| Monthly visits to tool pages \| not yet measured \| Cloudflare's aggregate logs/,
    /\| Independent citations and endorsements \| none recorded \| recorded by hand/,
    /\| GitHub stars, and issues mentioning MCP \| not measured: the GitHub API answered 503 and 503 \| GitHub's public API \|/,
    /\| Tools launch-ready \| \d+ of \d+ \| D2's checklist, below \|/,
    /\| Phase 1 tasks done \| \d+ of \d+ \| openspec\/changes\/\*\/tasks\.md \|/,
    /\| Spanish \(D8\): adults who are smartphone-only \| 16% of adults; 28% of Hispanic adults \| Pew Research Center, 2025, in docs\/research\/09 \|/,
    /\| Spanish \(D8\): households speaking Spanish at home \| 13\.6%; 2\.7% are Spanish-speaking with limited English \| American Community Survey, 2024, in docs\/research\/09 \|/,
  ]) assert.match(md, row);
  assert.match(md, /\*\*The bar:\*\* not judged\. Monthly visits are not measured yet, and no citation is recorded\./);
});

test('GitHub counts come from the public API, and a failed read is reported, not guessed', async () => {
  const ok = await githubCounts({ fetch: async (u) => new Response(JSON.stringify(u.includes('/search/') ? { total_count: 3 } : { stargazers_count: 40 }), { status: 200 }) });
  assert.deepEqual(ok, { ok: true, stars: 40, mcpIssues: 3 });
  const down = await githubCounts({ fetch: async () => { throw new Error('offline'); } });
  assert.deepEqual(down, { ok: false, why: 'the GitHub API did not answer (offline)' });
  const limited = await githubCounts({ fetch: async () => new Response('{}', { status: 403 }) });
  assert.equal(limited.why, 'the GitHub API answered 403 and 403');
});
