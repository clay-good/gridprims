// Discount and allowance programs the plan finder applies when a household ticks them (add-household-bill-check
// 1.4; plan-finder, "Discount programs apply to every plan"), read from each utility's own tariff sheet on
// 2026-11-21. A program covers only the rates its sheet names (`only`, matched against URDB's rate names) and
// only the charges it says it discounts (`appliesTo`); what the sheet adds that the bill engine cannot model is
// listed in `notModeled`. SDG&E is not here yet: its current tariff portal could not be read by script.

const PGE = 14328;
const SCE = 17609;

export const CHECKED = '2026-11-21';

/** The groups a household ticks; each is one or more program records. */
export const GROUPS = ['care', 'fera', 'medical'];

export default [
  {
    id: 'pge-care', group: 'care', name: 'CARE', utility: 'Pacific Gas and Electric', utilityIds: [PGE], kind: 'percent', percent: 35, appliesTo: ['energy'],
    only: ['^E-1\\b', '^E-TOU-C\\b', '^E-TOU-D\\b', '\\bEV2\\b', '^E-ELEC\\b', '^EM\\b', '^ES\\b', '^ESR\\b', '^ET\\b', '^EM-TOU\\b'],
    schedule: 'Electric Schedule D-CARE (Line-Item Discount for CARE Customers)', effective: 'Sheet 1: Advice 7846-E, effective 2026-03-01; Sheet 2: Advice 7469-E, effective 2025-01-01',
    url: 'https://www.pge.com/tariffs/assets/pdf/tariffbook/ELEC_SCHEDS_D-CARE.pdf', quote: 'A. D-CARE Discount: 35.000 % (Percent)',
    notModeled: ['The charges CARE customers do not pay (the Wildfire Fund, Wildfire Hardening, Recovery Bond, and CARE surcharge) are not taken out before the discount.', 'The base services charge is set to Tier 1 with no further discount.', 'The California Climate Credit is not discounted.'],
  },
  {
    id: 'pge-fera', group: 'fera', name: 'FERA', utility: 'Pacific Gas and Electric', utilityIds: [PGE], kind: 'percent', percent: 18, appliesTo: ['energy'],
    schedule: 'Electric Schedule E-FERA (Family Electric Rate Assistance)', effective: 'Advice 7846-E, effective 2026-03-01',
    url: 'https://www.pge.com/tariffs/assets/pdf/tariffbook/ELEC_SCHEDS_E-FERA.pdf', quote: 'Customers taking service on this rate schedule will receive an 18 percent discount on their',
    notModeled: ['The Wildfire Hardening and Recovery Bond charges FERA customers do not pay are not taken out before the discount.', 'The base services charge is set to Income Tier 2.'],
  },
  {
    id: 'pge-medical-baseline', group: 'medical', name: 'Medical Baseline', utility: 'Pacific Gas and Electric', utilityIds: [PGE], kind: 'baseline-kwh', kwhPerDay: 16.438,
    schedule: 'Electric Rule No. 19 (Medical Baseline Quantities)', effective: 'Advice 6865-E, effective 2023-03-23',
    url: 'https://www.pge.com/tariffs/assets/pdf/tariffbook/ELEC_RULES_19.pdf', quote: 'additional 16.438 kWh of electricity per day (the equivalent of 500 kWh per month)',
    notModeled: [],
  },
  {
    id: 'pge-medical-discount', group: 'medical', name: 'Medical Baseline (rates without a baseline)', utility: 'Pacific Gas and Electric', utilityIds: [PGE], kind: 'percent', percent: 12, appliesTo: ['energy'],
    only: ['^E-ELEC\\b', '^E-TOU-D\\b', '\\bEV2\\b'],
    schedule: 'Electric Schedule D-MEDICAL (Line-Item Discount for Medical Customers)', effective: 'Advice 7846-E, effective 2026-03-01',
    url: 'https://www.pge.com/tariffs/assets/pdf/tariffbook/ELEC_SCHEDS_D-MEDICAL.pdf', quote: 'Customers taking service on this rate schedule will receive a 12 percent discount',
    notModeled: ['The Wildfire Fund charge medical customers do not pay is not taken out before the discount.'],
  },
  {
    id: 'sce-care', group: 'care', name: 'CARE', utility: 'Southern California Edison', utilityIds: [SCE], kind: 'percent', percent: 32.5, appliesTo: ['fixed', 'energy', 'demand'],
    only: ['^Domestic Service: D\\b', '\\bTOU-D\\b'], excludes: ['TEV'],
    schedule: 'Schedule D-CARE (California Alternate Rates for Energy, Domestic Service)', effective: 'Sheet 1: Advice 5897-E, effective 2026-10-01; Sheet 4: Advice 5837-E, effective 2026-06-25',
    url: 'https://edisonintl.sharepoint.com/teams/Public/TM2/Shared%20Documents/Public/Regulatory/Tariff-SCE%20Tariff%20Books/Electric/Schedules/Residential%20Rates/ELECTRIC_SCHEDULES_D-CARE.pdf',
    quote: 'A 32.5 percent discount is applied to a CARE Customer\'s bill prior to the application of the Public Utilities',
    notModeled: ['The base services charge credit of $0.164 a day.', 'The CARE surcharge, part of the public purpose charge, the wildfire fund charge, and the fixed recovery charge CARE customers do not pay.'],
  },
  {
    id: 'sce-fera', group: 'fera', name: 'FERA', utility: 'Southern California Edison', utilityIds: [SCE], kind: 'percent', percent: 18, appliesTo: ['fixed', 'energy', 'demand'],
    only: ['\\bTOU-D\\b'], excludes: ['TEV'],
    schedule: 'Schedule D-FERA (Family Electric Rate Assistance)', effective: 'Sheet 1: Advice 5837-E, effective 2026-06-25; Sheet 3: Advice 5897-E, effective 2026-10-01',
    url: 'https://edisonintl.sharepoint.com/teams/Public/TM2/Shared%20Documents/Public/Regulatory/Tariff-SCE%20Tariff%20Books/Electric/Schedules/Residential%20Rates/ELECTRIC_SCHEDULES_D-FERA.pdf',
    quote: 'A 18.0 percent discount is applied to a FERA Customer\'s bill prior to the application of any applicable',
    notModeled: ['The base services charge credit of $0.197 a day.'],
  },
  {
    id: 'sce-medical-baseline', group: 'medical', name: 'Medical Baseline', utility: 'Southern California Edison', utilityIds: [SCE], kind: 'baseline-kwh', kwhPerDay: 16.5, excludes: ['PRIME'],
    schedule: 'Preliminary Statement Part H (Baseline Service), paragraph 4', effective: 'Advice 5338-E, effective 2024-08-15',
    url: 'https://edisonintl.sharepoint.com/teams/Public/TM2/Shared%20Documents/Public/Regulatory/Tariff-SCE%20Tariff%20Books/Electric/Preliminary%20Statements/ELECTRIC_PRELIM_H.pdf',
    quote: 'The standard Medical Baseline Allocation will be 16.5 kWh per day.',
    notModeled: ['On TOU-D-PRIME the sheet gives an 11% discount instead, without naming the charges it covers, so nothing is applied to that rate.'],
  },
];
