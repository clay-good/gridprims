// Which federal small generator interconnection process applies
// (add-interconnection-screens: process router), from the pro forma Small
// Generator Interconnection Procedures as amended by FERC Order No. 792:
// the 10 kW inverter process, Fast Track by the § 2.1 eligibility table, or
// the § 3 study process; above 20 MW, the large generator procedures.

/** SGIP § 2.1: Fast Track ceilings (kW) for certified inverter-based systems, by voltage at the point of interconnection. */
export const FAST_TRACK = [
  { below: 5, anywhere: 500, mainline: 500, band: 'below 5 kV' },
  { below: 15, anywhere: 2000, mainline: 3000, band: '5 kV to under 15 kV' },
  { below: 30, anywhere: 3000, mainline: 4000, band: '15 kV to under 30 kV' },
  { below: 69.000001, anywhere: 4000, mainline: 5000, band: '30 kV to 69 kV' },
];
export const ROTATING_CEILING_KW = 2000;
export const SGIP_MAX_KW = 20000;

/**
 * @param {{kw: number, kv: number, technology: 'inverter-certified' | 'inverter-other' | 'rotating', mainline: 'yes' | 'no' | 'unknown'}} p
 * @returns {{process: 'inverter-10kw' | 'fast-track' | 'study' | 'large', reason: string, ceilingKw?: number, mainlineWouldHelp?: boolean}}
 */
export function route({ kw, kv, technology, mainline }) {
  if (kw > SGIP_MAX_KW) return { process: 'large', reason: `${kw.toLocaleString('en-US')} kW is above the 20 MW the small generator procedures cover.` };
  if (technology === 'inverter-certified' && kw <= 10) return { process: 'inverter-10kw', reason: 'A certified inverter-based system of 10 kW or less goes to the 10 kW Inverter Process (§ 1.1.1).' };
  if (kv > 69) return { process: 'study', reason: `A line above 69 kV is not eligible for Fast Track at any size (§ 2.1); ${kv} kV is above it.` };
  if (technology === 'rotating') {
    return kw <= ROTATING_CEILING_KW
      ? { process: 'fast-track', ceilingKw: ROTATING_CEILING_KW, reason: 'A synchronous or induction machine of 2 MW or less is eligible for Fast Track (§ 2.1).' }
      : { process: 'study', ceilingKw: ROTATING_CEILING_KW, reason: 'A synchronous or induction machine above 2 MW is not eligible for Fast Track (§ 2.1).' };
  }
  if (technology === 'inverter-other') return { process: 'study', reason: 'The Fast Track table applies only to certified inverter-based systems (§ 2.1).' };
  const row = FAST_TRACK.find((r) => kv < r.below);
  const ceiling = mainline === 'yes' ? row.mainline : row.anywhere;
  if (kw <= ceiling) return { process: 'fast-track', ceilingKw: ceiling, reason: `At ${row.band}, a certified inverter-based system is eligible up to ${ceiling.toLocaleString('en-US')} kW${mainline === 'yes' ? ' on a mainline within 2.5 electrical circuit miles of the substation' : ' at any location'} (§ 2.1).` };
  return { process: 'study', ceilingKw: ceiling, mainlineWouldHelp: mainline !== 'yes' && kw <= row.mainline, reason: `At ${row.band}, the Fast Track ceiling is ${ceiling.toLocaleString('en-US')} kW${mainline === 'yes' ? ' even on a mainline' : ' at any location'} (§ 2.1).` };
}

/** Deadlines and fees the procedures write, by process, in the days the rule states. */
export const TIMELINE = {
  'fast-track': [
    ['Initial review of the screens', '15 business days from a complete application (§ 2.2)'],
    ['Agreement after passing, or failing but still interconnectable', '5 business days (§§ 2.2.2 to 2.2.3)'],
    ['Customer options meeting after an indeterminate failure', '10 business days (§ 2.2.4)'],
    ['Supplemental review, if you elect and pay for it', '30 business days from the deposit (§ 2.4)'],
  ],
  'inverter-10kw': [['The 10 kW Inverter Process', 'Attachment 5 of the procedures sets its own short steps']],
  study: [['The study process', 'Scoping meeting, then feasibility, system impact, and facilities studies (§ 3), each with its own deadline']],
  large: [],
};
export const PRE_APPLICATION = { fee: 300, days: '20 business days', cite: '§ 1.2' };
