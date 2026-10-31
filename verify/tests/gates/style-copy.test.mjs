import { test } from 'node:test';
import assert from 'node:assert/strict';
import { join } from 'node:path';
import { contrastRatio } from '../../lib/contrast.mjs';
import { checkContrast, checkLiteralColors } from '../../gates/style.mjs';
import { checkLiteralCopy, templates } from '../../gates/copy.mjs';
import { LIGHT, NIGHT } from '../../../site/styles/tokens.mjs';
import { fixtureRepo } from '../helpers.mjs';

test('contrast ratios match the WCAG formula and DESIGN.md figures', () => {
  assert.equal(contrastRatio('#000000', '#ffffff').toFixed(2), '21.00');
  assert.equal(contrastRatio('#ffffff', '#00704a').toFixed(2), '6.15'); // white on guide green
  assert.equal(contrastRatio('#111111', '#f07b21').toFixed(2), '6.80'); // black on work-zone orange
  assert.equal(contrastRatio('#ffffff', '#ffffff'), 1);
});

test('the shipped tokens clear every DESIGN.md threshold in both themes', () => {
  assert.deepEqual(checkContrast({ LIGHT, NIGHT }), []);
});

test('a token edit that breaks contrast fails, naming the pair and ratio', () => {
  const errors = checkContrast({ LIGHT: { ...LIGHT, muted: '#9aa59e' }, NIGHT });
  assert.ok(errors.some((e) => /^light: muted on bg is \d\.\d\d:1, below 4\.5:1$/.test(e)), errors.join('\n'));
});

test('an unknown literal color in a component rule fails the style lint', () => {
  const root = fixtureRepo({ 'styles/a.css': '.ok { color: var(--ink); }\n/* #fff in a comment is fine */\n.bad { color: #ff0000; background: rgb(0 0 0); }\n' });
  assert.deepEqual(checkLiteralColors(join(root, 'styles')), [
    'a.css:3: literal color "#ff0000"; use a token from site/styles/tokens.mjs',
    'a.css:3: literal color "rgb("; use a token from site/styles/tokens.mjs',
  ]);
});

test('template extraction skips expressions, including nested templates and strings', () => {
  const src = "const a = html`<p>${t('x')}</p>${list.map((i) => html`<li>${i}</li>`)}<b>${'}'}</b>`;";
  assert.deepEqual(templates(src).map((x) => x.text), ['<p>\u0000</p>\u0000<b>\u0000</b>', '<li>\u0000</li>']);
});

test('literal copy in a template fails, naming file, line, and where it belongs', () => {
  const root = fixtureRepo({
    'tpl/page.mjs': "import { html } from 'x';\nexport const ok = (t) => html`<p>${t('drop')}</p> &rarr; · (${1})`;\nexport const bad = () => html`<p>Drop a meter file</p>`;\nexport const attr = () => html`<input aria-label=\"Search tools\">`;\nexport const list = (xs) => html`<ul>${xs.map((x) =>\n  html`<li>Each ${x}</li>`)}</ul>`;\n",
  });
  assert.deepEqual(checkLiteralCopy(join(root, 'tpl'), 'tpl'), [
    'tpl/page.mjs:3: literal text "Drop a meter file"; put it in site/strings/en-US.mjs and use t()',
    'tpl/page.mjs:4: literal aria-label "Search tools"; put it in site/strings/en-US.mjs and use t()',
    'tpl/page.mjs:6: literal text "Each"; put it in site/strings/en-US.mjs and use t()',
  ]);
});
