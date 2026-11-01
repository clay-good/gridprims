// The data continuity ledger (add-data-continuity-ledger: continuity): one row
// per dataset we hold, ours included, saying whether it is current, due, late,
// or discontinued by the one lateness rule, with the publisher's notice, its
// URL's last check, our archived copy, any change to a posted release date,
// and any reply from the publisher published beside it; plus rows for the
// automation itself and every cited link that no longer resolves. Pages age it
// on the device from its generated-at time.

import { GRACE_DAYS, lateness } from './lateness.mjs';

const DAY = 86_400_000;

/** Fields a dataset needs before it can have a row; the build fails naming the missing one. */
export const REQUIRED = ['id', 'title', 'publisher', 'sourceUrl', 'cadence.every', 'asOf'];
const get = (o, path) => path.split('.').reduce((x, k) => x?.[k], o);

/**
 * The fields a dataset is missing for a ledger row.
 * @param {{id?: string}} d @returns {string[]}
 */
export function missingFields(d) {
  return REQUIRED.filter((f) => { const v = get(d, f); return v === undefined || v === null || v === ''; });
}

/**
 * A dataset's status at a moment: discontinued, late (30 days past due), due, or current.
 * @param {{asOf: string, cadence: any, discontinued?: any}} d @param {number} now
 */
export function statusOf(d, now) {
  if (d.discontinued) return { status: 'discontinued' };
  const l = lateness(d, now);
  const status = l.late ? 'late' : now >= Date.parse(`${l.due}T00:00:00Z`) ? 'due' : 'current';
  return { status, ...l, graceDays: GRACE_DAYS };
}

/**
 * One ledger row.
 * @param {any} d a dataset as the ledger sees it: registry fields, the served manifest's vintage and as-of, and ours or not
 * @param {{health?: any, replies?: any[], now: number}} ctx
 */
export function ledgerRow(d, { health, replies = [], now }) {
  const missing = missingFields(d);
  if (missing.length) throw new Error(`ledger: ${d.id ?? '(no id)'} is missing ${missing.join(', ')}`);
  const link = (health?.links ?? []).find((l) => l.url === d.sourceUrl) ?? null;
  const h = (health?.datasets ?? []).find((x) => x.id === d.id) ?? null;
  const next = d.cadence.nextRelease ?? null;
  const promises = h?.releasePromises ?? [];
  return {
    id: d.id, title: d.title, publisher: d.publisher, ours: Boolean(d.ours),
    cadence: d.cadence.every, vintage: d.vintage ?? null, asOf: d.asOf,
    nextRelease: next ? { date: next.date, posted: Boolean(next.posted), note: next.note ?? null } : null,
    ...statusOf(d, now),
    // Lateness without a posted promise is inferred from the cadence, and says so.
    basis: next?.posted ? 'posted date' : `inferred from ${/^[aeiou]/.test(d.cadence.every) ? 'an' : 'a'} ${d.cadence.every} cadence`,
    notice: d.notice ?? next?.url ?? d.sourceUrl,
    url: d.sourceUrl,
    urlCheck: link ? { status: link.status, state: link.state, checked: link.checked ?? health?.generatedAt ?? null, ...(link.finalUrl ? { movedTo: link.finalUrl } : {}) } : null,
    archive: d.archive ?? null,
    diff: d.diff ?? null,
    ...(d.discontinued ? { discontinued: d.discontinued } : {}),
    ...(d.moved ? { moved: d.moved } : {}),
    // A posted release date that changed or vanished: every version we saw, with its date, and no cause.
    promiseHistory: promises.length > 1 ? promises : [],
    replies: replies.filter((r) => r.dataset === d.id),
    lastRefresh: h?.lastRefresh ?? null, lastCheck: h?.lastCheck ?? null,
    pinned: h?.pinned ?? null,
  };
}

/**
 * The whole ledger: counts first, then rows, the automation's own rows, and dead citations.
 * @param {{datasets: any[], health?: any, replies?: any[], generatedAt: string, contact: string}} p
 */
export function buildLedger({ datasets, health = null, replies = [], generatedAt, contact }) {
  const now = Date.parse(generatedAt);
  const rows = datasets.map((d) => ledgerRow(d, { health, replies, now })).sort((a, b) => (a.ours === b.ours ? (a.title < b.title ? -1 : 1) : a.ours ? 1 : -1));
  const count = (s) => rows.filter((r) => r.status === s).length;
  const automation = (health?.workflows ?? []).map((w) => ({
    workflow: w.id, lastSuccess: w.lastSuccess ?? null, lastRun: w.lastRun ?? null, enabled: w.enabled ?? null,
    intervalHours: w.intervalHours, thresholdHours: w.thresholdHours, events: w.events ?? [],
  }));
  const dead = (health?.links ?? []).filter((l) => l.state === 'broken').map((l) => ({ url: l.url, status: l.status, lastOk: l.lastOk ?? null, usedBy: l.usedBy ?? [], archive: l.archive ?? null }));
  return {
    generatedAt, license: 'CC BY 4.0', contact,
    counts: { tracked: rows.length, current: count('current'), due: count('due'), late: count('late'), discontinued: count('discontinued') },
    graceDays: GRACE_DAYS,
    rows, automation,
    deposits: { last: health?.deposits?.last ?? null, restoreTest: health?.deposits?.restoreTest ?? null },
    deadLinks: dead, linksChecked: (health?.links ?? []).length,
  };
}

/** Days from a time to now, on whatever clock the caller passes (the device's, on a page). */
export const ageDays = (iso, now = Date.now()) => Math.floor((now - Date.parse(iso)) / DAY);
