// Explainer: what a balancing authority is (add-learn-and-data-guides 3.1).
// Every number is generated from EIA-930 and FERC Form 714 at build.

const mw = (x) => Math.round(x).toLocaleString('en-US');

export default {
  id: 'balancing-authority',
  title: 'What a balancing authority is',
  reviewed: '2026-11-14',
  summary: 'A balancing authority keeps the power made equal to the power used, moment by moment, in its area. EIA gets hourly data from {count} of them. Your utility is in one, and its busiest hours shape some rates and the emissions from your use.',
  sections: [
    { heading: 'What it does', paragraphs: [
      'Power cannot be stored in the wires, so every second the grid needs as much made as used. A balancing authority schedules power plants, trades power with its neighbors, and adjusts output to keep that balance. Some are run by a single utility. Others are regional grid operators that run a market for many utilities.',
    ] },
    { heading: 'How different they are', paragraphs: [
      'They range widely in size. In {year}, {largestName} reported the highest peak of those that file FERC Form 714: {largestPeak} MW. The smallest that filed, {smallestName}, peaked at {smallestPeak} MW.',
      '{generationOnly} of the {count} that report to EIA only generate power and serve no customers of their own.',
    ] },
    { heading: 'Why it matters to you', paragraphs: [
      'Your balancing authority\'s busiest hours decide coincident-peak charges in some rates, and its fuel mix hour by hour decides the emissions from the power you use at that hour. gridprims has a page for each one, with its hourly demand and fuel mix.',
    ] },
  ],
  cited: [],
  /** @param {{peaks: any, balancing: any}} d */
  figures({ peaks, balancing }) {
    const year = Math.max(...peaks.rows.map((r) => r.year));
    const ba = peaks.rows.filter((r) => r.year === year && r.respondent_type === 'balancing_authority' && r.peak_mw > 0).sort((a, b) => b.peak_mw - a.peak_mw);
    const form714 = `FERC Form 714 annual peaks, via PUDL ${peaks.manifest.release ?? peaks.manifest.version}, data year ${year}`;
    const eia930 = `EIA-930 balancing authorities, served version ${balancing.manifest.version}`;
    const [largest, smallest] = [ba[0], ba.at(-1)];
    return {
      count: { display: String(balancing.regions.length), source: eia930 },
      generationOnly: { display: String(balancing.regions.filter((r) => r.generationOnly).length), source: eia930 },
      year: { display: String(year), source: form714 },
      largestName: { display: largest.respondent_name, source: form714 },
      largestPeak: { display: mw(largest.peak_mw), source: form714 },
      smallestName: { display: smallest.respondent_name, source: form714 },
      smallestPeak: { display: mw(smallest.peak_mw), source: form714 },
      tryIt: { display: `/balancing-authorities/${(largest.balancing_authority_code_eia ?? '').toLowerCase()}/`, source: form714 },
    };
  },
  tryIt: { href: '{tryIt}', label: 'See the largest one\'s hourly demand and fuel mix' },
};
