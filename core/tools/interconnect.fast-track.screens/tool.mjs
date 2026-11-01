// interconnect.fast-track.screens: every Fast Track screen of the federal
// small generator procedures in rule order, with its threshold, who can
// answer it, and a result for the three your own entries settle
// (add-interconnection-screens: screen explainer). Screens that need the
// utility's data or circuit model stay open, never passed or failed.

const UTILITY = 'only the utility';
const MODEL = 'only the utility, from its circuit model';

/** @param {{lineConfig: string, connection: string, sharedKw: number, imbalanceKva: number, transformerKva: number}} v */
function evaluate(v) {
  const line = v.lineConfig === '3w' ? (['3ph', '3ph-grounded', '1ph-ll'].includes(v.connection) ? 'met' : 'not met')
    : v.lineConfig === '4w' ? (['3ph-grounded', '1ph-ln'].includes(v.connection) ? 'met' : 'not met') : 'open';
  const shared = v.sharedKw > 0 ? (v.sharedKw <= 20 ? 'met' : 'not met') : 'not applicable';
  const tap = v.transformerKva > 0 ? (v.imbalanceKva <= 0.2 * v.transformerKva ? 'met' : 'not met') : 'not applicable';
  return [
    { s: '2.2.1.1', name: 'The point of interconnection is on the utility\'s tariffed distribution system', threshold: 'yes or no', who: UTILITY, input: 'where the utility\'s distribution system ends', result: 'open' },
    { s: '2.2.1.2', name: 'Generation on the line section', threshold: 'at most 15% of the line section\'s annual peak load, as last measured at the substation', who: UTILITY, input: 'the line section\'s annual peak load and the generation already on it', result: 'open', also: 'The load-ratio screens tool works it out once you have the peak load from the utility.' },
    { s: '2.2.1.3', name: 'Load side of a spot network protector', threshold: 'inverter-based, and at most 5% of the spot network\'s maximum load or 50 kW, whichever is smaller', who: UTILITY, input: 'whether you are on a spot network, and its maximum load', result: 'open' },
    { s: '2.2.1.4', name: 'Fault current contribution', threshold: 'at most 10% of the circuit\'s maximum fault current at the nearest primary-level point', who: MODEL, input: 'the circuit\'s fault current', result: 'open' },
    { s: '2.2.1.5', name: 'Interrupting capability', threshold: 'no protective device or customer equipment above 87.5% of its short-circuit interrupting rating, and none already above it', who: MODEL, input: 'protective device ratings, which the utility does not publish', result: 'open' },
    { s: '2.2.1.6', name: 'Line configuration and grounding', threshold: 'on a three-phase three-wire line, a three-phase or single-phase phase-to-phase connection; on a three-phase four-wire line, an effectively grounded three-phase or single-phase line-to-neutral connection', who: 'you and your installer', input: 'the line type and your connection', result: line, how: line === 'open' ? 'Ask the utility or your installer whether the line is three-wire or four-wire.' : `A ${v.lineConfig === '3w' ? 'three-wire' : 'four-wire'} line with a ${{ '3ph': 'three-phase', '3ph-grounded': 'effectively grounded three-phase', '1ph-ll': 'single-phase phase-to-phase', '1ph-ln': 'single-phase line-to-neutral' }[v.connection]} connection: ${line}.` },
    { s: '2.2.1.7', name: 'Shared single-phase secondary', threshold: 'at most 20 kW of generation on the shared secondary', who: 'you and your installer', input: 'the generation on the shared secondary', result: shared, how: shared === 'not applicable' ? 'Not on a shared secondary.' : `${v.sharedKw} kW against at most 20 kW: ${shared}.` },
    { s: '2.2.1.8', name: 'Imbalance on a 240 V center-tap service', threshold: 'the addition creates an imbalance of at most 20% of the service transformer\'s nameplate rating', who: 'you and your installer', input: 'the imbalance and the transformer rating', result: tap, how: tap === 'not applicable' ? 'Not a 240 V center-tap service, or no transformer rating entered.' : `${v.imbalanceKva} kVA against 20% of ${v.transformerKva} kVA = ${+(0.2 * v.transformerKva).toFixed(2)} kVA: ${tap}.` },
    { s: '2.2.1.9', name: 'Transient stability', threshold: 'at most 10 MW on the transmission side of the substation transformer where transient stability limits are known', who: MODEL, input: 'the transmission system\'s stability limits', result: 'open' },
    { s: '2.2.1.10', name: 'No utility construction', threshold: 'no construction of facilities on the utility\'s own system is needed', who: UTILITY, input: 'the utility\'s design', result: 'open' },
  ];
}

export function compute(v) {
  const screens = evaluate(v);
  const n = (r) => screens.filter((x) => x.result === r).length;
  const met = n('met'); const notMet = n('not met'); const open = n('open');
  const steps = [
    ...screens.map((x) => `§ ${x.s}, ${x.name}: ${x.threshold}. Answered by ${x.who} (${x.input}). ${x.result === 'open' ? 'Open.' : x.how}${x.also ? ` ${x.also}` : ''}`),
    'The federal procedures have no starting-voltage-drop screen and no screen called a penetration test: those are California Rule 21 (Screens C, M, and N), Massachusetts (Screen 7), New York (Screens 3, E, and G), and Hawaii (Screen 5).',
    'If you elect supplemental review after failing a screen, the utility runs the minimum load, voltage and power quality, and safety and reliability screens (§ 2.4.4).',
  ];
  return {
    status: 'ok',
    outputs: { met, notMet, open },
    sentence: `${met} ${met === 1 ? 'screen is' : 'screens are'} met, ${notMet} not met, and ${open} still open. The utility runs every screen and decides.`,
    steps,
  };
}
