// The problem-report payload (platform/problem-reports; docs/decisions-day-one.md §7):
// its schema and limits, its canonical form, and the proof of work. The
// website, the Worker, and the MCP server all use this one module.

import { leadingZeroBits, sha256, toHex } from '../lib/sha256.mjs';

export const MAX_BYTES = 16 * 1024;
export const POW_BITS = 16;
export const LIMITS = { toolId: 64, toolVersion: 64, pageUrl: 512, message: 4000, datasets: 20, attachmentBytes: 8 * 1024 };
const FIELDS = new Set(['toolId', 'toolVersion', 'datasets', 'pageUrl', 'message', 'attachment', 'website', 'pow']);
const enc = new TextEncoder();

/** The fields that are hashed and stored: everything but the honeypot and the proof. */
export function canonical(p) {
  const { toolId = '', toolVersion = '', datasets = [], pageUrl = '', message = '', attachment } = p;
  return JSON.stringify({ toolId, toolVersion, datasets, pageUrl, message, ...(attachment === undefined ? {} : { attachment }) });
}

/** The challenge a proof of work answers: the payload's own digest. */
export const challenge = (p) => toHex(sha256(enc.encode(canonical(p))));

/**
 * Find a nonce whose hash with the challenge has POW_BITS leading zero bits.
 * @param {string} ch
 * @param {number} [bits]
 */
export function solve(ch, bits = POW_BITS) {
  for (let nonce = 0; ; nonce++) {
    const d = sha256(enc.encode(`${nonce}:${ch}`));
    if (leadingZeroBits(d) >= bits) return { nonce: String(nonce), hash: toHex(d) };
  }
}

/** @param {{nonce: string, hash: string}} pow @param {string} ch @param {number} [bits] */
export function verifyPow(pow, ch, bits = POW_BITS) {
  if (!pow || typeof pow.nonce !== 'string' || pow.nonce.length > 20) return false;
  const d = sha256(enc.encode(`${pow.nonce}:${ch}`));
  return toHex(d) === pow.hash && leadingZeroBits(d) >= bits;
}

/**
 * Check a submitted payload against the schema and limits.
 * @returns {string | null} what is wrong, in plain words
 */
export function checkPayload(p) {
  if (!p || typeof p !== 'object' || Array.isArray(p)) return 'The report must be a JSON object.';
  for (const k of Object.keys(p)) if (!FIELDS.has(k)) return `Unknown field ${JSON.stringify(k)}.`;
  for (const k of ['toolId', 'toolVersion', 'pageUrl', 'message']) {
    if (p[k] !== undefined && typeof p[k] !== 'string') return `${k} must be text.`;
    if ((p[k] ?? '').length > LIMITS[k]) return `${k} is longer than ${LIMITS[k]} characters.`;
  }
  if (!p.message?.trim()) return 'Say what looks wrong.';
  if ((p.pageUrl ?? '').includes('#')) return 'The page address must not include a fragment.';
  if (p.datasets !== undefined && (!Array.isArray(p.datasets) || p.datasets.length > LIMITS.datasets || p.datasets.some((d) => !d || typeof d.id !== 'string'))) return 'datasets must be a list of {id, version}.';
  if (p.attachment !== undefined && enc.encode(JSON.stringify(p.attachment)).length > LIMITS.attachmentBytes) return 'The attachment is too large.';
  if (p.website !== undefined && typeof p.website !== 'string') return 'Invalid form.';
  return null;
}
