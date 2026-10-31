// Reading the date, time, and number text utility exports contain. Every
// reader returns null for text it does not recognize, rather than guessing.

/**
 * @typedef {{year: number, month: number, day: number}} DateFields
 * @typedef {{hour: number, minute: number, second: number}} TimeFields
 */

const MONTHS = { jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12 };

const validDate = (y, m, d) => m >= 1 && m <= 12 && d >= 1 && d <= new Date(Date.UTC(y, m, 0)).getUTCDate() && y >= 1990 && y <= 2100;
const fullYear = (y) => (y < 100 ? 2000 + y : y);

/**
 * A date at the start of the text: 2026-01-31, 2026/01/31, 1/31/2026, 01/31/26, 31-Jan-2026, Jan 31 2026.
 * US month-first order is assumed for slashed dates, as US utilities write them.
 * @param {string} s
 * @returns {{date: DateFields, rest: string} | null}
 */
export function readDate(s) {
  const t = s.trim();
  let m = /^(\d{4})[-/](\d{1,2})[-/](\d{1,2})(?=$|[T\s])/.exec(t);
  if (m) {
    const [y, mo, d] = [+m[1], +m[2], +m[3]];
    return validDate(y, mo, d) ? { date: { year: y, month: mo, day: d }, rest: t.slice(m[0].length) } : null;
  }
  m = /^(\d{1,2})\/(\d{1,2})\/(\d{2}|\d{4})(?=$|\s)/.exec(t);
  if (m) {
    const [mo, d, y] = [+m[1], +m[2], fullYear(+m[3])];
    return validDate(y, mo, d) ? { date: { year: y, month: mo, day: d }, rest: t.slice(m[0].length) } : null;
  }
  m = /^(\d{1,2})-([A-Za-z]{3})[a-z]*-(\d{2}|\d{4})(?=$|\s)/.exec(t);
  if (m && MONTHS[m[2].toLowerCase()]) {
    const [d, mo, y] = [+m[1], MONTHS[m[2].toLowerCase()], fullYear(+m[3])];
    return validDate(y, mo, d) ? { date: { year: y, month: mo, day: d }, rest: t.slice(m[0].length) } : null;
  }
  m = /^([A-Za-z]{3})[a-z]*\.?\s+(\d{1,2}),?\s+(\d{4})(?=$|\s)/.exec(t);
  if (m && MONTHS[m[1].toLowerCase()]) {
    const [mo, d, y] = [MONTHS[m[1].toLowerCase()], +m[2], +m[3]];
    return validDate(y, mo, d) ? { date: { year: y, month: mo, day: d }, rest: t.slice(m[0].length) } : null;
  }
  return null;
}

/**
 * A clock time: 13:45, 1:45 PM, 13:45:00, 24:00, or the start of an hour range such as "0-0:59" or "1:00 - 1:15".
 * 24:00 is kept as hour 24 so the caller can see an interval-ending stamp.
 * @param {string} s
 * @returns {TimeFields | null}
 */
export function readTime(s) {
  const t = s.trim().replace(/^T/, '');
  let m = /^(\d{1,2}):(\d{2})(?::(\d{2})(?:\.\d+)?)?\s*([AaPp]\.?[Mm]\.?)?(?:\s*(?:[-–]|to)\s*\d{1,2}:\d{2}(?::\d{2})?\s*(?:[AaPp]\.?[Mm]\.?)?)?(?:\s*(?:Z|[+-]\d{2}:?\d{2}|[A-Z]{2,4}))?$/.exec(t);
  if (m) {
    let h = +m[1];
    const mi = +m[2];
    const sec = m[3] ? +m[3] : 0;
    if (m[4]) {
      const pm = /^p/i.test(m[4]);
      if (h < 1 || h > 12) return null;
      h = (h % 12) + (pm ? 12 : 0);
    }
    if (mi > 59 || sec > 59 || h > 24 || (h === 24 && (mi || sec))) return null;
    return { hour: h, minute: mi, second: sec };
  }
  m = /^(\d{1,2})\s*[-–]\s*\d{1,2}:\d{2}$/.exec(t); // "0-0:59": the hour starting at 0
  if (m && +m[1] <= 23) return { hour: +m[1], minute: 0, second: 0 };
  return null;
}

/**
 * A date and time together in one cell: "2026-01-31 13:45", "2026-01-31T13:45:00", "1/31/2026 1:45 PM".
 * @param {string} s
 * @returns {(DateFields & TimeFields) | null}
 */
export function readDateTime(s) {
  const d = readDate(s);
  if (!d) return null;
  const rest = d.rest.trim();
  if (rest === '') return null;
  const time = readTime(rest);
  return time ? { ...d.date, ...time } : null;
}

/**
 * A number as exports write it: 1,234.5, "(12.5)" for negative, a trailing unit, or a leading $.
 * Blank, "-", "N/A", and similar read as missing (null), never zero.
 * @param {string} s
 * @returns {number | null}
 */
export function readNumber(s) {
  let t = String(s).trim();
  if (t === '' || /^(-|—|n\/?a|null|none|missing|\*+)$/i.test(t)) return null;
  let negative = false;
  const paren = /^\((.*)\)$/.exec(t);
  if (paren) { negative = true; t = paren[1]; }
  t = t.replace(/^\$/, '').replace(/\s*(k?wh|k?w|mwh|kvarh?)$/i, '').replace(/,(?=\d{3}(\D|$))/g, '');
  if (!/^[-+]?(\d+\.?\d*|\.\d+)(e[-+]?\d+)?$/i.test(t)) return null;
  const n = Number(t);
  return Number.isFinite(n) ? (negative ? -n : n) : null;
}
