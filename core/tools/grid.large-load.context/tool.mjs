// grid.large-load.context: a requested load beside the utility that would
// serve it, as shares of its annual peak and sales and as average homes
// (add-large-load-screen: request-context).

const whole = (x) => Math.round(x).toLocaleString('en-US');

/** @param {{requestMw: number, loadFactor: number, peakMw: number, salesMwh: number, residentialKwh: number}} v */
export function compute({ requestMw, loadFactor, peakMw, salesMwh, residentialKwh }) {
  const energyMwh = requestMw * (loadFactor / 100) * 8760;
  const salesShare = (energyMwh / salesMwh) * 100;
  const homes = (energyMwh * 1000) / residentialKwh;
  const peakShare = peakMw > 0 ? (requestMw / peakMw) * 100 : undefined;
  const steps = [
    peakShare === undefined ? 'The utility reports no annual peak to FERC, so only the sales comparison is shown.' : `${whole(requestMw)} MW ÷ ${whole(peakMw)} MW peak = ${peakShare.toFixed(1)}% of the peak.`,
    `${whole(requestMw)} MW × ${loadFactor}% × 8,760 hours = ${whole(energyMwh)} MWh a year.`,
    `${whole(energyMwh)} MWh ÷ ${whole(salesMwh)} MWh of sales = ${salesShare.toFixed(1)}% of sales.`,
    `${whole(energyMwh * 1000)} kWh ÷ ${whole(residentialKwh)} kWh per home = ${whole(homes)} average homes.`,
  ];
  return {
    status: 'ok',
    outputs: { ...(peakShare === undefined ? {} : { peakShare }), energyMwh, salesShare, homes },
    sentence: (out) => (peakShare === undefined
      ? `It would use ${out.salesShare.display}% of what the utility sells in a year, as much energy as ${out.homes.display} homes.`
      : `It is ${out.peakShare.display}% of the utility's peak and would use as much energy as ${out.homes.display} homes.`),
    steps,
  };
}
