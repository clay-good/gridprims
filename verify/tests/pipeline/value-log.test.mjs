// The value log (plan-launch-and-value-proof 1.1 to 1.3): a month's entry is
// generated with no person's step, a second run in the same month replaces
// it, phase 0's exit criteria read met or name what is unmet, each tool's
// launch-ready items are computed, and unmeasured measures say so.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { entry, launchReady, phase0, withEntry } from '../../../pipeline/value-log.mjs';
import { TOOLS } from '../../../core/tools/index.mjs';

test('a month\'s entry carries every measure with its source, and unmeasured ones say so', async () => {
  const e = await entry({ now: new Date('2026-12-01T06:07:00Z') });
  assert.equal(e.month, '2026-12');
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
