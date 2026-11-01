// The six sections of the top rail (DESIGN.md Layout; site/home-and-navigation),
// and which section each tool belongs to, by its id's domain.

export const SECTIONS = [
  { id: 'home', path: '/' },
  { id: 'bills', path: '/bills/' },
  { id: 'data', path: '/data/' },
  { id: 'carbon', path: '/carbon/' },
  { id: 'grid', path: '/grid/' },
  { id: 'learn', path: '/learn/' },
];

const BY_DOMAIN = { load: 'bills', household: 'bills', ratepayer: 'bills', data: 'data', carbon: 'carbon', calc: 'grid', grid: 'grid', reliability: 'grid', interconnect: 'grid', electrify: 'grid', lines: 'grid', learn: 'learn' };

/** @param {string} toolId */
export const sectionOf = (toolId) => BY_DOMAIN[toolId.split('.')[0]] ?? 'grid';

/**
 * Built and reachable by link, but parked off the catalog while the site leads with bills:
 * engineering calculators, still listed on their section page and still published.
 */
export const PARKED = new Set(['calc.power-factor.correct', 'calc.transformer.size', 'calc.storage.basics', 'calc.cost.lcoe', 'calc.line-rating.ampacity', 'electrify.service-headroom.check', 'electrify.backup-power.size', 'reliability.outage-log.indices']);

