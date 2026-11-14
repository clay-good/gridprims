// household.usage-benchmark.compare: is my use high? A year of use from
// billing periods against EIA-861's average home for the utility and state.

import { entryQuestions, parsePeriods } from '../../lib/bill-entry.mjs';
import { annualize, compareWords, percentFrom, seasonalPattern } from '../../lib/usage-benchmark.mjs';
import { againstNormal, readWeather } from '../../lib/weather-text.mjs';
import { NORMALS_CAVEAT } from '../../lib/weather-model.mjs';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const longDate = (iso) => `${MONTHS[+iso.slice(5, 7) - 1]} ${+iso.slice(8, 10)}, ${iso.slice(0, 4)}`;
const kwh = (n) => `${Math.round(n).toLocaleString('en-US')} kWh`;
const perDay = (n) => `${n.toLocaleString('en-US', { maximumFractionDigits: 1 })} kWh a day`;

/**
 * @param {{periods: string, utilityAverage: number, stateAverage: number, dataYear: number, weather?: string}} v
 */
export function compute({ periods: text, utilityAverage, stateAverage, dataYear, weather = 'none' }) {
  const parsed = parsePeriods(text);
  if (parsed.errors.length) return { status: 'invalid', errors: parsed.errors.map((message) => ({ field: 'periods', message })) };
  const asks = entryQuestions(parsed.periods);
  if (asks.length) return { status: 'invalid', errors: asks.map((message) => ({ field: 'periods', message })) };
  const errors = [];
  if (!(utilityAverage > 0)) errors.push({ field: 'utilityAverage', message: 'Enter the utility\'s average home use in kWh a year, such as 12,000.' });
  if (!(stateAverage > 0)) errors.push({ field: 'stateAverage', message: 'Enter the state\'s average home use in kWh a year, such as 12,000.' });
  // How unusual the year's weather was, when a station is given (add-weather-normalization 4.2).
  let w = null;
  if (String(weather).trim().toLowerCase() !== 'none') {
    w = readWeather(weather);
    if (w.error) errors.push({ field: 'weather', message: w.error });
    else if (!w.station || !w.normals.length) errors.push({ field: 'weather', message: 'Pick a station: its daily temperatures and its normals are both needed to say how unusual the year was.' });
  }
  if (errors.length) return { status: 'invalid', errors };

  const year = annualize(parsed.periods);
  const vsUtility = percentFrom(year.annualKwh, utilityAverage);
  const vsState = percentFrom(year.annualKwh, stateAverage);
  const pattern = seasonalPattern(parsed.periods);
  const source = `EIA-861, ${dataYear}`;
  const steps = [
    `A year of use: ${kwh(year.annualKwh)}, ${year.method}.`,
    `The utility's average home: ${kwh(utilityAverage)} a year (residential sales ÷ residential customers, ${source}). ${kwh(year.annualKwh)} ÷ ${kwh(utilityAverage)} − 1 = ${vsUtility}%.`,
    `The state's average home: ${kwh(stateAverage)} a year (${source}). ${kwh(year.annualKwh)} ÷ ${kwh(stateAverage)} − 1 = ${vsState}%.`,
    'These are averages across homes of every size and heating type. EIA-861 publishes no distribution, so there is no percentile or rank.',
  ];
  if (pattern) {
    steps.push(`Highest period: ${longDate(pattern.high.start)} to ${longDate(pattern.high.end)}, ${perDay(pattern.high.perDay)}. Lowest: ${longDate(pattern.low.start)} to ${longDate(pattern.low.end)}, ${perDay(pattern.low.perDay)}. The highest is ${pattern.ratio}× the lowest.`);
    if (pattern.checklist.length) steps.push(`A swing above 1.5× often has a cause worth checking: ${pattern.checklist.join(', ')}. These are things to check, not a diagnosis.`);
  }
  if (w) {
    const dates = parsed.periods.flatMap((p) => [p.start, p.end]).sort();
    const n = againstNormal(w, dates[0], dates.at(-1));
    const dd = (x) => Math.round(x).toLocaleString('en-US');
    /** Degree days of one kind against normal; a kind the normal year has none of is said plainly. */
    const kind = (x, normalX, change, what) => (normalX > 0
      ? `${dd(x)} ${what} degree days, ${Math.abs(Math.round(change * 100))}% ${change >= 0 ? 'more' : 'fewer'} than normal (${dd(normalX)})`
      : x > 0 ? `${dd(x)} ${what} degree days, where the normal year has none` : `no ${what} degree days, as normal`);
    if (n.days) {
      steps.push(`How unusual the weather was: from ${longDate(dates[0])} to ${longDate(dates.at(-1))}, ${w.station.name} (station ${w.station.id}) recorded ${kind(n.hdd, n.normalHdd, n.hddChange, 'heating')}, and ${kind(n.cdd, n.normalCdd, n.cddChange, 'cooling')}, at base ${n.base} °F over the ${n.days.toLocaleString('en-US')} days with a reading.${n.days < n.span ? ` ${(n.span - n.days).toLocaleString('en-US')} of the ${n.span.toLocaleString('en-US')} days have no reading and are left out of both sides.` : ''} A year warmer or colder than normal moves use; the weather check splits how much.`, NORMALS_CAVEAT);
    } else steps.push(`How unusual the weather was: ${w.station.name} has no readings between ${longDate(dates[0])} and ${longDate(dates.at(-1))}, so it cannot say.`);
  }
  const lead = year.estimated ? `From ${year.days} days, we estimate ${kwh(year.annualKwh)} a year. That` : `This home's ${kwh(year.annualKwh)} a year`;
  return {
    status: 'ok',
    outputs: { annualKwh: year.annualKwh, vsUtility, vsState, ...(pattern ? { ratio: pattern.ratio } : {}) },
    sentence: `${lead} is ${compareWords(vsUtility)} the utility's average home and ${compareWords(vsState)} the state's (${source}).`,
    steps,
  };
}
