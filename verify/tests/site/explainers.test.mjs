// Learn explainers (add-learn-and-data-guides tasks 3.1 and 3.2): summaries
// first and short, sections short, every number generated from a registered
// dataset with its source or cited and dated, a "Try it" link that stays on the
// site, and a "Needs review" chip a year after the last review.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT } from '../../../pipeline/run.mjs';
import EXPLAINERS from '../../../data/curated/explainers/index.mjs';
import { checkExplainerRecords, checkExplainers } from '../../gates/explainers.mjs';
import { resolveExplainer } from '../../../site/entities/explainers.mjs';
import { explainerPage } from '../../../site/templates/explainer.mjs';
import { served } from '../../../site/entities/plants.mjs';
import { balancingPages } from '../../../site/entities/balancing.mjs';
import { utilityPages } from '../../../site/entities/utilities.mjs';
import { regionPages } from '../../../site/entities/regions.mjs';
import { carbonData } from '../../../site/entities/carbon.mjs';
import { sectionPage } from '../../../site/templates/pages.mjs';
import { TOOLS } from '../../../core/tools/index.mjs';
import { buildLedger } from '../../../core/lib/ledger.mjs';
import { ledgerDatasets } from '../../../site/entities/ledger.mjs';
import { createI18n } from '../../../site/lib/i18n.mjs';
import strings from '../../../site/strings/en-US.mjs';

const i18n = createI18n(strings, 'en-US');
const data = join(ROOT, 'data');
const ctx = {
  peaks: served(data, 'pudl-ferc714', 'annual_peaks'), balancing: balancingPages(data), utilities: utilityPages(data),
  ledger: buildLedger({ datasets: await ledgerDatasets(ROOT), generatedAt: '2026-11-14T00:00:00Z', contact: 'https://gridprims.com/report/' }),
  ercot4cp: JSON.parse(readFileSync(join(ROOT, 'data/curated/ercot-4cp.json'), 'utf8')),
  carbon: carbonData(data), egrid: served(data, 'egrid', 'subregions'), history: served(data, 'eia-861-history', 'sales'),
};
ctx.regions = regionPages(data, ctx.utilities.utilities);
const byId = (id) => EXPLAINERS.find((e) => e.id === id);
const render = (e) => String(explainerPage({ explainer: e, resolved: resolveExplainer(e, ctx), i18n }));
const text = (h) => h.replace(/<[^>]+>/g, ' ').replace(/&#39;/g, "'").replace(/&amp;/g, '&').replace(/\s+/g, ' ');

test('the committed explainers pass the gate, and each renders from the built data', async () => {
  assert.deepEqual(await checkExplainers(ROOT, '2026-11-14'), []);
  for (const e of EXPLAINERS) assert.match(render(e), new RegExp(`data-explainer="${e.id}"`));
});

test('data center scale: the utility\'s peak is Form 714\'s, with its source, and the request is labeled an example', () => {
  const html = text(render(byId('data-center-request')));
  const u = ctx.utilities.utilities.find((x) => x.id === 195);
  const peak = Math.round(u.peak.mw).toLocaleString('en-US');
  assert.match(html, new RegExp(`Alabama Power Co peaked at ${peak} MW in ${u.peak.year}\\.`));
  assert.match(html, new RegExp(`${peak}: FERC Form 714 annual peaks, via PUDL .*, data year ${u.peak.year}\\.`));
  assert.match(html, /300: an example value, not a real case/);
  assert.match(render(byId('data-center-request')), /<a class="button primary" href="\/utilities\/195\/" data-try-it>/);
});

test('a hand-typed number fails unless it is cited with a source and a date, or labeled an example', () => {
  const e = byId('public-data');
  const typed = { ...e, sections: [...e.sections, { heading: 'More', paragraphs: ['About 4,000 people read this each month.'] }] };
  assert.deepEqual(checkExplainerRecords([typed], '2026-11-14'), ['public-data: the number "4,000" is typed by hand; generate it from a dataset, or cite it with a source and a date']);
  const undated = { ...e, cited: [{ text: '30', source: 'our rule' }] };
  assert.match(checkExplainerRecords([undated], '2026-11-14').join('\n'), /the cited number "30" needs a source and a date/);
  // Names that hold digits are not numbers: Form 714, EIA-930, Order No. 2023.
  const named = { ...e, sections: [{ heading: 'Forms', paragraphs: ['FERC Form 714, EIA-930, and Order No. 2023 are named, not counted.'] }] };
  assert.deepEqual(checkExplainerRecords([named], '2026-11-14'), []);
});

test('a cited number older than 24 months is flagged for review in CI', () => {
  const e = { ...byId('public-data'), cited: [{ text: '30', source: 'gridprims\' lateness rule', date: '2024-11-13' }] };
  assert.deepEqual(checkExplainerRecords([e], '2026-11-14'), ['public-data: the cited number "30" (gridprims\' lateness rule) is from 2024-11-13, more than 24 months ago; review it']);
  assert.deepEqual(checkExplainerRecords([{ ...e, cited: [{ ...e.cited[0], date: '2024-11-14' }] }], '2026-11-14'), []);
});

test('year-old explainer: the "Needs review" chip is dated a year after the last review, and shows the date', () => {
  const html = render({ ...byId('public-data'), reviewed: '2025-11-13' });
  assert.match(html, /<span class="warning-chip" data-late-from="2026-11-13" hidden>Not updated in 12 months: last updated Nov 13, 2025<\/span>/);
  assert.match(text(html), /Last updated Nov 13, 2025\./);
});

test('summaries are short and plain, sections short, and "Try it" stays on the site', () => {
  const e = byId('balancing-authority');
  const long = { ...e, summary: 'One sentence. Two sentences. Three sentences. Four sentences.' };
  assert.match(checkExplainerRecords([long], '2026-11-14').join('\n'), /the summary has 4 sentences; at most 3/);
  const hard = { ...e, summary: 'Interconnection reliability considerations necessitate comprehensive operational coordination methodologies.' };
  assert.match(checkExplainerRecords([hard], '2026-11-14').join('\n'), /the summary reads at grade \d+\.\d; at most 8/);
  const wordy = { ...e, sections: [{ heading: 'Long', paragraphs: [Array(301).fill('word').join(' ')] }] };
  assert.match(checkExplainerRecords([wordy], '2026-11-14').join('\n'), /section "Long" has 301 words; at most 300/);
  const away = { ...e, tryIt: { href: '/tools/x/?utility=1', label: 'x' } };
  assert.match(checkExplainerRecords([away], '2026-11-14').join('\n'), /never a query string/);
});

test('coincident peaks: ERCOT\'s last four intervals come from its own files, and the proposed change is cited and dated', () => {
  const html = text(render(EXPLAINERS.find((e) => e.id === 'coincident-peaks')));
  const c = ctx.ercot4cp;
  const year = Math.max(...Object.keys(c.years).map(Number).filter((y) => c.years[y]?.intervals?.length === 4));
  assert.match(html, new RegExp(`For ${year}, ERCOT's four intervals ended at \\w{3} \\d+ \\d\\d:\\d\\d; `));
  assert.match(html, /Electric Reliability Council of Texas \(ERCOT\), NP9-83-M, as of/);
  assert.match(html, /30: PUCT Project 58000 proposal, as read for docs\/research\/06 §2, Oct 29, 2026/);
});

test('Learn index: all eleven explainers, the glossary, the data guides, and the program links are listed', () => {
  assert.equal(EXPLAINERS.length, 11);
  const html = String(sectionPage({ id: 'learn', tools: TOOLS, i18n }));
  for (const e of EXPLAINERS) assert.ok(html.includes(`href="/learn/${e.id}/"`), e.id);
  for (const p of ['/learn/glossary/', '/learn/get-your-data/', '/learn/links/']) assert.ok(html.includes(`href="${p}"`), p);
});

test('the national price in "Why is my bill so high?" is computed the way EIA\'s Table 2.10 is, and matches it', () => {
  const html = text(render(EXPLAINERS.find((e) => e.id === 'bill-high')));
  // EIA's published US residential averages: 13.66 cents in 2021 (Electric Power Annual, Table 2.10).
  assert.match(html, /up from 13\.66 cents in 2021\./);
  assert.match(html, /homes paid an average of \d+\.\d\d cents per kWh in 2025/);
});
