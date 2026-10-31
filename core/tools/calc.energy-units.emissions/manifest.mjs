import { EDITION, RATES } from './rates.mjs';

export default {
  id: 'calc.energy-units.emissions',
  version: '0.1.0',
  title: 'Emissions from electricity use',
  purpose: 'Estimate the CO₂ and other greenhouse gases from a year of electricity use at your eGRID subregion\'s average rates.',
  archetype: 'calculator',
  firstScreen: ['mwh', 'subregion'],
  inputs: [
    { name: 'mwh', label: 'Electricity used', type: 'number', unit: 'MWh', range: { min: 0, max: 1e9 }, precision: 'exact', example: 1000 },
    { name: 'subregion', label: 'eGRID subregion', type: 'enum', options: Object.entries(RATES).map(([id, r]) => ({ value: id, label: `${id} · ${r.name}` })), example: 'ERCT' },
  ],
  outputs: [
    { name: 'co2', label: 'CO₂', unit: 'metric tons', rounding: { decimals: 2, fixed: true } },
    { name: 'co2e', label: 'CO₂ equivalent', unit: 'metric tons', rounding: { decimals: 2, fixed: true } },
    { name: 'ch4', label: 'Methane (CH₄)', unit: 'metric tons', rounding: { decimals: 4 } },
    { name: 'n2o', label: 'Nitrous oxide (N₂O)', unit: 'metric tons', rounding: { decimals: 4 } },
  ],
  commandForms: ['{mwh} MWh in {subregion}', '{mwh} MWh emissions in {subregion}'],
  method: `Multiply the energy by the subregion's ${EDITION.name} total output emission rate for each gas (lb/MWh), convert pounds to metric tons (0.45359237 kg/lb), and add CH₄ and N₂O to CO₂ with the 100-year global warming potentials eGRID uses (AR5: 28 and 265).`,
  assumptions: [
    'The subregion\'s average rate over the whole year applies to every MWh, whenever it was used (location-based accounting).',
    'Total output rates include all generation in the subregion; they are not marginal or hourly rates.',
  ],
  citations: [
    { source: `EPA, Emissions & Generation Resource Integrated Database (${EDITION.name})`, edition: `${EDITION.name}, served snapshot ${EDITION.snapshot}`, locator: 'Subregion file: total output emission rates (lb/MWh) for CO₂, CH₄, N₂O, and CO₂e', url: 'https://www.epa.gov/egrid' },
    { source: `EPA, ${EDITION.name} Technical Guide`, edition: 'January 2025', locator: 'CO₂ equivalent emissions, PDF page 23: GWPs from AR5 without climate-carbon feedbacks (CH₄ 28, N₂O 265)', url: 'https://www.epa.gov/egrid/egrid-technical-guide' },
    { source: 'NIST Special Publication 811', edition: '2008', locator: 'Appendix B.8, pound (avoirdupois) to kilogram', url: 'https://www.nist.gov/pml/special-publication-811' },
  ],
  datasets: ['egrid'],
  examples: [
    { id: 'erct-1000', title: '1,000 MWh in ERCOT (ERCT)', inputs: { mwh: 1000, subregion: 'ERCT' }, expect: { co2: { value: (1000 * RATES.ERCT.co2 * 0.45359237) / 1000, tolerance: { abs: 0.005 }, display: ((1000 * RATES.ERCT.co2 * 0.45359237) / 1000).toFixed(2) } }, source: `${EDITION.name} ERCT CO₂ rate of ${RATES.ERCT.co2} lb/MWh × 0.45359237 kg/lb` },
  ],
  related: ['calc.energy-units.convert'],
  handoffs: [
    { label: 'EPA Power Profiler', url: 'https://www.epa.gov/egrid/power-profiler' },
  ],
  stability: 'experimental',
  validation: {
    level: 2,
    evidence: [
      { kind: 'own-examples', summary: 'A worked example and the spec\'s 800 lb/MWh case (362.87 metric tons for 1,000 MWh) pass.' },
      { kind: 'published-example', path: 'verify/reference/egrid2023-co2e-check.json', summary: 'CO₂e computed from each subregion\'s CO₂, CH₄, and N₂O rates with the technical guide\'s GWPs matches eGRID\'s own published CO₂e rate within 0.1% in all 27 subregions.' },
    ],
  },
  toRaise: 'Three recorded cases where a utility or an emissions inventory used the same eGRID subregion rate would raise it to field-verified.',
  limitations: [
    'Average annual rates miss the hour-by-hour changes in the grid\'s mix; use hourly data when you have it.',
    'This is location-based accounting; contracts for clean power (market-based accounting) are not reflected.',
    `Rates are ${EDITION.name}'s; a newer edition will change them.`,
  ],
};
