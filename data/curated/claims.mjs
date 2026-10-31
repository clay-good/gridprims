// The unverified-claim register (site/limitations, "The unverified-claim
// register"): research claims shipped code or pages rely on that are still
// tagged unverified. Manifests declare the ids they rely on in `claims`; the
// build fails when an id has no entry here.

export default [
  {
    id: 'pge-green-button-csv-layout',
    claim: 'PG&E\'s Green Button CSV starts with about five metadata rows, then TYPE, DATE, START TIME, END TIME, USAGE (kWh), COST, NOTES.',
    brief: 'docs/research/07-methods-and-formats-verification.md §3',
    usedBy: ['/files/ (file intake recognizes this layout)'],
    wouldConfirm: 'One real PG&E export, with personal fields removed, sent through a problem report.',
  },
  {
    id: 'smart-meter-texas-columns',
    claim: 'Smart Meter Texas 15-minute exports carry ESIID, usage date, start and end times, kWh, an estimated flag, and a consumption or surplus column.',
    brief: 'docs/research/09-audiences-and-data-access.md §1a',
    usedBy: ['/files/ (file intake recognizes this layout)'],
    wouldConfirm: 'One real Smart Meter Texas export, with the ESIID removed.',
  },
  {
    id: 'eia-861-release-month',
    claim: 'EIA posts the next EIA-861 release each August (an inferred date, not a posted one).',
    brief: 'docs/research/01-data-sources-and-licensing.md, EIA',
    usedBy: ['/data/eia-861/ (the expected next release)'],
    wouldConfirm: 'EIA posting a release date for the 2026 data.',
  },
];
