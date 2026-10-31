// LBNL's Queued Up: every request in US interconnection queues through the end
// of 2025 (add-public-grid-data: queue snapshot). An annual edition.

export default {
  id: 'lbnl-queued-up',
  title: 'Queued Up: Interconnection Queue Data File (Lawrence Berkeley National Laboratory)',
  publisher: 'Lawrence Berkeley National Laboratory and GridTracker',
  sourceUrl: 'https://emp.lbl.gov/queues',
  terms: {
    url: 'https://emp.lbl.gov/queues',
    section: 'Copyright Notice',
    // Captured 2026-10-31 from the Internet Archive's copy of that page made 2026-09-26
    // (web.archive.org/web/20260926081320/https://emp.lbl.gov/queues); the live page refuses scripted requests.
    text: 'The Queued Up data file is licensed CC BY 4.0. You may use, share, or adapt the dataset as long as you attribute it to Lawrence Berkeley National Laboratory and GridTracker. Queued Up Data File. Copyright (c) 2026, The Regents of the University of California, through Lawrence Berkeley National Laboratory (subject to receipt of any required approvals from the U.S. Dept. of Energy) & GridTracker. CC BY 4.0.',
    captured: '2026-10-31',
    license: 'CC-BY-4.0',
  },
  redistributionBasis: { kind: 'named license', note: 'CC BY 4.0, copyright The Regents of the University of California (LBNL) and GridTracker' },
  inputLicense: 'CC-BY-4.0',
  // No hand-set posture: the matcher derives it from the captured terms (queue-snapshot spec).
  factual: true,
  attribution: 'Lawrence Berkeley National Laboratory and GridTracker. Queued Up Data File, 2026 edition (data through the end of 2025), CC BY 4.0, retrieved {asOfMonth}.',
  cadence: { every: 'annual', nextRelease: { date: '2027-06-30', posted: false, note: 'LBNL publishes each edition in spring or early summer; the date is inferred, not posted' } },
  ceii: {
    infrastructure: true,
    note: 'Proposed and built projects by county, size, type, and status as LBNL publishes them. Point-of-interconnection substation names are left out of our table.',
    checklist: { publicSourceOnly: true, noPlanningModels: true, noSubstationPoints: true, noOneLineDiagrams: true, noBusImpedances: true, noNdaData: true },
  },
  owner: 'add-public-grid-data',
  // LBNL posts each edition under an upload-month path, so a new edition is a hand-made bump.
  vintages: {
    2025: { url: 'https://emp.lbl.gov/sites/default/files/2026-05/LBNL_Ix_Queue_Data_File_thru2025.xlsx', asOf: '2026-05-07', sha256: '794582d3281c6a305e9615fcfec3fae9dc85be2165216d33760b677e976a08b6' },
  },
  recipe: [
    { step: 'fetch', url: '{vintage.url}' },
  ],
  tables: [
    {
      name: 'requests',
      title: 'Interconnection requests with status, dates, county, type, and capacity',
      recipe: [
        { step: 'read-xlsx', sheet: '03. Complete Queue Data', headerRows: 2 },
        { step: 'normalize', module: 'lbnl-queue' },
        { step: 'quirk', name: 'repeated-ids', note: 'A queue id that repeats within an entity keeps every row, numbered by seq in file order, since LBNL\'s totals count each.', fixture: 'verify/fixtures/data/lbnl-queued-up/repeated.json' },
        { step: 'validate', key: ['q_id', 'entity', 'seq'], rows: { min: 34000, max: 48000, maxDropPct: 10, maxRisePct: 25, from: 'the 2026 edition (38,201 requests)' } },
        { step: 'partition', by: 'state', unmatched: 'no_state' },
        { step: 'write-shards' },
        { step: 'write-csv-gz' },
      ],
    },
  ],
};
