// interconnect.minimum-load.screen: the 15%-of-peak screen and the
// 100%-of-minimum-load screen of the federal small generator procedures,
// with the minimum-load screen as a band across the utilities' own
// assumptions unless a utility value is entered (add-interconnection-screens:
// minimum-load range). Peak load is always the user's.

import { BAND, minLoadBand, minLoadMet, peakScreen } from '../../lib/min-load.mjs';

const kw = (x) => `${Math.round(x).toLocaleString('en-US')} kW`;
const pc = (x) => `${(x * 100).toFixed(1)}%`;
const SOURCE = { report: 'a pre-application report', published: 'the utility\'s published feeder value', other: 'the utility' };

export function compute(v) {
  if (!(v.peakKw > 0)) return { status: 'refused', reason: 'No load-ratio result without the line section\'s annual peak load. It comes only from the utility: ask for a pre-application report, or look for your utility\'s hosting-capacity map.' };
  const p = peakScreen(v.aggregateKw, v.peakKw);
  const steps = [`15%-of-peak screen: ${kw(v.aggregateKw)} ÷ ${kw(v.peakKw)} = ${pc(p.ratio)}; the rule requires no more than 15%: ${p.met ? 'met' : 'not met'}.`];
  const absolute = v.technology === 'storage' || v.technology === 'other';
  const window = v.technology === 'solar-fixed' ? '10 a.m. to 4 p.m.' : v.technology === 'solar-tracking' ? '8 a.m. to 6 p.m.' : null;
  const outputs = { peakRatio: p.ratio * 100 };
  let minSentence;
  if (v.minLoadKw > 0) {
    const met = minLoadMet(v.aggregateKw, v.minLoadKw);
    outputs.minLoadRatio = (v.aggregateKw / v.minLoadKw) * 100;
    steps.push(`Minimum-load screen on ${SOURCE[v.minLoadSource]}${v.measured !== 'unknown' ? ` (marked ${v.measured})` : ''}: ${kw(v.aggregateKw)} is ${pc(v.aggregateKw / v.minLoadKw)} of ${kw(v.minLoadKw)}; the rule requires less than 100%: ${met ? 'met' : 'not met'}.`);
    minSentence = `On the utility's minimum load, the minimum-load screen is ${met ? 'met' : 'not met'}.${v.aggregateKw === v.minLoadKw ? ' Equal is not less, so the rule is not met.' : ''}`;
    if (!absolute) { const b = minLoadBand(v.aggregateKw, v.peakKw); steps.push(`For comparison only, the band would give ${b.low.met ? 'met' : 'not met'} at 15% and ${b.high.met ? 'met' : 'not met'} at 40% of peak.`); }
  } else if (absolute) {
    minSentence = 'For this project the minimum-load screen uses absolute minimum load. The 15% to 40% band is only for daytime load, so the screen needs the utility\'s value.';
    steps.push('The rule uses absolute minimum load for every project except solar with no storage; the band utilities assume is for daytime minimum load.');
  } else {
    const b = minLoadBand(v.aggregateKw, v.peakKw);
    outputs.flipShare = b.flip * 100;
    steps.push(`Minimum daytime load (${window}) is unknown, so the screen is computed across the 15% to 40% of peak that utilities assume: ${kw(b.low.minLoadKw)} to ${kw(b.high.minLoadKw)}.`);
    steps.push(`At 15% (${kw(b.low.minLoadKw)}): ${b.low.met ? 'met' : 'not met'}. At 40% (${kw(b.high.minLoadKw)}): ${b.high.met ? 'met' : 'not met'}. The rule requires generation less than 100% of minimum load.`);
    minSentence = b.settled
      ? `The minimum-load screen is ${b.low.met ? 'met' : 'not met'} across the whole 15% to 40% band, so the assumption does not change the answer.`
      : `The minimum-load screen is met if minimum load is above ${pc(b.flip)} of peak and not met below it, so it turns on data the utility holds.`;
  }
  steps.push('Minimum daytime load is not published for most feeders; the 15% to 40% band is the range utilities themselves assume. A pre-application report or a published feeder value settles it.');
  return {
    status: 'ok', outputs,
    sentence: `The project is ${pc(p.ratio)} of peak, so the 15% screen is ${p.met ? 'met' : 'not met'}. ${minSentence}`,
    steps,
  };
}
