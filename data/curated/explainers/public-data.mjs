// Explainer: how gridprims keeps public data (add-learn-and-data-guides 3.1).
// The counts are generated from the continuity ledger at build.

export default {
  id: 'public-data',
  title: 'How gridprims keeps public data',
  reviewed: '2026-11-14',
  summary: 'gridprims keeps a dated, checked copy of each public dataset it uses. Each copy says who published it, when, and under what terms. A public ledger shows which are current and which are late.',
  sections: [
    { heading: 'A dated copy', paragraphs: [
      'Each dataset is kept as numbered versions. Every version records the publisher, the date the data describes, the day we fetched it, its license, and a checksum for each file. When a publisher changes a file, the change becomes a new version with a list of what changed; the old version stays.',
    ] },
    { heading: 'Checked against the publisher', paragraphs: [
      'Scheduled jobs check for new releases, recheck each publisher\'s terms, and test every link we cite. The continuity ledger tracks {tracked} datasets, ours included. Today it lists {late} as late, by one rule: due on the publisher\'s posted date or its usual schedule, and late 30 days after.',
    ] },
    { heading: 'What we will not copy', paragraphs: [
      'Some data is not ours to republish. Where a license is unclear, we publish only numbers we computed ourselves. Feeder and substation detail is critical infrastructure information, so we never publish or estimate it.',
    ] },
  ],
  cited: [
    { text: '30', source: 'gridprims\' lateness rule (core/lib/lateness.mjs)', date: '2026-10-31' },
  ],
  /** @param {{ledger: any}} d */
  figures({ ledger }) {
    const source = `the continuity ledger, generated ${ledger.generatedAt.slice(0, 10)}`;
    return {
      tracked: { display: String(ledger.counts.tracked), source },
      late: { display: String(ledger.counts.late), source },
    };
  },
  tryIt: { href: '/ledger/', label: 'Open the continuity ledger' },
};
