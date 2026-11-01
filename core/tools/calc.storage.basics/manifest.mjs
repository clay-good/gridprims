export default {
  id: 'calc.storage.basics',
  version: '0.1.0',
  title: 'Battery duration and usable energy',
  purpose: 'How long a battery runs at a given power, its C-rate, and how much energy it delivers and needs to recharge.',
  archetype: 'calculator',
  firstScreen: ['powerMw', 'energyMwh', 'dispatchMw', 'dod', 'roundTrip'],
  inputs: [
    { name: 'powerMw', label: 'Rated power', type: 'number', unit: 'MW', range: { min: 0.000001, max: 1e6 }, precision: 'exact', example: 100 },
    { name: 'energyMwh', label: 'Rated energy', type: 'number', unit: 'MWh', range: { min: 0.000001, max: 1e7 }, precision: 'exact', example: 400 },
    { name: 'dispatchMw', label: 'Dispatch power', type: 'number', unit: 'MW', range: { min: 0.000001, max: 1e6 }, precision: 'exact', example: 75 },
    { name: 'dod', label: 'Depth of discharge', type: 'number', unit: '%', range: { min: 1, max: 100 }, precision: 'exact', example: 90 },
    { name: 'roundTrip', label: 'Round-trip efficiency', type: 'number', unit: '%', range: { min: 1, max: 100 }, precision: 'exact', example: 85 },
  ],
  outputs: [
    { name: 'durationDispatch', label: 'Duration at dispatch power', unit: 'h', rounding: { decimals: 2, fixed: true } },
    { name: 'cRate', label: 'C-rate at dispatch power', unitless: true, rounding: { sigFigs: 4 } },
    { name: 'durationRated', label: 'Duration at rated power', unit: 'h', rounding: { decimals: 2, fixed: true } },
    { name: 'usable', label: 'Usable delivered energy', unit: 'MWh', rounding: { decimals: 1, fixed: true } },
    { name: 'charging', label: 'Charging energy needed', unit: 'MWh', rounding: { decimals: 1, fixed: true } },
  ],
  method: 'Duration is energy ÷ power; C-rate is power ÷ energy. Depth of discharge limits the energy delivered, and round-trip efficiency is a loss taken on charging, so charging energy is delivered energy ÷ efficiency. The same convention holds in the workbench\'s battery screen.',
  assumptions: [
    'Rated energy is the battery\'s nameplate energy at its rated power; real duration falls at high power and low temperature.',
    'Depth of discharge and round-trip efficiency are the values entered; degradation is not modeled.',
  ],
  citations: [
    { source: 'NLR, Annual Technology Baseline (ATB): Utility-Scale Battery Storage', edition: '2025', locator: 'Definitions of power, energy, duration, and round-trip efficiency', url: 'https://atb.nlr.gov/' },
  ],
  datasets: [],
  examples: [
    { id: 'partial-power', title: '100 MW / 400 MWh dispatching at 75 MW', inputs: { powerMw: 100, energyMwh: 400, dispatchMw: 75, dod: 90, roundTrip: 85 }, expect: { durationDispatch: { value: 5.33, tolerance: { abs: 0.005 }, display: '5.33' }, cRate: { value: 0.1875, tolerance: { abs: 0.00005 }, display: '0.1875' }, usable: { value: 360, tolerance: { abs: 0.05 }, display: '360.0' }, charging: { value: 423.5, tolerance: { abs: 0.05 }, display: '423.5' } }, source: 'calc/storage-and-cost spec, scenarios "Partial-power dispatch" and "Usable energy"' },
  ],
  glossary: ['kw', 'kwh'],
  related: ['calc.cost.lcoe'],
  handoffs: [{ label: 'NLR Annual Technology Baseline', url: 'https://atb.nlr.gov/' }],
  stability: 'experimental',
  validation: { level: 1, evidence: [{ kind: 'own-examples', summary: 'The spec\'s 5.33 h, 0.1875 C-rate, 360 MWh, and 423.5 MWh cases pass.' }] },
  toRaise: 'A published battery worked example reproduced with the same convention would raise it to cross-checked.',
  limitations: [
    'Real duration depends on power level, temperature, and age; these are nameplate figures.',
    'Auxiliary loads and standby losses are not modeled.',
  ],
};
