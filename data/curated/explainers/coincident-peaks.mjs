// Explainer: coincident peaks (add-learn-and-data-guides 3.1). ERCOT's
// intervals are generated from data/curated/ercot-4cp.json, read from ERCOT's
// own NP9-83-M files; the Texas rule change is cited to docs/research/06,
// which the weekly rule recheck watches.

export default {
  id: 'coincident-peaks',
  title: 'Coincident peaks: 4CP, 5CP, and capacity tags',
  reviewed: '2026-11-14',
  summary: 'Some charges are set by your use during the grid\'s busiest hours of the year. Those hours are known only after the season ends. Using less in them can cut next year\'s charges a lot.',
  sections: [
    { heading: 'How it works', paragraphs: [
      'In ERCOT, transmission costs are shared by each customer\'s demand in the single busiest interval of each summer month, June through September: the 4CP. PJM uses the five busiest days of summer, the 5CP, to set capacity tags. Either way, the intervals are named only after the season ends.',
    ] },
    { heading: 'ERCOT\'s last published peaks', paragraphs: [
      'For {year}, ERCOT\'s four intervals ended at {intervals}, Central Prevailing Time. Each interval lasts {minutes} minutes.',
    ] },
    { heading: 'A change proposed in Texas', paragraphs: [
      'In July 2026 the Texas commission proposed, in Project 58000, replacing 4CP with the twelve monthly peaks, measured over 30 minutes. It had not been adopted as of late October 2026.',
    ] },
  ],
  cited: [
    { text: '30', source: 'PUCT Project 58000 proposal, as read for docs/research/06 §2', date: '2026-10-29' },
  ],
  /** @param {{ercot4cp: any}} d */
  figures({ ercot4cp }) {
    const year = Math.max(...Object.keys(ercot4cp.years).map(Number).filter((y) => ercot4cp.years[y]?.intervals?.length === 4));
    const iv = ercot4cp.years[year].intervals;
    const source = `${ercot4cp.publisher}, NP9-83-M, as of ${ercot4cp.asOf}`;
    const when = (i) => new Date(`${i.date}T00:00:00Z`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' }) + ` ${i.ends}`;
    return {
      year: { display: String(year), source },
      intervals: { display: iv.map(when).join('; '), source },
      minutes: { display: String(iv[0].minutes), source },
    };
  },
  tryIt: { href: '/files/#plans&utility=1015&state=TX', label: 'See the sample file\'s load in ERCOT\'s peak intervals' },
};
