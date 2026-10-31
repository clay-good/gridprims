// POST /api/reports and the nightly retention cleanup (platform/problem-reports).
// Stores a valid report and returns its id. Computes nothing from the report,
// calls no other service with it, and sets no cookie.

import { challenge, checkPayload, MAX_BYTES, verifyPow } from '../core/contract/report.mjs';

const DAY = 86_400_000;
export const CLOSED_RETENTION_DAYS = 180;
export const MAX_RETENTION_DAYS = 365;

const json = (status, body, extra = {}) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store', ...extra } });

/** A short random id people can quote when asking for deletion. */
export function reportId() {
  const alphabet = 'abcdefghjkmnpqrstuvwxyz23456789';
  const bytes = crypto.getRandomValues(new Uint8Array(10));
  return `r_${Array.from(bytes, (b) => alphabet[b % alphabet.length]).join('')}`;
}

/**
 * @param {Request} request
 * @param {{DB: any, REPORT_LIMITER?: {limit: (o: {key: string}) => Promise<{success: boolean}>}}} env
 * @param {() => number} [now]
 */
export async function handleReport(request, env, now = Date.now) {
  if (request.method !== 'POST') return json(405, { error: 'Send reports with POST.' }, { allow: 'POST' });
  if (!/^application\/json\b/.test(request.headers.get('content-type') ?? '')) return json(415, { error: 'Send the report as JSON.' });
  if (Number(request.headers.get('content-length') ?? 0) > MAX_BYTES) return json(413, { error: 'The report is too large.' });

  // Ten reports per ten minutes per client, counted by the host at each edge location.
  const key = request.headers.get('cf-connecting-ip') ?? 'unknown';
  if (env.REPORT_LIMITER && !(await env.REPORT_LIMITER.limit({ key })).success) {
    return json(429, { error: 'Too many reports from here. Please try again in 10 minutes.' }, { 'retry-after': '600' });
  }

  const text = await request.text();
  if (new TextEncoder().encode(text).length > MAX_BYTES) return json(413, { error: 'The report is too large.' });
  let p;
  try { p = JSON.parse(text); } catch { return json(400, { error: 'The report is not valid JSON.' }); }
  const problem = checkPayload(p);
  if (problem) return json(400, { error: problem });

  // A filled honeypot gets a normal-looking answer and is not stored.
  if (p.website) return json(201, { id: reportId(), changelog: '/changelog/' });
  if (!verifyPow(p.pow, challenge(p))) return json(400, { error: 'The report form needs to be sent from the gridprims page.' });

  const { website, pow, ...stored } = p;
  const id = reportId();
  await env.DB.prepare('INSERT INTO reports (id, received_at, closed_at, payload) VALUES (?1, ?2, NULL, ?3)')
    .bind(id, new Date(now()).toISOString(), JSON.stringify(stored)).run();
  return json(201, { id, changelog: '/changelog/' });
}

/** Delete reports closed more than 180 days ago, and any report older than 365 days. */
export async function cleanupReports(env, now = Date.now) {
  const closedBefore = new Date(now() - CLOSED_RETENTION_DAYS * DAY).toISOString();
  const receivedBefore = new Date(now() - MAX_RETENTION_DAYS * DAY).toISOString();
  return env.DB.prepare('DELETE FROM reports WHERE (closed_at IS NOT NULL AND closed_at < ?1) OR received_at < ?2').bind(closedBefore, receivedBefore).run();
}
