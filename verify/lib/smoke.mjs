// Header checks shared by the local worker test and the post-deploy smoke test
// (platform/privacy-and-security, "Strict Content Security Policy").

import { REQUIRED_DIRECTIVES } from '../../worker/headers.mjs';

/** Problems with one response's security headers; empty when it is right. */
export function checkHeaders(res) {
  const problems = [];
  const csp = res.headers.get('content-security-policy') ?? '';
  const directives = csp.split(';').map((d) => d.trim());
  for (const req of REQUIRED_DIRECTIVES) {
    const [name] = req.split(' ');
    const d = directives.find((x) => x.startsWith(`${name} `));
    if (!d || !d.startsWith(req)) problems.push(`missing ${req}`);
    if (d && /\*|https?:|'unsafe-(inline|eval)'/.test(d)) problems.push(`${name} allows more than its own origin`);
  }
  if (res.headers.get('referrer-policy') !== 'no-referrer') problems.push('referrer-policy');
  if (res.headers.get('x-content-type-options') !== 'nosniff') problems.push('x-content-type-options');
  if (res.headers.has('set-cookie')) problems.push('sets a cookie');
  return problems;
}

/** Every route template the smoke test fetches. */
export const SMOKE_ROUTES = ['/', '/limits/', '/changelog/', '/files/', '/settings/', '/privacy/', '/report/', '/data/eia-861/', '/tools/calc/energy-units/convert/', '/site/styles/site.css', '/core/contract/run.mjs', '/health/pipeline.json'];
