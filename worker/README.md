# worker

The one Cloudflare Worker (foundation design D4, D9, D15).

| Path | What |
|---|---|
| `index.mjs` | Serves `dist/` through the static-asset binding with security headers; missing pages get `404.html` with status 404 |
| `reports.mjs` | `POST /api/reports` (schema, honeypot, proof of work, rate limit, D1 insert) and the nightly retention cleanup |
| `watchdog.mjs` | The nightly watchdog: re-enables workflows GitHub disabled for inactivity, starts any whose published health is stale, and dispatches the heartbeat workflow |
| `schema.sql` | The D1 table for reports |
| `headers.mjs` | The Content Security Policy and security headers, shared with the smoke test |

The CSP allows only our own origin, plus the inline theme script by its SHA-256 hash, computed from the same constant the pages embed. No cookie is ever set. Deployed by `wrangler deploy`, which `wrangler.jsonc` makes build the site first, with a nightly cron (03:29 UTC) for report retention and the watchdog. The watchdog needs two Worker secrets: `GITHUB_ACTIONS_TOKEN` (fine-grained, this repository only, Actions read and write, no expiry) and `GITHUB_REPO`.

## Deploying

The one Worker is `gridprims`. `wrangler.jsonc` carries everything about it: the module, the assets in `dist/`, the reports database, the report rate limiter, and the nightly schedule. Wrangler is the host's own CLI and never a dependency here.

| Step | Command or place |
|---|---|
| From a workstation | `wrangler deploy` (it runs `node site/build.mjs` first) |
| When a commit lands on `main` | Cloudflare's Workers Builds, connected to the repository in the dashboard once: Workers → gridprims → Settings → Builds. Build command `node site/build.mjs`, deploy command `npx wrangler deploy` |
| The reports database | `gridprims-reports`, created once; its schema is `schema.sql`, applied with `wrangler d1 execute gridprims-reports --remote --file=worker/schema.sql` |
| The two watchdog secrets | `wrangler secret put GITHUB_ACTIONS_TOKEN` and `wrangler secret put GITHUB_REPO` |

`dist/.assetsignore`, written by the build, keeps `_csp-hashes.json` and `_manifest.json` from being served; the host reads `_redirects` itself.
