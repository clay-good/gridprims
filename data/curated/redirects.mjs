// Permanent redirects (site/home-and-navigation, "Stable URLs keyed by ids";
// design D3). Rules may use Cloudflare's :placeholder segments, so a rename
// keyed by an id needs one rule, not one per old slug. The build writes them
// to dist/_redirects and fails past 1,500 rules.

/** @type {Array<{from: string, to: string, reason: string, date: string}>} */
export default [];
