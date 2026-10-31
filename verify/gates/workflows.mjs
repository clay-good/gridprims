// The CI policy gate (platform/automation, "Only our own scripts run in CI";
// "Forked pull requests reach no secret"; "The runner is pinned"): every action
// is GitHub's own and pinned to a full commit SHA, no workflow uses the
// pull-request target trigger, untrusted event text never reaches a shell
// line, and every job but the canary names a pinned runner image.

import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

/** @param {string} root */
export function checkWorkflows(root) {
  const dir = join(root, '.github/workflows');
  if (!existsSync(dir)) return [];
  const errors = [];
  for (const f of readdirSync(dir).filter((n) => /\.ya?ml$/.test(n))) {
    const src = readFileSync(join(dir, f), 'utf8');
    const at = (i) => src.slice(0, i).split('\n').length;
    for (const m of src.matchAll(/^\s*-?\s*uses:\s*([^\s#]+)/gm)) {
      const [action, ref = ''] = m[1].split('@');
      if (action.startsWith('./')) continue;
      if (!/^actions\/[\w.-]+$/.test(action)) errors.push(`.github/workflows/${f}:${at(m.index)}: ${m[1]} is not a GitHub-published action`);
      else if (!/^[0-9a-f]{40}$/.test(ref)) errors.push(`.github/workflows/${f}:${at(m.index)}: ${action} is not pinned to a full commit SHA`);
    }
    if (/\bpull_request_target\b/.test(src)) errors.push(`.github/workflows/${f}: uses the pull_request_target trigger`);
    for (const m of src.matchAll(/\$\{\{\s*github\.event\.[^}]*\}\}/g)) {
      const line = src.split('\n')[at(m.index) - 1];
      if (/^\s*(run:|[^:]*$)/.test(line) || /run:/.test(line)) errors.push(`.github/workflows/${f}:${at(m.index)}: event text interpolated into a shell line; pass it through an environment variable`);
    }
    // Scheduled runs avoid the top of the hour and never race another run of themselves.
    for (const m of src.matchAll(/cron:\s*'(\S+)\s/g)) if (m[1] === '0' || m[1] === '00') errors.push(`.github/workflows/${f}:${at(m.index)}: scheduled at the top of the hour; pick an off-the-hour minute`);
    if (/^\s*schedule:/m.test(src) && (!/^concurrency:/m.test(src) || /cancel-in-progress:\s*true/.test(src))) errors.push(`.github/workflows/${f}: a scheduled workflow needs a concurrency group that queues runs (cancel-in-progress: false)`);
    for (const m of src.matchAll(/runs-on:\s*(\S+)/g)) {
      if (/-latest$/.test(m[1]) && f !== 'canary.yml') errors.push(`.github/workflows/${f}:${at(m.index)}: runs on the floating label ${m[1]}; pin an image such as ubuntu-24.04`);
    }
  }
  return errors;
}
