// calc.power-factor.correct: the capacitor correction that raises a load's
// power factor to a target, and what the low power factor costs on a tariff
// that adjusts billing demand to a target power factor.

const r1 = (x) => Math.round(x * 10) / 10;
const money = (x) => `$${x.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const tanOf = (pf) => Math.tan(Math.acos(pf));

/** Power factor from what was measured beside kW: the power factor itself, kVAR, or kVA. */
export function powerFactorFrom(kw, measured, value) {
  if (measured === 'pf') return value;
  if (measured === 'kvar') return kw / Math.hypot(kw, value);
  return kw / value;
}

/** Reactive correction in kVAR: kW × (tan(arccos(PF now)) − tan(arccos(PF target))), never negative. */
export const correctionKvar = (kw, pfNow, pfTarget) => Math.max(0, kw * (tanOf(pfNow) - tanOf(pfTarget)));

/** Line current in amps for a kVA at a voltage, three-phase or single-phase. */
export const amps = (kva, volts, phases) => (kva * 1000) / (phases === 'three' ? Math.sqrt(3) * volts : volts);

/**
 * @param {{kw: number, measured: 'pf' | 'kvar' | 'kva', value: number, pfTarget: number, volts: number, phases: 'three' | 'single', demandRate: number, tariffPf: number}} v
 */
export function compute({ kw, measured, value, pfTarget, volts, phases, demandRate, tariffPf }) {
  const pf = powerFactorFrom(kw, measured, value);
  if (!(pf > 0 && pf <= 1)) return { status: 'invalid', errors: [{ field: 'value', message: measured === 'kva' ? 'kVA must be at least the kW.' : 'Enter a power factor above 0 and up to 1.' }] };
  if (!(pfTarget > 0 && pfTarget <= 1)) return { status: 'invalid', errors: [{ field: 'pfTarget', message: 'Enter a target power factor above 0 and up to 1, such as 0.95.' }] };
  const none = pfTarget <= pf;
  const kvar = none ? 0 : correctionKvar(kw, pf, pfTarget);
  const after = none ? pf : pfTarget;
  const kvaBefore = kw / pf;
  const kvaAfter = kw / after;
  const ampsSaved = amps(kvaBefore, volts, phases) - amps(kvaAfter, volts, phases);
  // A tariff that bills demand scaled up to a target power factor: billing kW = kW × target ÷ actual, when actual is lower.
  const billing = (p) => (tariffPf > 0 && p < tariffPf ? (kw * tariffPf) / p : kw);
  const penaltyNow = (billing(pf) - kw) * demandRate;
  const penaltyAfter = (billing(after) - kw) * demandRate;
  const saving = penaltyNow - penaltyAfter;
  const pfText = pf.toFixed(3).replace(/0+$/, '').replace(/\.$/, '');
  const steps = [
    measured === 'pf' ? `Power factor now: ${pfText}, as entered.` : `Power factor now: ${kw} kW ÷ ${measured === 'kvar' ? `√(${kw}² + ${value}²)` : `${value} kVA`} = ${pfText}.`,
    none
      ? `The target ${pfTarget} is not above the power factor now (${pfText}), so no correction is needed.`
      : `Correction: ${kw} kW × (tan(arccos ${pfText}) − tan(arccos ${pfTarget})) = ${kw} × (${tanOf(pf).toFixed(4)} − ${tanOf(pfTarget).toFixed(4)}) = ${r1(kvar)} kVAR.`,
    `Apparent power: ${r1(kvaBefore)} kVA now, ${r1(kvaAfter)} kVA after; current falls by ${r1(ampsSaved)} A at ${volts} V ${phases === 'three' ? 'three-phase' : 'single-phase'}.`,
  ];
  if (tariffPf > 0 && demandRate > 0) {
    steps.push(pf < tariffPf
      ? `Tariff: billing demand is ${kw} kW × ${tariffPf} ÷ ${pfText} = ${r1(billing(pf))} kW, a power-factor penalty of ${r1(billing(pf) - kw)} kW, or ${money(penaltyNow)} a month at ${money(demandRate)}/kW.${penaltyAfter === 0 ? ` Correcting to ${after} removes it.` : ` After correction the penalty is ${money(penaltyAfter)}.`}`
      : `Tariff: the power factor now (${pfText}) already meets the tariff's ${tariffPf}, so there is no power-factor penalty.`);
    steps.push('The saving is the tariff\'s power-factor effect only; it leaves out the cost of the equipment and its installation, and any reduction in losses.');
  }
  steps.push('Choose the bank\'s size, steps, and placement with an electrical engineer, who also checks for harmonics and resonance; no public-domain list of standard bank ratings is cited here, so size up to the next rating your supplier offers.');
  return {
    status: 'ok',
    outputs: { kvar, kvaBefore, kvaAfter, ampsSaved, monthlySaving: saving },
    sentence: (out) => (none ? `No correction is needed: the power factor is already ${pfText}, at or above the ${pfTarget} target.` : `Raising ${kw} kW from ${pfText} to ${pfTarget} takes about ${out.kvar.display} kVAR of correction.`),
    steps,
  };
}
