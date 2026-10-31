// /.well-known/security.txt (RFC 9116; trust/security-disclosure). The expiry
// is eleven months after the build's date, and the build's date is the
// commit's, so a release rebuilds byte for byte and the daily scheduled
// commit keeps the expiry rolling forward with no one renewing it.

import { SECURITY } from './config.mjs';

/** Eleven months after a date, as RFC 3339 at midnight UTC. */
export function elevenMonthsAfter(iso) {
  const d = new Date(iso);
  const t = Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 11, Math.min(d.getUTCDate(), 28));
  return new Date(t).toISOString().replace('.000Z', 'Z');
}

/** @param {string} buildDate ISO date-time of the build (the commit's time) */
export function securityTxt(buildDate) {
  return [
    `Contact: ${SECURITY.contact}`,
    `Expires: ${elevenMonthsAfter(buildDate)}`,
    `Policy: ${SECURITY.policy}`,
    `Preferred-Languages: ${SECURITY.languages}`,
    `Canonical: ${SECURITY.canonical}`,
    '',
  ].join('\n');
}
