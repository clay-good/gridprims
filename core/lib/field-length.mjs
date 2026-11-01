// Lengths as field crews write them (add-overhead-line-checks: shared
// routines): 22'4" with straight or curly marks, 22-4, 22 ft 4 in, 22.33 ft,
// 40 in, and meters; and lengths back out as feet and inches, rounded toward
// more clearance: up for sag and shortfalls, down for heights and margins.

const FT = String.raw`(?:'|’|′|ft\.?|feet|foot)`;
const IN = String.raw`(?:"|”|″|''|’’|in\.?|inch|inches)`;
const NUM = String.raw`(\d+(?:\.\d+)?)`;
const M_PER_FT = 0.3048;

/**
 * @param {string} text
 * @returns {{ft: number} | {error: string}}
 */
export function parseLength(text) {
  const t = String(text ?? '').trim().toLowerCase().replace(/\s+/g, ' ');
  if (!t) return { error: 'Enter a length, such as 22\' 4" or 22 ft 4 in.' };
  let m;
  if ((m = new RegExp(`^${NUM} ?${FT} ?(?:${NUM} ?${IN}?)?$`).exec(t))) return { ft: Number(m[1]) + (m[2] ? Number(m[2]) / 12 : 0) };
  if ((m = new RegExp(`^${NUM} ?${IN}$`).exec(t))) return { ft: Number(m[1]) / 12 };
  if ((m = /^(\d+)-(\d+(?:\.\d+)?)$/.exec(t))) return Number(m[2]) < 12 ? { ft: Number(m[1]) + Number(m[2]) / 12 } : { error: `"${text}" reads as feet and inches, but ${m[2]} in. is a foot or more.` };
  if ((m = new RegExp(`^${NUM} ?(?:m|meters?|metres?)$`).exec(t))) return { ft: Number(m[1]) / M_PER_FT };
  if ((m = new RegExp(`^${NUM} ?(?:cm|centimeters?|centimetres?)$`).exec(t))) return { ft: Number(m[1]) / 100 / M_PER_FT };
  return { error: `"${text}" is not a length we read. Write it as 22' 4", 22-4, 22 ft 4 in, 22.33 ft, or 6.8 m.` };
}

/**
 * Feet and inches, rounded toward more clearance.
 * @param {number} ft @param {'up' | 'down'} toward @param {number} [step] inches to round to (1, or 0.5 for a sag at a point)
 */
export function feetInches(ft, toward, step = 1) {
  const sign = ft < 0 ? '−' : '';
  const raw = Math.abs(ft) * 12;
  // A hair of float error is not a real inch.
  const e = 1e-9;
  const inches = (toward === 'up' ? Math.ceil(raw / step - e) : Math.floor(raw / step + e)) * step;
  const f = Math.floor(inches / 12 + e);
  const i = +(inches - f * 12).toFixed(2);
  if (f === 0) return `${sign}${i} in.`;
  return `${sign}${f} ft ${i} in.`;
}

/** A rule's value as written: whole feet stay "18 ft", the rest as feet and inches. */
export const ruleLength = (ft) => (Number.isInteger(+(ft * 12).toFixed(6) / 12) ? `${ft} ft` : feetInches(ft, 'up'));
