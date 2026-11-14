// The Shapiro-Wilk test for normality, by Royston's approximation (Applied
// Statistics algorithm AS R94, 1995), the algorithm R's shapiro.test and
// SciPy's shapiro use. The major-event-day method assumes the logarithms of
// daily minutes per customer are normal; this checks that assumption
// (add-reliability-tools task 3.3). Valid for 3 to 5,000 values.
//
// Normal quantiles use Wichura's AS 241 (PPND16, about 16 digits); the normal
// upper tail uses a Chebyshev fit to erfc with fractional error under 1.2e-7
// everywhere, so even tiny p-values keep their leading digits.

/** Normal quantile for 0 < p < 1 (Wichura 1988, AS 241). */
export function normalQuantile(p) {
  if (!(p > 0 && p < 1)) return p === 0 ? -Infinity : p === 1 ? Infinity : NaN;
  const q = p - 0.5;
  if (Math.abs(q) <= 0.425) {
    const r = 0.180625 - q * q;
    return q * (((((((2509.0809287301226727 * r + 33430.575583588128105) * r + 67265.770927008700853) * r + 45921.953931549871457) * r + 13731.693765509461125) * r + 1971.5909503065514427) * r + 133.14166789178437745) * r + 3.387132872796366608)
      / (((((((5226.495278852545925 * r + 28729.085735721942674) * r + 39307.89580009271061) * r + 21213.794301586595867) * r + 5394.1960214247511077) * r + 687.1870074920579083) * r + 42.313330701600911252) * r + 1);
  }
  let r = Math.sqrt(-Math.log(q < 0 ? p : 1 - p));
  let x;
  if (r <= 5) {
    r -= 1.6;
    x = (((((((7.7454501427834140764e-4 * r + 0.0227238449892691845833) * r + 0.24178072517745061177) * r + 1.27045825245236838258) * r + 3.64784832476320460504) * r + 5.7694972214606914055) * r + 4.6303378461565452959) * r + 1.42343711074968357734)
      / (((((((1.05075007164441684324e-9 * r + 5.475938084995344946e-4) * r + 0.0151986665636164571966) * r + 0.14810397642748007459) * r + 0.68976733498510000455) * r + 1.6763848301838038494) * r + 2.05319162663775882187) * r + 1);
  } else {
    r -= 5;
    x = (((((((2.01033439929228813265e-7 * r + 2.71155556874348757815e-5) * r + 0.0012426609473880784386) * r + 0.026532189526576123093) * r + 0.29656057182850489123) * r + 1.7848265399172913358) * r + 5.4637849111641143699) * r + 6.6579046435011037772)
      / (((((((2.04426310338993978564e-15 * r + 1.4215117583164458887e-7) * r + 1.8463183175100546818e-5) * r + 7.868691311456132591e-4) * r + 0.0148753612908506148525) * r + 0.13692988092273580531) * r + 0.59983220655588793769) * r + 1);
  }
  return q < 0 ? -x : x;
}

/** erfc(x), fractional error under 1.2e-7 for every x (Chebyshev fit, Press et al., Numerical Recipes §6.2). */
function erfc(x) {
  const z = Math.abs(x);
  const t = 1 / (1 + 0.5 * z);
  const r = t * Math.exp(-z * z - 1.26551223 + t * (1.00002368 + t * (0.37409196 + t * (0.09678418 + t * (-0.18628806 + t * (0.27886807 + t * (-1.13520398 + t * (1.48851587 + t * (-0.82215223 + t * 0.17087277)))))))));
  return x >= 0 ? r : 2 - r;
}

/** P(Z > z) for a standard normal Z. */
export const normalUpper = (z) => 0.5 * erfc(z / Math.SQRT2);

const poly = (c, x) => c.reduceRight((acc, k) => acc * x + k, 0);
// Royston's coefficients (AS R94).
const C1 = [0, 0.221157, -0.147981, -2.07119, 4.434685, -2.706056];
const C2 = [0, 0.042981, -0.293762, -1.752461, 5.682633, -3.582633];
const C3 = [0.544, -0.39978, 0.025054, -6.714e-4];
const C4 = [1.3822, -0.77857, 0.062767, -0.0020322];
const C5 = [-1.5861, -0.31082, -0.083751, 0.0038915];
const C6 = [-0.4803, -0.082676, 0.0030302];
const G = [-2.273, 0.459];

/**
 * @param {number[]} values 3 to 5,000 finite numbers
 * @returns {{status: 'ok', n: number, W: number, p: number} | {status: 'refused', n: number, reason: string}}
 */
export function shapiroWilk(values) {
  const x = values.filter(Number.isFinite).sort((a, b) => a - b);
  const n = x.length;
  if (n < 3) return { status: 'refused', n, reason: 'The Shapiro-Wilk test needs at least 3 values.' };
  if (n > 5000) return { status: 'refused', n, reason: 'The Shapiro-Wilk approximation used here holds for at most 5,000 values.' };
  if (x[n - 1] - x[0] === 0) return { status: 'refused', n, reason: 'Every value is the same, so there is no spread to test.' };

  // The coefficients a_i, antisymmetric about the middle.
  const a = new Array(n).fill(0);
  if (n === 3) {
    a[0] = -Math.SQRT1_2;
    a[2] = Math.SQRT1_2;
  } else {
    const m = Array.from({ length: n }, (_, i) => normalQuantile((i + 1 - 0.375) / (n + 0.25)));
    const summ2 = m.reduce((s, v) => s + v * v, 0);
    const ssumm2 = Math.sqrt(summ2);
    const rsn = 1 / Math.sqrt(n);
    const a1 = poly(C1, rsn) + m[n - 1] / ssumm2;
    let first;
    let fac;
    if (n > 5) {
      const a2 = poly(C2, rsn) + m[n - 2] / ssumm2;
      fac = Math.sqrt((summ2 - 2 * m[n - 1] ** 2 - 2 * m[n - 2] ** 2) / (1 - 2 * a1 ** 2 - 2 * a2 ** 2));
      a[n - 2] = a2;
      a[1] = -a2;
      first = 2;
    } else {
      fac = Math.sqrt((summ2 - 2 * m[n - 1] ** 2) / (1 - 2 * a1 ** 2));
      first = 1;
    }
    a[n - 1] = a1;
    a[0] = -a1;
    for (let i = first; i < n - first; i++) a[i] = m[i] / fac;
  }

  const mean = x.reduce((s, v) => s + v, 0) / n;
  const ss = x.reduce((s, v) => s + (v - mean) ** 2, 0);
  const num = x.reduce((s, v, i) => s + a[i] * v, 0);
  const W = Math.min(1, (num * num) / ss);

  let p;
  if (n === 3) {
    // Exact for three values.
    p = Math.max(0, (6 / Math.PI) * (Math.asin(Math.sqrt(W)) - Math.PI / 3));
  } else if (W >= 1) {
    p = 1;
  } else {
    let y = Math.log(1 - W);
    let mu;
    let sigma;
    if (n <= 11) {
      const gamma = poly(G, n);
      if (y >= gamma) return { status: 'ok', n, W, p: 1e-99 };
      y = -Math.log(gamma - y);
      mu = poly(C3, n);
      sigma = Math.exp(poly(C4, n));
    } else {
      const ln = Math.log(n);
      mu = poly(C5, ln);
      sigma = Math.exp(poly(C6, ln));
    }
    p = normalUpper((y - mu) / sigma);
  }
  return { status: 'ok', n, W, p: Math.min(1, p) };
}
