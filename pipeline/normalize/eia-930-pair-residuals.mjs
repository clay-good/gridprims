// The pair identity: the flow one balancing authority reports with a neighbor
// and the flow the neighbor reports back are equal and opposite by EIA's sign
// convention (positive is a net outflow). For each pair and hour both report,
// the residual is the sum of the two reports; an hour only one reported is
// unavailable, not a residual.

import { eachRow, mw, stats } from './eia-930-interchange-common.mjs';

export const SCHEMA = [
  { name: 'ba', type: 'str' }, { name: 'neighbor', type: 'str' }, { name: 'year', type: 'f64' },
  { name: 'hours_tested', type: 'f64', unit: 'hours both reported' }, { name: 'hours_unavailable', type: 'f64', unit: 'hours only one reported' },
  { name: 'throughput_mwh', type: 'f64', unit: 'MWh, the larger report each hour' }, { name: 'residual_mwh', type: 'f64', unit: 'MWh, the sum of hourly residual magnitudes' },
  { name: 'residual_pct', type: 'f64', unit: '% of throughput' },
  { name: 'median_mwh', type: 'f64', unit: 'MWh, hourly residual magnitude' }, { name: 'p90_mwh', type: 'f64', unit: 'MWh' }, { name: 'max_mwh', type: 'f64', unit: 'MWh' },
];

export async function normalize(input) {
  // Per pair and UTC hour: the lower code's report of its flow to the higher, and the higher's back.
  const hours = new Map();
  const problems = [];
  for (const k of ['i1', 'i2']) {
    const head = await eachRow(input[k], (r) => {
      const a = r['Balancing Authority'];
      const b = r['Directly Interconnected Balancing Authority'];
      const v = mw(r['Interchange (MW)']);
      if (!a || !b || v === null || Number.isNaN(v)) return;
      const [lo, hi] = a < b ? [a, b] : [b, a];
      const key = `${lo}|${hi}|${r['UTC Time at End of Hour']}`;
      const h = hours.get(key) ?? hours.set(key, { lo: null, hi: null }).get(key);
      h[a === lo ? 'lo' : 'hi'] = v;
    });
    if (!head?.includes('Interchange (MW)')) problems.push(`${k}: no Interchange (MW) column`);
  }
  const pairs = new Map();
  for (const [key, h] of hours) {
    const pair = key.slice(0, key.lastIndexOf('|'));
    const p = pairs.get(pair) ?? pairs.set(pair, { tested: 0, unavailable: 0, throughput: 0, residuals: [] }).get(pair);
    if (h.lo === null || h.hi === null) { p.unavailable++; continue; }
    p.tested++;
    p.throughput += Math.max(Math.abs(h.lo), Math.abs(h.hi));
    p.residuals.push(h.lo + h.hi);
  }
  const rows = [...pairs].sort((x, y) => (x[0] < y[0] ? -1 : 1)).map(([pair, p]) => {
    const [ba, neighbor] = pair.split('|');
    const residual = p.residuals.reduce((n, r) => n + Math.abs(r), 0);
    const s = stats(p.residuals);
    return { ba, neighbor, year: 2025, hours_tested: p.tested, hours_unavailable: p.unavailable, throughput_mwh: p.throughput, residual_mwh: residual, residual_pct: p.throughput ? Math.round((residual / p.throughput) * 1e6) / 1e4 : null, median_mwh: s.median, p90_mwh: s.p90, max_mwh: s.max };
  });
  return { rows, problems, dataPeriod: '2025' };
}
