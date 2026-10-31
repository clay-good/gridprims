// Energy units and fuel heat contents, each with its source, year, and
// whether it is exact or an average (calc/energy-units-and-emissions).

/** International Table Btu in joules, exact by definition (NIST SP 811, B.8). */
export const BTU_J = 1055.05585262;

const NIST = 'NIST SP 811 (2008), Appendix B.8';
const EIA_BTU = 'EIA, British thermal units (Btu)';
const EIA_GAS = 'EIA, Heat Content of Natural Gas Consumed, US delivered to consumers';
const EIA_MER = 'EIA, Monthly Energy Review, Table A1';
const EIA_CALC = 'EIA, Energy conversion calculators, electric power sector';

/**
 * @typedef {{id: string, aliases?: string[], unit: string, one?: string, label: string, joules: number, kind: 'si' | 'fuel',
 *   constant: {text: string, source: string, year?: string, exact: boolean}}} EnergyUnit
 */

/** @type {EnergyUnit[]} */
export const UNITS = [
  { id: 'Wh', aliases: ['watt-hours', 'watt-hour'], unit: 'Wh', label: 'Wh (watt-hours)', joules: 3600, kind: 'si', constant: { text: '1 Wh = 3,600 J', source: NIST, exact: true } },
  { id: 'kWh', aliases: ['kilowatt-hour'], unit: 'kWh', label: 'kWh (kilowatt-hours)', joules: 3.6e6, kind: 'si', constant: { text: '1 kWh = 3.6 MJ', source: NIST, exact: true } },
  { id: 'MWh', aliases: ['megawatt-hour'], unit: 'MWh', label: 'MWh (megawatt-hours)', joules: 3.6e9, kind: 'si', constant: { text: '1 MWh = 3.6 GJ', source: NIST, exact: true } },
  { id: 'GWh', aliases: ['gigawatt-hour'], unit: 'GWh', label: 'GWh (gigawatt-hours)', joules: 3.6e12, kind: 'si', constant: { text: '1 GWh = 3.6 TJ', source: NIST, exact: true } },
  { id: 'J', aliases: ['joule'], unit: 'J', label: 'J (joules)', joules: 1, kind: 'si', constant: { text: 'joule, the SI unit of energy', source: NIST, exact: true } },
  { id: 'MJ', unit: 'MJ', label: 'MJ (megajoules)', joules: 1e6, kind: 'si', constant: { text: '1 MJ = 1,000,000 J', source: NIST, exact: true } },
  { id: 'GJ', unit: 'GJ', label: 'GJ (gigajoules)', joules: 1e9, kind: 'si', constant: { text: '1 GJ = 1,000,000,000 J', source: NIST, exact: true } },
  { id: 'Btu', aliases: ['British thermal unit'], unit: 'Btu', label: 'Btu (British thermal units)', joules: BTU_J, kind: 'si', constant: { text: '1 Btu (International Table) = 1,055.05585262 J', source: NIST, exact: true } },
  { id: 'MMBtu', aliases: ['million Btu', 'mmbtus'], unit: 'MMBtu', label: 'MMBtu (million Btu)', joules: BTU_J * 1e6, kind: 'si', constant: { text: '1 MMBtu = 1,000,000 Btu', source: EIA_BTU, exact: true } },
  { id: 'therm', unit: 'therms', one: 'therm', label: 'therms', joules: BTU_J * 1e5, kind: 'si', constant: { text: '1 therm = 100,000 Btu', source: EIA_BTU, exact: true } },
  { id: 'ft3-natural-gas', aliases: ['cf', 'ft3', 'ft³', 'cubic feet', 'cubic foot', 'cubic feet of gas'], unit: 'ft³ of natural gas', label: 'cubic feet of natural gas', joules: 1036 * BTU_J, kind: 'fuel', constant: { text: '1 cubic foot of natural gas = 1,036 Btu (US average)', source: EIA_GAS, year: '2025', exact: false } },
  { id: 'short-ton-coal', aliases: ['tons of coal', 'ton of coal', 'short tons', 'short ton'], unit: 'short tons of coal', one: 'short ton of coal', label: 'short tons of coal', joules: 18_792_000 * BTU_J, kind: 'fuel', constant: { text: '1 short ton of coal = 18,792,000 Btu (electric power sector average)', source: EIA_CALC, year: '2026 estimate', exact: false } },
  { id: 'bbl-distillate', unit: 'barrels of distillate fuel oil', one: 'barrel of distillate fuel oil', label: 'barrels of distillate fuel oil (heating oil, diesel)', joules: 5.770e6 * BTU_J, kind: 'fuel', constant: { text: '1 barrel of distillate fuel oil = 5.770 MMBtu (average)', source: EIA_MER, exact: false } },
  { id: 'bbl-residual', unit: 'barrels of residual fuel oil', one: 'barrel of residual fuel oil', label: 'barrels of residual fuel oil', joules: 6.287e6 * BTU_J, kind: 'fuel', constant: { text: '1 barrel of residual fuel oil = 6.287 MMBtu (average)', source: EIA_MER, exact: false } },
  { id: 'bbl-propane', unit: 'barrels of propane', one: 'barrel of propane', label: 'barrels of propane', joules: 3.841e6 * BTU_J, kind: 'fuel', constant: { text: '1 barrel of propane = 3.841 MMBtu (average)', source: EIA_MER, exact: false } },
];

/** Significant figures each fuel average carries, which caps the result. */
export const FUEL_SIG_FIGS = { 'ft3-natural-gas': 4, 'short-ton-coal': 5, 'bbl-distillate': 4, 'bbl-residual': 4, 'bbl-propane': 4 };

export const BY_ID = Object.fromEntries(UNITS.map((u) => [u.id, u]));
