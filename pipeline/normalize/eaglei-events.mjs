// County outage events from EAGLE-I's 15-minute customers-out records
// (add-electrification-tools: backup-power, "County outage history"): a run
// of intervals with at least 1% of the county's modeled customers out,
// bridging missing records of up to an hour; a record under 1% ends the run.
// Duration = intervals × 15 minutes. The yearly files are read a line at a
// time, in order, and are sorted by time, so each county's run carries
// across midnight on New Year's Eve.

import { readMcc, STATE_OF_FIPS } from './eaglei-common.mjs';

export const SCHEMA = [
  { name: 'state', type: 'str' }, { name: 'fips', type: 'str', unit: 'county FIPS code' },
  { name: 'start', type: 'str', unit: 'UTC, YYYY-MM-DDTHH:MM' }, { name: 'year', type: 'f64' },
  { name: 'hours', type: 'f64', unit: 'hours' }, { name: 'peak_pct_out', type: 'f64', unit: '% of modeled customers' },
];

const Q = 900_000;
const YEARS = Array.from({ length: 12 }, (_, i) => 2014 + i);
// Columns are found by name: 2023 calls customers out "sum", and 2024 adds total_customers (not used:
// the 1% rule keeps one denominator, MCC.csv, for every year).
const OUT_NAMES = ['customers_out', 'sum'];

export async function normalize(input) {
  const problems = [];
  const { mcc, problem } = await readMcc(input.mcc);
  if (problem) return { rows: [], problems: [problem] };
  const rows = [];
  const runs = new Map(); // fips → {startMs, lastMs, peak}
  const close = (fips) => {
    const r = runs.get(fips);
    if (!r) return;
    runs.delete(fips);
    rows.push({ state: STATE_OF_FIPS[fips.slice(0, 2)], fips, start: new Date(r.startMs).toISOString().slice(0, 16), year: new Date(r.startMs).getUTCFullYear(), hours: (r.lastMs - r.startMs + Q) / 3_600_000, peak_pct_out: Math.round(r.peak * 10000) / 100 });
  };
  let skipped = 0;
  for (const year of YEARS) {
    const lines = input[`y${year}`];
    if (!lines) { problems.push(`no file for ${year}`); continue; }
    let col = null;
    for await (const line of lines()) {
      if (!col) {
        const names = line.trim().split(',');
        col = { fips: names.indexOf('fips_code'), out: names.findIndex((n) => OUT_NAMES.includes(n)), time: names.indexOf('run_start_time') };
        if (Object.values(col).some((i) => i < 0)) { problems.push(`${year}: header is "${line.slice(0, 80)}", without fips_code, customers_out (or sum), and run_start_time`); break; }
        continue;
      }
      if (!line) continue;
      const f = line.split(',');
      const fips = f[col.fips].padStart(5, '0');
      const customers = mcc.get(fips);
      if (!customers || !STATE_OF_FIPS[fips.slice(0, 2)]) { skipped++; continue; }
      const share = Number(f[col.out]) / customers;
      const ms = Date.parse(`${f[col.time].replace(' ', 'T')}Z`);
      const run = runs.get(fips);
      if (!(share >= 0.01)) { close(fips); continue; }
      if (run && ms - run.lastMs <= Q + 3_600_000) { run.lastMs = ms; run.peak = Math.max(run.peak, share); continue; }
      close(fips);
      runs.set(fips, { startMs: ms, lastMs: ms, peak: share });
    }
  }
  for (const fips of [...runs.keys()]) close(fips);
  rows.sort((a, b) => (a.state < b.state ? -1 : a.state > b.state ? 1 : a.fips < b.fips ? -1 : a.fips > b.fips ? 1 : a.start < b.start ? -1 : 1));
  return { rows, problems, dataPeriod: '2014-2025', ...(skipped ? { notes: [`${skipped} records for counties outside MCC.csv were skipped`] } : {}) };
}
