import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fleschKincaid, syllables } from '../../../core/lib/readability.mjs';

/** Sentences scored by hand: words, sentences, and syllables counted by a person. */
const HAND = [
  ['The cat sat on the mat.', 6, 1, 6],
  ['Your bill is higher than last year.', 7, 1, 8],
  ['This battery would save about four hundred dollars a year.', 10, 1, 15],
  ['Your peak demand was set on a hot afternoon in July.', 11, 1, 15],
  ['The grid was cleanest after midnight.', 6, 1, 9],
  ['We could not read this file.', 6, 1, 6],
  ['Download your data from the utility website.', 7, 1, 13],
  ['Electricity costs more during the summer months.', 7, 1, 13],
  ['A screening estimate is not a utility study.', 8, 1, 15],
  ['The meter recorded use each fifteen minutes.', 7, 1, 12],
  ['Natural gas prices changed the cost of power.', 8, 1, 12],
  ['Two meters were found in this file. Pick one to begin.', 11, 2, 13],
  ['Your home used more energy than the average home nearby.', 10, 1, 15],
  ['Solar panels make the most power at noon.', 8, 1, 11],
  ['This rate charges extra for power used in the evening.', 10, 1, 14],
  ['The comparison considers seasonal variation and regulatory adjustments.', 8, 1, 24],
  ['Interconnection applications require substantial documentation.', 5, 1, 19],
  ['Sign in and look for a link to download your usage.', 11, 1, 13],
  ['It took less than a second.', 6, 1, 7],
  ['Prices may change, so check the date shown beside each number.', 11, 1, 14],
  ['Unfortunately, considerable uncertainty accompanies these preliminary calculations.', 7, 1, 28],
];
const grade = (w, s, syl) => 0.39 * (w / s) + 11.8 * (syl / w) - 15.59;

test('within 0.5 grade of 21 hand-scored sentences', () => {
  for (const [text, w, s, syl] of HAND) {
    const r = fleschKincaid(text);
    const want = grade(w, s, syl);
    assert.ok(Math.abs(r.grade - want) <= 0.5, `${text}\n  got grade ${r.grade.toFixed(2)} (${r.words} words, ${r.syllables} syllables), hand ${want.toFixed(2)} (${syl} syllables)`);
    assert.equal(r.words, w, text);
    assert.equal(r.sentences, s, text);
  }
});

test('numbers and unit symbols count as one syllable; decimals do not end sentences', () => {
  assert.equal(syllables('40.95'), 1);
  assert.equal(syllables('MMBtu'), 1);
  const r = fleschKincaid('12 MWh is 40.95 MMBtu.');
  assert.deepEqual([r.words, r.sentences, r.syllables], [5, 1, 5]);
});

test('the reference tool\'s result sentences read at grade 8 or below', async () => {
  const { TOOLS } = await import('../../../core/tools/index.mjs');
  const { runTool } = await import('../../../core/contract/run.mjs');
  for (const { manifest, impl } of TOOLS) {
    for (const ex of manifest.examples) {
      const r = runTool(manifest, impl, ex.inputs);
      assert.ok(fleschKincaid(r.sentence).grade <= 8, `${manifest.id} ${ex.id}: "${r.sentence}"`);
    }
  }
});
