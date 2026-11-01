// Our state counts and capacity of community solar projects serving
// customers, by who markets the subscriptions (utility, third party, other).

import { projects } from './nlr-sts-common.mjs';

export const SCHEMA = [
  { name: 'state', type: 'str' }, { name: 'marketer', type: 'str', unit: 'who markets the subscriptions, as the laboratory records it' },
  { name: 'projects', type: 'f64' }, { name: 'mw_ac', type: 'f64', unit: 'MW-AC' },
];

export async function normalize(rows) {
  const p = projects(rows);
  if (p.problem) return { rows: [], problems: [p.problem] };
  const groups = Map.groupBy(p.projects, (x) => `${x.state}|${x.marketer}`);
  const out = [...groups].map(([k, xs]) => ({ state: k.split('|')[0], marketer: k.split('|')[1], projects: xs.length, mw_ac: Math.round(xs.reduce((n, x) => n + x.mw, 0) * 1e6) / 1e6 }))
    .sort((a, b) => (a.state < b.state ? -1 : a.state > b.state ? 1 : a.marketer < b.marketer ? -1 : 1));
  return { rows: out, problems: [] };
}
