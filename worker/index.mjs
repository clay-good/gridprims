// The one Cloudflare Worker (foundation design D4, D9, D15): serves the static
// site with security headers and stores problem reports. The watchdog
// handler is added by task 10.14. It sets no cookies and computes
// nothing from what visitors send.

import { securityHeaders } from './headers.mjs';
import { THEME_SCRIPT } from '../site/templates/layout.mjs';
import { cleanupReports, handleReport } from './reports.mjs';

let headersPromise = null;

/** The CSP hash of the inline theme script, computed once from the same constant the pages embed. */
async function headers() {
  headersPromise ??= crypto.subtle.digest('SHA-256', new TextEncoder().encode(THEME_SCRIPT)).then((buf) => {
    const b64 = btoa(String.fromCharCode(...new Uint8Array(buf)));
    return securityHeaders([`sha256-${b64}`]);
  });
  return headersPromise;
}

/** Copy a response with our headers added; a page response never sets a cookie. */
async function withHeaders(res, status = res.status) {
  const out = new Response(res.body, { status, statusText: res.statusText, headers: res.headers });
  for (const [k, v] of Object.entries(await headers())) out.headers.set(k, v);
  out.headers.delete('set-cookie');
  return out;
}

export default {
  /**
   * @param {Request} request
   * @param {{ASSETS: {fetch: (r: Request | string) => Promise<Response>}}} env
   */
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === '/api/reports') return withHeaders(await handleReport(request, env));
    if (url.pathname.startsWith('/api/')) {
      return withHeaders(new Response(JSON.stringify({ error: 'Not found' }), { status: 404, headers: { 'content-type': 'application/json' } }));
    }
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      return withHeaders(new Response('Method not allowed', { status: 405, headers: { allow: 'GET, HEAD' } }));
    }
    const res = await env.ASSETS.fetch(request);
    if (res.status === 404) {
      const notFound = await env.ASSETS.fetch(new Request(new URL('/404.html', url), request));
      return withHeaders(notFound, 404);
    }
    return withHeaders(res);
  },

  /** The nightly schedule: report retention (the watchdog joins it with task 10.14). */
  async scheduled(event, env, ctx) {
    ctx.waitUntil(cleanupReports(env));
  },
};
