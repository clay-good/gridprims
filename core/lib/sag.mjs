// Sag and clearance of a span (add-overhead-line-checks: midspan clearance),
// by the parabolic method USDA RUS Bulletin 1724E-152 gives: sag D = wS²/8H,
// and sag at an offset x from midspan Dx = D(1 − (2x/S)²). A line hangs from
// the straight chord between its two attachments; heights are above the
// ground at each pole, and the ground is taken as straight between them.

/** Parabolic sag (ft) from weight (lb/ft), span (ft), and horizontal tension (lb). */
export const parabolicSag = (w, S, H) => (w * S * S) / (8 * H);

/** Exact catenary sag of a level span (ft): c(cosh(S/2c) − 1), with c = H/w. */
export const catenarySag = (w, S, H) => { const c = H / w; return c * (Math.cosh(S / (2 * c)) - 1); };

/** Sag below the chord at an offset x (ft) from midspan. */
export const sagAt = (D, S, x) => D * (1 - ((2 * x) / S) ** 2);

/**
 * A line's height above ground at a fraction u (0 at pole A, 1 at pole B) of the span.
 * @param {{a: number, b: number, sag: number}} line heights at each pole and midspan sag below the chord (ft)
 */
export const heightAt = (line, u) => line.a * (1 - u) + line.b * u - 4 * line.sag * u * (1 - u);

/** Where a quadratic in u, given by its values at 0, 1 and its curvature term, is smallest on [0, 1]. */
function lowest(at0, at1, k) {
  // f(u) = at0 + (at1 − at0)u − k u(1 − u); f'(u) = (at1 − at0) − k + 2k u.
  const f = (u) => at0 + (at1 - at0) * u - k * u * (1 - u);
  const cands = [0, 1];
  if (k > 0) { const u = (k - (at1 - at0)) / (2 * k); if (u > 0 && u < 1) cands.push(u); }
  return cands.map((u) => ({ u, value: f(u) })).reduce((a, b) => (b.value < a.value ? b : a));
}

/**
 * The lowest point above ground: its height and its distance from the lower pole. At a pole when the
 * curve's bottom falls outside the span.
 * @param {{a: number, b: number, sag: number}} line @param {number} S
 */
export function lowestPoint(line, S) {
  const { u, value } = lowest(line.a, line.b, 4 * line.sag);
  const lowerIsA = line.a <= line.b;
  const fromLower = lowerIsA ? u * S : (1 - u) * S;
  return { height: value, fromLower, atPole: u === 0 || u === 1, midspan: Math.abs(u - 0.5) < 1e-9 };
}

/**
 * The smallest gap between a line and the line above it, along the span, and where it falls.
 * @param {{a: number, b: number, sag: number}} lower @param {{a: number, b: number, sag: number}} upper @param {number} S
 */
export function smallestGap(lower, upper, S) {
  const { u, value } = lowest(upper.a - lower.a, upper.b - lower.b, 4 * (upper.sag - lower.sag));
  return { gap: value, at: u * S, midspan: Math.abs(u - 0.5) < 1e-9 };
}
