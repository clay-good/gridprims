// calc.cost.lcoe: levelized cost of energy by the NLR ATB's simple equation,
// with each term's contribution in $/MWh.

const fmt = (x, d = 2) => x.toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });

/** MWh per kW-year at a 100% capacity factor: 8,760 h ÷ 1,000. */
export const MWH_PER_KW_YEAR = 8.76;

/**
 * @param {{fcr: number, capex: number, fom: number, cf: number, vom: number, fuel: number}} v cf in percent
 */
export function compute({ fcr, capex, fom, cf, vom, fuel }) {
  const mwhPerKw = (cf / 100) * MWH_PER_KW_YEAR;
  const capital = (fcr * capex) / mwhPerKw;
  const fixed = fom / mwhPerKw;
  const lcoe = capital + fixed + vom + fuel;
  return {
    status: 'ok',
    outputs: { lcoe, capital, fixed },
    sentence: (out) => `The levelized cost of energy is $${out.lcoe.display} per MWh.`,
    steps: [
      `Energy per kW of capacity: ${cf}% × 8.76 MWh per kW-year = ${mwhPerKw.toFixed(4).replace(/0+$/, '')} MWh per kW-year.`,
      `Capital: ${fcr} fixed charge rate × $${capex.toLocaleString('en-US')}/kW ÷ ${mwhPerKw.toFixed(4).replace(/0+$/, '')} = $${fmt(capital)}/MWh.`,
      `Fixed O&M: $${fom.toLocaleString('en-US')}/kW-year ÷ ${mwhPerKw.toFixed(4).replace(/0+$/, '')} = $${fmt(fixed)}/MWh.`,
      `Variable O&M $${fmt(vom)}/MWh and fuel $${fmt(fuel)}/MWh are added as they are.`,
      `LCOE: $${fmt(capital)} + $${fmt(fixed)} + $${fmt(vom)} + $${fmt(fuel)} = $${fmt(lcoe)}/MWh.`,
    ],
  };
}
