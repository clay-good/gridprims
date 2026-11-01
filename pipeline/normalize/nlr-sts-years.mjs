// Our state capacity of community solar serving customers by year of
// interconnection, for the check against the laboratory's own State Summary.

import { projects } from './nlr-sts-common.mjs';

export const SCHEMA = [{ name: 'state', type: 'str' }, { name: 'year', type: 'f64' }, { name: 'projects', type: 'f64' }, { name: 'mw_ac', type: 'f64', unit: 'MW-AC' }];

export async function normalize(rows) {
  const p = projects(rows);
  if (p.problem) return { rows: [], problems: [p.problem] };
  const groups = Map.groupBy(p.projects.filter((x) => x.year !== null), (x) => `${x.state}|${x.year}`);
  const out = [...groups].map(([k, xs]) => ({ state: k.split('|')[0], year: Number(k.split('|')[1]), projects: xs.length, mw_ac: Math.round(xs.reduce((n, x) => n + x.mw, 0) * 1e6) / 1e6 }))
    .sort((a, b) => (a.state < b.state ? -1 : a.state > b.state ? 1 : a.year - b.year));
  return { rows: out, problems: [] };
}
