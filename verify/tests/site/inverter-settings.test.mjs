// The certification and settings reference (add-interconnection-screens 5.5; interconnect/equipment-reference):
// every published default is in the stored capture of the sheet it cites; the mismatch answer cites the
// requirement and leaves the decision to the authority and the utility; a state whose rule points elsewhere gets
// no other state's numbers; a value with no free source is omitted with where it is defined; and the page says
// the standard's own text is not reproduced.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import * as DATA from '../../../data/curated/inverter-settings.mjs';
import { inverterSettingsPage } from '../../../site/templates/inverter-settings.mjs';
import { createI18n } from '../../../site/lib/i18n.mjs';
import strings from '../../../site/strings/en-US.mjs';
import { ROOT } from '../../../pipeline/run.mjs';

const i18n = createI18n(strings, 'en-US');
const body = (file) => readFileSync(join(ROOT, file), 'utf8').split('\n----\n')[1];
const html = String(inverterSettingsPage({ data: DATA, i18n }));
const main = html.slice(html.indexOf('<main'));

test('setting cited to a rule: every value is in the stored capture of the sheet its group cites', () => {
  for (const g of DATA.SETTINGS) {
    const text = body(g.cite.capture);
    const parts = g.cite.locator.split(',').map((x) => x.trim());
    const section = text.split('\n\n').find((p) => parts.some((x) => p.split('\n')[0].includes(x)));
    assert.ok(section, `${g.id}: ${g.cite.locator} is captured`);
    for (const r of g.rows) for (const n of r.numbers) assert.ok(section.includes(n), `${g.id}: ${n}`);
  }
  assert.match(main, /data-not-reproduced>IEEE 1547&#39;s own text, tables, and numbering are not reproduced here/);
  assert.equal([...main.matchAll(/data-setting-group/g)].length, DATA.SETTINGS.length);
});

test('certification mismatch: explained, cited to the rules, and left to the authority having jurisdiction and the utility', () => {
  assert.match(DATA.CERTIFICATION.mismatch, /authority having jurisdiction and the utility to decide/);
  for (const c of DATA.CERTIFICATION.cites) assert.ok(body(c.capture).replace(/\s+/g, ' ').includes(c.quote), c.locator);
  assert.match(main, /data-mismatch/);
  assert.match(DATA.CERTIFICATION.explained[1], /non-inverter-based facilities certify to SA/);
});

test('a jurisdiction that publishes no tables: Hawaii\'s rule points to its profile, and no California number is shown for it', () => {
  const hi = DATA.POINTS_ELSEWHERE.find((e) => e.jurisdiction === 'HI');
  assert.ok(body(hi.cite.capture).replace(/\s+/g, ' ').includes(hi.cite.quote));
  const section = /data-points-elsewhere="HI">([\s\S]*?)<\/div>/.exec(main)[1];
  assert.doesNotMatch(section, /\d+(\.\d+)?\s?(Hz|%|s\b)/, 'no setting value');
  assert.match(section, /California&#39;s numbers are not Hawaii&#39;s/);
});

test('no free source for a value: omitted, naming the standard and where it is defined, with no value given', () => {
  assert.ok(DATA.OMITTED.length >= 2);
  for (const o of DATA.OMITTED) {
    assert.match(o.where, /IEEE 1547-2018/);
    assert.doesNotMatch(`${o.what} ${o.why}`, /\d+(\.\d+)?\s?(p\.u\.|Hz|%)/);
  }
  assert.equal([...main.matchAll(/data-omitted/g)].length, DATA.OMITTED.length);
});
