// Shared reading for EPA's Clean Air Markets bulk files (add-measured-plant-emissions
// 1.1): the quoted CSV they publish, the columns we take from the hourly and
// facility files, and the conversion EPA states for short tons to metric tons.

/** EPA reports carbon dioxide in short tons; pages show metric tons. */
export const SHORT_TON_TO_TONNE = 0.90718474;

/**
 * The standard-time offset from UTC of each state's clocks, in hours. EPA's
 * hourly records are in the plant's own local standard time, with no daylight
 * saving, so an hour can only be put back on a common clock state by state.
 *
 * A state split between two zones is placed in the zone that holds most of it,
 * which leaves a one-hour error for the few monitored plants on the other side:
 * the Florida panhandle, El Paso, western Kansas, Nebraska, the Dakotas,
 * northwest Indiana, western Kentucky and Tennessee, Michigan's Menominee
 * county, and eastern Oregon and Idaho. `SPLIT_ZONE_STATES` names them so the
 * approximation travels with the data.
 */
export const STANDARD_OFFSETS = {
  AL: -6, AK: -9, AZ: -7, AR: -6, CA: -8, CO: -7, CT: -5, DE: -5, DC: -5, FL: -5, GA: -5, HI: -10, ID: -8, IL: -6,
  IN: -5, IA: -6, KS: -6, KY: -5, LA: -6, ME: -5, MD: -5, MA: -5, MI: -5, MN: -6, MS: -6, MO: -6, MT: -7, NE: -6,
  NV: -8, NH: -5, NJ: -5, NM: -7, NY: -5, NC: -5, ND: -6, OH: -5, OK: -6, OR: -8, PA: -5, RI: -5, SC: -5, SD: -6,
  TN: -6, TX: -6, UT: -7, VT: -5, VA: -5, WA: -8, WV: -5, WI: -6, WY: -7, PR: -4,
};

/** States whose clocks are split between two zones, where the offset above is the majority zone. */
export const SPLIT_ZONE_STATES = ['FL', 'ID', 'IN', 'KS', 'KY', 'MI', 'ND', 'NE', 'OR', 'SD', 'TN', 'TX'];

/** The UTC hour number (hours since 1970) of one of EPA's local-standard-time records. */
export const utcHourOf = (date, hour, offsetHours) => Math.round(Date.parse(`${date}T00:00:00Z`) / 3_600_000) + hour - offsetHours;

/**
 * One line of EPA's CSV: fields are quoted when they hold a comma
 * ("ARP, CSNOX"), and a quote inside a quoted field is doubled.
 * @param {string} line @returns {string[]}
 */
export function splitCsvLine(line) {
  const out = [];
  let field = '';
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (quoted) {
      if (c !== '"') { field += c; continue; }
      if (line[i + 1] === '"') { field += '"'; i++; continue; }
      quoted = false;
    } else if (c === '"') quoted = true;
    else if (c === ',') { out.push(field); field = ''; }
    else field += c;
  }
  out.push(field);
  return out;
}

/**
 * Where each named column sits in a header line, or which are missing. Columns
 * are found by name, so a file that gains or reorders columns still reads.
 * @param {string} line @param {string[]} names
 * @returns {{at?: Record<string, number>, missing?: string[]}}
 */
export function headerIndex(line, names) {
  const header = splitCsvLine(line.replace(/^\uFEFF/, '')).map((h) => h.trim());
  const missing = names.filter((n) => !header.includes(n));
  if (missing.length) return { missing };
  return { at: Object.fromEntries(names.map((n) => [n, header.indexOf(n)])) };
}

/**
 * The hourly files handed to a normalizer, read from the keys themselves, so a
 * run over a few states (a test fixture) reads exactly what it was given.
 * @param {Record<string, unknown>} input
 */
export const hourlyFilesIn = (input) => Object.keys(input)
  .map((key) => ({ key, m: /^h(\d{4})-([a-z]{2})$/.exec(key) })).filter((x) => x.m)
  .map(({ key, m }) => ({ key, year: Number(m[1]), state: m[2].toUpperCase() }))
  .sort((a, b) => a.year - b.year || (a.state < b.state ? -1 : 1));

/** The facility files handed to a normalizer, oldest first. */
export const facilityFilesIn = (input) => Object.keys(input)
  .map((key) => ({ key, m: /^f(\d{4})$/.exec(key) })).filter((x) => x.m)
  .map(({ key, m }) => ({ key, year: Number(m[1]) })).sort((a, b) => a.year - b.year);

/** The period a set of files covers, as the manifest states it ("2024-2025"). */
export const periodOf = (years) => { const y = [...new Set(years)].sort(); return y.length > 1 ? `${y[0]}-${y[y.length - 1]}` : String(y[0] ?? ''); };

const num = (s) => (s === undefined || s === '' ? null : Number(s));

/** The hourly columns we read. Everything else in the file is left where it is. */
export const HOURLY_COLUMNS = ['State', 'Facility ID', 'Unit ID', 'Associated Stacks', 'Date', 'Hour', 'Operating Time', 'Gross Load (MW)', 'SO2 Mass (lbs)', 'CO2 Mass (short tons)', 'NOx Mass (lbs)', 'Heat Input (mmBtu)', 'Primary Fuel Type'];

/**
 * EPA's fuel name in the fuel categories EIA-930 reports generation under, so
 * measured load can be set beside the estimate for the same fuel: coal, natural
 * gas, oil, and everything else. A unit EPA lists with two fuels is placed by
 * the first, because the hourly record does not say which burned in the hour.
 * @param {string | null | undefined} fuel @returns {'col' | 'ng' | 'oil' | 'oth'}
 */
export function fuelCategory(fuel) {
  const first = String(fuel ?? '').split(',')[0].trim().toLowerCase();
  if (first === 'coal' || first === 'coal refuse') return 'col';
  if (first === 'pipeline natural gas' || first === 'natural gas') return 'ng';
  if (first.endsWith('oil')) return 'oil';
  return 'oth';
}

/**
 * Read every hourly state-year file a line at a time, handing each record to
 * `onRow`. A file whose header lost a column we read fails the run rather
 * than being misread.
 * @param {Record<string, () => AsyncIterable<string>>} input lines by file key
 * @param {Array<{key: string, year: number, state: string}>} [files] the hourly files to read (default: all of them)
 * @param {(r: {state: string, plantId: number, unitId: string, stacks: string, year: number, month: number, date: string, hour: number, operating: number, loadMw: number | null, so2Lbs: number | null, co2Tons: number | null, noxLbs: number | null, heatMmbtu: number | null, fuel: 'col' | 'ng' | 'oil' | 'oth'}) => void} onRow
 * @returns {Promise<string[]>} problems
 */
export async function readHourly(input, onRow, files = hourlyFilesIn(input)) {
  const problems = [];
  for (const { key, year, state } of files) {
    const lines = input[key];
    if (!lines) { problems.push(`no hourly file for ${state} ${year}`); continue; }
    let at = null;
    for await (const line of lines()) {
      if (!at) {
        const found = headerIndex(line, HOURLY_COLUMNS);
        if (found.missing) { problems.push(`${state} ${year}: the hourly header is missing ${found.missing.join(', ')}`); break; }
        at = found.at;
        continue;
      }
      if (!line) continue;
      const f = splitCsvLine(line);
      const date = f[at.Date];
      if (!date) continue;
      onRow({
        state: f[at.State] || state,
        plantId: Number(f[at['Facility ID']]),
        unitId: f[at['Unit ID']],
        stacks: f[at['Associated Stacks']] ?? '',
        year: Number(date.slice(0, 4)),
        month: Number(date.slice(5, 7)),
        date,
        hour: Number(f[at.Hour]),
        operating: num(f[at['Operating Time']]) ?? 0,
        loadMw: num(f[at['Gross Load (MW)']]),
        so2Lbs: num(f[at['SO2 Mass (lbs)']]),
        co2Tons: num(f[at['CO2 Mass (short tons)']]),
        noxLbs: num(f[at['NOx Mass (lbs)']]),
        heatMmbtu: num(f[at['Heat Input (mmBtu)']]),
        fuel: fuelCategory(f[at['Primary Fuel Type']]),
        // The same record on a common clock: EPA's local standard hour, moved to UTC by the state's offset.
        utcHour: utcHourOf(date, Number(f[at.Hour]), STANDARD_OFFSETS[f[at.State] || state] ?? 0),
      });
    }
  }
  return problems;
}
