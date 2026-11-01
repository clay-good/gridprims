// carbon.load-shift.estimate: the attributed CO2 a flexible load (EV charging,
// pre-cooling, a batch job) would change in a year by moving to hours with a
// lower typical consumption-based intensity (add-hourly-carbon: cleanest-hours).
// On the website the cleanest-hours picker fills both intensities from the
// region's typical hours in EIA-930.

import { ATTRIBUTIONAL, LB_PER_T } from '../../lib/hourly-carbon.mjs';

const lb = (x) => `${Math.round(x).toLocaleString('en-US')} lb`;

/** @param {{kwhPerDay: number, currentLbPerMwh: number, proposedLbPerMwh: number, days: number}} v */
export function compute({ kwhPerDay, currentLbPerMwh, proposedLbPerMwh, days }) {
  const perKwh = (currentLbPerMwh - proposedLbPerMwh) / 1000;
  const changeLb = kwhPerDay * perKwh * days;
  const changeT = changeLb / LB_PER_T;
  const less = changeLb >= 0;
  const steps = [
    `Intensity difference: ${currentLbPerMwh.toLocaleString('en-US')} − ${proposedLbPerMwh.toLocaleString('en-US')} lb/MWh = ${(perKwh * 1000).toLocaleString('en-US')} lb/MWh, or ${+perKwh.toFixed(6)} lb/kWh.`,
    `${kwhPerDay.toLocaleString('en-US')} kWh a day × ${+perKwh.toFixed(6)} lb/kWh × ${days} days = ${lb(Math.abs(changeLb))} a year ${less ? 'less' : 'more'}.`,
    `${lb(Math.abs(changeLb))} ÷ ${LB_PER_T.toFixed(2)} lb per metric ton = ${Math.abs(changeT).toFixed(2)} metric tons.`,
    ATTRIBUTIONAL,
  ];
  return {
    status: 'ok',
    outputs: { changeLb, changeT },
    sentence: (out) => `Moving ${kwhPerDay.toLocaleString('en-US')} kWh a day ${less ? 'cuts' : 'adds'} about ${out.changeT.display.replace('-', '')} metric tons of CO₂ a year.`,
    steps,
  };
}
