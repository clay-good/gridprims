// The limits page and record (site-experience tasks 5.1, 5.2).

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, cpSync } from 'node:fs';
import { join } from 'node:path';
import { limitsRecord, FRESH_RUN_DAYS } from '../../../core/contract/limits.mjs';
import { cannotDo, claims } from '../../../core/contract/limits-inputs.mjs';
import { limitsPage } from '../../../site/templates/pages.mjs';
import { createI18n } from '../../../site/lib/i18n.mjs';
import strings from '../../../site/strings/en-US.mjs';
import { TOOLS } from '../../../core/tools/index.mjs';
import { build } from '../../../site/build.mjs';
import { createServer } from '../../../mcp/protocol.mjs';
import { checkClaims } from '../../gates/claims.mjs';
import { ROOT } from '../../../pipeline/run.mjs';
import { tempDir } from '../../lib/temp.mjs';

const i18n = createI18n(strings, 'en-US');
const NOW = Date.parse('2026-10-31T00:00:00Z');
const record = (o = {}) => limitsRecord({ tools: TOOLS, cannotDo, claims, now: NOW, ...o });
const page = (L, health) => String(limitsPage({ limits: L, i18n, health }));

test('the cannot-do list carries every minimum entry with a reason and sources', () => {
  const ids = cannotDo.map((c) => c.id);
  for (const id of ['circuit-model', 'nodal-prices', 'adequacy', 'interconnection-verdict', 'professional-advice', 'real-time', 'forecasts', 'protected-infrastructure', 'feeder-or-address']) assert.ok(ids.includes(id), id);
  for (const c of cannotDo) assert.ok(c.reason && c.sources.length, c.id);
  const adequacy = cannotDo.find((c) => c.id === 'adequacy');
  assert.match(adequacy.reason, /confidential.*2010 vintage.*forbids redistribution/);
  assert.equal(adequacy.verified, false, 'an absence we could not fully confirm says so');
});

test('launch reality: no tool is field-verified, the page says so, and gives the counts at each level', () => {
  const L = record();
  assert.equal(L.counts['field-verified'], 0);
  const html = page(L);
  assert.match(html, /No tool here is field-verified/);
  assert.match(html, /Tools by how well checked they are: Unvalidated 0, Self-checked 13, Cross-checked 9, Field-verified 0\./);
});

test('the three axes are separate columns, and a cross-checked tool with no sign-off reads "Review pending"', () => {
  const html = page(record());
  assert.match(html, /<th scope="col">Stability<\/th><th scope="col">Validation level<\/th><th scope="col">Practitioner review<\/th>/);
  assert.match(html, /<td>Stable<\/td>\s*<td>2 · Cross-checked<\/td>\s*<td>Review pending<\/td>/);
  assert.match(html, /One does not imply another\./);
});

test('stale evidence: a pass older than 90 days shows the date with a "needs a fresh run" chip', () => {
  const old = new Date(NOW - (FRESH_RUN_DAYS + 1) * 86_400_000).toISOString();
  const L = record({ health: { tools: [{ id: 'calc.energy-units.convert', evidencePassed: old }] } });
  assert.equal(L.tools[0].needsFreshRun, true);
  assert.match(page(L), /last passed Aug 1, 2026<\/span> <span class="warning-chip">needs a fresh run/);
  const fresh = record({ health: { tools: TOOLS.map(({ manifest }) => ({ id: manifest.id, evidencePassed: '2026-10-30T09:20:00Z' })) } });
  assert.doesNotMatch(page(fresh), /needs a fresh run/);
});

test('what would raise each tool\'s level is stated', () => {
  assert.match(page(record()), /would raise it to field-verified/);
});

test('phase 0 page with no tools says the table is empty until the first ships', () => {
  assert.match(page(limitsRecord({ tools: [], cannotDo, claims, now: NOW })), /No tool has shipped yet/);
});

test('sections not yet populated say so and name what will populate them', () => {
  const html = page(record());
  assert.match(html, /Not yet populated:<\/strong> The corrections log is not yet populated; add-trust-and-continuity fills it\./);
  assert.match(html, /Not yet populated:<\/strong> The tariff conformance suite will list the charge types its reference engines cannot check\./);
});

test('a late dataset and a stalled automation are listed with their dates', () => {
  const datasets = [{ dataset: 'egrid', title: 'eGRID', asOf: '2024-01-30', cadence: { every: 'annual' } }];
  const health = { workflows: [{ id: 'refresh-data', lastSuccess: '2026-10-01T09:17:00Z', thresholdHours: 72 }], datasets: [] };
  const L = record({ datasets, health });
  assert.equal(L.problems.lateDatasets[0].id, 'egrid');
  assert.match(page(L, { workflows: [], datasets: [] }), /eGRID was due Jan 30, 2025 \(judged from its usual schedule\); 639 days late\./);
  assert.deepEqual(L.problems.automation.stalled.map((w) => w.id), ['refresh-data']);
});

test('the unverified-claim register is listed, and a manifest citing a claim with no entry fails the build', async () => {
  assert.match(page(record()), /id="claim-smart-meter-texas-columns"/);
  assert.deepEqual(await checkClaims(ROOT), []);
  const root = tempDir('gridprims-claims-');
  cpSync(join(ROOT, 'site'), join(root, 'site'), { recursive: true });
  cpSync(join(ROOT, 'core'), join(root, 'core'), { recursive: true });
  cpSync(join(ROOT, 'parsers'), join(root, 'parsers'), { recursive: true });
  cpSync(join(ROOT, 'data/curated'), join(root, 'data/curated'), { recursive: true });
  const mp = join(root, 'core/tools/calc.energy-units.convert/manifest.mjs');
  writeFileSync(mp, readFileSync(mp, 'utf8').replace("  toRaise:", "  claims: ['made-up-claim'],\n  toRaise:"));
  assert.match((await checkClaims(root)).join('\n'), /calc\.energy-units\.convert claims: "made-up-claim" has no entry/);
});

test('the page, its JSON, and the agent resource are one record', async () => {
  const out = tempDir('gridprims-dist-');
  await build({ outDir: out });
  const json = JSON.parse(readFileSync(join(out, 'limits/limits.json'), 'utf8'));
  const res = await createServer().handle({ jsonrpc: '2.0', id: 1, method: 'resources/read', params: { uri: 'gridprims://limits', _meta: { 'io.modelcontextprotocol/protocolVersion': '2026-07-28', 'io.modelcontextprotocol/clientCapabilities': {} } } });
  const agent = JSON.parse(res.result.contents[0].text);
  assert.deepEqual(agent.cannotDo, json.cannotDo);
  assert.deepEqual(agent.tools.map((x) => [x.id, x.validationLevel]), json.tools.map((x) => [x.id, x.validationLevel]));
  assert.deepEqual(agent.unverifiedClaims, json.unverifiedClaims);
});
