// The home page, catalog, and simplicity budget (site experience tasks 3.1
// to 3.3).

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { LANES, checkSimplicity } from '../../../site/ui/home-lanes.mjs';
import { PARKED, SECTIONS } from '../../../site/ui/sections.mjs';
import { TOOLS } from '../../../core/tools/index.mjs';
import { validateManifest } from '../../../core/contract/manifest.mjs';
import { walk } from '../../lib/walk.mjs';
import { sharedSite } from '../../lib/shared-site.mjs';

const out = await sharedSite();
const read = (p) => readFileSync(join(out, p), 'utf8');
const main = (h) => h.slice(h.indexOf('<main'), h.indexOf('</main>'));

test('without JavaScript the home page is the siting read-out: the question, its inputs, and its limits', () => {
  const html = read('index.html');
  const body = main(html);
  assert.match(body, /<h1 id="siting-title" class="home-title">Where can new load or generation connect, and how long will it take\?<\/h1>/);
  // The place and the size are both in the served HTML, with one action.
  assert.match(body, /<input id="siting-zip" name="zip"/);
  assert.match(body, /<input id="siting-mw" name="mw"/);
  assert.match(body, /<option value="generation">New generation<\/option>/);
  const primary = [...body.matchAll(/class="button primary"[^>]*>([^<]+)</g)].map((m) => m[1]);
  assert.deepEqual(primary, ['Show me']);
  // The resolution limit is on the page itself, not only on the limits page.
  assert.match(body, /Critical Energy\/Electric Infrastructure Information/);
  assert.match(body, /ask the serving utility for its hosting-capacity map/);
  // Scripting off still says what the read-out needs.
  assert.match(body, /<noscript><p class="panel">This read-out needs JavaScript/);
  // Nothing else competes for the first screen: no tool cells, no dropzone, no worked sample.
  assert.doesNotMatch(body, /class="tool-cell"/);
  assert.doesNotMatch(body, /data-home-file|class="dropzone"/);
  assert.doesNotMatch(body, /Basis · sample-office-15min\.csv/);
  // Breadth is the one centred search bar; the catalog is a footer card.
  assert.match(body, /<section class="home-search command" role="search"/);
  assert.match(body, /id="command-input"/);
  // The workbench stays reachable, just not from the first screen.
  assert.ok(read('files/index.html').includes('<h1>What your meter file says</h1>'));
  assert.ok(read('tools/index.html').includes('href="/files/"'));
});

test('tools that are not built appear nowhere, not even as "coming soon"', () => {
  const built = new Set(TOOLS.map((x) => x.manifest.id));
  const unbuilt = [...LANES.home, ...LANES.work].filter((c) => c.tool && !built.has(c.tool));
  assert.ok(unbuilt.length > 0, 'the spec names tools still to come');
  for (const f of walk(out).filter((x) => x.endsWith('.html') && !/^(plants|utilities)\//.test(x))) {
    const h = read(f);
    for (const c of unbuilt) assert.ok(!h.includes(`/tools/${c.tool.replace(/\./g, '/')}`), `${f} links unbuilt ${c.tool}`);
    assert.doesNotMatch(h, /coming soon/i, f);
  }
});

test('the catalog lists every published tool but the parked ones, with what each needs, and filters on the device', () => {
  const html = read('tools/index.html');
  for (const { manifest: m } of TOOLS) assert.equal(html.includes(`href="/tools/${m.id.replace(/\./g, '/')}/"`), !PARKED.has(m.id), m.id);
  // A parked tool still publishes; it is only off the catalog.
  for (const id of PARKED) assert.ok(read(`tools/${id.replace(/\./g, '/')}/index.html`), id);
  assert.match(html, /data-needs="zip"[\s\S]*Find my utility|Find my utility[\s\S]*data-needs/);
  assert.match(html, /<select name="needs" data-filter="needs">[\s\S]*<option value="bill">bill totals<\/option>/);
  assert.match(html, /<script type="module" src="\/site\/pages\/catalog\.js">/);
  // The bill check and the usage benchmark need bill totals, as their home-lane cells say.
  assert.equal([...html.matchAll(/data-needs="bill"/g)].length, 2);
  assert.match(html, /<p data-catalog-empty hidden>No published tool matches these filters\.<\/p>/);
});

test('the simplicity budget: six sections, five cells a lane, five first-screen inputs; a new tool replaces a cell', () => {
  assert.deepEqual(checkSimplicity(SECTIONS), []);
  assert.match(checkSimplicity([...SECTIONS, { id: 'more', path: '/more/' }])[0], /7 sections in the top rail, at most 6/);
  const promoted = { ...LANES, home: [...LANES.home, { id: 'new-tool', tool: 'bills.new', needs: 'none' }] };
  assert.match(checkSimplicity(SECTIONS, promoted)[0], /the home lane has 6 cells, at most 5; replace one instead of adding/);
  const replaced = { ...LANES, home: [...LANES.home.slice(0, 4), { id: 'new-tool', tool: 'bills.new', needs: 'none' }] };
  assert.deepEqual(checkSimplicity(SECTIONS, replaced), []);
  const [{ manifest }] = TOOLS;
  assert.deepEqual(validateManifest(manifest), []);
  assert.match(validateManifest({ ...manifest, firstScreen: undefined }).join('\n'), /firstScreen must list the inputs shown on the first screen/);
});

test('nothing interrupts arrival: no open dialog, visible overlay, banner, tour, or consent notice on any page', () => {
  for (const f of walk(out).filter((x) => x.endsWith('.html') && !/^(plants|utilities)\//.test(x))) {
    const h = read(f);
    assert.doesNotMatch(h, /<dialog[^>]*\sopen[\s>]/, f);
    // An overlay that starts hidden (the workbench's drag target) appears only when asked for, so it does not interrupt.
    const shown = [...h.matchAll(/<[^>]*class="[^"]*\b(modal|overlay|banner|tour|interstitial)\b[^"]*"[^>]*>/g)].map((m) => m[0]).filter((tag) => !/\shidden[\s>]/.test(tag));
    assert.deepEqual(shown, [], f);
    assert.doesNotMatch(h, /cookie (consent|banner|notice)|accept (all )?cookies/i, f);
  }
});

test('every plant page is linked from a state page', () => {
  const states = walk(out).filter((f) => /^states\/[a-z]{2}\/index\.html$/.test(f)).map(read).join('');
  const linked = new Set([...states.matchAll(/href="\/plants\/(\d+)\/"/g)].map((m) => m[1]));
  const plants = walk(out).filter((f) => /^plants\/\d+\/index\.html$/.test(f)).map((f) => f.split('/')[1]);
  assert.deepEqual(plants.filter((p) => !linked.has(p)), []);
  assert.match(read('states/index.html'), /href="\/states\/tx\/">Texas<\/a>/);
});
