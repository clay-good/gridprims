// Community solar for state pages (add-program-fact-pages: community solar):
// our counts and capacity of projects serving customers, by who markets the
// subscriptions, and the capacity the laboratory tracks as in queue, kept
// apart and never added to it.

import { served } from './plants.mjs';

/** @param {string} dataDir */
export function communitySolarData(dataDir) {
  const p = served(dataDir, 'nlr-sharing-the-sun', 'state_projects');
  if (!p) return null;
  const q = served(dataDir, 'nlr-sharing-the-sun', 'state_queue');
  return {
    manifest: p.manifest,
    state: (st) => {
      const rows = p.rows.filter((r) => r.state === st);
      const queue = q?.rows.find((r) => r.state === st)?.mw_ac ?? 0;
      return { operating: { projects: rows.reduce((n, r) => n + r.projects, 0), mw: rows.reduce((n, r) => n + r.mw_ac, 0), byMarketer: rows }, queueMw: queue };
    },
  };
}
