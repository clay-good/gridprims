// Steady-state ampacity of a bare overhead conductor by the IEEE 738 heat
// balance (add-grid-calculators: line-rating, task 1.1): the current at which
// convective and radiative cooling equal resistive and solar heating at the
// conductor's maximum temperature. The equations follow IEEE 738-2023's
// clauses on convective cooling, radiated heat loss, solar heat gain, and
// conductor resistance; the standard's text is not reproduced. Everything is
// SI inside; units convert at the boundary.

const RAD = Math.PI / 180;

/** Clear-atmosphere total heat flux density (W/m²) at sea level for a solar altitude in degrees (IEEE 738 polynomial). */
const CLEAR = [-42.2391, 63.8044, -1.922, 3.46921e-2, -3.61118e-4, 1.94318e-6, -4.07608e-9];
const flux = (hcDeg) => (hcDeg <= 0 ? 0 : Math.max(0, CLEAR.reduce((n, c, k) => n + c * hcDeg ** k, 0)));

/** The sun's altitude and azimuth (radians) for a latitude, day of year, and solar hour. */
export function sunPosition(latDeg, dayOfYear, solarHour, declinationAmplitude = 23.46) {
  const lat = latDeg * RAD;
  const delta = declinationAmplitude * RAD * Math.sin(((284 + dayOfYear) / 365) * 2 * Math.PI);
  const omega = (solarHour - 12) * 15 * RAD;
  const hc = Math.asin(Math.cos(lat) * Math.cos(delta) * Math.cos(omega) + Math.sin(lat) * Math.sin(delta));
  const chi = Math.sin(omega) / (Math.sin(lat) * Math.cos(omega) - Math.cos(lat) * Math.tan(delta));
  const c = omega < 0 && chi >= 0 ? 0 : omega >= 0 && chi < 0 ? 2 * Math.PI : Math.PI;
  return { altitude: hc, azimuth: c + Math.atan(chi) };
}

/**
 * The heat balance at a conductor temperature.
 * @param {{diameterM: number, r1: number, t1: number, r2: number, t2: number, emissivity: number, absorptivity: number}} c resistances in Ω/m
 * @param {{ambientC: number, windMps: number, windAngleDeg: number, elevationM: number, latitude: number, lineAzimuthDeg: number, dayOfYear: number, solarHour: number | null}} w solarHour null for night
 * @param {number} tc conductor temperature, °C
 */
export function heatBalance(c, w, tc, { declinationAmplitude = 23.46 } = {}) {
  const D = c.diameterM;
  const ta = w.ambientC;
  const tf = (tc + ta) / 2;
  const mu = (1.458e-6 * (tf + 273) ** 1.5) / (tf + 383.4);
  const rho = (1.293 - 1.525e-4 * w.elevationM + 6.379e-9 * w.elevationM ** 2) / (1 + 0.00367 * tf);
  const k = 2.424e-2 + 7.477e-5 * tf - 4.407e-9 * tf ** 2;
  const re = (D * rho * w.windMps) / mu;
  const phi = w.windAngleDeg * RAD;
  const kAngle = 1.194 - Math.cos(phi) + 0.194 * Math.cos(2 * phi) + 0.368 * Math.sin(2 * phi);
  const qc1 = kAngle * (1.01 + 1.35 * re ** 0.52) * k * (tc - ta);
  const qc2 = kAngle * 0.754 * re ** 0.6 * k * (tc - ta);
  const qcn = 3.645 * Math.sqrt(rho) * D ** 0.75 * (tc - ta) ** 1.25;
  const qc = Math.max(qc1, qc2, qcn);
  const qr = 17.8 * D * c.emissivity * (((tc + 273) / 100) ** 4 - ((ta + 273) / 100) ** 4);
  let qs = 0;
  if (w.solarHour !== null) {
    const sun = sunPosition(w.latitude, w.dayOfYear, w.solarHour, declinationAmplitude);
    const hcDeg = sun.altitude / RAD;
    const kSolar = 1 + 1.148e-4 * w.elevationM - 1.108e-8 * w.elevationM ** 2;
    const theta = Math.acos(Math.cos(sun.altitude) * Math.cos(sun.azimuth - w.lineAzimuthDeg * RAD));
    qs = c.absorptivity * kSolar * flux(hcDeg) * Math.sin(theta) * D;
  }
  const r = c.r1 + ((c.r2 - c.r1) / (c.t2 - c.t1)) * (tc - c.t1);
  return { qc, qcForced: Math.max(qc1, qc2), qcNatural: qcn, qr, qs, r };
}

/** Steady-state ampacity in amps at the conductor's maximum temperature, with the heat terms (W/m). */
export function ampacity(c, w, maxTempC, opts) {
  const h = heatBalance(c, w, maxTempC, opts);
  const net = h.qc + h.qr - h.qs;
  return { amps: net > 0 ? Math.sqrt(net / h.r) : 0, ...h };
}

/** Three-phase MVA for amps on a line-to-line kV: √3 × kV × kA. */
export const mva = (amps, kv) => Math.sqrt(3) * kv * (amps / 1000);

/** US customary inputs to SI: inches, ft/s, ft, Ω per mile. */
export const US = { inch: 0.0254, ftPerS: 0.3048, ft: 0.3048, ohmPerMile: 1 / 1609.344 };

/**
 * A conductor-only ambient-adjusted rating table: day (with solar gain at the date and hour) and night (none)
 * amps for each ambient temperature, under one fixed wind assumption.
 * @returns {Array<{ambientC: number, dayAmps: number, nightAmps: number}>}
 */
export function ratingTable(c, w, maxTempC, { fromC = -20, toC = 45, stepC = 1 } = {}) {
  const rows = [];
  for (let ta = fromC; ta <= toC + 1e-9; ta += stepC) {
    const t = Math.round(ta * 1000) / 1000;
    const day = t < maxTempC ? ampacity(c, { ...w, ambientC: t }, maxTempC).amps : 0;
    const night = t < maxTempC ? ampacity(c, { ...w, ambientC: t, solarHour: null }, maxTempC).amps : 0;
    rows.push({ ambientC: t, dayAmps: day, nightAmps: night });
  }
  return rows;
}

/** The table as CSV, with its assumptions and what it leaves out in header comments. */
export function ratingTableCsv(rows, assumptions) {
  return [
    '# Conductor thermal-limit table (IEEE 738 steady-state heat balance), computed by gridprims.',
    '# This excludes terminal equipment and emergency ratings, which a facility\'s Order 881 rating must also consider.',
    ...assumptions.map((a) => `# ${a}`),
    'ambient_c,day_amps,night_amps',
    ...rows.map((r) => `${r.ambientC},${Math.round(r.dayAmps)},${Math.round(r.nightAmps)}`),
  ].join('\n') + '\n';
}
