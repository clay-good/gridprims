import { test } from 'node:test';
import assert from 'node:assert/strict';
import { escapeHtml, html, raw } from '../../../site/lib/html.mjs';
import { createI18n } from '../../../site/lib/i18n.mjs';

test('every interpolated value is escaped', () => {
  const evil = '<script>alert("x")</script>&\'';
  assert.equal(String(html`<p title="${evil}">${evil}</p>`), '<p title="&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;&amp;&#39;">&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;&amp;&#39;</p>');
});

test('an unescaped value fails: only Html passes through', () => {
  const inner = html`<b>${'<i>'}</b>`;
  assert.equal(String(html`<p>${inner}</p>`), '<p><b>&lt;i&gt;</b></p>');
  assert.equal(String(html`<p>${{ toString: () => '<img src=x onerror=alert(1)>' }}</p>`), '<p>&lt;img src=x onerror=alert(1)&gt;</p>');
  assert.equal(String(html`${raw('<hr>')}`), '<hr>');
});

test('arrays join and empty values render as nothing', () => {
  assert.equal(String(html`<ul>${['a', '<b>'].map((x) => html`<li>${x}</li>`)}</ul>${null}${undefined}${false}${0}`), '<ul><li>a</li><li>&lt;b&gt;</li></ul>0');
  assert.equal(escapeHtml(5), '5');
});

test('messages fill placeholders and choose plural forms', () => {
  const i18n = createI18n({ hi: 'Hi {name}', rows: { one: '{count} row', other: '{count} rows' } }, 'en-US');
  assert.equal(i18n.t('hi', { name: 'Ana' }), 'Hi Ana');
  assert.equal(i18n.t('rows', { count: 1 }), '1 row');
  assert.equal(i18n.t('rows', { count: 35040 }), '35040 rows');
  assert.throws(() => i18n.t('missing'), /missing message id/);
  assert.throws(() => i18n.t('hi'), /needs a value for \{name\}/);
  assert.equal(i18n.date('2026-10-30'), 'Oct 30, 2026');
});
