// The total identity: a balancing authority's total net interchange is the sum
// of its flows with each neighbor. EIA publishes two totals in the BALANCE
// file: the total as reported, and the adjusted total, where EIA imputed an
// anomalous value. Both readings are tested against the sum of the
// INTERCHANGE file's pairs, and the smaller residual leads (the conservative
// reading). EIA's "Sum(Valid DIBAs)" column is computed from those same pairs,
// so it cannot test them and is not used.

import { eachRow, mw, stats } from './eia-930-interchange-common.mjs';

export const SCHEMA = [
  { name: 'ba', type: 'str' }, { name: 'year', type: 'f64' },
  { name: 'hours_tested', type: 'f64', unit: 'hours with a total and at least one pair' }, { name: 'hours_unavailable', type: 'f64', unit: 'hours with a total and no pair, or pairs and no total' },
  { name: 'reported_residual_pct', type: 'f64', unit: '% of throughput, against the reported total' },
  { name: 'adjusted_residual_pct', type: 'f64', unit: '% of throughput, against EIA\'s adjusted total' },
  { name: 'leading_reading', type: 'str', unit: 'the reading with the smaller residual' },
  { name: 'median_mwh', type: 'f64', unit: 'MWh, hourly residual magnitude on the leading reading' }, { name: 'p90_mwh', type: 'f64', unit: 'MWh' }, { name: 'max_mwh', type: 'f64', unit: 'MWh' },
];

export async function normalize(input) {
  const totals = new Map();
  for (const k of ['b1', 'b2']) {
    await eachRow(input[k], (r) => {
      const t = mw(r['Total Interchange (MW)']);
      const v = mw(r['Total Interchange (MW) (Adjusted)']);
      if (t === null && v === null) return;
      totals.set(`${r['Balancing Authority']}|${r['UTC Time at End of Hour']}`, { reported: t, adjusted: v });
    });
  }
  const sums = new Map();
  for (const k of ['i1', 'i2']) {
    await eachRow(input[k], (r) => {
      const v = mw(r['Interchange (MW)']);
      if (v === null || Number.isNaN(v)) return;
      const key = `${r['Balancing Authority']}|${r['UTC Time at End of Hour']}`;
      sums.set(key, (sums.get(key) ?? 0) + v);
    });
  }
  const per = new Map();
  for (const key of new Set([...totals.keys(), ...sums.keys()])) {
    const ba = key.slice(0, key.indexOf('|'));
    const p = per.get(ba) ?? per.set(ba, { tested: 0, unavailable: 0, throughput: 0, reported: [], adjusted: [] }).get(ba);
    const t = totals.get(key);
    const s = sums.get(key);
    if (!t || s === undefined || t.reported === null) { p.unavailable++; continue; }
    p.tested++;
    p.throughput += Math.max(Math.abs(t.reported), Math.abs(s));
    p.reported.push(t.reported - s);
    if (t.adjusted !== null) p.adjusted.push(t.adjusted - s);
  }
  const pct = (xs, tp) => (tp ? Math.round((xs.reduce((n, r) => n + Math.abs(r), 0) / tp) * 1e6) / 1e4 : null);
  const rows = [...per].sort((x, y) => (x[0] < y[0] ? -1 : 1)).filter(([, p]) => p.tested).map(([ba, p]) => {
    const rep = pct(p.reported, p.throughput);
    const adj = p.adjusted.length ? pct(p.adjusted, p.throughput) : null;
    const leading = adj !== null && adj < rep ? 'adjusted total' : 'reported total';
    const s = stats(leading === 'reported total' ? p.reported : p.adjusted);
    return { ba, year: 2025, hours_tested: p.tested, hours_unavailable: p.unavailable, reported_residual_pct: rep, adjusted_residual_pct: adj, leading_reading: leading, median_mwh: s.median, p90_mwh: s.p90, max_mwh: s.max };
  });
  return { rows, problems: [], dataPeriod: '2025' };
}
