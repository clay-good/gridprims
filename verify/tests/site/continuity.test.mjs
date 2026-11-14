// The continuity page (add-trust-and-continuity task 3.4): steps a stranger can
// follow with no handover, the runtime and build command, the licenses that
// make revival legal without permission, and each dataset's own terms and
// source file, read from the served manifests.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT } from '../../../pipeline/run.mjs';
import { continuityPage } from '../../../site/templates/pages.mjs';
import { createI18n } from '../../../site/lib/i18n.mjs';
import strings from '../../../site/strings/en-US.mjs';

const i18n = createI18n(strings, 'en-US');
const datasets = readdirSync(join(ROOT, 'data')).filter((id) => existsSync(join(ROOT, 'data', id, 'current.json'))).map((id) => {
  const { version } = JSON.parse(readFileSync(join(ROOT, 'data', id, 'current.json'), 'utf8'));
  return JSON.parse(readFileSync(join(ROOT, 'data', id, version, 'manifest.json'), 'utf8'));
});
const node = readFileSync(join(ROOT, '.node-version'), 'utf8').trim();
const html = String(continuityPage({ i18n, datasets, node }));
const text = html.replace(/<[^>]+>/g, ' ').replace(/&#39;/g, "'").replace(/&amp;/g, '&').replace(/\s+/g, ' ');

test('revival steps published: the runtime, the build command, and the licenses, with no step that waits on a person', () => {
  assert.match(text, new RegExp(`Install Node\\.js ${node.replace(/\./g, '\\.')} or later\\. Nothing else is needed\\.`));
  assert.match(text, /Run npm test, then npm run build\. The site is in dist\//);
  assert.match(text, /The code is MIT and our text and tables are CC BY 4\.0/);
  assert.doesNotMatch(text, /\b(contact us|ask us|email us|request access|successor)\b/i);
});

test('maintainer unreachable: the page says nothing needs the maintainer', () => {
  assert.match(text, /No step here waits on the maintainer\..*it can come back even if we stop answering\./);
});

test('no permission needed: each dataset names the terms a copy inherits, from its own manifest', () => {
  assert.match(text, /You need nothing from us/);
  for (const d of datasets) {
    const li = new RegExp(`data-upstream="${d.dataset}"`);
    assert.match(html, li, d.dataset);
    assert.ok(text.includes(String(d.license)), `${d.dataset} names its license`);
    if (d.raw?.length) assert.ok(html.includes(d.raw[0].sha256), `${d.dataset} names its source file's checksum`);
  }
  assert.match(text, /Each dataset below carries its publisher’s own terms/);
});
