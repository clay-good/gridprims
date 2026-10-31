// calc.energy-units.convert: convert an energy quantity between units and fuels.

import { BY_ID, FUEL_SIG_FIGS } from './units.mjs';
import { formatNumber, roundSig } from '../../lib/precision.mjs';

/** The unit name to read after a displayed amount: singular only for exactly 1. */
const named = (u, display) => (display === '1' && u.one ? u.one : u.unit);

/**
 * @param {{value: number, from: string, to: string}} v
 */
export function compute({ value, from, to }) {
  const a = BY_ID[from];
  const b = BY_ID[to];
  const factor = a.joules / b.joules;
  const result = value * factor;
  const usesFuel = a.kind === 'fuel' || b.kind === 'fuel';
  const sigCap = Math.min(4, FUEL_SIG_FIGS[from] ?? 4, FUEL_SIG_FIGS[to] ?? 4);

  // The direct factor is shown to 6 significant figures. Pure unit conversions
  // are attributed to the SI derivation (NIST), never to EIA.
  const factorDisplay = formatNumber(roundSig(factor, 6), { sigFigs: 6 });
  const factorText = `1 ${a.one ?? a.unit} = ${factorDisplay} ${named(b, factorDisplay)}`;
  const factorSource = usesFuel ? 'EIA average heat content, via the Btu' : 'Derived from the SI definitions (NIST SP 811)';

  const constants = [{ text: factorText, source: factorSource, exact: !usesFuel }];
  for (const u of a === b ? [a] : [a, b]) constants.push({ ...u.constant });

  const amount = formatNumber(value, { sigFigs: 15 });
  return {
    status: 'ok',
    outputs: { value: result },
    rounding: { value: { sigFigs: sigCap } },
    sentence: (out) => `${amount} ${named(a, amount)} is ${usesFuel ? 'about ' : ''}${out.value.display} ${named(b, out.value.display)}.`,
    steps: [
      `Convert ${a.unit} to joules: ${a.constant.text}.`,
      `Convert joules to ${b.unit}: ${b.constant.text}.`,
      `So ${factorText}. ${amount} × ${factorDisplay} = ${formatNumber(result, { sigFigs: 6 })}.`,
      usesFuel ? 'A fuel heat content is an average, so real fuel varies. The result is shown to the figures that average carries.' : 'Every constant here is exact by definition.',
    ],
    constants,
  };
}
