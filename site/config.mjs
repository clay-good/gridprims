// Site-wide addresses, stated once (trust/security-disclosure, "security.txt":
// the contact, policy, and canonical URLs come from one place).

export const ORIGIN = 'https://gridprims.com';

/** Who runs gridprims, as the About page names them (site/trust-pages), and their own site. */
export const MAINTAINER = 'Clay Good';
export const MAINTAINER_URL = 'https://claygood.com';

/** The public source repository, linked from the footer and the developer page. */
export const REPO_URL = 'https://github.com/clay-good/gridprims';
export const SECURITY = {
  contact: `${ORIGIN}/report/`,
  policy: `${ORIGIN}/security/`,
  canonical: `${ORIGIN}/.well-known/security.txt`,
  languages: 'en',
};
