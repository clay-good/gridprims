# worker

The one Cloudflare Worker (foundation design D4, D9, D15).

| Path | What |
|---|---|
| `index.mjs` | Serves `dist/` through the static-asset binding with security headers; missing pages get `404.html` with status 404 |
| `headers.mjs` | The Content Security Policy and security headers, shared with the smoke test |

The CSP allows only our own origin, plus the inline theme script by its SHA-256 hash, computed from the same constant the pages embed. No cookie is ever set. Still to come: `POST /api/reports` (task 9.1) and the scheduled watchdog (task 10.14).
