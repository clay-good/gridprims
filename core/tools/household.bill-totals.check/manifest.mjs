const tiered = JSON.stringify({ fixedMonthly: 10, seasons: [{ name: 'all year', from: '01-01', tiers: [{ upTo: 500, rate: 0.12 }, { rate: 0.15 }] }] });
const seasonal = JSON.stringify({ seasons: [{ name: 'non-summer', from: '01-01', tiers: [{ rate: 0.10 }] }, { name: 'summer', from: '07-01', tiers: [{ rate: 0.14 }] }, { name: 'non-summer', from: '10-01', tiers: [{ rate: 0.10 }] }] });

export default {
  id: 'household.bill-totals.check',
  version: '0.1.0',
  title: 'Bill check',
  purpose: 'Price your bills from the kWh printed on them, line by line, and see how they compare with what you paid.',
  archetype: 'calculator',
  firstScreen: ['periods', 'tariff'],
  inputs: [
    { name: 'periods', label: 'Billing periods', type: 'text', multiline: true, example: '2026-03-01 to 2026-03-30, 800 kWh, paid $131.40', hint: 'One period a line: the dates (or a month, as 2026-03), the kWh, and optionally what you paid. For a time-of-use bill, the kWh in each period, as period 1 300 kWh.' },
    { name: 'tariff', label: 'Tariff', type: 'text', picker: 'urdb-tariff', example: tiered, hint: 'The tariff as JSON: fixedMonthly, minimumMonthly, and seasons with tiers or time-of-use periods. The bill check page fills it from your utility\'s rates.' },
    { name: 'prorate', label: 'Split a period that crosses a season by days', type: 'enum', options: [{ value: 'yes', label: 'Yes' }, { value: 'no', label: 'No, use the rates in force on the last day' }], example: 'yes' },
  ],
  outputs: [
    { name: 'total', label: 'Computed bill', unit: '$', rounding: { decimals: 2, fixed: true } },
    { name: 'effectivePrice', label: 'Effective price', unit: '¢/kWh', rounding: { decimals: 2, fixed: true } },
    { name: 'difference', label: 'Paid minus computed', unit: '$', rounding: { decimals: 2, fixed: true } },
    { name: 'differencePct', label: 'Paid minus computed, percent', unit: '%', rounding: { decimals: 1 } },
  ],
  method: 'Check the periods first (overlaps, duplicates, periods over 45 days, a month that reads like an extra digit, negative kWh). Then price each period on the tariff: the fixed charge, each tier\'s kWh at its rate, and the minimum bill, in exact micro-dollars rounded to the cent line by line. A period that crosses a season splits its kWh and tier allowances by days. Time-of-use bills are priced from the kWh in each period as the bill prints them.',
  assumptions: [
    'The tariff is the one in force for the whole period; a rate change within a period is treated like a season change only when it is entered as one.',
    'A tier allowance stated per day is multiplied by the days in the period.',
    'The effective price uses the amounts paid when every period has one, otherwise the computed bills.',
  ],
  citations: [
    { source: 'OpenEI Utility Rate Database (URDB)', edition: 'snapshot 2026-10', locator: 'Energy rate structure, weekday and weekend schedules, fixed and minimum charges', url: 'https://openei.org/wiki/Utility_Rate_Database' },
    { source: 'OpenEI, Utility Rates API documentation', edition: 'version 7', locator: 'Field definitions: energyratestructure (rate, adj, max, unit), fixedchargefirstmeter, mincharge', url: 'https://openei.org/services/doc/rest/util_rates/?version=7' },
  ],
  datasets: ['urdb'],
  examples: [
    { id: 'tiered', title: 'A tiered bill: 800 kWh with a $10.00 fixed charge', inputs: { periods: '2026-03-01 to 2026-03-30, 800 kWh', tariff: tiered, prorate: 'yes' }, expect: { total: { value: 115, tolerance: { abs: 0.001 }, display: '115.00' }, effectivePrice: { value: 14.38, tolerance: { abs: 0.001 }, display: '14.38' } }, source: 'household/bill-totals spec, scenarios "Tiered bill" and "Effective price"' },
    { id: 'season-split', title: 'A period crossing summer start', inputs: { periods: '2026-06-15 to 2026-07-14, 900 kWh', tariff: seasonal, prorate: 'yes' }, expect: { total: { value: 106.8, tolerance: { abs: 0.001 }, display: '106.80' } }, source: 'household/bill-totals spec, scenario "Period crosses summer start": 480 kWh at 10 cents and 420 at 14 cents' },
    { id: 'paid-more', title: 'Paid $131.40 against $115.00 computed', inputs: { periods: '2026-03-01 to 2026-03-30, 800 kWh, paid $131.40', tariff: tiered, prorate: 'yes' }, expect: { total: { value: 115, tolerance: { abs: 0.001 }, display: '115.00' }, difference: { value: 16.4, tolerance: { abs: 0.001 }, display: '16.40' }, differencePct: { value: 14.3, tolerance: { abs: 0.001 }, display: '14.3' } }, source: 'household/bill-totals spec, scenario "Paid more than computed"' },
  ],
  related: [],
  handoffs: [
    { label: 'OpenEI Utility Rate Database', url: 'https://apps.openei.org/USURDB/' },
  ],
  stability: 'experimental',
  validation: {
    level: 1,
    evidence: [
      { kind: 'own-examples', summary: 'Three worked examples from the spec\'s scenarios, and 21 URDB rates classified and converted by hand, pass to the cent.' },
    ],
  },
  toRaise: 'Five published residential bill examples (state regulators\' typical-bill tables) reproduced to the cent would raise it to cross-checked.',
  limitations: [
    'Taxes, local fees, and riders that the tariff data leaves out are not included, so a real bill is usually higher.',
    'Time-of-use energy is priced only from the kWh in each period as the bill prints them; a tiered time-of-use rate cannot be priced from totals.',
    'Demand charges need meter data and are not priced here.',
    'Export credits for net-metered months are not modeled; such a month prices only the charges that do not depend on kWh.',
  ],
};
