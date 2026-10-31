// The share of each state's customers EAGLE-I covered, by year
// (coverage_history.csv, 2018 to 2022): the lowest and highest share seen
// across that year's reporting.

export const SCHEMA = [
  { name: 'state', type: 'str' }, { name: 'year', type: 'f64' },
  { name: 'min_pct_covered', type: 'f64', unit: '%' }, { name: 'max_pct_covered', type: 'f64', unit: '%' },
];

const HEADER = 'year,state,total_customers,min_covered,max_covered,min_pct_covered,max_pct_covered';

export async function normalize(input) {
  const rows = [];
  let first = true;
  for await (const raw of input.coverage()) {
    const line = raw.replace(/^﻿/, '').trim();
    if (!line) continue;
    if (first) { first = false; if (line !== HEADER) return { rows: [], problems: [`coverage_history.csv header is "${line}"`] }; continue; }
    const [date, state, , , , lo, hi] = line.split(',');
    const yy = Number(date.split('/')[2]);
    rows.push({ state, year: yy < 100 ? 2000 + yy : yy, min_pct_covered: Math.round(Number(lo) * 1000) / 10, max_pct_covered: Math.round(Number(hi) * 1000) / 10 });
  }
  return { rows, problems: [], dataPeriod: '2018-2022' };
}
