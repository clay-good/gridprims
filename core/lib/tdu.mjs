// Texas TDU delivery charges by effective date (add-household-bill-check 1.3; plan-finder, "Retail choice
// supply plus delivery"): the version of a TDU's residential charges in force on a day, and the charges a
// billing period carries, from the version in force on its last day, with any change inside the period named.

/** The TDUs the data covers, in the order a picker lists them. */
export const TDUS = ['oncor', 'centerpoint', 'aep-texas-central', 'aep-texas-north', 'tnmp', 'lubbock'];

/**
 * The version in force on an ISO date, or null when none is (before the first on file, or after a version
 * marked superseded with no successor on file).
 * @param {any[]} versions @param {string} tdu @param {string} day YYYY-MM-DD
 */
export function versionOn(versions, tdu, day) {
  const v = versions.filter((x) => x.tdu === tdu && x.effective <= day).sort((a, b) => a.effective.localeCompare(b.effective)).at(-1) ?? null;
  return v && v.supersededOn && day >= v.supersededOn ? null : v;
}

/**
 * The delivery charges for a billing period, as the bill engine's named charges, from the version in force on
 * the period's last day.
 * @param {any[]} versions @param {string} tdu @param {{start: string, end: string}} period
 * @returns {null | {version: any, charges: Array<{label: string, monthly?: number, perKwh?: number}>, changedMidPeriod: string | null}}
 */
export function chargesFor(versions, tdu, period) {
  const version = versionOn(versions, tdu, period.end);
  if (!version) return null;
  const changed = versions.filter((x) => x.tdu === tdu && x.effective > period.start && x.effective <= period.end).map((x) => x.effective).sort().at(-1) ?? null;
  return {
    version,
    charges: [
      ...(version.total.dollarsPerMonth ? [{ label: `${version.name} delivery, per month`, monthly: Math.round(version.monthly.reduce((t, c) => t + c.dollars, 0) * 100) / 100 }] : []),
      // From the components as the sheet states them; a recorded total may be rounded to four places.
      { label: `${version.name} delivery, per kWh`, perKwh: Math.round(version.perKwh.reduce((t, c) => t + c.cents, 0) * 1e5) / 1e7 },
    ],
    changedMidPeriod: changed,
  };
}
