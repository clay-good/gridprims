// calc.energy-units.emissions: annual emissions from energy at an eGRID
// subregion's average output rates, in metric tons.

import { EDITION, RATES } from './rates.mjs';
import { formatNumber } from '../../lib/precision.mjs';

/** Pounds to metric tons: 0.45359237 kg per lb, exact by definition (NIST SP 811). */
export const LB_TO_T = 0.45359237 / 1000;
/** AR5 100-year GWPs without climate-carbon feedbacks, as the eGRID2023 technical guide states. */
export const GWP = { ch4: 28, n2o: 265 };

/** Metric tons from MWh at a rate in lb/MWh. */
export const metricTons = (mwh, lbPerMwh) => mwh * lbPerMwh * LB_TO_T;

/**
 * @param {{mwh: number, subregion: string}} v
 */
export function compute({ mwh, subregion }) {
  const r = RATES[subregion];
  const co2 = metricTons(mwh, r.co2);
  const ch4 = metricTons(mwh, r.ch4);
  const n2o = metricTons(mwh, r.n2o);
  const co2e = co2 + GWP.ch4 * ch4 + GWP.n2o * n2o;
  const amount = mwh.toLocaleString('en-US', { maximumFractionDigits: 6 });
  return {
    status: 'ok',
    outputs: { co2, co2e, ch4, n2o },
    sentence: (out) => `${amount} MWh in ${subregion} is about ${out.co2.display} metric tons of CO₂. With other gases, it is ${out.co2e.display} tons of CO₂e (${EDITION.name}).`,
    steps: [
      `${EDITION.name} total output emission rates for ${subregion}: ${r.co2} lb/MWh CO₂, ${r.ch4} lb/MWh CH₄, ${r.n2o} lb/MWh N₂O.`,
      `CO₂: ${amount} MWh × ${r.co2} lb/MWh × 0.45359237 kg/lb ÷ 1,000 = ${formatNumber(co2, { decimals: 2 })} metric tons.`,
      `CO₂e: CO₂ + ${GWP.ch4} × CH₄ + ${GWP.n2o} × N₂O = ${formatNumber(co2e, { decimals: 2 })} metric tons (AR5 100-year GWPs, as eGRID uses).`,
      'These are annual average rates for every hour of the year. With interval data, hourly rates give a better answer, because the grid\'s mix changes hour by hour.',
    ],
    constants: [
      { text: '1 lb = 0.45359237 kg', source: 'NIST SP 811, exact by definition', exact: true },
      { text: `${r.co2} lb CO₂/MWh (${subregion})`, source: `EPA ${EDITION.name}, subregion total output emission rate`, exact: false, year: EDITION.dataYear },
    ],
  };
}
