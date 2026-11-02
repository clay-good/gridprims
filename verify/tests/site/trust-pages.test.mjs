// The trust page set (site-experience tasks 6.1, 6.2).

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { methodsPage } from '../../../site/templates/pages.mjs';
import { TRUST_PAGES, FOOTER_PAGES, FOOTER_CARDS } from '../../../site/templates/layout.mjs';
import { createI18n } from '../../../site/lib/i18n.mjs';
import strings from '../../../site/strings/en-US.mjs';
import { TOOLS } from '../../../core/tools/index.mjs';
import { pagesOf } from '../../gates/urls.mjs';
import { ROOT } from '../../../pipeline/run.mjs';
import { fleschKincaid } from '../../../core/lib/readability.mjs';
import { sharedSite } from '../../lib/shared-site.mjs';

const out = await sharedSite();
const page = (p) => readFileSync(join(out, p, 'index.html'), 'utf8');

test('every page\'s footer is the four cards and the report path, and links nothing outside gridprims but the source and the maintainer', () => {
  const about = page('/about/');
  // The trust set stays one click away, from the card that names it.
  for (const [, href] of FOOTER_PAGES) assert.ok(about.includes(`href="${href}"`), `/about/ lacks ${href}`);
  for (const p of pagesOf(out)) {
    const html = page(p);
    for (const [, href] of FOOTER_CARDS) assert.ok(html.includes(`href="${href}"`), `${p} lacks the card for ${href}`);
    // Reporting a problem is how a tool earns its validation level, so it stays on every page.
    assert.match(html, /<a href="\/report\/" data-report>/, `${p} lacks the report path`);
    // The footer is about gridprims alone; a handoff elsewhere on the page is a different thing.
    const footer = html.slice(html.indexOf('<footer'));
    for (const d of ['sophiewell.com', 'geoprims.com', 'roughlogic.com', 'enklayve.com', 'vaulytica.com', 'encryptalotta.com']) assert.ok(!footer.includes(d), `${p}'s footer still links ${d}`);
    // The only outbound links are the source repository and the maintainer's own site.
    const outbound = [...footer.matchAll(/href="(https?:\/\/[^"]+)"/g)].map((m) => new URL(m[1]).host);
    assert.deepEqual([...new Set(outbound)].sort(), ['claygood.com', 'github.com'], p);
  }
  for (const [id, href] of TRUST_PAGES) if (id !== 'report') assert.ok(pagesOf(out).includes(href), `${href} is not built`);
});

test('the terms say: as is, screening only, your decision, no liability, publishers\' data, and how to report, in plain short sentences', () => {
  const html = page('/terms/');
  for (const re of [/provided as is, with no warranty of any kind/, /not engineering, legal, tax, financial, or safety advice/, /not a utility study, a bill, or a utility’s decision/, /You are responsible for the decisions/, /we accept no liability/, /Data belongs to its publishers/, /never a reason to publish a number we cannot support/, /href="\/limits\/#cannot"/, /report form/]) assert.match(html, re);
  for (const k of ['terms.free', 'terms.screening', 'terms.yours', 'terms.liability', 'terms.data', 'terms.care']) {
    assert.ok(fleschKincaid(strings[k]).grade <= 12, `${k} reads at grade ${fleschKincaid(strings[k]).grade.toFixed(1)}`);
  }
});

test('About names the maintainer and the funding, lists planned costs honestly, and invents no users or endorsements', () => {
  const html = page('/about/');
  assert.match(html, /built and run by Clay Good/);
  assert.match(html, /no advertising, sponsorship, affiliate fees, or payments for leads, and has no funders/);
  assert.match(html, /hosting costs nothing, so the only bill is the domain.*\$5-a-month paid plan/s);
  assert.doesNotMatch(html, /trusted by|used by \d|partners include/i);
});

test('the methods page shows each worked example with its source, tolerance, and last CI result', () => {
  const i18n = createI18n(strings, 'en-US');
  const { manifest } = TOOLS[0];
  const html = String(methodsPage({ manifest, i18n, passed: '2026-11-02T09:20:00Z' }));
  assert.match(html, /12 MWh to MMBtu<\/th><td>calc\/energy-units-and-emissions spec[^<]*<\/td><td class="mono">±0\.0001<\/td><td>Passed on Nov 2, 2026<\/td>/);
  assert.match(String(methodsPage({ manifest, i18n, passed: null })), /Not yet run in CI/);
});

test('the license page gives copyable citations for a page, a result, and a dataset version', () => {
  const html = page('/license/');
  assert.match(html, /MIT/);
  assert.match(html, /CC BY 4\.0/);
  assert.match(html, /Limits\. gridprims\. https:\/\/gridprims\.com\/limits\/ \(accessed \d{4}-\d{2}-\d{2}\)\./);
  assert.match(html, /&quot;12 MWh is 40\.95 MMBtu\.&quot; Energy unit converter, version \d+\.\d+\.\d+\. gridprims\./);
  // The data citation uses one served dataset: whichever it is, it reads "<title>, version <v> (as of <date>). <credit>".
  const served = readdirSync(join(ROOT, 'data')).filter((id) => existsSync(join(ROOT, 'data', id, 'current.json'))).map((id) => {
    const { version } = JSON.parse(readFileSync(join(ROOT, 'data', id, 'current.json'), 'utf8'));
    return JSON.parse(readFileSync(join(ROOT, 'data', id, version, 'manifest.json'), 'utf8'));
  });
  const esc = (x) => x.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
  assert.ok(served.some((m) => html.includes(esc(`${m.title}, version ${m.version} (as of ${m.asOf}). ${m.attribution}`))), 'a served dataset is cited with its version, as-of date, and credit');
});

test('review status comes only from records: every tool reads "Review pending" and the strip says so', () => {
  assert.match(page('/review-status/'), /Energy unit converter<\/a><\/th><td>Review pending<\/td>/);
  assert.match(page('/tools/calc/energy-units/convert/'), /data-strip>[\s\S]*Review pending/);
});

test('sources credit every publisher; continuity gives the revival steps and upstreams; corrections and accessibility say what they must', () => {
  assert.match(page('/sources/'), /U\.S\. Energy Information Administration: Annual Electric Power Industry Report[\s\S]*NIST Special Publication 811/);
  assert.match(page('/continuity/'), /Install Node\.js 24\.12\.0 or later[\s\S]*https:\/\/www\.eia\.gov\/electricity\/data\/eia861\/zip\/f8612025\.zip/);
  assert.match(page('/corrections/'), /a note of concern[\s\S]*a withdrawal[\s\S]*No corrections yet\./);
  assert.match(page('/accessibility/'), /WCAG 2\.2 at level AA[\s\S]*Known issues[\s\S]*Glossary pop-ups/);
});
