// Site-wide addresses, stated once (trust/security-disclosure, "security.txt":
// the contact, policy, and canonical URLs come from one place).

export const ORIGIN = 'https://gridprims.com';

/** Who runs gridprims, as the About page names them (site/trust-pages). */
export const MAINTAINER = 'Clay Good';
export const SECURITY = {
  contact: `${ORIGIN}/report/`,
  policy: `${ORIGIN}/security/`,
  canonical: `${ORIGIN}/.well-known/security.txt`,
  languages: 'en',
};
