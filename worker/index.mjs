// The one Cloudflare Worker (foundation design D4, D9, D15): serves the static
// site with security headers, stores problem reports, and runs the nightly
// watchdog that keeps the CI schedules alive. It sets no cookies and computes
// nothing from what visitors send.

import { securityHeaders } from './headers.mjs';
import { THEME_SCRIPT } from '../site/templates/layout.mjs';
import { cleanupReports, handleReport } from './reports.mjs';
import { watchdog } from './watchdog.mjs';

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

/** Data files are a public API: any origin may read them, and nothing sent with them is personal. */
function openData(res) {
  res.headers.set('access-control-allow-origin', '*');
  res.headers.set('cross-origin-resource-policy', 'cross-origin');
  return res;
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
    // The static data API (add-public-grid-data: data library): /data/<id>/latest/<file> redirects to
    // the current version, and every data file can be read from any origin, without credentials.
    const latest = /^\/data\/([a-z0-9-]+)\/latest\/(.+)$/.exec(url.pathname);
    if (latest) {
      const cur = await env.ASSETS.fetch(new Request(new URL(`/data/${latest[1]}/current.json`, url), request));
      if (!cur.ok) return openData(await withHeaders(await env.ASSETS.fetch(new Request(new URL('/404.html', url), request)), 404));
      const { version } = await cur.json();
      return openData(await withHeaders(new Response(null, { status: 302, headers: { location: `/data/${latest[1]}/${version}/${latest[2]}`, 'cache-control': 'public, max-age=300' } })));
    }
    const res = await env.ASSETS.fetch(request);
    if (url.pathname.startsWith('/data/') && res.ok && !url.pathname.endsWith('/')) return openData(await withHeaders(res));
    if (res.status === 404) {
      // A plant page that fell below the content minimum redirects to its state page (site/build.mjs MOVED_PLANTS).
      const plant = /^\/plants\/(\d+)\/?$/.exec(url.pathname);
      if (plant) {
        const moved = await env.ASSETS.fetch(new Request(new URL('/moved-plants.json', url), request));
        const to = moved.ok ? (await moved.json())[plant[1]] : null;
        if (to) return withHeaders(new Response(null, { status: 301, headers: { location: to } }));
      }
      const notFound = await env.ASSETS.fetch(new Request(new URL('/404.html', url), request));
      return withHeaders(notFound, 404);
    }
    // RFC 9116 asks for plain text in UTF-8, whatever the host would infer.
    if (url.pathname === '/.well-known/security.txt') {
      const out = await withHeaders(res);
      out.headers.set('content-type', 'text/plain; charset=utf-8');
      return out;
    }
    return withHeaders(res);
  },

  /** The nightly schedule: report retention and the watchdog. Neither depends on the other. */
  async scheduled(event, env, ctx) {
    ctx.waitUntil(cleanupReports(env));
    ctx.waitUntil(watchdog(env).catch(() => { /* a failed watchdog shows as a stale heartbeat */ }));
  },
};
