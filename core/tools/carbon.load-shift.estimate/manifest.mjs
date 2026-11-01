export default {
  id: 'carbon.load-shift.estimate',
  version: '0.1.0',
  title: 'Cleanest hours and load shifting',
  purpose: 'The typical cleanest and dirtiest hours in your grid region, and the CO₂ a flexible load would avoid by moving to cleaner hours.',
  archetype: 'calculator',
  firstScreen: ['kwhPerDay', 'currentLbPerMwh', 'proposedLbPerMwh'],
  inputs: [
    { name: 'kwhPerDay', label: 'Flexible load', type: 'number', unit: 'kWh a day', range: { min: 0, max: 1e7 }, precision: 'exact', example: 200, hint: 'An EV charging 40 miles a day uses about 12 kWh.' },
    { name: 'currentLbPerMwh', label: 'Typical intensity in the hours you use it now', type: 'number', unit: 'lb CO₂/MWh', picker: 'cleanest-hours', range: { min: 0, max: 5000 }, precision: 'exact', example: 1000 },
    { name: 'proposedLbPerMwh', label: 'Typical intensity in the hours you could move it to', type: 'number', unit: 'lb CO₂/MWh', range: { min: 0, max: 5000 }, precision: 'exact', example: 700 },
    { name: 'days', label: 'Days a year', type: 'number', unit: 'days', range: { min: 1, max: 366 }, precision: 'exact', example: 365 },
  ],
  outputs: [
    { name: 'changeLb', label: 'Attributed CO₂ avoided', unit: 'lb a year', rounding: { decimals: 0, fixed: true } },
    { name: 'changeT', label: 'Attributed CO₂ avoided', unit: 'metric tons a year', rounding: { decimals: 1, fixed: true } },
  ],
  method: 'CO₂ avoided = kWh a day × (current − proposed typical intensity) ÷ 1,000 × days. Typical intensities are EIA-930 consumption-based CO₂ intensity, the median for each local clock hour of each month over the latest three complete years, averaged over the hours of each window and weighted by days in each month.',
  assumptions: [
    'The load is spread evenly over the hours of each window.',
    'The same daily energy moves on every day of the year.',
  ],
  citations: [
    { source: 'U.S. Energy Information Administration, Hourly Electric Grid Monitor (Form EIA-930)', edition: 'per-region workbooks, served snapshot 2026-10', locator: 'CO2 Emissions Intensity for Consumed Electricity (lb/kWh)', url: 'https://www.eia.gov/electricity/gridmonitor/' },
    { source: 'NIST Special Publication 811', edition: '2008', locator: 'Appendix B.8, pound (avoirdupois) to kilogram', url: 'https://www.nist.gov/pml/special-publication-811' },
  ],
  datasets: ['eia-930'],
  examples: [
    { id: 'spec-ev', title: 'Moving 200 kWh a day of EV charging from evening to midday', inputs: { kwhPerDay: 200, currentLbPerMwh: 1000, proposedLbPerMwh: 700, days: 365 }, expect: { changeLb: { value: 21900, tolerance: { abs: 1e-6 }, display: '21,900' }, changeT: { value: 9.9337, tolerance: { abs: 0.0001 }, display: '9.9' } }, source: 'carbon/cleanest-hours spec, scenario "Move EV charging": 200 kWh × 0.300 lb/kWh × 365 = 21,900 lb' },
    { id: 'dirtier', title: 'A move into dirtier hours shows as more CO₂', inputs: { kwhPerDay: 10, currentLbPerMwh: 600, proposedLbPerMwh: 800, days: 365 }, expect: { changeLb: { value: -730, tolerance: { abs: 1e-6 }, display: '-730' } }, source: 'Hand-computed: 10 kWh × −0.2 lb/kWh × 365 = −730 lb' },
  ],
  glossary: ['consumption-based-intensity', 'balancing-authority', 'kwh'],
  related: ['calc.energy-units.emissions'],
  handoffs: [{ label: 'Hourly emissions of your own meter file (the workbench)', url: 'https://gridprims.com/files/' }],
  stability: 'experimental',
  validation: { level: 1, evidence: [{ kind: 'own-examples', summary: 'The spec\'s EV example (21,900 lb, 9.9 metric tons) and a move into dirtier hours, each hand-computed.' }] },
  toRaise: 'Typical hours checked against Open Grid Emissions\' hourly rates for the same regions and years would raise it to cross-checked.',
  screeningLabel: 'An estimate from history using average-intensity (attributional) accounting: not a forecast, and not the actual change in grid emissions, which depends on the marginal generators.',
  limitations: [
    'Typical hours come from the latest three complete years; a region adding solar or retiring coal changes them.',
    'Average intensity, not marginal: the generators that actually respond to a shift can be cleaner or dirtier.',
    'EIA computes hourly CO₂ from generation by fuel times annual average emission factors.',
  ],
};
