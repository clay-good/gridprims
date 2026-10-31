// Assembling one canonical series from timed readings: shared by every
// intake reader so duplicates and gaps follow one rule everywhere.

/**
 * @param {Array<{ms: number, value: number, line?: number}>} items readings with UTC start times
 * @param {{meter: string, channel: string, intervalMinutes: number, unitRead: string, quantity: 'energy' | 'demand', toKwh: number}} meta
 *   toKwh converts an energy reading to kWh; demand readings (kW) are converted by the interval length
 * @param {{identical: number, conflicting: number, examples: any[]}} duplicates tally shared across series
 * @param {any[]} gaps list shared across series
 */
export function assembleSeries(items, meta, duplicates, gaps) {
  items.sort((a, b) => a.ms - b.ms || (a.line ?? 0) - (b.line ?? 0));
  const ms = [];
  const vals = [];
  for (const it of items) {
    const last = ms.length - 1;
    if (last >= 0 && ms[last] === it.ms) {
      if (vals[last] === it.value) duplicates.identical++;
      else {
        duplicates.conflicting++;
        if (duplicates.examples.length < 5) duplicates.examples.push({ meter: meta.meter, startMs: it.ms, values: [vals[last], it.value] });
        vals[last] = Math.max(vals[last], it.value); // the rule: keep the higher reading, so demand is never understated
      }
      continue;
    }
    ms.push(it.ms);
    vals.push(it.value);
  }
  const step = meta.intervalMinutes * 60_000;
  for (let i = 1; i < ms.length; i++) {
    const missing = Math.round((ms[i] - ms[i - 1]) / step) - 1;
    if (missing > 0) gaps.push({ meter: meta.meter, channel: meta.channel, startMs: ms[i - 1] + step, endMs: ms[i], intervals: missing });
  }
  const factor = meta.quantity === 'demand' ? meta.intervalMinutes / 60 : meta.toKwh;
  // Divide for factors below 1 (Wh to kWh is ÷ 1,000), so whole watt-hours convert exactly.
  const convert = factor < 1 ? (v) => v / Math.round(1 / factor) : (v) => v * factor;
  return {
    meter: meta.meter, channel: meta.channel, intervalMinutes: meta.intervalMinutes, unitRead: meta.unitRead, quantity: meta.quantity,
    startMs: Float64Array.from(ms), kwh: Float64Array.from(vals, convert),
  };
}

export const DUPLICATE_RULE = 'When two readings share a time, the higher one is kept.';
