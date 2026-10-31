// Security headers for every response (platform/privacy-and-security,
// "Strict Content Security Policy"). The Worker and the smoke test both use
// this module, so the policy is defined once.

/**
 * @param {string[]} scriptHashes CSP hash sources for inline scripts, such as 'sha256-…'
 */
export function securityHeaders(scriptHashes) {
  const csp = [
    "default-src 'self'",
    `script-src 'self' ${scriptHashes.map((h) => `'${h}'`).join(' ')}`.trim(),
    "style-src 'self'",
    "img-src 'self' data:",
    "font-src 'self'",
    "connect-src 'self'",
    "manifest-src 'self'",
    "worker-src 'self'",
    "object-src 'none'",
    "base-uri 'none'",
    "frame-ancestors 'none'",
    "form-action 'none'",
    'upgrade-insecure-requests',
  ].join('; ');
  return {
    'content-security-policy': csp,
    'referrer-policy': 'no-referrer',
    'x-content-type-options': 'nosniff',
    'permissions-policy': 'camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=(), browsing-topics=()',
    'cross-origin-opener-policy': 'same-origin',
    'cross-origin-resource-policy': 'same-origin',
    'strict-transport-security': 'max-age=31536000; includeSubDomains',
  };
}

/** The directives every page must carry, as the spec states them, for the smoke test. */
export const REQUIRED_DIRECTIVES = ["default-src 'self'", "script-src 'self'", "connect-src 'self'", "object-src 'none'", "base-uri 'none'", "frame-ancestors 'none'", "form-action 'none'"];
