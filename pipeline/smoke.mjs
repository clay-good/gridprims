// Post-deploy smoke test with rollback (platform/data-operations, "Live-site
// checks"; task 10.4): fetch every route template from the live site, check
// status and security headers, and roll back to the previous version when any
// check fails.
//   BASE_URL=https://gridprims.com CLOUDFLARE_API_TOKEN=... CLOUDFLARE_ACCOUNT_ID=... CF_WORKER_NAME=... node pipeline/smoke.mjs

import { fileURLToPath } from 'node:url';
import { checkHeaders, SMOKE_ROUTES } from '../verify/lib/smoke.mjs';
import { cloudflare } from './deploy.mjs';

/** @param {{base: string, fetch?: typeof fetch}} o */
export async function smoke({ base, fetch: f = fetch }) {
  const failures = [];
  for (const route of SMOKE_ROUTES) {
    try {
      const res = await f(new URL(route, base));
      if (res.status !== 200) failures.push(`${route}: HTTP ${res.status}`);
      for (const p of checkHeaders(res)) failures.push(`${route}: ${p}`);
    } catch (e) {
      failures.push(`${route}: ${e.message}`);
    }
  }
  return failures;
}

/** Point all traffic back at the version deployed before the latest one. */
export async function rollback({ token, account, worker, fetch: f }) {
  const cf = cloudflare({ token, account, fetch: f });
  const { deployments } = await cf.call('GET', `/accounts/${account}/workers/scripts/${worker}/deployments`);
  const previous = deployments?.[1]?.versions?.[0]?.version_id;
  if (!previous) throw new Error('no previous version to roll back to');
  await cf.call('POST', `/accounts/${account}/workers/scripts/${worker}/deployments`, { body: { strategy: 'percentage', versions: [{ version_id: previous, percentage: 100 }] } });
  return previous;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const env = process.env;
  const failures = await smoke({ base: env.BASE_URL });
  if (!failures.length) { console.log(`smoke ok: ${SMOKE_ROUTES.length} routes`); process.exit(0); }
  for (const f of failures) console.error(`FAIL ${f}`);
  const v = await rollback({ token: env.CLOUDFLARE_API_TOKEN, account: env.CLOUDFLARE_ACCOUNT_ID, worker: env.CF_WORKER_NAME });
  console.error(`rolled back to version ${v}`);
  process.exit(1);
}
