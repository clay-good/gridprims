// Worked examples for weather.change.explain: 24 monthly bills and two years
// of daily mean temperatures from a smooth seasonal curve, so the expected
// parts follow from stated numbers. The second winter is 6 °F colder.

const DAY = 86_400_000;
const iso = (t) => new Date(t).toISOString().slice(0, 10);
const START = Date.UTC(2024, 10, 1); // November 1, 2024

/** Daily mean °F: a 55 °F year swinging 25 °F, coldest in mid-January, the second winter `colder` °F colder. */
const meanOn = (i, colder) => {
  const doy = (i + 305) % 365;
  const winter2 = i >= 365 && (doy < 90 || doy > 300) ? colder : 0;
  return Math.round((55 - 25 * Math.cos((2 * Math.PI * (doy - 15)) / 365) - winter2) * 10) / 10;
};

/** The weather input as the station picker writes it. */
export function weatherText(colder) {
  const lines = ['station EXAMPLE A smooth seasonal curve'];
  for (let i = 0; i < 730; i++) lines.push(`${iso(START + i * DAY)} ${meanOn(i, colder)}`);
  return lines.join('\n');
}

/** 24 monthly bills: base + slope × heating degree days below 60 °F, and `extra` kWh a day more in the second year. */
export function billsText(colder, { base = 18, slope = 1.2, extra = 0 } = {}) {
  const lines = [];
  let i = 0;
  for (let m = 0; m < 24; m++) {
    const from = new Date(Date.UTC(2024, 10 + m, 1));
    const to = new Date(Date.UTC(2024, 11 + m, 0));
    const days = Math.round((to - from) / DAY) + 1;
    let kwh = 0;
    for (let d = 0; d < days; d++, i++) kwh += base + (i >= 365 ? extra : 0) + slope * Math.max(0, 60 - meanOn(i, colder));
    lines.push(`${iso(from)} to ${iso(to)}, ${Math.round(kwh)} kWh`);
  }
  return lines.join('\n');
}
