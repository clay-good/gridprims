// Sections, stable URLs, the 404, and the pseudo-locale (site-experience
// tasks 1.1, 1.2, 1.3, 2.2), Node side.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { build } from '../../../site/build.mjs';
import { checkUrls, pagesOf } from '../../gates/urls.mjs';
import { redirectFor, redirectsFile } from '../../../site/lib/redirects.mjs';
import { pseudoLocalize } from '../../../site/lib/i18n.mjs';
import { suggest } from '../../../site/pages/not-found.js';
import { tempDir } from '../../lib/temp.mjs';

const out = tempDir('gridprims-dist-');
await build({ outDir: out });
const page = (p) => readFileSync(join(out, p, 'index.html'), 'utf8');

test('every page carries the six sections, marking the current one', () => {
  for (const [p, current] of [['/', 'Home'], ['/files/', 'Bills'], ['/data/eia-861/', 'Data'], ['/tools/calc/energy-units/convert/', 'Grid'], ['/learn/', 'Learn']]) {
    const html = page(p);
    for (const s of ['Home', 'Bills', 'Data', 'Carbon', 'Grid', 'Learn']) assert.match(html, new RegExp(`>${s}</a></li>`), `${p} ${s}`);
    assert.match(html, new RegExp(`aria-current="page">${current}<`), p);
    assert.equal((html.match(/aria-current="page"/g) ?? []).length, 1, p);
  }
});

test('section pages list only what exists, never "coming soon"', () => {
  assert.match(page('/grid/'), /href="\/tools\/calc\/energy-units\/convert\/">Energy unit converter</);
  assert.match(page('/bills/'), /href="\/files\/">Read your meter file</);
  assert.match(page('/data/'), /href="\/data\/eia-861\/">Annual Electric Power Industry Report/);
  assert.match(page('/carbon/'), /Nothing in this section has shipped yet/);
  for (const p of pagesOf(out)) assert.doesNotMatch(page(p), /coming soon|line rating/i, p);
});

test('the URL record: a renamed utility without a redirect fails; with an id rule it passes', () => {
  const published = ['/', '/utility/14328-oncor/'];
  const pages = ['/', '/utility/14328-oncor-electric-delivery/'];
  assert.match(checkUrls({ pages, published: [...published, pages[1]], rules: [] })[0], /\/utility\/14328-oncor\/ was published and now neither resolves nor redirects/);
  const rules = [{ from: '/utility/14328-:slug/', to: '/utility/14328-oncor-electric-delivery/' }];
  assert.deepEqual(checkUrls({ pages, published: [...published, pages[1]], rules }), []);
  assert.equal(redirectFor('/utility/14328-txu/', rules).to, '/utility/14328-oncor-electric-delivery/');
  assert.equal(redirectsFile(rules), '/utility/14328-:slug/ /utility/14328-oncor-electric-delivery/ 301\n');
});

test('the redirect budget fails at 1,501 rules, naming the count and the largest groups', () => {
  const rules = Array.from({ length: 1501 }, (_, i) => ({ from: `/plant/${i}-:slug/`, to: `/plant/${i}-x/` }));
  const errors = checkUrls({ pages: rules.map((r) => r.to), published: rules.map((r) => r.to), rules });
  assert.match(errors.join('\n'), /1501 redirect rules, over the budget of 1500; largest groups: \/plant\/ 1501/);
});

test('a new page not yet recorded is named', () => {
  assert.match(checkUrls({ pages: ['/', '/new/'], published: ['/'], rules: [] })[0], /1 new pages are not in data\/curated\/published-urls\.json \(\/new\/\)/);
});

test('404 suggestions are computed from the path on the device, best match first', async () => {
  const index = JSON.parse(readFileSync(join(out, 'command-index.json'), 'utf8'));
  assert.equal(suggest('/tools/calc/energy-unit/conver/', index)[0].id, 'calc.energy-units.convert');
  assert.deepEqual(suggest('/zzzz/', index), []);
  const html = readFileSync(join(out, '404.html'), 'utf8');
  assert.match(html, /<h2>Sections<\/h2>/, 'without script it lists the sections');
  assert.match(html, /<h2>Every tool<\/h2>[\s\S]*Energy unit converter/);
});

test('pseudo-locale: accented, about 35% longer, placeholders kept', () => {
  const s = 'Your peak was {kw} kW on {when}.';
  const p = pseudoLocalize(s);
  assert.match(p, /\{kw\}.*\{when\}/);
  assert.match(p, /Yöür péák/);
  assert.ok(p.length >= s.length * 1.3, `${p.length} vs ${s.length}`);
});
