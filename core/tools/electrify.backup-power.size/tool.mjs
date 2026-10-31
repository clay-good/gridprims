// electrify.backup-power.size: a first-pass battery and generator size from
// a list of critical loads and the outage length to ride through.

import { battery, generator, parseLoads, peakRunningKw, profile } from '../../lib/backup-power.mjs';

const n1 = (x) => x.toLocaleString('en-US', { maximumFractionDigits: 2 });

/**
 * @param {{loads: string, hours: number, usable: number, motorRunKw: number, motorStartKw: number}} v
 */
export function compute(v) {
  const { loads, errors } = parseLoads(v.loads);
  if (errors.length) return { status: 'invalid', errors: errors.map((message) => ({ field: 'loads', message })) };
  if (!loads.length) return { status: 'invalid', errors: [{ field: 'loads', message: 'List at least one critical load, as "refrigerator, 0.2 kW, 24 h".' }] };
  if (v.motorStartKw > 0 && !(v.motorRunKw > 0)) return { status: 'invalid', errors: [{ field: 'motorRunKw', message: 'Enter the motor\'s running kW from its nameplate, as well as its starting kW.' }] };
  const kw = profile(loads);
  const daily = kw.reduce((a, b) => a + b, 0);
  const b = battery(kw, v.hours, v.usable / 100);
  const peak = peakRunningKw(loads);
  const g = generator(peak, v.motorStartKw > 0 ? { runKw: v.motorRunKw, startKw: v.motorStartKw } : null);
  return {
    status: 'ok',
    outputs: { dailyKwh: daily, usableKwh: b.usableKwh, nameplateKwh: b.nameplateKwh, peakKw: peak, generatorKw: g.kw },
    sentence: (out) => `For ${n1(v.hours)} hours, get a battery of about ${out.nameplateKwh.display} kWh (${out.usableKwh.display} kWh you can use). Or get a generator of at least ${out.generatorKw.display} kW.`,
    steps: [
      `Daily critical energy: ${loads.map((l) => `${l.name} ${l.kw} kW × ${l.hours} h = ${n1(l.kw * l.hours)} kWh`).join('; ')}; total ${n1(daily)} kWh.`,
      `Critical load by hour: ${kw.map((x) => n1(x)).join(', ')} kW (midnight to 11 pm). A load with no start time is spread over the day.`,
      `Battery: the outage starts at ${b.startHour}:00, the hour with the most critical load, and lasts ${n1(v.hours)} hours: ${n1(b.usableKwh)} kWh usable ÷ ${v.usable}% usable window = ${n1(b.nameplateKwh)} kWh nameplate.`,
      `Generator: ${g.formula}. A load with no start time counts at its full kW, since it could run at any moment.`,
      'Generator ratings are usually stated at 0.8 power factor. Check motor starting against the generator\'s own motor-starting data; no starting multiplier is assumed.',
    ],
  };
}
