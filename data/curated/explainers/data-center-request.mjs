// Explainer: how big is a data center request (add-learn-and-data-guides 3.1).
// The utility's peak and sales are generated from FERC Form 714 and EIA-861;
// the request size and load factor are example values, labeled as such.

const whole = (x) => Math.round(x).toLocaleString('en-US');
/** The worked example: one utility, a 300 MW request, a 90% load factor. */
const UTILITY = 195;
const REQUEST_MW = 300;
const LOAD_FACTOR = 0.9;

export default {
  id: 'data-center-request',
  title: 'How big is a data center request?',
  reviewed: '2026-11-14',
  summary: 'A large data center can ask a utility for hundreds of megawatts. Whether that is big depends on the utility. Compare the request with the utility\'s own yearly peak and its yearly sales.',
  sections: [
    { heading: 'Against the peak', paragraphs: [
      'Utilities that file FERC Form 714 report their demand for every hour of the year, and the highest hour is the peak. {utility} peaked at {peak} MW in {peakYear}. A 300 MW request would be {peakShare}% of that peak, before any growth.',
    ] },
    { heading: 'Against the year\'s sales', paragraphs: [
      'A data center runs most hours of the year. At a 90% load factor, 300 MW uses {energy} MWh a year. {utility} sold {sales} MWh in {salesYear}, so the request would add {salesShare}% to its sales.',
    ] },
    { heading: 'Who pays if it leaves', paragraphs: [
      'A utility may build lines and plants for one large customer. Some large-load tariffs answer that with a minimum bill for a set number of years, or an exit fee if the customer leaves early. The terms differ by state and utility; gridprims\' large-load terms table cites each one to the order or tariff sheet that sets it.',
    ] },
  ],
  cited: [
    { text: '300', example: true },
    { text: '90', example: true },
  ],
  /** @param {{utilities: any, peaks: any}} d */
  figures({ utilities }) {
    const u = utilities.utilities.find((x) => x.id === UTILITY);
    const eia861 = `EIA-861, served version ${utilities.sources.eia861.version}, data year ${u.year}`;
    const form714 = `FERC Form 714 annual peaks, via PUDL ${utilities.sources.ferc714?.release ?? utilities.sources.ferc714?.version}, data year ${u.peak.year}`;
    const energy = REQUEST_MW * LOAD_FACTOR * 8760;
    return {
      utility: { display: u.name, source: eia861 },
      peak: { display: whole(u.peak.mw), source: form714 },
      peakYear: { display: String(u.peak.year), source: form714 },
      peakShare: { display: (REQUEST_MW / u.peak.mw * 100).toFixed(1), source: form714 },
      energy: { display: whole(energy), source: 'arithmetic: 300 MW × 0.9 × 8,760 hours' },
      sales: { display: whole(u.totalSales), source: eia861 },
      salesYear: { display: String(u.year), source: eia861 },
      salesShare: { display: (energy / u.totalSales * 100).toFixed(1), source: eia861 },
      tryIt: { display: `/utilities/${UTILITY}/`, source: eia861 },
    };
  },
  tryIt: { href: '{tryIt}', label: 'See this utility\'s peak, sales, and large-load terms' },
};
