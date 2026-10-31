export default {
  id: 'calc.transformer.size',
  version: '0.1.0',
  title: 'Transformer sizing and loading',
  purpose: 'How many kVA a load needs, and how heavily a transformer of the rating you are considering would carry it.',
  archetype: 'calculator',
  firstScreen: ['loadAs', 'load', 'phases', 'volts', 'rating'],
  inputs: [
    { name: 'loadAs', label: 'Load given as', type: 'enum', options: [{ value: 'amps', label: 'Amps' }, { value: 'kva', label: 'kVA' }, { value: 'kw', label: 'kW, with a power factor' }], example: 'amps' },
    { name: 'load', label: 'Load', type: 'number', unit: 'A, kVA, or kW', range: { min: 0, max: 1e7 }, precision: 'exact', example: 600 },
    { name: 'phases', label: 'Service', type: 'enum', options: [{ value: 'three', label: 'Three-phase' }, { value: 'single', label: 'Single-phase' }], example: 'three' },
    { name: 'volts', label: 'Voltage (line-to-line for three-phase)', type: 'number', unit: 'V', range: { min: 1, max: 1e6 }, precision: 'exact', example: 480 },
    { name: 'rating', label: 'Transformer rating you are considering', type: 'number', unit: 'kVA', range: { min: 0.001, max: 1e7 }, precision: 'exact', example: 500 },
    { name: 'pf', label: 'Power factor (for a load in kW)', type: 'number', unit: 'power factor', range: { min: 0, max: 1 }, precision: 'exact', example: 0.95 },
  ],
  outputs: [
    { name: 'kva', label: 'Apparent power needed', unit: 'kVA', rounding: { decimals: 1, fixed: true } },
    { name: 'loading', label: 'Loading', unit: '%', rounding: { decimals: 1, fixed: true } },
    { name: 'headroom', label: 'Headroom', unit: 'kVA', rounding: { decimals: 1, fixed: true } },
    { name: 'amps', label: 'Current', unit: 'A', rounding: { decimals: 1, fixed: true } },
  ],
  commandForms: ['{load} {loadAs} at {volts} V'],
  method: 'Apparent power is √3 × V line-to-line × A ÷ 1,000 for three-phase service and V × A ÷ 1,000 for single-phase, or kW ÷ power factor. Loading is kVA ÷ rating, and headroom is rating − kVA.',
  assumptions: [
    'Three-phase voltage is line-to-line, and the load is balanced across phases.',
    'A load given in kW uses the power factor entered.',
  ],
  citations: [
    { source: 'NIST Special Publication 811', edition: '2008', locator: 'Section 8: apparent power (volt ampere) and its relation to voltage and current', url: 'https://www.nist.gov/pml/special-publication-811' },
    { source: 'IEEE C57.91, Guide for Loading Mineral-Oil-Immersed Transformers, and IEEE C57.96 for dry-type transformers', edition: 'named only; not quoted or applied', locator: 'Overload duration, hot-spot temperature, and loss of life', paywalled: true },
  ],
  datasets: [],
  examples: [
    { id: 'amps-480-3ph', title: '600 A at 480 V three-phase on a 500 kVA transformer', inputs: { loadAs: 'amps', load: 600, phases: 'three', volts: 480, rating: 500, pf: 0.95 }, expect: { kva: { value: 498.8, tolerance: { abs: 0.05 }, display: '498.8' }, loading: { value: 99.8, tolerance: { abs: 0.05 }, display: '99.8' } }, source: 'calc/transformer-sizing spec, scenario "Three-phase from amps": √3 × 480 × 600 ÷ 1,000' },
    { id: 'kw-peak', title: 'A 412 kW peak at 0.95 on a 500 kVA transformer', inputs: { loadAs: 'kw', load: 412, phases: 'three', volts: 480, rating: 500, pf: 0.95 }, expect: { kva: { value: 433.7, tolerance: { abs: 0.05 }, display: '433.7' }, loading: { value: 86.7, tolerance: { abs: 0.05 }, display: '86.7' }, headroom: { value: 66.3, tolerance: { abs: 0.05 }, display: '66.3' } }, source: 'calc/transformer-sizing spec, scenario "Peak loading"' },
    { id: 'single-240', title: '200 A at 240 V single-phase', inputs: { loadAs: 'amps', load: 200, phases: 'single', volts: 240, rating: 50, pf: 0.95 }, expect: { kva: { value: 48, tolerance: { abs: 0.05 }, display: '48.0' } }, source: 'Hand computation: 240 × 200 ÷ 1,000' },
  ],
  related: ['calc.power-factor.correct'],
  handoffs: [],
  stability: 'experimental',
  validation: {
    level: 1,
    evidence: [
      { kind: 'own-examples', summary: 'Hand-computed cases for single-phase, three-phase, and amps from kVA match to 0.1 kVA, and 498.8 kVA converts back to 600 A within 0.1 A. No freely published worked sizing example has been found to register.' },
    ],
  },
  toRaise: 'A freely published worked transformer-sizing example from a utility or government source, reproduced within 0.1 kVA, would raise it to cross-checked.',
  screeningLabel: 'Screening estimate: the utility or an engineer sizes the transformer for real.',
  limitations: [
    'Names no standard rating; the standard list is in a paid IEEE standard.',
    'Does not compute permissible overload time, hot-spot or top-oil temperature, or loss of life.',
    'Assumes a balanced three-phase load; unbalanced loads need each phase checked.',
  ],
};
