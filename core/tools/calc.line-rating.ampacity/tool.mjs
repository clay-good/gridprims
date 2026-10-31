// calc.line-rating.ampacity: steady-state ampacity of a bare overhead
// conductor by the IEEE 738 heat balance, in US or SI units.

import { ampacity, mva, US } from '../../lib/line-rating.mjs';

const fmt = (x, d) => x.toLocaleString('en-US', { maximumFractionDigits: d });

/** The day of the year for a YYYY-MM-DD date, or null. */
const dayOfYear = (iso) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(iso).trim());
  if (!m) return null;
  const t = Date.UTC(+m[1], +m[2] - 1, +m[3]);
  if (new Date(t).getUTCMonth() !== +m[2] - 1) return null;
  return Math.round((t - Date.UTC(+m[1], 0, 1)) / 86_400_000) + 1;
};

/**
 * @param {{units: 'us' | 'si', diameter: number, r1: number, t1: number, r2: number, t2: number, emissivity: number, absorptivity: number, maxTemp: number, ambient: number, wind: number, windAngle: number, elevation: number, latitude: number, lineAzimuth: number, date: string, solarHour: number, kv: number}} v
 */
export function compute(v) {
  const us = v.units === 'us';
  const doy = dayOfYear(v.date);
  if (doy === null) return { status: 'invalid', errors: [{ field: 'date', message: 'Enter the date as YYYY-MM-DD, such as 2025-07-15.' }] };
  if (v.t1 === v.t2) return { status: 'invalid', errors: [{ field: 't2', message: 'The two resistance temperatures must differ.' }] };
  // Convert at the boundary: everything inside is SI.
  const c = {
    diameterM: us ? v.diameter * US.inch : v.diameter / 1000,
    r1: us ? v.r1 * US.ohmPerMile : v.r1 / 1000, t1: v.t1,
    r2: us ? v.r2 * US.ohmPerMile : v.r2 / 1000, t2: v.t2,
    emissivity: v.emissivity, absorptivity: v.absorptivity,
  };
  const w = {
    ambientC: v.ambient, windMps: us ? v.wind * US.ftPerS : v.wind, windAngleDeg: v.windAngle,
    elevationM: us ? v.elevation * US.ft : v.elevation, latitude: v.latitude, lineAzimuthDeg: v.lineAzimuth, dayOfYear: doy, solarHour: v.solarHour,
  };
  if (!(v.maxTemp > v.ambient)) return { status: 'invalid', errors: [{ field: 'maxTemp', message: 'The maximum conductor temperature must be above the air temperature.' }] };
  const r = ampacity(c, w, v.maxTemp);
  const per = us ? 'W/ft' : 'W/m';
  const q = (x) => (us ? x * US.ft : x);
  const windText = `${fmt(v.wind, 3)} ${us ? 'ft/s' : 'm/s'}`;
  return {
    status: 'ok',
    outputs: { amps: r.amps, ...(v.kv > 0 ? { mva: mva(r.amps, v.kv) } : {}), convection: q(r.qc), radiation: q(r.qr), solar: q(r.qs) },
    sentence: (out) => `The line can carry ${out.amps.display} A at ${fmt(v.maxTemp, 1)} °C. In ${windText} of wind, the air takes away ${out.convection.display} ${per} of heat.`,
    steps: [
      `Resistance at ${fmt(v.maxTemp, 1)} °C, interpolated from the two values entered: ${(r.r * (us ? 1609.344 : 1000)).toFixed(5)} Ω/${us ? 'mile' : 'km'}.`,
      `Convective cooling: ${fmt(q(r.qc), 3)} ${per} (forced ${fmt(q(r.qcForced), 3)}, natural ${fmt(q(r.qcNatural), 3)}; the larger is used), IEEE 738 clause on convective heat loss.`,
      `Radiated heat loss: ${fmt(q(r.qr), 3)} ${per}; solar heat gain: ${fmt(q(r.qs), 3)} ${per} on ${v.date} at solar hour ${v.solarHour}.`,
      `Ampacity: √((cooling + radiation − solar) ÷ resistance) = ${fmt(r.amps, 1)} A.`,
      ...(v.kv > 0 ? [`Three-phase rating at ${fmt(v.kv, 3)} kV: √3 × ${fmt(v.kv, 3)} kV × ${fmt(r.amps / 1000, 4)} kA = ${fmt(mva(r.amps, v.kv), 1)} MVA.`] : []),
      'This is the conductor\'s thermal limit only; terminal equipment, emergency ratings, and clearances also limit a line.',
    ],
  };
}
