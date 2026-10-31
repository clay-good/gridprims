// Checks every link in data/curated/regulators.mjs (add-ratepayer-tools task
// 1.5) and records what each one returned, so the build can refuse a link
// nobody has checked. A 403 or 429 is "blocked": the site refuses automated
// checks, and the link was opened by hand instead. When Node cannot connect
// at all (some servers leave out their intermediate certificate, or drop
// Node's TLS handshake), curl checks the link instead, and the note says so.
// Dev-time only, rerun whenever the curated file changes:
//   node verify/tools/regulator-links.mjs > verify/reference/regulator-links.json

import { spawnSync } from 'node:child_process';
import REGULATORS from '../../data/curated/regulators.mjs';

const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130 Safari/537.36';
const urls = [...new Set(REGULATORS.flatMap((r) => [r.home, r.docket, r.comment].filter(Boolean)))];
const links = {};
await Promise.all(urls.map(async (url) => {
  let status = 0;
  let note;
  try { status = (await fetch(url, { redirect: 'follow', headers: { 'user-agent': UA, accept: 'text/html,*/*' }, signal: AbortSignal.timeout(30_000) })).status; } catch (e) {
    const curl = spawnSync('curl', ['-s', '-o', '/dev/null', '-L', '--max-time', '30', '-A', UA, '-w', '%{http_code}', url], { encoding: 'utf8' });
    status = Number(curl.stdout) || 0;
    note = `checked with curl; Node could not connect (${e.cause?.code ?? e.name})`;
  }
  links[url] = { status, state: status === 403 || status === 429 ? 'blocked' : status >= 200 && status < 400 ? 'ok' : 'broken', ...(note ? { note } : {}) };
}));
const sorted = Object.fromEntries(urls.sort().map((u) => [u, links[u]]));
process.stdout.write(`${JSON.stringify({ checked: new Date().toISOString().slice(0, 10), links: sorted }, null, 2)}\n`);
