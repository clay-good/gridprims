// Texas Electricity Facts Labels the bill check's totals path must reproduce (add-household-bill-check 2.4;
// household/bill-totals, "EFL average price"). Three fixed-rate plans from three providers in three TDU areas,
// each read from the EFL itself on 2026-11-21: the energy and base charges, the TDU delivery charges the EFL
// states it passes through, and the average price per kWh it prints at the levels 16 TAC § 25.475(g)(2)(C)
// sets for residential customers (500, 1,000, and 2,000 kWh, "rounded to the nearest one-tenth of one cent").
// Only the figures are kept; the EFLs are the providers' documents. The Budget Power PDF is generated on
// request and stamps its creation time, so its SHA-256 is of the copy read.

export const EFL_RULE = { rule: '16 TAC § 25.475(g)(2)(C)(i)', url: 'https://ftp.puc.texas.gov/public/puct-info/agency/rulesnlaws/subrules/electric/25.475/25.475.pdf', levels: [500, 1000, 2000] };

export const EFLS = [
  {
    id: 'budget-power-no-gimmicks-12-oncor', provider: 'Capital Energy PA LLC dba Budget Power (PUCT 10293)', plan: 'No Gimmicks 12 - Oncor', tduArea: 'Oncor',
    date: '2026-11-20', version: 'No Gimmicks_12_ONC_FIXED_UN_4871_0_100_11202026', url: 'https://signup.budgetpowertx.com/Home/EFL?productId=35455&Promo=', sha256: 'cbef09d0e137aa4b6552b6d1e64fd379a1a9c46eacf85fdfee599291196c1a24',
    energyPerKwh: 0.04871, baseMonthly: 0, tdu: { monthly: 4.06, perKwh: 0.068673, says: 'TDSP Charges include all recurring charges from Oncor Energy passed through without mark-up.' },
    printed: { 500: 12.6, 1000: 12.1, 2000: 11.9 },
  },
  {
    id: 'reliant-power-on-18-centerpoint', provider: 'Reliant Energy Retail Services, LLC (PUCT 10007)', plan: 'Reliant Power On 18 plan', tduArea: 'CenterPoint',
    date: '2026-11-13', version: 'R1F00200425047A', url: 'https://www.reliant.com/defl/R1F00200425047A.pdf', sha256: 'f2b252d4784a9bb56bd61a214ced1feaabd981764b8ca86a44c2a9cec7423f8a',
    energyPerKwh: 0.058938, baseMonthly: 5, tdu: { monthly: 4.9, perKwh: 0.065611, says: 'TDU Delivery Charges include all recurring charges passed through without mark-up.' },
    printed: { 500: 14.4, 1000: 13.4, 2000: 12.9 },
  },
  {
    id: 'infuse-essential-12-aep-central', provider: 'Infuse Energy (PUCT 10299)', plan: 'Essential Infusion 12 Plan', tduArea: 'AEP Texas Central',
    date: '2026-11-16', version: 'EssentialInfusion12-AEPS-20261116-122900(ENG)', url: 'https://88fd201f32c53c2bd0fb-11ba98ed637230a2314ec7c228a44bda.ssl.cf5.rackcdn.com/202611/EFL-20261116-122900-AEPS-Essential%20Infusion%2012%20(English).pdf', sha256: '3317ceeb526300244de3a845cbf0f27f753205dd239fb55b4b34453eefdadb7e',
    energyPerKwh: 0.05162, baseMonthly: 2, tdu: { monthly: 3.24, perKwh: 0.056898, says: 'applicable AEP Texas Central charges passed through at cost' },
    printed: { 500: 11.9, 1000: 11.4, 2000: 11.1 },
    note: 'The EFL adds $5.00 a billing period without Autopay, which its printed averages leave out, so it is left out here too.',
  },
];
