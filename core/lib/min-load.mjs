// The load-ratio screens of small generator interconnection
// (add-interconnection-screens: minimum-load range): the 15%-of-peak screen,
// and the 100%-of-minimum-load screen computed across the minimum-load
// assumption band utilities themselves apply (15% to 40% of peak) when no
// utility value is in hand, naming the assumption where the answer flips.
// Comparisons follow the rule's own wording.

export const BAND = { low: 0.15, high: 0.4 };

/** The 15%-of-peak screen: met when aggregate generation does not exceed the threshold share of peak. */
export function peakScreen(aggregateKw, peakKw, threshold = 0.15) {
  const ratio = aggregateKw / peakKw;
  return { ratio, threshold, met: ratio <= threshold + 1e-12 };
}

/** The minimum-load screen at one minimum load: met only when generation is less than 100% of it. */
export const minLoadMet = (aggregateKw, minLoadKw) => aggregateKw < minLoadKw;

/**
 * The minimum-load screen across the band of minimum load as a share of peak: the result at each end, and
 * the share at and above which it would be met, when that falls inside the band.
 */
export function minLoadBand(aggregateKw, peakKw, band = BAND) {
  const at = (share) => ({ share, minLoadKw: share * peakKw, met: minLoadMet(aggregateKw, share * peakKw) });
  const low = at(band.low);
  const high = at(band.high);
  // Met for every share strictly above aggregate / peak.
  const flip = aggregateKw / peakKw;
  return { low, high, flip, settled: low.met === high.met, flipsInside: flip >= band.low && flip < band.high };
}
