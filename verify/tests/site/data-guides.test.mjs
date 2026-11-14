// The get-your-data guides (add-learn-and-data-guides tasks 2.1, 2.2, 2.4,
// and 2.5): every guide has its level, date, and source; the schema allows
// only steps and notes as free text and rejects account numbers, street
// addresses, and screenshots; every format named has a fixture that parses;
// and a utility with no download gets the request letter and the totals tool.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { join } from 'node:path';
import { ROOT } from '../../../pipeline/run.mjs';
import GUIDES, { FORMATS, LEVELS } from '../../../data/curated/guides/index.mjs';
import { FIXTURES } from '../../fixtures/intake/make.mjs';
import { checkDataGuides, checkGuides } from '../../gates/data-guides.mjs';
import { getYourDataPage } from '../../../site/templates/pages.mjs';
import { createI18n } from '../../../site/lib/i18n.mjs';
import strings from '../../../site/strings/en-US.mjs';
import { fixtureRepo } from '../helpers.mjs';

const i18n = createI18n(strings, 'en-US');
const TODAY = '2026-11-14';
const check = (guides, formats = FORMATS, root = ROOT) => checkGuides(guides, formats, LEVELS, { root, today: TODAY, fixtures: FIXTURES });
const page = () => String(getYourDataPage({ i18n, guides: GUIDES, formats: FORMATS, hasPage: () => true }));
const text = (h) => h.replace(/<[^>]+>/g, ' ').replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/\s+/g, ' ');

test('the committed guides pass, and launch coverage is there: the 25 largest, Smart Meter Texas, and the co-op portals', async () => {
  assert.deepEqual(await checkDataGuides(ROOT, TODAY), []);
  const rows = new Set(GUIDES.map((g) => /§1a rows? (\d+)/.exec(g.source)?.[1]).filter(Boolean).map(Number));
  for (let n = 1; n <= 25; n++) assert.ok(rows.has(n), `row ${n} of the brief's top 25 has a guide`);
  for (const id of ['smart-meter-texas', 'smarthub', 'opower']) assert.ok(GUIDES.some((g) => g.id === id), id);
  for (const g of GUIDES) assert.ok(LEVELS.includes(g.level) && /^\d{4}-\d{2}-\d{2}$/.test(g.checked) && g.source, g.id);
});

test('account number in a step: the lint fails and names the field', () => {
  const [first, ...rest] = GUIDES;
  const bad = { ...first, computer: [...first.computer, 'Enter account 4471 2093 8812'] };
  assert.deepEqual(check([bad, ...rest]), [`${first.id}.computer[${first.computer.length}]: holds a run of 8 or more digits, which reads as an account number or meter id`]);
  const home = { ...first, notes: 'Mine is at 1234 West Oak Street.' };
  assert.match(check([home, ...rest]).join('\n'), new RegExp(`${first.id}\\.notes: holds what reads as a street address`));
  // Ordinary text passes: months, minutes, and a year.
  assert.deepEqual(check([{ ...first, notes: 'History: 24 months at 15 minutes, expected January 2027.' }, ...rest]), []);
});

test('screenshot in the guides folder, or a free-form field: the check fails and explains the text-only rule', () => {
  const root = fixtureRepo({ 'data/curated/guides/index.mjs': '', 'data/curated/guides/pge-step-2.png': Buffer.from([0x89, 0x50]), 'verify/reference/espi/openespi-test_usage_data.xml': '', 'verify/reference/espi/openespi-test_usage_data.expected.json': '', 'verify/fixtures/intake/files/pge-green-button.csv': '', 'verify/fixtures/intake/files/smart-meter-texas.csv': '' });
  assert.match(check(GUIDES, FORMATS, root).join('\n'), /data\/curated\/guides\/pge-step-2\.png: guides are text only; screenshots and downloaded files are never committed/);
  assert.match(check([{ ...GUIDES[0], screenshot: 'step.png' }]).join('\n'), /"screenshot" is not a guide field/);
});

test('new utility CSV named without a fixture: the build fails and asks for a synthetic fixture in that shape', () => {
  const ga = GUIDES.find((g) => g.id === 'georgia-power');
  const errors = check([{ ...ga, formats: ['georgia-power-hourly-xlsx'], choose: 'Georgia Power hourly export (XLSX)' }]);
  assert.deepEqual(errors, ['georgia-power: names the format "georgia-power-hourly-xlsx", which has no fixture; add a synthetic fixture in that shape to the intake library and to FORMATS']);
  // A fixture with no expected receipt does not count either.
  assert.match(check(GUIDES, { ...FORMATS, odd: { label: 'Odd', fixture: 'verify/fixtures/intake/make.mjs' } }).join('\n'), /format odd: fixture verify\/fixtures\/intake\/make\.mjs has no expected receipt/);
});

test('Smart Meter Texas: the Oncor guide explains the 15-minute report export and its two formats', () => {
  const html = text(page());
  const oncor = html.slice(html.indexOf('Oncor TX'), html.indexOf('Con Edison NY'));
  assert.match(oncor, /Open the report "Energy Data 15 Min Interval"/);
  assert.match(oncor, /Files offered Smart Meter Texas 15-minute CSV, Green Button XML/);
  assert.match(oncor, /Choose Smart Meter Texas 15-minute CSV/);
  assert.match(page(), /<a href="\/utilities\/44372\/">Utility page<\/a>/);
});

test('no download found: Duke Energy Carolinas says so as of the check date, and offers the request and the totals tool', () => {
  const html = page();
  const duke = html.slice(html.indexOf('id="duke-carolinas"'), html.indexOf('id="centerpoint"'));
  assert.match(duke, /No self-serve interval download was found as of Oct 29, 2026\./);
  assert.match(duke, /<a href="#ask">Ask for your data<\/a>/);
  assert.match(duke, /<a href="\/tools\/household\/bill-totals\/check\/">/);
  assert.doesNotMatch(duke, /Files offered/, 'no format is claimed where no download exists');
});

test('unverified and stale: a third-party guide shows the Unverified strip and asks for reports; every guide dates its review chip a year out', () => {
  const html = page();
  const fpl = html.slice(html.indexOf('id="fpl"'), html.indexOf('id="pge"'));
  assert.match(fpl, /<p class="strip" data-guide-level>Unverified: steps from a third-party guide, as of Oct 29, 2026\. If you see something different, please tell us\. <a href="\/report\/">Report what you see<\/a>/);
  const pge = html.slice(html.indexOf('id="pge"'), html.indexOf('id="sce"'));
  assert.match(pge, /Checked against the utility’s own help pages on Oct 29, 2026\./);
  assert.match(pge, /data-late-from="2027-10-29" hidden>Needs review: not checked in 12 months/);
});

test('the request letter asks for interval data, a format, and a date range, and leaves name and account number blank', () => {
  const letter = /<pre class="mono" data-request-letter>([\s\S]*?)<\/pre>/.exec(page())[1];
  assert.match(letter, /interval usage data for the last 24 months/);
  assert.match(letter, /as a Green Button file \(XML or CSV\), or as a CSV or Excel file/);
  assert.match(letter, /Name on the account: ____________/);
  assert.match(letter, /Account number: ____________/);
  assert.doesNotMatch(letter, /\d{6,}/);
});
