// The tool-contract and validation-level scenarios on the answer card
// (foundation tasks 3.9 and 8.8): refusals as answers, the screening label,
// the work-zone strip for levels 0 and 1, and copied results keeping the level.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createI18n } from '../../../site/lib/i18n.mjs';
import strings from '../../../site/strings/en-US.mjs';
import { copyText, renderAnswer } from '../../../site/ui/tool-page.mjs';
import { runTool } from '../../../core/contract/run.mjs';
import { sample } from '../helpers.mjs';

const i18n = createI18n(strings, 'en-US');
const impl = { compute: ({ x }) => ({ status: 'ok', outputs: { y: x * 2 }, sentence: (o) => `Twice is ${o.y.display} kWh.` }) };
const withLevel = (level, extra = {}) => ({ ...sample(), ...extra, validation: { level, evidence: level ? [{ kind: 'own-examples', summary: 'Our examples pass.' }] : [] } });

test('a level 0 answer carries the unvalidated strip beside it, with the limits page and report links', () => {
  const m = withLevel(0);
  const card = String(renderAnswer(m, runTool(m, impl, { x: 2 }), i18n, { isExample: false }));
  assert.match(card, /data-strip>[\s\S]*Unvalidated: the method is cited, but nothing independent has checked it yet/);
  assert.match(card, /href="\/limits\/#calc\.sample\.double"/);
  assert.match(card, /Report a problem/);
});

test('a level 2 answer shows the check glyph and no level strip', () => {
  const m = withLevel(2);
  const card = String(renderAnswer(m, runTool(m, impl, { x: 2 }), i18n, { isExample: false }));
  assert.match(card, /class="ok"/);
  assert.doesNotMatch(card, /data-strip/);
});

test('the screening label sits in the same strip as the answer, strongest reason first', () => {
  const m = withLevel(1, { screeningLabel: 'Screening estimate. Your utility\'s study is the final word.' });
  const card = String(renderAnswer(m, runTool(m, impl, { x: 2 }), i18n, { isExample: true }));
  assert.match(card, /data-strip>[\s\S]*Screening estimate\. Your utility&#39;s study is the final word\. · Self-checked only[\s\S]* · Example values/);
  assert.equal(card.match(/data-strip/g).length, 1, 'one strip per answer');
});

test('a refusal renders as an answer with its reason and the limits link, and no number', () => {
  const m = withLevel(1);
  const refuse = { compute: () => ({ status: 'refused', reason: 'Public data cannot support a loss-of-load figure.', limitsUrl: '/limits/#adequacy' }) };
  const card = String(renderAnswer(m, runTool(m, refuse, { x: 2 }), i18n, { isExample: false }));
  assert.match(card, /We do not compute this\./);
  assert.match(card, /Public data cannot support a loss-of-load figure\./);
  assert.match(card, /href="\/limits\/#adequacy"/);
  assert.doesNotMatch(card, /class="number"/);
});

test('a copied level 1 result keeps the level and its meaning, rounded as shown', () => {
  const m = withLevel(1, { screeningLabel: 'Screening estimate.' });
  const text = copyText(m, runTool(m, impl, { x: 2.123456 }), i18n, 'https://gridprims.com/x/');
  assert.equal(text, 'Twice is 4.25 kWh.\nScreening estimate.\nValidation: Self-checked. Our own worked examples and consistency tests pass, but no independent check has been run yet.\nSource: https://gridprims.com/x/');
});
