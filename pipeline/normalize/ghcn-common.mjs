// Shared reading of GHCN-Daily's fixed-width station index (ghcnd-stations.txt).

/** Each station's state and its index line's fields, for the stations wanted. @param {() => AsyncIterable<string>} lines @param {Set<string>} [want] */
export async function readStations(lines, want) {
  const out = new Map();
  for await (const l of lines()) {
    if (l.length < 40) continue;
    const id = l.slice(0, 11);
    if (want && !want.has(id)) continue;
    out.set(id, { state: l.slice(38, 40).trim() || null, lat: Number(l.slice(12, 20)), lon: Number(l.slice(21, 30)), elevation: Number(l.slice(31, 37)), name: l.slice(41, 71).trim() });
  }
  return out;
}

/** The station id a by-station file key names ("h_USW00023183" or "n_USW00023183"). */
export const stationOf = (key) => key.slice(2);
