// The hosting-capacity directory (add-interconnection-screens 5.3 and 5.4; interconnect/feeder-data-paths):
// every entry says whether a map exists, whether it downloads, whether it publishes minimum load, what its terms
// say, and when it was checked; the minimum-load entries say how to find a feeder's figure and hold none; the
// atlas is linked with its date and condition; the three limits come before any link; a stale entry carries the
// chip; and nothing on the page or in the data is a value from a map.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import ENTRIES, { ACCESS, ATLAS } from '../../../data/curated/hosting-capacity.mjs';
import { hostingCapacityPage } from '../../../site/templates/hosting-capacity.mjs';
import { reviewFrom } from '../../../site/templates/program-links.mjs';
import { outboundLinks } from '../../../pipeline/link-check.mjs';
import { createI18n } from '../../../site/lib/i18n.mjs';
import strings from '../../../site/strings/en-US.mjs';
import { ROOT } from '../../../pipeline/run.mjs';

const i18n = createI18n(strings, 'en-US');
const page = (entries = ENTRIES) => String(hostingCapacityPage({ entries, atlas: ATLAS, i18n }));
const main = (html) => html.slice(html.indexOf('<main'));

test('every entry records access, reuse terms, minimum load, and its check date; a map that exists is linked', () => {
  for (const e of ENTRIES) {
    assert.ok(ACCESS.includes(e.access), e.id);
    assert.match(e.lastChecked, /^\d{4}-\d{2}-\d{2}$/);
    if (!['none', 'not-found'].includes(e.access)) {
      assert.match(e.url ?? '', /^https:\/\//, `${e.id}: a map that exists is linked`);
      assert.ok(e.reuse, `${e.id}: what the terms say`);
    }
  }
  assert.equal(new Set(ENTRIES.map((e) => e.id)).size, ENTRIES.length);
});

test('utility publishes minimum load: the entry says so, says how to find a feeder\'s figure, links the map, and holds no value', () => {
  const pub = ENTRIES.filter((e) => e.minimumLoad);
  assert.deepEqual(pub.map((e) => e.id).sort(), ['pge-or', 'xcel-co', 'xcel-mn']);
  for (const e of pub) {
    assert.ok(e.url, e.id);
    assert.match(e.minimumLoad.how, /find your feeder/);
    assert.ok(e.minimumLoad.how.includes(e.minimumLoad.field));
  }
  const html = page();
  for (const e of pub) assert.match(new RegExp(`data-hc-entry="${e.id}"[\\s\\S]*?</tr>`).exec(html)[0], /data-minimum-load/);
});

test('viewer-only map: a map that will not download, or whose terms forbid reuse, says so and offers no data', () => {
  const viewer = ENTRIES.filter((e) => e.access === 'viewer');
  assert.ok(viewer.length >= 5);
  const html = page();
  for (const e of viewer) assert.match(new RegExp(`data-hc-entry="${e.id}"[\\s\\S]*?</tr>`).exec(html)[0], /View only; no data to download/);
  assert.match(ENTRIES.find((e) => e.id === 'sdge').reuse, /^Forbids it/);
  assert.match(ENTRIES.find((e) => e.id === 'georgia-power').reuse, /^Forbids it/);
});

test('atlas condition stated: linked with its date and a note that we found it unmaintained, beside our own check dates', () => {
  const html = page();
  const atlas = /data-hc-atlas>([\s\S]*?)<\/p>/.exec(html)[1];
  assert.ok(atlas.includes(`href="${ATLAS.url}"`));
  assert.match(atlas, /last updated Jan 26, 2026/);
  assert.match(atlas, /does not maintain/);
});

test('caveat shown: the three limits come before the first map link', () => {
  const html = main(page());
  const caveat = html.indexOf('data-hc-caveat');
  const firstLink = Math.min(...ENTRIES.filter((e) => e.url).map((e) => html.indexOf(`href="${e.url}"`)).filter((i) => i >= 0));
  assert.ok(caveat >= 0 && caveat < firstLink);
  for (const k of ['estimate', 'reservation', 'changes']) assert.ok(html.includes(strings[`hc.caveat.${k}`].replace(/'/g, '&#39;')), k);
});

test('stale entry: checked 13 months ago, it shows the chip with its last-checked date', () => {
  const old = { ...ENTRIES[0], id: 'old', lastChecked: '2025-10-21' };
  const html = page([old]);
  const chip = /<span class="warning-chip" data-late-from="([^"]+)" hidden>([^<]+)<\/span>/.exec(html);
  assert.equal(chip[1], reviewFrom('2025-10-21'));
  assert.ok(chip[1] < '2026-11-21', 'past its review date, so the shell shows it');
  assert.match(chip[2], /Needs review: last checked Oct 21, 2025/);
});

test('nothing hosted: the data holds no number from any map, only descriptions and links', () => {
  for (const e of ENTRIES) {
    for (const [k, v] of Object.entries(e)) assert.notEqual(typeof v, 'number', `${e.id}.${k}`);
    assert.deepEqual(Object.keys(e).sort(), ['access', 'id', 'lastChecked', 'mapUrl', 'minimumLoad', 'note', 'reuse', 'states', 'url', 'utility']);
    if (e.minimumLoad) assert.deepEqual(Object.keys(e.minimumLoad).sort(), ['field', 'how']);
  }
  assert.doesNotMatch(main(page()), /\b\d+(\.\d+)?\s?(MW|kW|kVA|MVA)\b/, 'no load or capacity figure on the page');
});

test('the weekly link check reads every directory link', async () => {
  const links = await outboundLinks(ROOT);
  for (const e of ENTRIES) {
    if (e.url) assert.ok(links.has(e.url), e.id);
    if (e.mapUrl) assert.ok(links.has(e.mapUrl), `${e.id} map`);
  }
  assert.ok(links.has(ATLAS.url));
});
