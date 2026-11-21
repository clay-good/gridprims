// The scorecard feeds the limits page and the validation levels (add-tariff-conformance-suite 3.7): the
// engine's standing comes from running the latest release; below 20 rates in 5 states the bill tools stay
// where they are and the limits page says how far the sample has reached; at the bar they rise to
// cross-checked in the same build, with the evidence linking the scorecard release.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { BAR, BILL_TOOLS, conformanceStatus } from '../../../core/contract/conformance.mjs';
import { limitsRecord } from '../../../core/contract/limits.mjs';
import { TOOLS } from '../../../core/tools/index.mjs';
import { readConformance, limitsInputs } from '../../../mcp/data.mjs';
import { limitsPage } from '../../../site/templates/pages.mjs';
import { createI18n } from '../../../site/lib/i18n.mjs';
import strings from '../../../site/strings/en-US.mjs';
import { ROOT } from '../../../pipeline/run.mjs';
import { committedVectors } from '../../../pipeline/lib/vector-releases.mjs';

const i18n = createI18n(strings, 'en-US');
const current = readConformance(`${ROOT}/data/curated/conformance`);
const bill = (L) => L.tools.find((x) => x.id === BILL_TOOLS[0]);
const declared = TOOLS.find(({ manifest: m }) => m.id === BILL_TOOLS[0]).manifest.validation.level;

test('the standing is computed by running the latest release: every rate counted, its states listed', () => {
  assert.equal(current.release, '2026.11.0');
  assert.equal(current.rates, 8);
  assert.deepEqual(current.states, ['LA']);
  assert.equal(current.missed, 0);
  assert.equal(current.met, false);
  assert.deepEqual(current.bar, { rates: 20, states: 5 });
  assert.equal(conformanceStatus(null, []), null);
});

test('a rate with any vector outside the margin does not count', () => {
  const vectors = committedVectors(ROOT).map((v) => structuredClone(v));
  const off = vectors.find((v) => v.id.endsWith('-1000kwh'));
  off.expected.total.amount += 5;
  off.tolerance.amount = 10;
  const s = conformanceStatus({ version: 'x', date: '2026-11-21' }, vectors);
  assert.equal(s.rates, current.rates - 1);
  assert.equal(s.missed, 1);
});

test('sample too small: the bill tools keep their level, and the limits page states the sample against the bar', () => {
  const small = { ...current, rates: 8, states: ['LA', 'FL'] };
  const L = limitsRecord({ tools: TOOLS, conformance: small });
  assert.equal(bill(L).validationLevel, declared);
  assert.ok(!bill(L).evidence.some((e) => e.kind === 'conformance'));
  const html = String(limitsPage({ limits: L, i18n }));
  assert.match(html, /our engine reproduces 8 regulator-published rates in 2 state\(s\) within 0\.5% of the bill or \$1\. The bill tools rise to cross-checked at 20 rates spanning 5 states, so their level stays where it is\./);
  assert.ok(html.includes('href="/data/ground-truth/scorecard/"'));
});

test('validation level raised: at 20 rates across 5 states the bill tools are cross-checked, the evidence linking the release', () => {
  const met = { ...current, rates: BAR.rates, states: ['FL', 'GA', 'LA', 'OH', 'PA'], met: true };
  const L = limitsRecord({ tools: TOOLS, conformance: met });
  assert.equal(bill(L).validationLevel, Math.max(2, declared));
  if (declared < 2) {
    assert.equal(bill(L).validationName, 'cross-checked');
    assert.match(bill(L).evidence.at(-1).summary, /20 regulator-published rates across 5 states .*2026\.11\.0, \/data\/ground-truth\/scorecard\//);
  }
  assert.match(String(limitsPage({ limits: L, i18n })), /past the bar of 20 rates spanning 5 states, so the bill tools are cross-checked/);
  for (const t of L.tools.filter((x) => !BILL_TOOLS.includes(x.id))) assert.ok(!t.evidence.some((e) => e.kind === 'conformance'), t.id);
});

test('the MCP limits resource carries the same standing as the page', () => {
  assert.deepEqual(limitsInputs().conformance, current);
});
