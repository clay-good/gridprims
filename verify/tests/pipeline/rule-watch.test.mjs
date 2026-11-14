// The weekly rule-status recheck (plan-launch-and-value-proof 1.4): every
// source in the brief's Sources list is checked against what the last check
// saw; a moved, dead, or changed source flags its item; a refusal keeps the
// last reading; and the scheduled run writes a dated note to the brief.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT } from '../../../pipeline/run.mjs';
import { BRIEF, NOTES_HEADING, SEEN, fingerprint, ruleSources, runRuleWatch } from '../../../pipeline/rule-watch.mjs';
import { readHealth } from '../../../pipeline/lib/health.mjs';
import { WORKFLOWS } from '../../../pipeline/workflows.mjs';
import { tempDir } from '../../lib/temp.mjs';

const BRIEF_MD = `# 06: Status

## 1. ERCOT

Body text.

## Sources

- ERCOT 4CP page: https://ercot.example/4cp ; https://ercot.example/zip
- PUCT 58000 proposal: https://puct.example/58000.pdf
- PJM 5CP: https://pjm.example/5cp.pdf
- GA PSC release: https://psc.example/ga.pdf
`;

function repo(md = BRIEF_MD) {
  const root = tempDir('gridprims-rules-');
  mkdirSync(join(root, 'docs/research'), { recursive: true });
  mkdirSync(join(root, 'data/health'), { recursive: true });
  writeFileSync(join(root, BRIEF), md);
  return root;
}

/** A host serving each URL's body, or a status, or a redirect to another URL. */
const host = (pages) => async (url) => {
  const p = pages[url];
  if (p === undefined) return { ok: false, status: 404, url };
  if (typeof p === 'number') return { ok: p < 400, status: p, url, arrayBuffer: async () => new ArrayBuffer(0), headers: new Headers() };
  const body = typeof p === 'string' ? p : p.body;
  return { ok: true, status: 200, url: p.to ?? url, arrayBuffer: async () => new TextEncoder().encode(body).buffer, headers: new Headers({ 'content-type': p.type ?? 'text/html' }) };
};

test('the brief\'s own Sources list is what gets checked, one item per bullet', () => {
  const real = ruleSources(readFileSync(join(ROOT, BRIEF), 'utf8'));
  assert.ok(real.length >= 20, `${real.length} items`);
  assert.ok(real.flatMap((s) => s.urls).length >= 40);
  assert.ok(real.some((s) => s.item === 'PJM summer 2025 5CP'));
  assert.deepEqual(ruleSources(BRIEF_MD).map((s) => [s.item, s.urls.length]), [['ERCOT 4CP page', 2], ['PUCT 58000 proposal', 1], ['PJM 5CP', 1], ['GA PSC release', 1]]);
});

test('a change of markup alone is not a change; a change of words is', () => {
  const a = fingerprint(new TextEncoder().encode('<p>Comments close <b>2026-08-11</b>.</p>'), 'text/html');
  const b = fingerprint(new TextEncoder().encode('<div class="x">Comments   close 2026-08-11.</div><script>t=1</script>'), 'text/html');
  const c = fingerprint(new TextEncoder().encode('<p>Comments close 2026-09-30.</p>'), 'text/html');
  assert.equal(a, b);
  assert.notEqual(a, c);
});

test('the scheduled run seeds, then flags moved, dead, and changed sources, and writes a dated note each time', async () => {
  const root = repo();
  const pages = {
    'https://ercot.example/4cp': '<p>4CP intervals</p>', 'https://ercot.example/zip': { body: 'zip', type: 'application/zip' },
    'https://puct.example/58000.pdf': { body: 'proposal v1', type: 'application/pdf' }, 'https://pjm.example/5cp.pdf': { body: '5CP', type: 'application/pdf' },
    'https://psc.example/ga.pdf': 403,
  };
  const first = await runRuleWatch({ root, fetch: host(pages), now: () => '2026-11-16T08:19:00.000Z' });
  assert.match(first.note, /^- \*\*2026-11-16\.\*\* 5 sources for 4 items checked\./);
  assert.match(first.note, /1 refused an automated reader and keep their last reading: GA PSC release/);
  assert.match(first.note, /Nothing to reread\./);

  // A week later: PUCT's proposal text changed, PJM's PDF moved, and one ERCOT link died.
  pages['https://puct.example/58000.pdf'] = { body: 'proposal v2, adopted', type: 'application/pdf' };
  pages['https://pjm.example/5cp.pdf'] = { body: '5CP', type: 'application/pdf', to: 'https://pjm.example/archive/5cp.pdf' };
  delete pages['https://ercot.example/zip'];
  const second = await runRuleWatch({ root, fetch: host(pages), now: () => '2026-11-23T08:19:00.000Z' });
  assert.match(second.note, /1 item with a source that moved: PJM 5CP/);
  assert.match(second.note, /1 item with a source that no longer resolves: ERCOT 4CP page/);
  assert.match(second.note, /1 item with a source that changed since the last check: PUCT 58000 proposal/);
  assert.match(second.note, /Reread the flagged items before stating them at the next phase gate\./);

  const md = readFileSync(join(root, BRIEF), 'utf8');
  assert.equal(md.split(NOTES_HEADING).length, 2, 'the heading is written once');
  assert.ok(md.indexOf('**2026-11-16.**') < md.indexOf('**2026-11-23.**'), 'notes accumulate in date order');
  assert.ok(md.startsWith(BRIEF_MD), 'the brief itself is left as written');

  const seen = JSON.parse(readFileSync(join(root, SEEN), 'utf8'));
  assert.equal(seen['https://pjm.example/5cp.pdf'].finalUrl, 'https://pjm.example/archive/5cp.pdf');
  // A dead link keeps the fingerprint it last had, so its recovery is not mistaken for a change.
  assert.equal(seen['https://ercot.example/zip'].state, 'broken');
  assert.ok(seen['https://ercot.example/zip'].hash);

  const h = readHealth(root);
  assert.equal(h.runs[0].workflow, 'rule-watch');
  assert.match(h.runs[0].notes[0], /^5 sources for 4 items checked/);
  assert.ok(h.workflows.find((w) => w.id === 'rule-watch').lastSuccess);
});

test('the watch is a declared weekly workflow', () => {
  const w = WORKFLOWS.find((x) => x.id === 'rule-watch');
  assert.deepEqual([w.file, w.intervalHours, w.thresholdHours], ['rule-watch.yml', 168, 504]);
  assert.match(readFileSync(join(ROOT, '.github/workflows/rule-watch.yml'), 'utf8'), /node pipeline\/rule-watch\.mjs/);
});
