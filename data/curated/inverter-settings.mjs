// The certification and settings reference (add-interconnection-screens 5.5; interconnect/equipment-reference):
// what each certification generation means and which rule calls for which, and the common grid-support
// defaults as facts, each cited to a state rule that publishes the value, grouped by what a setting does for a
// project rather than by any standard's tables. Nothing here reproduces IEEE 1547's text, tables, or numbering;
// a value with no free source is omitted with the standard and section where it is defined.

const PGE = { publisher: 'Pacific Gas and Electric Company', document: 'Electric Rule No. 21, Section Hh (Advice 7692-E, effective 2025-08-29)', url: 'https://www.pge.com/tariffs/assets/pdf/tariffbook/ELEC_RULES_21.pdf', capture: 'data/curated/captures/interconnect/pge-rule-21-hh.txt' };
const HECO = { publisher: 'Hawaiian Electric Company', document: 'Rule No. 14, Appendix I', url: 'https://www.hawaiianelectric.com/documents/billing_and_payment/rates/hawaiian_electric_rules/14.pdf', capture: 'data/curated/captures/interconnect/heco-rule-14-appendix-i-settings.txt' };

export const CHECKED = '2026-11-21';

/** The certification generations, in our words, each sentence resting on the cited text. */
export const CERTIFICATION = {
  explained: [
    'UL 1741 Supplement SB is the certification that tests an inverter against IEEE 1547-2018, the current interconnection standard, using its test procedures in IEEE 1547.1-2020. California\'s Rule 21 writes its smart-inverter requirements to be consistent with SB, with IEEE 1547-2018 as the source requirement document, and says the Rule prevails where they conflict.',
    'UL 1741 Supplement SA is the earlier supplement, certified against a utility\'s own source requirements document rather than IEEE 1547-2018. Hawaiian Electric\'s Rule 14, for example, let non-inverter-based facilities certify to SA against its Source Requirements Document version 1.1 until July 1, 2021, and has required inverter-based facilities to be certified to IEEE 1547-2018 since February 1, 2023.',
  ],
  mismatch: 'Equipment certified to the earlier SA supplement may not meet a rule that calls for IEEE 1547-2018 or UL 1741 SB: the tests and the settings it was certified to differ. Whether a particular unit is accepted, with a firmware update or a recertification or not at all, is for the authority having jurisdiction and the utility to decide.',
  cites: [{ ...PGE, locator: 'Section Hh, opening paragraph', quote: 'consistent with UL 1741 – Supplement SB using as the source requirement document ANSI/IEEE 1547- 2018' }, { ...HECO, locator: 'Appendix I, equipment certification', quote: 'shall be certified to IEEE 1547- 2018 requirements beginning February 1, 2023' }],
};

/** Published defaults, grouped by what they do, each value cited to the sheet that prints it. */
export const SETTINGS = [
  {
    id: 'frequency-trip', jurisdiction: 'CA', group: 'When the inverter must stop on abnormal frequency',
    cite: { ...PGE, locator: 'Table Hh-2a, Cal. P.U.C. Sheet No. 60226-E' },
    rows: [
      { what: 'High frequency, fast', value: 'at or above 62.0 Hz, within 0.16 s', numbers: ['62.0', '0.16'] },
      { what: 'High frequency, slow', value: 'from 61.2 Hz up to 62 Hz, within 300 s', numbers: ['61.2', '300'] },
      { what: 'Low frequency, slow', value: 'from 56.5 Hz up to 58.5 Hz, within 300 s', numbers: ['58.5', '56.5<f≤58.5'] },
      { what: 'Low frequency, fast', value: 'at or below 56.5 Hz, within 0.16 s', numbers: ['56.5', 'f≤56.5'] },
    ],
  },
  {
    id: 'volt-var', jurisdiction: 'CA', group: 'How the inverter helps hold voltage: reactive power by voltage (volt-VAR)',
    cite: { ...PGE, locator: 'Table Hh-3' },
    rows: [
      { what: 'At 92% of nominal voltage and below', value: 'inject reactive power, 30%', numbers: ['92.0%', '30%'] },
      { what: 'From 97% to 103% of nominal voltage', value: 'unity power factor (no reactive power)', numbers: ['97.0%', '103.0%'] },
      { what: 'At 107% of nominal voltage and above', value: 'absorb reactive power, 30%', numbers: ['107.0%', '30%'] },
    ],
  },
  {
    id: 'volt-watt', jurisdiction: 'CA', group: 'When it cuts output on high voltage (volt-watt)',
    cite: { ...PGE, locator: 'Section Hh, volt-watt paragraph' },
    rows: [{ what: 'Above 106% of nominal voltage', value: 'reduce active power by 25% of nameplate for each 1% of nominal voltage', numbers: ['106%', '25%'] }],
  },
  {
    id: 'activation', jurisdiction: 'CA', group: 'Which functions are on by default',
    cite: { ...PGE, locator: 'Table Hh-4' },
    rows: [
      { what: 'On', value: 'anti-islanding; voltage and frequency ride-through; volt-VAR; enter-service ramp; soft-start reconnection; frequency-watt; volt-watt', numbers: ['Anti-islanding Activated', 'Volt/Watt Activated', 'Frequency/Watt Activated'] },
      { what: 'Off', value: 'fixed power factor; constant reactive power; the storage inverter\'s normal-operation ramp (unless agreed)', numbers: ['Fixed power factor Deactivated', 'Constant Reactive Power Mode Deactivated'] },
    ],
  },
];

/** A jurisdiction whose rule points elsewhere for its settings. */
export const POINTS_ELSEWHERE = [
  {
    jurisdiction: 'HI', utility: 'Hawaiian Electric',
    says: 'Rule 14 requires certification to IEEE 1547-2018 and publishes no settings table of its own: default settings come from the Company\'s Utility-Required Profile, a file of configuration parameters drawn from ranges the Hawaii PUC approved, assigned to each facility and posted on the Company\'s website. California\'s numbers are not Hawaii\'s and are not shown for it.',
    cite: { ...HECO, locator: 'Appendix I, definition y and equipment certification', quote: 'to the Company’s latest URP for default settings' },
  },
];

/** Parameters with no free, citable source as text: named, never guessed. */
export const OMITTED = [
  { what: 'Voltage trip and ride-through settings (how far voltage may stray, and for how long, before the inverter must stop or must keep running)', where: 'IEEE 1547-2018, the voltage trip tables for each abnormal-performance category', why: 'California prints them in Rule 21 Tables Hh-1a and Hh-1b as images on the sheet, with no text we can check against; we omit them rather than retype numbers from a picture.' },
  { what: 'Reactive power capability by category (how much reactive power an inverter must be able to supply)', where: 'IEEE 1547-2018, Section 5.2 (Rule 21 calls for Category B)', why: 'No free government source prints the capability values as text.' },
];
