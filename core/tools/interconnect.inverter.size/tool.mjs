// interconnect.inverter.size: the ratio of an array's direct-current capacity
// to its inverter's alternating-current capacity, what a high or low ratio
// means, and which figure the interconnection screens see
// (add-interconnection-screens: equipment reference). An export limit can
// change the figure screened, and the utility decides whether to accept the
// limiting method. Premises wiring is not covered here.

const kw = (x) => `${(+x.toFixed(2)).toLocaleString('en-US')} kW`;

/** @param {{dcKw: number, acKw: number, exportKw: number, storage: string}} v */
export function compute({ dcKw, acKw, exportKw, storage }) {
  if (!(acKw > 0)) return { status: 'invalid', errors: [{ field: 'acKw', message: 'Enter the inverter\'s alternating-current rating, which must be above 0 kW.' }] };
  const ratio = dcKw / acKw;
  const limited = exportKw > 0 && exportKw < acKw;
  const steps = [
    `${kw(dcKw)} of panels ÷ ${kw(acKw)} of inverter = ${ratio.toFixed(2)}.`,
    ratio > 1
      ? `Above 1, the panels can make more than the inverter passes, so the inverter clips the top of sunny days. That trades a little summer energy for more output in the morning, the evening, and winter, and for a smaller inverter.`
      : ratio < 1
        ? 'Below 1, the inverter is larger than the panels can fill, so nothing clips and the inverter runs below its rating most of the time.'
        : 'At 1, the panels and the inverter are matched.',
    `The screens generally see the ${kw(acKw)} alternating-current rating, not the ${kw(dcKw)} of panels: the panels set how much energy you make, and the inverter sets how much can reach the grid at once.`,
    'gridprims ships no benchmark table of typical ratios. EIA reported individual-system inverter loading ratios usually between 1.13 and 1.30, and a capacity-weighted average of 1.25 at the end of 2016; for current distributions, read the published reports linked below.',
  ];
  if (limited) {
    steps.push(`With an export limit of ${kw(exportKw)}, a rule that tests what the project exports would see ${kw(exportKw)} rather than ${kw(acKw)}: Texas, for example, keys its no-study-fee class to units that "export not more than 15% of the total load on a single radial feeder" (16 TAC § 25.211(g)(1)).`);
    steps.push('A rule that tests nameplate instead still sees the full inverter rating. The utility decides whether it accepts your limiting method, and some rules name which methods qualify.');
    if (storage === 'yes') steps.push('With storage, how the limit is enforced matters: a limit held by programming or by an on-site limiting element is what some rules credit, so say which yours uses in the application.');
  } else if (exportKw > 0) {
    steps.push(`An export limit of ${kw(exportKw)} is not below the ${kw(acKw)} inverter rating, so it limits nothing the screens would see.`);
  }
  steps.push('Service, panel, busbar, and conductor questions are electrical-code matters, not interconnection ones, and are not covered here.');
  return {
    status: 'ok',
    outputs: { ratio, screenedKw: limited ? exportKw : acKw },
    sentence: `The ratio is ${ratio.toFixed(2)}. The screens generally see ${kw(limited ? exportKw : acKw)}${limited ? ', the export limit, if the utility accepts how you hold it' : ', the inverter rating'}.`,
    steps,
  };
}
