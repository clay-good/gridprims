// Nothing is reachable only by its address (site/home-and-navigation, "Growth
// replaces, it does not accumulate"): every page family we build is linked
// from a section page, the catalog, or the footer, so a visitor who starts at
// the home page can reach it. The home page itself stays free of tool cells.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { PAGE_CELLS } from '../../../site/ui/home-lanes.mjs';
import { sharedSite } from '../../lib/shared-site.mjs';

const out = await sharedSite();
const page = (p) => readFileSync(join(out, p, 'index.html'), 'utf8');
const SECTIONS = ['bills', 'data', 'carbon', 'grid', 'learn'];
/** One page of each family a visitor should be able to reach from a section. */
const FAMILIES = ['/scenario/', '/large-load/terms/', '/learn/glossary/', '/ledger/', '/ledger/checks/', '/states/', '/queue/'];

test('every page family is linked from a section page or the catalog', () => {
  const linked = new Set();
  for (const s of [...SECTIONS, 'tools']) for (const m of page(s).matchAll(/href="(\/[^"#]*\/)"/g)) linked.add(m[1]);
  const orphans = FAMILIES.filter((f) => !linked.has(f));
  assert.deepEqual(orphans, [], `reachable only by address: ${orphans.join(', ')}`);
});

test('a page cell appears only once its page exists', () => {
  const grid = page('grid');
  for (const c of PAGE_CELLS.grid) assert.ok(grid.includes(`href="${c.path}"`), c.path);
  const cells = [...page('grid').matchAll(/class="tool-cell"/g)].length;
  assert.ok(cells >= PAGE_CELLS.grid.length, `${cells} cells on /grid/`);
  // A cell whose page is missing is left out rather than linking nowhere.
  assert.doesNotMatch(grid, /href="\/scenario\/"[^>]*>\s*<\/a>/);
});

test('the home page still carries no tool cells, and reaches breadth through one link', () => {
  const home = page('.');
  assert.doesNotMatch(home, /class="tool-cell"/);
  assert.match(home, /href="\/tools\/"/);
});
