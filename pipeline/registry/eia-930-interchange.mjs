// EIA-930's interchange identity for 2025 (add-data-continuity-ledger:
// consistency checks): each balancing authority reports its hourly flow with
// each neighbor and its total. EIA's own definitions make the two sides of a
// pair equal and opposite, and a total the sum of its pairs. Only our computed
// residuals ship; EIA's files stay with EIA.

import eia930 from './eia-930.mjs';

const file = (name, sha256) => ({ url: `https://www.eia.gov/electricity/gridmonitor/sixMonthFiles/${name}`, name, sha256, stream: true });

export default {
  ...eia930,
  id: 'eia-930-interchange',
  title: 'Interchange consistency of EIA-930, 2025: pair and total residuals by balancing authority',
  shortTitle: 'EIA-930 interchange residuals, 2025',
  description: {
    contains: 'For 2025, each pair of neighboring balancing authorities: the hours both reported their flow with each other, the hours only one did, and how far apart the two reports were. And each balancing authority: how far its reported total interchange was from the sum of its reported pairs, on both of EIA\'s totals, as reported and as adjusted.',
    excludes: 'No hourly values: residuals are summarized by year. A residual is an inconsistency between two reports, not missing or extra electricity.',
  },
  attribution: 'Computed by gridprims from U.S. Energy Information Administration, Hourly Electric Grid Monitor (Form EIA-930), six-month BALANCE and INTERCHANGE files for 2025 ({asOfMonth}).',
  owner: 'add-data-continuity-ledger',
  releaseWatch: undefined,
  // EIA's own statement of the identity and its caveats.
  revisionPolicy: 'https://www.eia.gov/electricity/930-content/about.html',
  vintages: {
    2025: {
      asOf: '2026-10-31', release: '2025 six-month files',
      files: {
        i1: file('EIA930_INTERCHANGE_2025_Jan_Jun.csv', '26346191ea9b738a166f75eeb3291b16d2863c74c51986c7779e71f194a2c32d'),
        i2: file('EIA930_INTERCHANGE_2025_Jul_Dec.csv', '6e9a627d9266975a65cf6a14f39a532332288d06c0ec1c228200585beecf13be'),
        b1: file('EIA930_BALANCE_2025_Jan_Jun.csv', 'fac4bb991dfa1dab3b4b35300ccab54ac99be13a40ce91954db8ddafb2816242'),
        b2: file('EIA930_BALANCE_2025_Jul_Dec.csv', '1146158b972439db7c7f4cc7d0491e07644ddbf244d03b8ecb44cb2c833d10f1'),
      },
    },
  },
  recipe: [{ step: 'fetch', url: '{vintage.files.*.url}' }],
  tables: [
    {
      name: 'pair_residuals',
      title: 'Each pair of neighboring balancing authorities: hours tested, hours unavailable, and how far apart the two reports were',
      recipe: [
        { step: 'read-lines', files: ['i1', 'i2'] },
        { step: 'normalize', module: 'eia-930-pair-residuals' },
        { step: 'validate', key: ['ba', 'neighbor'], rows: { min: 100, max: 400, maxDropPct: 20, maxRisePct: 20, from: '2025: about 200 directly interconnected pairs' } },
        { step: 'partition', by: null },
        { step: 'write-shards' },
        { step: 'write-csv-gz' },
      ],
    },
    {
      name: 'total_residuals',
      title: 'Each balancing authority: reported total interchange against the sum of its reported pairs, on both readings of the total',
      recipe: [
        { step: 'read-lines', files: ['b1', 'b2', 'i1', 'i2'] },
        { step: 'normalize', module: 'eia-930-total-residuals' },
        { step: 'validate', key: ['ba'], rows: { min: 50, max: 80, maxDropPct: 10, maxRisePct: 20, from: '2025: about 65 balancing authorities' } },
        { step: 'partition', by: null },
        { step: 'write-shards' },
        { step: 'write-csv-gz' },
      ],
    },
  ],
};
