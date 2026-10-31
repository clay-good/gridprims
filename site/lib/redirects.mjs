// Matching paths against redirect rules with :placeholder and * segments, the
// way Cloudflare's _redirects file does, so the build can check every
// published URL still lands somewhere.

/** @param {string} from a rule's source pattern */
export function ruleRegex(from) {
  const esc = from.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/:[A-Za-z]\w*/g, '[^/]+').replace(/\*/g, '.*');
  return new RegExp(`^${esc}$`);
}

/** @param {string} path @param {Array<{from: string, to: string}>} rules */
export const redirectFor = (path, rules) => rules.find((r) => ruleRegex(r.from).test(path)) ?? null;

/** The _redirects file body. */
export const redirectsFile = (rules) => rules.map((r) => `${r.from} ${r.to} 301`).join('\n') + (rules.length ? '\n' : '');
