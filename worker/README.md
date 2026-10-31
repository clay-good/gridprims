# worker

The one Cloudflare Worker (foundation design D4, D9, D15).

| Path | What |
|---|---|
| `index.mjs` | Serves `dist/` through the static-asset binding with security headers; missing pages get `404.html` with status 404 |
| `reports.mjs` | `POST /api/reports` (schema, honeypot, proof of work, rate limit, D1 insert) and the nightly retention cleanup |
| `watchdog.mjs` | The nightly watchdog: re-enables workflows GitHub disabled for inactivity, starts any whose published health is stale, and dispatches the heartbeat workflow |
| `schema.sql` | The D1 table for reports |
| `headers.mjs` | The Content Security Policy and security headers, shared with the smoke test |

The CSP allows only our own origin, plus the inline theme script by its SHA-256 hash, computed from the same constant the pages embed. No cookie is ever set. Deployed by `pipeline/deploy.mjs` with a nightly cron (03:29 UTC) for report retention and the watchdog. The watchdog needs two Worker secrets: `GITHUB_ACTIONS_TOKEN` (fine-grained, this repository only, Actions read and write, no expiry) and `GITHUB_REPO`.
