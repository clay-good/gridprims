import { test } from 'node:test';
import assert from 'node:assert/strict';
import { formatNumber, roundSig, sigFigsOf } from '../../../core/lib/precision.mjs';

test('significant figures read from typed text', () => {
  const cases = { '4': 1, '4.00': 3, '$4': 1, '$4.00': 3, '12': 2, '400': 1, '1,036': 4, '0.0050': 2, '10.': 2, '-3.20': 3, '1.5e3': 2, '0': 0, 'abc': 0, '': 0 };
  for (const [text, n] of Object.entries(cases)) assert.equal(sigFigsOf(text), n, text);
});

test('rounding to significant figures', () => {
  assert.equal(roundSig(44_400, 1), 40_000);
  assert.equal(roundSig(40.945_67, 4), 40.95);
  assert.equal(roundSig(-0.000_123_456, 2), -0.000_12);
  assert.equal(roundSig(0, 3), 0);
});

test('US-style display never shows more figures than the rule', () => {
  assert.equal(formatNumber(40.945_67, { sigFigs: 4 }), '40.95');
  assert.equal(formatNumber(1_036_000, { sigFigs: 4 }), '1,036,000');
  assert.equal(formatNumber(44_400, { sigFigs: 1 }), '40,000');
  assert.equal(formatNumber(1234.5678, { decimals: 2 }), '1,234.57');
  assert.equal(formatNumber(0.000_000_341, { sigFigs: 3 }), '3.41E-7');
  assert.equal(formatNumber(3.6e18, { sigFigs: 4 }), '3.600E18');
});
