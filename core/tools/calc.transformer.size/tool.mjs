// calc.transformer.size: the apparent power a load needs, and how heavily a
// transformer of a given rating would carry it. A screening step; standard
// ratings and overload limits come from the user, the utility, and the
// applicable loading guide.

const r1 = (x) => Math.round(x * 10) / 10;

/** Apparent power in kVA from amps: three-phase √3 × V line-to-line × A ÷ 1,000; single-phase V × A ÷ 1,000. */
export const kvaFromAmps = (amps, volts, phases) => ((phases === 'three' ? Math.sqrt(3) : 1) * volts * amps) / 1000;
/** Line current in amps from kVA, the inverse. */
export const ampsFromKva = (kva, volts, phases) => (kva * 1000) / ((phases === 'three' ? Math.sqrt(3) : 1) * volts);

/**
 * @param {{loadAs: 'kva' | 'kw' | 'amps', load: number, pf: number, volts: number, phases: 'three' | 'single', rating: number}} v
 */
export function compute({ loadAs, load, pf, volts, phases, rating }) {
  if (loadAs === 'kw' && !(pf > 0 && pf <= 1)) return { status: 'invalid', errors: [{ field: 'pf', message: 'Enter a power factor above 0 and up to 1, such as 0.95.' }] };
  const kva = loadAs === 'kva' ? load : loadAs === 'kw' ? load / pf : kvaFromAmps(load, volts, phases);
  const amps = loadAs === 'amps' ? load : ampsFromKva(kva, volts, phases);
  const loading = (kva / rating) * 100;
  const headroom = rating - kva;
  const service = phases === 'three' ? 'three-phase' : 'single-phase';
  const steps = [
    loadAs === 'kva' ? `Load: ${load} kVA, as entered.`
      : loadAs === 'kw' ? `Load: ${load} kW ÷ ${pf} power factor = ${r1(kva)} kVA. The power factor is an assumption; a bill or meter shows it.`
        : `Load: ${phases === 'three' ? '√3 × ' : ''}${volts} V × ${load} A ÷ 1,000 = ${r1(kva)} kVA (${service}).`,
    `Current at ${volts} V ${service}: ${r1(amps)} A.`,
    `Loading on a ${rating} kVA transformer: ${r1(kva)} ÷ ${rating} = ${r1(loading)}%, with ${r1(headroom)} kVA of headroom.`,
  ];
  if (loading > 100) steps.push('The load exceeds the nameplate rating. Whether the transformer may carry it for a time is the owner\'s and the utility\'s decision under their loading guide (IEEE C57.91 for liquid-immersed and IEEE C57.96 for dry-type transformers), which this tool does not apply.');
  steps.push('This tool names no standard size: the standard distribution transformer ratings are in IEEE C57.12.00, a paid standard we neither buy nor quote, so enter the rating you are considering. It also does not compute overload time, hot-spot or top-oil temperature, or loss of life; those come from the loading guide and the owner\'s practice.');
  return {
    status: 'ok',
    outputs: { kva, loading, headroom, amps },
    sentence: (out) => `The load needs ${out.kva.display} kVA, which is ${out.loading.display}% of a ${rating} kVA transformer${loading > 100 ? ', above its nameplate rating' : ''}.`,
    steps,
  };
}
