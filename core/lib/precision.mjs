// Significant figures and US-style number display (tool contract: "Precision
// never exceeds the inputs"). One module so every tool rounds the same way.

/**
 * Count the significant figures a typed decimal string carries.
 * Trailing zeros in a whole number without a decimal point are not counted,
 * so "4" and "400" carry 1, "4.00" carries 3, "1,036" carries 4.
 * @param {string} text
 * @returns {number} significant figures, or 0 for zero or unparseable input
 */
export function sigFigsOf(text) {
  const s = String(text).trim().replace(/[,$\s]/g, '').replace(/^[+-]/, '');
  const m = /^(\d*)(?:\.(\d*))?(?:[eE][+-]?\d+)?$/.exec(s);
  if (!m || (m[1] === '' && (m[2] ?? '') === '')) return 0;
  const whole = m[1].replace(/^0+/, '');
  const frac = m[2];
  if (frac === undefined) return whole.replace(/0+$/, '').length;
  if (whole.length > 0) return whole.length + frac.length;
  return frac.replace(/^0+/, '').length;
}

/**
 * Round to n significant figures.
 * @param {number} x
 * @param {number} n
 */
export function roundSig(x, n) {
  if (!Number.isFinite(x) || x === 0) return x;
  return Number(x.toPrecision(Math.max(1, Math.min(21, n))));
}

/**
 * Round to a fixed number of decimals.
 * @param {number} x
 * @param {number} d
 */
export function roundDecimals(x, d) {
  if (!Number.isFinite(x)) return x;
  const f = 10 ** d;
  return Math.round((x + Number.EPSILON * Math.sign(x)) * f) / f;
}

/**
 * Apply a manifest rounding rule: {sigFigs} or {decimals}.
 * @param {number} x
 * @param {{sigFigs?: number, decimals?: number}} rule
 */
export function applyRounding(x, rule) {
  if (rule.sigFigs !== undefined) return roundSig(x, rule.sigFigs);
  if (rule.decimals !== undefined) return roundDecimals(x, rule.decimals);
  return x;
}

/**
 * Display a number in US style with digit grouping, never showing more
 * precision than the rule allows. Very large or small magnitudes use
 * E notation so a display never pretends to carry trailing digits.
 * @param {number} x
 * @param {{sigFigs?: number, decimals?: number}} rule
 */
export function formatNumber(x, rule) {
  if (!Number.isFinite(x)) return String(x);
  const r = applyRounding(x, rule);
  const abs = Math.abs(r);
  if (r !== 0 && (abs >= 1e15 || abs < 1e-6)) {
    return r.toExponential(Math.max(0, (rule.sigFigs ?? 4) - 1)).replace('e+', 'E').replace('e-', 'E-');
  }
  /** @type {Intl.NumberFormatOptions} */
  const opts = rule.sigFigs !== undefined
    ? { maximumSignificantDigits: rule.sigFigs }
    : { minimumFractionDigits: 0, maximumFractionDigits: rule.decimals ?? 20 };
  return new Intl.NumberFormat('en-US', opts).format(r);
}
