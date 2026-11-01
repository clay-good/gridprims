const months = [88, 92, 101, 97, 110, 118, 120, 116, 104, 95, 90, 86].join(', ');

export default {
  id: 'electrify.service-headroom.check',
  version: '0.1.0',
  title: 'Service headroom',
  purpose: 'How much room is left on an existing electric service, from the demand the meter already measured.',
  archetype: 'calculator',
  firstScreen: ['demand', 'volts', 'phase', 'ratingA', 'edition'],
  inputs: [
    { name: 'demand', label: 'Maximum demand', type: 'text', multiline: true, unit: 'kW', example: '120', hint: 'Twelve monthly maximum demands from demand-metered bills, separated by commas, or the one highest 15-minute demand from a recording of 30 days or more.' },
    { name: 'volts', label: 'Service voltage', type: 'number', unit: 'V', range: { min: 100, max: 35000 }, precision: 'exact', example: 480 },
    { name: 'phase', label: 'Phase', type: 'enum', options: [{ value: '1', label: 'Single-phase' }, { value: '3', label: 'Three-phase' }], example: '3' },
    { name: 'ratingA', label: 'Service rating', type: 'number', unit: 'A', range: { min: 1, max: 10000 }, precision: 'exact', example: 400 },
    { name: 'edition', label: 'NEC edition adopted locally', type: 'enum', options: [{ value: '2023', label: '2023 NEC, section 220.87' }, { value: '2026', label: '2026 NEC, section 120.87 (section number not yet confirmed)' }], example: '2023' },
    { name: 'basis', label: 'Where the demand comes from', type: 'enum', options: [{ value: 'recording', label: 'A recording of 30 days or more' }, { value: 'bills', label: 'Twelve monthly bills' }], example: 'recording' },
    { name: 'powerFactor', label: 'Power factor', type: 'number', unit: 'fraction', range: { min: 0.01, max: 1 }, precision: 'exact', example: 0.95, hint: 'Use the measured power factor when the bill or file shows one; otherwise 1.0, and compare the result at 0.90.' },
    { name: 'generation', label: 'Solar, wind, a battery, or peak shaving on this service', type: 'enum', options: [{ value: 'no', label: 'No' }, { value: 'yes', label: 'Yes' }], example: 'no' },
  ],
  outputs: [
    { name: 'headroomA', label: 'Headroom', unit: 'A', rounding: { decimals: 1, fixed: true } },
    { name: 'headroomKva', label: 'Headroom', unit: 'kVA', rounding: { decimals: 1, fixed: true } },
    { name: 'amps', label: 'Demand × 125%', unit: 'A', rounding: { decimals: 1, fixed: true } },
    { name: 'maxKw', label: 'Maximum demand', unit: 'kW', rounding: { decimals: 1, fixed: true } },
    { name: 'kva', label: 'Maximum demand', unit: 'kVA', rounding: { decimals: 1, fixed: true } },
    { name: 'kva125', label: 'Demand × 125%', unit: 'kVA', rounding: { decimals: 1, fixed: true } },
    { name: 'headroomA90', label: 'Headroom at power factor 0.90', unit: 'A', rounding: { decimals: 1, fixed: true } },
  ],
  method: 'Existing load = maximum demand ÷ power factor × 125%, in amps at the service voltage (single-phase: kVA × 1,000 ÷ V; three-phase: kVA × 1,000 ÷ (√3 × V)); headroom = service rating − existing load.',
  assumptions: [
    'The maximum demand is a 15-minute average, the way demand meters and interval files record it.',
    'Utility meter data is the service total and assumes balanced phases.',
  ],
  citations: [
    { source: 'NFPA 70, National Electrical Code', edition: '2023', locator: 'Section 220.87, Determining Existing Loads (cited and paraphrased; read it through NFPA\'s free access); see docs/derivations/service-headroom.md', url: 'https://www.nfpa.org/freeaccess' },
    { source: 'Mike Holt, Code Q&A: Calculating feeder or service loads, EC&M', edition: 'August 8, 2014', locator: 'Worked existing-load example, 200 A single-phase service', url: 'https://www.ecmweb.com/national-electrical-code/qa/article/20899437/code-qa-calculating-feeder-or-service-loads' },
  ],
  datasets: [],
  examples: [
    { id: 'spec-480v', title: '120 kW on a 480 V three-phase, 400 A service', inputs: { demand: '120', basis: 'recording', powerFactor: 0.95, volts: 480, phase: '3', ratingA: 400, generation: 'no', edition: '2023' }, expect: { kva: { value: 126.3158, tolerance: { abs: 0.05 }, display: '126.3' }, kva125: { value: 157.8947, tolerance: { abs: 0.05 }, display: '157.9' }, amps: { value: 189.92, tolerance: { abs: 0.05 }, display: '189.9' }, headroomA: { value: 210.08, tolerance: { abs: 0.05 }, display: '210.1' }, headroomKva: { value: 174.66, tolerance: { abs: 0.05 }, display: '174.7' } }, source: 'electrify/service-headroom spec, scenario "Three-phase service"' },
    { id: 'bills', title: 'Twelve demand-metered bills on a 208 V three-phase, 600 A service', inputs: { demand: months, basis: 'bills', powerFactor: 1, volts: 208, phase: '3', ratingA: 600, generation: 'no', edition: '2023' }, expect: { maxKw: { value: 120, tolerance: { abs: 0.05 }, display: '120.0' }, amps: { value: 416.37, tolerance: { abs: 0.05 }, display: '416.4' }, headroomA: { value: 183.63, tolerance: { abs: 0.05 }, display: '183.6' } }, source: 'Own example: 120 kW × 1.25 = 150 kVA; 150,000 ÷ (√3 × 208) = 416.4 A' },
  ],
  glossary: ['kw', 'demand'],
  related: [],
  handoffs: [{ label: 'Conductor sizing and full load calculations (RoughLogic)', url: 'https://roughlogic.com/' }],
  stability: 'experimental',
  validation: {
    level: 2,
    evidence: [
      { kind: 'own-examples', summary: 'The spec\'s 480 V scenario (126.3 kVA, 157.9 kVA, 189.9 A, 210.1 A, 174.7 kVA) and a twelve-bill example pass.' },
      { kind: 'published-example', path: 'verify/reference/nec-existing-load-examples.json', summary: 'Two published worked examples (EC&M, 2014; Electrical Contractor, 2011) are reproduced to the whole amps they print: 123 A, 173 A, and 27 A spare; 929 A, 1,180 A, and 20 A spare.' },
    ],
  },
  toRaise: 'Three recorded cases where an electrician\'s 30-day recording and our figure from the same site were compared would raise it to field-verified.',
  claims: ['nec-2026-section-120-87'],
  screeningLabel: 'A starting point for your electrician, not a load calculation for a permit: the inspector decides.',
  limitations: [
    'Not a code compliance decision; conductor sizing and full load calculations are out of scope.',
    'Sites with solar, wind, a battery, or peak shaving cannot use the 30-day option.',
  ],
};
