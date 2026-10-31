# worker

The one Cloudflare Worker (foundation design D4, D9, D15).

| Path | What |
|---|---|
| `index.mjs` | Serves `dist/` through the static-asset binding with security headers; missing pages get `404.html` with status 404 |
| `reports.mjs` | `POST /api/reports` (schema, honeypot, proof of work, rate limit, D1 insert) and the nightly retention cleanup |
| `schema.sql` | The D1 table for reports |
| `headers.mjs` | The Content Security Policy and security headers, shared with the smoke test |

The CSP allows only our own origin, plus the inline theme script by its SHA-256 hash, computed from the same constant the pages embed. No cookie is ever set. Still to come: the scheduled watchdog (task 10.14) and the deploy script (task 8.6).
