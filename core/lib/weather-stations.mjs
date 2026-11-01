// Weather stations for a place, chosen on the device (add-weather-normalization:
// degree-day data): candidate stations ranked by great-circle distance from a
// ZIP's internal point, and a station's daily mean temperatures assembled from
// its shard rows, with NOAA-flagged values treated as missing.

import { toF } from './weather-model.mjs';

const R_MILES = 3958.7613; // mean Earth radius
const rad = (d) => (d * Math.PI) / 180;

/** Great-circle distance in miles (haversine). */
export function miles(a, b) {
  const dLat = rad(b.lat - a.lat);
  const dLon = rad(b.lon - a.lon);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * R_MILES * Math.asin(Math.min(1, Math.sqrt(h)));
}

/**
 * Stations nearest a point, nearest first, with distance and elevation.
 * @param {{lat: number, lon: number}} point @param {Array<{station: string, lat: number, lon: number}>} stations
 */
export function rankStations(point, stations, count = 5) {
  return stations.map((s) => ({ ...s, miles: miles(point, s) })).sort((a, b) => a.miles - b.miles || (a.station < b.station ? -1 : 1)).slice(0, count);
}

const DAY = 86_400_000;
export const isoOfDay = (day) => new Date(day * DAY).toISOString().slice(0, 10);

/**
 * A station's daily mean temperature in °F by ISO date: the mean of the day's maximum and minimum, only on
 * days where both are present and neither carries a NOAA quality flag. Flagged values are counted.
 * @param {Iterable<any>} rows ghcn-daily shard rows @param {string} station
 */
export function dailyMeans(rows, station) {
  const means = new Map();
  let flagged = 0;
  for (const r of rows) {
    if (r.station !== station) continue;
    if (r.qflag_tmax || r.qflag_tmin) { flagged++; continue; }
    if (r.tmax === null || r.tmin === null) continue;
    means.set(isoOfDay(r.day), (toF(r.tmax) + toF(r.tmin)) / 2);
  }
  return { means, flagged };
}
