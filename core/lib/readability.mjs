// Flesch-Kincaid grade level (Kincaid et al., 1975, Navy research report 8-75):
//   grade = 0.39 × (words / sentences) + 11.8 × (syllables / words) − 15.59
// Used by the result-sentence gate (grade 8 or below) and later by the Learn
// guides. Syllables come from a vowel-group rule with an exceptions list.

/** Words the vowel-group rule miscounts, with their syllable counts. */
const EXCEPTIONS = {
  area: 3, idea: 3, being: 2, create: 2, created: 3, creates: 2, real: 1, really: 2, fuel: 1, fuels: 1, hour: 1, hours: 1, our: 1,
  every: 2, average: 3, averages: 4, different: 3, business: 2, people: 2, utility: 4, utilities: 4, the: 1, one: 1, once: 1,
  data: 2, meter: 2, meters: 2, solar: 2, energy: 3, battery: 3, power: 2, tower: 2, quiet: 2, science: 2, video: 3, radio: 3,
  january: 4, february: 4, ion: 2, lion: 2, poem: 2, doing: 2, going: 2, seeing: 2, usual: 3, usually: 4, actual: 3,
  actually: 4, gradual: 3, period: 3, periods: 3, react: 2, reactive: 3, therm: 1, therms: 1, kilowatt: 3, kilowatts: 3,
  megawatt: 3, megawatts: 3, gigawatt: 3, hundred: 2, evening: 2, everyone: 3, everything: 3, wh: 1, kwh: 1, mwh: 1, gwh: 1, mmbtu: 1, btu: 1, kw: 1, mw: 1, ercot: 2, pjm: 1,
};

/**
 * Syllables in one word. Tokens with digits and all-capital unit symbols
 * (12, 40.95, MWh, MMBtu) count as one syllable each: they are read as one
 * glance, and counting them letter by letter would punish plain answers.
 * @param {string} word
 */
export function syllables(word) {
  const raw = word.replace(/[^A-Za-z0-9.'’-]/g, '').replace(/\.+$/, '');
  if (!raw) return 0;
  if (/\d/.test(raw)) return 1;
  const w = raw.toLowerCase().replace(/['’]/g, '');
  if (w in EXCEPTIONS) return EXCEPTIONS[w];
  if (/^[A-Z][A-Za-z]*[A-Z]/.test(raw) && raw.length <= 6) return 1; // unit symbols and acronyms: MWh, PJM, ERCOT
  if (w.includes('-')) return w.split('-').reduce((n, p) => n + syllables(p), 0);
  if (w.length <= 3) return 1;
  let s = w.replace(/([^aeiouy])ely$/, '$1ly'); // lately, unfortunately: the e is silent
  let extra = 0;
  if (/[^aeiouy]le$/.test(s)) { s = s.slice(0, -2); extra = 1; } // table, considerable: "-ble" is its own syllable
  else if (/[^aeiouytd]ed$/.test(s)) s = s.slice(0, -2); // changed: silent; recorded, started: said
  else if (/[^aeiouy]es$/.test(s) && !/(?:[sxzcg]|ch|sh)es$/.test(s)) s = s.slice(0, -2); // minutes: silent; prices, charges, boxes: said
  else if (/[^aeiouy]e$/.test(s)) s = s.slice(0, -1); // silent final e
  s = s.replace(/^y/, '');
  let n = (s.match(/[aeiouy]{1,2}/g)?.length ?? 0) + extra;
  n += (s.replace(/(?:tion|sion|cia|tia|gion|qu[aeio]|gu[aeio])/g, '').match(/(?:ia|io|eo|ua|uo)/g) ?? []).length; // vowel pairs said apart
  return Math.max(1, n);
}

/**
 * @param {string} text one or more sentences
 * @returns {{grade: number, words: number, sentences: number, syllables: number}}
 */
export function fleschKincaid(text) {
  // Decimal points and abbreviations like "U.S." are not sentence ends.
  const cleaned = text.replace(/(\d)\.(\d)/g, '$1$2').replace(/\b([A-Z])\.(?=[A-Z]\.)/g, '$1');
  const sentences = Math.max(1, cleaned.split(/[.!?]+(?:\s|$)/).filter((s) => /[A-Za-z0-9]/.test(s)).length);
  const words = text.split(/\s+/).filter((w) => /[A-Za-z0-9]/.test(w));
  const syl = words.reduce((n, w) => n + syllables(w), 0);
  const wc = Math.max(1, words.length);
  return { grade: 0.39 * (wc / sentences) + 11.8 * (syl / wc) - 15.59, words: words.length, sentences, syllables: syl };
}
