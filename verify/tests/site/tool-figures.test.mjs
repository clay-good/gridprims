// The one chart on each overhead-line tool page (add-overhead-line-checks 3.6
// and 4.5): drawn from the tool's figure, with a summary, a table view, and
// colors from CSS tokens.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderFigure } from '../../../site/ui/tool-figures.mjs';
import { createI18n } from '../../../site/lib/i18n.mjs';
import strings from '../../../site/strings/en-US.mjs';
import midspan from '../../../core/tools/lines.midspan-clearance.check/manifest.mjs';
import * as midspanImpl from '../../../core/tools/lines.midspan-clearance.check/tool.mjs';
import attach from '../../../core/tools/lines.attachment-height.find/manifest.mjs';
import * as attachImpl from '../../../core/tools/lines.attachment-height.find/tool.mjs';

const i18n = createI18n(strings, 'en-US');
const chartParts = (svg) => {
  assert.match(svg, /role="img" aria-label="[^"]+"/);
  assert.match(svg, /<figcaption>[^<]+<\/figcaption>/);
  assert.match(svg, /<caption>[^<]+<\/caption>/, 'a table view');
  assert.doesNotMatch(svg, /#[0-9a-f]{6}|rgb\(/i, 'colors come from CSS tokens');
  assert.doesNotMatch(svg, /\.\./, 'one period after a length');
};

test('the span profile draws the line, the required clearance, and labels the lowest point', () => {
  const svg = String(renderFigure(midspan, midspanImpl, midspan.examples[0].inputs, i18n));
  chartParts(svg);
  assert.match(svg, /data-figure-chart="span-profile"/);
  assert.match(svg, /class="series series-compare" d="[^"]+"><title>Required clearance/);
  assert.match(svg, /Lowest 22 ft 6 in\.<\/text>/);
  assert.match(svg, /lowest at 22 ft 6 in\., 100 ft from the first pole, on a 200 ft span/);
  assert.match(svg, /stays above the 18 ft 0 in\. required clearance/);
});

test('the span profile says when the line dips below the clearance, and draws the line above', () => {
  const short = midspan.examples.find((e) => String(renderFigure(midspan, midspanImpl, e.inputs, i18n)).includes('dips below'));
  assert.ok(short, 'one worked example falls short');
  const withAbove = midspan.examples.find((e) => String(e.inputs.above ?? 'none').toLowerCase() !== 'none');
  if (withAbove) assert.match(String(renderFigure(midspan, midspanImpl, withAbove.inputs, i18n)), /<title>Line above<\/title>/);
});

test('the pole elevation shows the communication space, every line, and where the new line goes', () => {
  const ex = attach.examples[0];
  const svg = String(renderFigure(attach, attachImpl, ex.inputs, i18n));
  chartParts(svg);
  assert.match(svg, /class="elev-space"/);
  assert.match(svg, /New line 26 ft 10 in\.<\/text>/);
  assert.equal((svg.match(/class="elev-mark /g) ?? []).length, String(ex.inputs.attachments).trim().split('\n').length + 1);
  // Labels never overlap: each sits at least 14 units below the last.
  const ys = [...svg.matchAll(/<text x="168" y="([\d.]+)"/g)].map((m) => +m[1]);
  assert.ok(ys.length >= 3, "every line is labeled");
  for (let k = 1; k < ys.length; k++) assert.ok(ys[k] - ys[k - 1] >= 13.9, `labels ${k - 1} and ${k} overlap`);
});

test('a pole with no room says so instead of placing a line', () => {
  const svg = String(renderFigure(attach, attachImpl, attach.examples.at(-1).inputs, i18n));
  assert.match(svg, /There is no communication space/);
  assert.match(svg, /The pole needs 2 ft 0 in\. more height/);
  assert.doesNotMatch(svg, /elev-new/);
});

test('invalid inputs and tools without a figure draw nothing', () => {
  assert.equal(String(renderFigure(midspan, midspanImpl, { ...midspan.examples[0].inputs, span: 'abc' }, i18n)), '');
  assert.equal(String(renderFigure({ id: 'calc.energy-units.convert' }, {}, {}, i18n)), '');
});
