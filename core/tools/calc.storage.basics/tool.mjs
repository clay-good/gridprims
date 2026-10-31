// calc.storage.basics: a battery's duration, C-rate, and usable energy, with
// the site-wide convention that depth of discharge limits delivered energy and
// round-trip efficiency is a loss taken on charging.

const fmt = (x, d) => x.toLocaleString('en-US', { maximumFractionDigits: d });

/**
 * @param {{powerMw: number, energyMwh: number, dispatchMw: number, dod: number, roundTrip: number}} v dod and roundTrip in percent
 */
export function compute({ powerMw, energyMwh, dispatchMw, dod, roundTrip }) {
  if (dispatchMw > powerMw) return { status: 'invalid', errors: [{ field: 'dispatchMw', message: `Dispatch power cannot exceed the rated ${fmt(powerMw, 3)} MW.` }] };
  const durationRated = energyMwh / powerMw;
  const durationDispatch = energyMwh / dispatchMw;
  const cRate = dispatchMw / energyMwh;
  const usable = energyMwh * (dod / 100);
  const charging = usable / (roundTrip / 100);
  return {
    status: 'ok',
    outputs: { durationDispatch, cRate, durationRated, usable, charging },
    sentence: (out) => `At ${fmt(dispatchMw, 3)} MW, this battery runs ${out.durationDispatch.display} hours; it delivers ${out.usable.display} MWh and needs ${out.charging.display} MWh to recharge.`,
    steps: [
      `Duration at rated power: ${fmt(energyMwh, 3)} MWh ÷ ${fmt(powerMw, 3)} MW = ${fmt(durationRated, 2)} h.`,
      `Duration at ${fmt(dispatchMw, 3)} MW: ${fmt(energyMwh, 3)} ÷ ${fmt(dispatchMw, 3)} = ${fmt(durationDispatch, 2)} h; C-rate ${fmt(dispatchMw, 3)} ÷ ${fmt(energyMwh, 3)} = ${fmt(cRate, 4)}.`,
      `Usable delivered energy: ${fmt(energyMwh, 3)} MWh × ${fmt(dod, 2)}% depth of discharge = ${fmt(usable, 1)} MWh.`,
      `Charging energy: ${fmt(usable, 1)} MWh ÷ ${fmt(roundTrip, 2)}% round-trip efficiency = ${fmt(charging, 1)} MWh, with the losses taken on charging.`,
    ],
  };
}
