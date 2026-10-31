// The off-host watchdog (foundation design D15; platform/automation, "Schedules
// survive the host's inactivity rule"): a scheduled handler on the Worker we
// already run. With one credential scoped to this repository's Actions API it
// re-enables workflows the host disabled, starts any whose published health is
// stale, and dispatches the heartbeat workflow so it is itself watched.

const API = 'https://api.github.com';
const HOUR = 3_600_000;

/**
 * @param {{GITHUB_ACTIONS_TOKEN?: string, GITHUB_REPO?: string, ASSETS: {fetch: (r: Request | string) => Promise<Response>}}} env
 * @param {{fetch?: typeof fetch, now?: () => number}} [o]
 * @returns {Promise<{ran: boolean, reenabled: string[], dispatched: string[], note?: string}>}
 */
export async function watchdog(env, o = {}) {
  if (!env.GITHUB_ACTIONS_TOKEN || !env.GITHUB_REPO) return { ran: false, reenabled: [], dispatched: [], note: 'no credential configured' };
  const f = o.fetch ?? fetch;
  const now = o.now ?? Date.now;
  const gh = async (method, path, body) => {
    const res = await f(`${API}/repos/${env.GITHUB_REPO}${path}`, {
      method,
      headers: { authorization: `Bearer ${env.GITHUB_ACTIONS_TOKEN}`, accept: 'application/vnd.github+json', 'user-agent': 'gridprims-watchdog', ...(body ? { 'content-type': 'application/json' } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!res.ok && res.status !== 204) throw new Error(`${method} ${path}: HTTP ${res.status}`);
    return res.status === 204 ? null : res.json();
  };

  const { workflows } = await gh('GET', '/actions/workflows?per_page=100');
  const fileOf = (w) => w.path.split('/').pop();
  const reenabled = [];
  for (const w of workflows.filter((x) => x.state === 'disabled_inactivity')) {
    await gh('PUT', `/actions/workflows/${w.id}/enable`);
    reenabled.push(fileOf(w));
  }

  // Start every scheduled workflow whose last success is older than its threshold, by the published record.
  const dispatched = [];
  let health = null;
  try { health = await (await env.ASSETS.fetch('https://gridprims.com/health/pipeline.json')).json(); } catch { health = null; }
  for (const row of health?.workflows ?? []) {
    const stale = !row.lastSuccess || now() - Date.parse(row.lastSuccess) > row.thresholdHours * HOUR;
    if (stale) {
      await gh('POST', `/actions/workflows/${row.id}.yml/dispatches`, { ref: 'main' });
      dispatched.push(`${row.id}.yml`);
    }
  }
  // The heartbeat: the watchdog's own run, recorded where everyone can see it go stale.
  await gh('POST', '/actions/workflows/heartbeat.yml/dispatches', { ref: 'main', inputs: { at: new Date(now()).toISOString() } });
  dispatched.push('heartbeat.yml');
  return { ran: true, reenabled, dispatched };
}
