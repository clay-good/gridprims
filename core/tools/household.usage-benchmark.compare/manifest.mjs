const months = (y, kwhs) => kwhs.map((k, i) => `${y}-${String(i + 1).padStart(2, '0')}, ${k.toLocaleString('en-US')} kWh`).join('\n');

export default {
  id: 'household.usage-benchmark.compare',
  version: '0.1.0',
  title: 'Is my use high?',
  purpose: 'Compare a year of your electricity use with the average home of your utility and your state, and see your seasonal swing.',
  archetype: 'calculator',
  firstScreen: ['periods', 'utilityAverage', 'stateAverage', 'dataYear'],
  inputs: [
    { name: 'periods', label: 'Billing periods', type: 'text', multiline: true, example: months(2025, Array(12).fill(1200)), hint: 'One period a line: the dates (or a month, as 2026-03) and the kWh. Twelve periods give a year; fewer are scaled to a year by the days they cover.' },
    { name: 'utilityAverage', label: 'Utility average home', type: 'number', unit: 'kWh a year', picker: 'eia-averages', range: { min: 1, max: 1000000 }, precision: 'exact', example: 12000 },
    { name: 'stateAverage', label: 'State average home', type: 'number', unit: 'kWh a year', range: { min: 1, max: 1000000 }, precision: 'exact', example: 12000 },
    { name: 'dataYear', label: 'Data year of the averages', type: 'number', unit: 'year', range: { min: 1990, max: 2100 }, precision: 'exact', example: 2025 },
  ],
  outputs: [
    { name: 'vsUtility', label: 'Compared with the utility average', unit: '%', rounding: { decimals: 1 } },
    { name: 'vsState', label: 'Compared with the state average', unit: '%', rounding: { decimals: 1 } },
    { name: 'annualKwh', label: 'A year of use', unit: 'kWh', rounding: { decimals: 0 } },
    { name: 'ratio', label: 'Highest period over lowest, per day', unit: '×', rounding: { decimals: 1 } },
  ],
  method: 'Sum the latest 12 periods, or scale fewer to 365 days by the days they cover. Compare with EIA-861\'s average residential use per customer (residential sales ÷ residential customers) for the utility and the state, as a percent difference. Then compare the highest and lowest periods by kWh per day.',
  assumptions: [
    'State averages leave out delivery-only rows, whose customers EIA also counts under the company that sells them energy; this is how EIA\'s Table 5A counts them.',
    'A partial year is scaled by days, so a year with a hot summer and a mild winter in the missing months reads high or low.',
  ],
  citations: [
    { source: 'EIA, Annual Electric Power Industry Report (Form EIA-861)', edition: '2025', locator: 'Sales to Ultimate Customers: residential sales (MWh) and customers', url: 'https://www.eia.gov/electricity/data/eia861/' },
    { source: 'EIA, Electric Sales, Revenue, and Average Price', edition: '2024', locator: 'Table 5A, average monthly residential consumption by state', url: 'https://www.eia.gov/electricity/sales_revenue_price/' },
  ],
  datasets: ['eia-861'],
  examples: [
    { id: 'above-utility', title: '14,400 kWh against a 12,000 kWh average', inputs: { periods: months(2025, Array(12).fill(1200)), utilityAverage: 12000, stateAverage: 12000, dataYear: 2025 }, expect: { vsUtility: { value: 20, tolerance: { abs: 0.05 }, display: '20' }, annualKwh: { value: 14400, tolerance: { abs: 0.5 }, display: '14,400' } }, source: 'household/usage-benchmark spec, scenario "Above utility average"' },
    { id: 'partial-year', title: 'Seven months covering 213 days', inputs: { periods: '2026-01, 1,922 kWh\n2026-02, 1,400 kWh\n2026-03, 1,000 kWh\n2026-04, 800 kWh\n2026-05, 744 kWh\n2026-06, 900 kWh\n2026-07-01 to 2026-08-01, 1,200 kWh', utilityAverage: 12000, stateAverage: 12000, dataYear: 2025 }, expect: { annualKwh: { value: 13651, tolerance: { abs: 0.5 }, display: '13,651' }, ratio: { value: 2.6, tolerance: { abs: 0.05 }, display: '2.6' } }, source: 'household/usage-benchmark spec, scenarios "Partial year" (213 days) and "Winter-heavy pattern" (62 and 24 kWh a day)' },
  ],
  related: ['household.bill-totals.check'],
  handoffs: [
    { label: 'EIA-861 data files', url: 'https://www.eia.gov/electricity/data/eia861/' },
  ],
  stability: 'experimental',
  validation: {
    level: 2,
    evidence: [
      { kind: 'own-examples', summary: 'Two worked examples from the spec\'s scenarios pass, and three utilities\' averages computed by hand from their EIA-861 rows match.' },
      { kind: 'published-example', path: 'verify/reference/eia-table-5a-usage.json', summary: 'State averages computed from EIA-861 2024 match EIA\'s published Table 5A average monthly residential consumption in all 51 states.' },
    ],
  },
  toRaise: 'Three recorded real bills compared with their utility\'s published average would raise it to field-verified.',
  limitations: [
    'An average includes homes of every size, age, and heating type; a large or all-electric home can be well above it and use energy well.',
    'EIA-861 publishes no distribution of use, so this shows no percentile, rank, or "homes like yours".',
    'The averages are for the latest EIA-861 year, which may differ from the year of your bills.',
  ],
};
