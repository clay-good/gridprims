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
  {
    id: 'nec-2026-section-120-87',
    claim: 'The 2026 NEC moves 220.87, Determining Existing Loads, to 120.87, with the same 1-year and 30-day options and the same bar on the 30-day option for sites with solar, wind, or peak shaving.',
    brief: 'docs/derivations/service-headroom.md (Mike Holt\'s 2026 table of contents; Minnesota\'s 2026 adoption review)',
    usedBy: ['/tools/electrify/service-headroom/check/ (the 2026 edition option)'],
    wouldConfirm: 'Reading 120.87 in the 2026 NEC through NFPA\'s free access.',
  },
];
