// The program links index (add-program-fact-pages tasks 1.1 to 1.3): every
// entry carries its facts, the index covers every outside handoff, no URL
// tracks a click, the page groups entries by question with a "needs review"
// chip a year after each check, and the weekly link check reads them all.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { TOOLS } from '../../../core/tools/index.mjs';
import LINKS, { QUESTIONS } from '../../../data/curated/program-links.mjs';
import { checkLinks, checkProgramLinks } from '../../gates/program-links.mjs';
import { outboundLinks } from '../../../pipeline/link-check.mjs';
import { programLinksPage, reviewFrom } from '../../../site/templates/program-links.mjs';
import { createI18n } from '../../../site/lib/i18n.mjs';
import strings from '../../../site/strings/en-US.mjs';
import { ROOT } from '../../../pipeline/run.mjs';

const i18n = createI18n(strings, 'en-US');
const TODAY = '2026-11-14';

test('the committed index passes: every entry has its facts, and every outside handoff is listed', async () => {
  assert.deepEqual(await checkProgramLinks(ROOT, TODAY), []);
});

test('an entry missing who maintains it, or why we link, fails the check by name', () => {
  const [first, ...rest] = LINKS;
  const { maintainer, ...noMaintainer } = first;
  const { why, ...noWhy } = rest[0];
  const errors = checkLinks([noMaintainer, noWhy, ...rest.slice(1)], QUESTIONS, TOOLS, TODAY);
  assert.ok(errors.includes(`${first.id}: missing maintainer`), errors.join('\n'));
  assert.ok(errors.includes(`${rest[0].id}: missing why`));
});

test('a referral or tracking parameter fails, and so does a cost, question, or date we do not recognize', () => {
  const bad = { ...LINKS[0], id: 'x', url: 'https://example.org/tool?utm_source=gridprims&ref=gp&page=2', cost: 'cheap', question: 'shopping', lastChecked: '2027-01-01' };
  const errors = checkLinks([...LINKS, bad], QUESTIONS, TOOLS, TODAY).join('\n');
  assert.match(errors, /x: url carries the tracking parameter "utm_source"/);
  assert.match(errors, /x: url carries the tracking parameter "ref"/);
  assert.doesNotMatch(errors, /"page"/, 'an ordinary parameter is fine');
  assert.match(errors, /x: cost "cheap" is not one of free, free with an account, paid/);
  assert.match(errors, /x: question "shopping" is not one of/);
  assert.match(errors, /x: lastChecked "2027-01-01" is not a date on or before 2026-11-14/);
  for (const l of LINKS) assert.equal([...new URL(l.url).searchParams.keys()].length, 0, `${l.id} carries no parameters at all`);
});

test('completeness: dropping an entry a tool hands off to fails, naming the tool and the target', () => {
  const errors = checkLinks(LINKS.filter((l) => l.id !== 'reopt'), QUESTIONS, TOOLS, TODAY);
  assert.deepEqual(errors, ['electrify.backup-power.size: hands off to https://reopt.nlr.gov/tool, which the program links index does not list']);
});

test('launch coverage: the minimum list in the spec is all there', () => {
  for (const id of ['reopt', 'interconnection-fyi', 'gridstatus', 'eia-gridmonitor', 'pudl', 'urdb', 'hosting-capacity-atlas', 'dsire', 'afdc-fuel-prices', 'state-commissions', 'roughlogic']) {
    assert.ok(LINKS.some((l) => l.id === id), id);
  }
});

test('the page groups entries by question, shows each one\'s facts, and dates its "needs review" chip a year out', () => {
  const html = String(programLinksPage({ links: LINKS, questions: QUESTIONS, i18n }));
  assert.equal((html.match(/data-link-entry=/g) ?? []).length, LINKS.length);
  assert.ok(html.indexOf('Where can I connect, and what is already queued?') < html.indexOf('How should I size solar, storage, or a backup system?'));
  assert.match(html, /<span class="warning-chip" data-late-from="2027-11-14" hidden>Needs review: not checked in 12 months<\/span>/);
  assert.match(html, /We do not rank paid products, and no link carries a referral or tracking code\./);
  // The hosting capacity scenario: the atlas, who keeps it, and its own dates.
  assert.match(html, /Atlas of Electric Distribution System Hosting Capacity Maps<\/a>[\s\S]*U\.S\. Department of Energy[\s\S]*58 utilities and state agencies with maps in 26 states as of May 2024/);
  assert.match(html, /Checked Nov 14, 2026 in a browser; the site refuses automated checks\./);
  assert.equal(reviewFrom('2024-02-29'), '2025-03-01');
});

test('the weekly link check reads every entry and names where it is linked', async () => {
  const links = await outboundLinks(ROOT);
  for (const l of LINKS) assert.ok((links.get(l.url) ?? []).some((u) => u === `program links: ${l.name} (/learn/links/#${l.id})`), l.id);
});
