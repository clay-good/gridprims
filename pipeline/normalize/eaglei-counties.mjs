// EAGLE-I's modeled customers per county (MCC.csv, a 2022 snapshot): the
// denominator for the 1% outage threshold.

import { readMcc, STATE_OF_FIPS } from './eaglei-common.mjs';

export const SCHEMA = [
  { name: 'state', type: 'str' }, { name: 'fips', type: 'str', unit: 'county FIPS code' }, { name: 'customers', type: 'f64', unit: 'modeled customers, 2022' },
];

export async function normalize(input) {
  const { mcc, problem } = await readMcc(input.mcc);
  if (problem) return { rows: [], problems: [problem] };
  const rows = [...mcc].filter(([f]) => STATE_OF_FIPS[f.slice(0, 2)]).map(([fips, customers]) => ({ state: STATE_OF_FIPS[fips.slice(0, 2)], fips, customers })).sort((a, b) => (a.fips < b.fips ? -1 : 1));
  return { rows, problems: [], dataPeriod: '2022' };
}
