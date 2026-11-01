export default {
  id: 'calc.cost.lcoe',
  version: '0.2.0',
  title: 'Levelized cost of energy',
  purpose: 'The levelized cost of energy from capital cost, operating costs, and capacity factor, with each term\'s share shown.',
  archetype: 'calculator',
  firstScreen: ['fcr', 'capex', 'fom', 'cf'],
  inputs: [
    { name: 'fcr', label: 'Fixed charge rate', type: 'number', unit: 'per year', range: { min: 0, max: 1 }, precision: 'exact', example: 0.07 },
    { name: 'capex', label: 'Capital cost', type: 'number', unit: '$/kW', range: { min: 0, max: 1e6 }, precision: 'exact', example: 1000 },
    { name: 'fom', label: 'Fixed O&M', type: 'number', unit: '$/kW-year', range: { min: 0, max: 1e5 }, precision: 'exact', example: 20 },
    { name: 'cf', label: 'Capacity factor', type: 'number', unit: '%', range: { min: 0.01, max: 100 }, precision: 'exact', example: 25 },
    { name: 'vom', label: 'Variable O&M', type: 'number', unit: '$/MWh', range: { min: 0, max: 1e5 }, precision: 'exact', example: 0 },
    { name: 'fuel', label: 'Fuel cost', type: 'number', unit: '$/MWh', range: { min: 0, max: 1e5 }, precision: 'exact', example: 0 },
  ],
  outputs: [
    { name: 'lcoe', label: 'Levelized cost of energy', unit: '$/MWh', rounding: { decimals: 2, fixed: true } },
    { name: 'capital', label: 'Capital share', unit: '$/MWh', rounding: { decimals: 2, fixed: true } },
    { name: 'fixed', label: 'Fixed O&M share', unit: '$/MWh', rounding: { decimals: 2, fixed: true } },
  ],
  method: 'LCOE = (fixed charge rate × capital cost + fixed O&M) ÷ (capacity factor × 8.76 MWh per kW-year) + variable O&M + fuel cost, as NLR\'s Annual Technology Baseline defines it.',
  assumptions: [
    'The fixed charge rate carries the financing, taxes, and project life; it is entered, not computed.',
    'Costs are in the same year\'s dollars; no default is offered, so every input is yours.',
  ],
  citations: [
    { source: 'NLR, Annual Technology Baseline (ATB): Levelized Cost of Energy', edition: '2025', locator: 'LCOE equation: (FCR × CAPEX + FOM) ÷ (CF × 8,760) + VOM + fuel', url: 'https://atb.nlr.gov/' },
  ],
  datasets: [],
  examples: [
    { id: 'spec-41', title: 'FCR 0.07, $1,000/kW, $20/kW-year, 25% capacity factor', inputs: { fcr: 0.07, capex: 1000, fom: 20, cf: 25, vom: 0, fuel: 0 }, expect: { lcoe: { value: 41.10, tolerance: { abs: 0.005 }, display: '41.10' }, capital: { value: 31.96, tolerance: { abs: 0.005 }, display: '31.96' }, fixed: { value: 9.13, tolerance: { abs: 0.005 }, display: '9.13' } }, source: 'calc/storage-and-cost spec, scenario "LCOE numbers": 90 ÷ 2.19' },
  ],
  glossary: ['capacity-factor', 'kwh'],
  related: ['calc.storage.basics'],
  handoffs: [{ label: 'NLR Annual Technology Baseline', url: 'https://atb.nlr.gov/' }],
  stability: 'experimental',
  validation: {
    level: 2,
    evidence: [
      { kind: 'own-examples', summary: 'The spec\'s $41.10/MWh case passes, with each term shown.' },
      { kind: 'published-example', path: 'verify/reference/atb-2025-lcoe-cases.json', summary: 'NLR ATB 2025\'s published LCOE for nine technologies (utility, commercial, and residential PV, land-based and offshore wind, geothermal, hydropower, biopower, and CSP) is reproduced from each case\'s own inputs within 1%.' },
    ],
  },
  toRaise: 'Three recorded project cases where the LCOE was checked against a developer\'s or utility\'s own figure would raise it to field-verified.',
  limitations: [
    'A simple LCOE: no degradation, construction period, or tax detail beyond what the fixed charge rate carries.',
    'No defaults are offered; read the ATB for costs and capacity factors by technology.',
  ],
};
