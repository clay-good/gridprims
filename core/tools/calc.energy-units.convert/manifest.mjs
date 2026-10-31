import { UNITS } from './units.mjs';

const options = UNITS.map((u) => ({ value: u.id, label: u.label, unit: u.unit, ...(u.one ? { one: u.one } : {}), ...(u.aliases ? { aliases: u.aliases } : {}) }));

export default {
  id: 'calc.energy-units.convert',
  version: '0.1.0',
  title: 'Energy unit converter',
  purpose: 'Convert energy between kWh, MWh, Btu, therms, joules, and common fuels, with every constant and its source shown.',
  archetype: 'calculator',
  inputs: [
    { name: 'value', label: 'Amount', type: 'number', unitFrom: 'from', range: { min: -1e15, max: 1e15 }, precision: 'exact', example: 12 },
    { name: 'from', label: 'From', type: 'enum', options, example: 'MWh' },
    { name: 'to', label: 'To', type: 'enum', options, example: 'MMBtu' },
  ],
  outputs: [
    { name: 'value', label: 'Converted amount', unitFrom: 'to', rounding: { sigFigs: 4 } },
  ],
  commandForms: ['{value} {from} to {to}', '{value} {from} in {to}', '{value} {from} = {to}', '{from} to {to}'],
  method: 'Convert the amount to joules with its unit\'s definition, then from joules to the target unit. Fuels use EIA\'s published average heat content in Btu.',
  assumptions: [
    'Btu means the International Table Btu, 1,055.05585262 joules.',
    'A therm is 100,000 Btu.',
    'Fuel heat contents are US averages for the year shown, not the content of any one delivery.',
  ],
  citations: [
    { source: 'NIST Special Publication 811, Guide for the Use of the International System of Units', edition: '2008', locator: 'Appendix B.8, British thermal unit (IT) and kilowatt hour to joule', url: 'https://www.nist.gov/pml/special-publication-811' },
    { source: 'EIA, Heat Content of Natural Gas Consumed', edition: 'Annual, 2025', locator: 'US, delivered to consumers, Btu per cubic foot', url: 'https://www.eia.gov/dnav/ng/ng_cons_heat_a_EPG0_VGTH_btucf_a.htm' },
    { source: 'EIA, Monthly Energy Review', edition: 'Appendix A', locator: 'Table A1, approximate heat content of petroleum products', url: 'https://www.eia.gov/totalenergy/data/monthly/pdf/mer_A_FULL.pdf' },
    { source: 'EIA, Energy conversion calculators', edition: '2026 estimates', locator: 'Coal, electric power sector, Btu per short ton', url: 'https://www.eia.gov/energyexplained/units-and-calculators/energy-conversion-calculators.php' },
    { source: 'EIA, British thermal units (Btu)', edition: 'Energy Explained', locator: 'Therm and MMBtu definitions', url: 'https://www.eia.gov/energyexplained/units-and-calculators/british-thermal-units.php' },
  ],
  datasets: [],
  examples: [
    { id: 'mwh-to-mmbtu', title: '12 MWh to MMBtu', inputs: { value: 12, from: 'MWh', to: 'MMBtu' }, expect: { value: { value: 40.9457, tolerance: { abs: 0.0001 }, display: '40.95' } }, source: 'calc/energy-units-and-emissions spec, scenario "MWh to MMBtu"; factor from the NIST SP 811 Btu (IT) definition' },
    { id: 'gas-to-btu', title: '1,000 cubic feet of natural gas to Btu', inputs: { value: 1000, from: 'ft3-natural-gas', to: 'Btu' }, expect: { value: { value: 1036000, tolerance: { abs: 0.001 }, display: '1,036,000' } }, source: 'EIA 2025 US average of 1,036 Btu per cubic foot' },
    { id: 'kwh-to-btu', title: '1 kWh to Btu', inputs: { value: 1, from: 'kWh', to: 'Btu' }, expect: { value: { value: 3412.14, tolerance: { abs: 0.005 }, display: '3,412' } }, source: 'NIST SI derivation: 3.6 MJ ÷ 1,055.05585262 J per Btu' },
    { id: 'therm-to-kwh', title: '1 therm to kWh', inputs: { value: 1, from: 'therm', to: 'kWh' }, expect: { value: { value: 29.3071, tolerance: { abs: 0.0001 }, display: '29.31' } }, source: '100,000 Btu (EIA) × 1,055.05585262 J (NIST) ÷ 3.6 MJ' },
    { id: 'coal-to-mmbtu', title: '1 short ton of coal to MMBtu', inputs: { value: 1, from: 'short-ton-coal', to: 'MMBtu' }, expect: { value: { value: 18.792, tolerance: { abs: 0.0001 }, display: '18.79' } }, source: 'EIA 2026 estimate, electric power sector' },
  ],
  related: ['calc.energy-units.emissions'],
  handoffs: [
    { label: 'EIA energy conversion calculators', url: 'https://www.eia.gov/energyexplained/units-and-calculators/energy-conversion-calculators.php' },
  ],
  stability: 'experimental',
  validation: {
    level: 1,
    evidence: [
      { kind: 'own-examples', summary: 'Five worked examples, built from the cited NIST and EIA constants, pass within their tolerances.' },
    ],
  },
  limitations: [
    'Fuel results use national averages; the gas or oil you buy can differ by a few percent.',
    'The coal figure is EIA\'s estimate for coal burned in power plants, not for home or industrial coal.',
    'Volumes and weights of fuels are not converted to each other except through their energy.',
  ],
};
