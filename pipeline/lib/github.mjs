// The git host's REST API through fetch (foundation design D12): opening an
// issue for a failure and re-enabling workflows the host disabled. Uses the
// workflow's own token from the environment; never logs it.

const API = 'https://api.github.com';

/**
 * @param {{repo?: string, token?: string, fetch?: typeof fetch}} [o]
 */
export function github(o = {}) {
  const repo = o.repo ?? process.env.GITHUB_REPOSITORY;
  const token = o.token ?? process.env.GITHUB_TOKEN;
  const f = o.fetch ?? fetch;
  const call = async (method, path, body) => {
    const res = await f(`${API}/repos/${repo}${path}`, {
      method,
      headers: { authorization: `Bearer ${token}`, accept: 'application/vnd.github+json', 'x-github-api-version': '2022-11-28', 'user-agent': 'gridprims-pipeline' },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!res.ok && res.status !== 204) throw new Error(`${method} ${path}: HTTP ${res.status}`);
    return res.status === 204 ? null : res.json();
  };
  return {
    available: Boolean(repo && token),
    /** Re-enable every workflow the host disabled for inactivity; returns their names. */
    async reenableInactive() {
      const { workflows } = await call('GET', '/actions/workflows?per_page=100');
      const fixed = [];
      for (const w of workflows.filter((x) => x.state === 'disabled_inactivity')) {
        await call('PUT', `/actions/workflows/${w.id}/enable`);
        fixed.push(w.path.split('/').pop().replace(/\.ya?ml$/, ''));
      }
      return fixed;
    },
    /** Open an issue unless one with the same title is still open. */
    async openIssue(title, body) {
      const open = await call('GET', `/issues?state=open&labels=pipeline&per_page=100`);
      if (open.some((i) => i.title === title)) return null;
      return call('POST', '/issues', { title, body, labels: ['pipeline'] });
    },
  };
}
