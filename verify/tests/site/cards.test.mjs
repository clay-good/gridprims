// Static social cards (site experience task 4.4): one 1200 x 630 PNG of at
// most 100 KB per section, committed with its SVG source, referenced by
// every page of the section, and no share buttons or widgets.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT } from '../../../pipeline/run.mjs';
import { CARDS } from '../../../site/templates/layout.mjs';
import { cardSvg } from '../../tools/social-cards.mjs';
import strings from '../../../site/strings/en-US.mjs';
import { walk } from '../../lib/walk.mjs';
import { sharedSite } from '../../lib/shared-site.mjs';

const out = await sharedSite();
const read = (p) => readFileSync(join(out, p), 'utf8');

test('each section card is a 1200 x 630 PNG of at most 100 KB, beside its SVG source', () => {
  for (const id of CARDS) {
    const png = readFileSync(join(ROOT, 'site/cards', `${id}.png`));
    assert.deepEqual([...png.subarray(1, 4)].map((c) => String.fromCharCode(c)).join(''), 'PNG', id);
    assert.deepEqual([png.readUInt32BE(16), png.readUInt32BE(20)], [1200, 630], id);
    assert.ok(png.length <= 100 * 1024, `${id} is ${png.length} bytes`);
    const title = id === 'home' ? strings['site.tagline'] : strings[`section.${id}`];
    assert.equal(readFileSync(join(ROOT, 'site/cards', `${id}.svg`), 'utf8'), cardSvg(id, title), `${id}.svg is current; run node verify/tools/social-cards.mjs`);
  }
});

test('pages name their section\'s card; a shared utility page shows its own title and the Data card', () => {
  const card = (p) => read(p).match(/<meta property="og:image" content="([^"]+)">/)?.[1];
  assert.equal(card('index.html'), 'https://gridprims.com/site/cards/home.png');
  assert.equal(card('bills/index.html'), 'https://gridprims.com/site/cards/bills.png');
  assert.equal(card('tools/calc/energy-units/convert/index.html'), 'https://gridprims.com/site/cards/grid.png');
  const utility = read('utilities/195/index.html');
  assert.equal(card('utilities/195/index.html'), 'https://gridprims.com/site/cards/data.png');
  assert.match(utility, /<meta property="og:title" content="Alabama Power Co · gridprims">/);
  assert.match(utility, /<meta name="twitter:card" content="summary_large_image">/);
  for (const id of CARDS) assert.ok(walk(out).includes(`site/cards/${id}.png`), `${id}.png is deployed`);
});

test('no share buttons or third-party widgets', () => {
  for (const f of walk(out).filter((x) => x.endsWith('.html') && !/^(plants|utilities)\//.test(x))) {
    assert.doesNotMatch(read(f), /addthis|sharethis|platform\.twitter\.com|connect\.facebook\.net|share-button/i, f);
  }
});
