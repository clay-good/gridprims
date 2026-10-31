# Platform APIs

What gridprims relies on from Node.js and the browser, and nothing else (`platform/zero-dependency`). The platform-API gate (`verify/gates/platform-apis.mjs`) reads the Node table: code may import only modules listed here as **Stable**.

## Runtime versions

| Runtime | Version |
|---|---|
| Node.js floor | 24.12.0 (`.node-version`, `package.json` engines) |
| Node.js lines CI tests | 24 (Maintenance LTS) and 26 (Active LTS from 2026-10-28) |
| Browsers | The first versions with `DecompressionStream('deflate-raw')`, module workers, and `Intl` IANA time zones: Chrome 80, Firefox 113, Safari 16.4 (to be confirmed by the browser driver, task 4.8) |

## Node.js built-ins

| API | Introduced | Stability | Used for |
|---|---|---|---|
| `node:fs` | 0.x | Stable | Reading the repository in gates, pipeline, and the MCP server |
| `node:path` | 0.x | Stable | Path handling |
| `node:url` | 0.x | Stable | `fileURLToPath`, `pathToFileURL` |
| `node:crypto` | 0.x | Stable | SHA-256 checksums |
| `node:zlib` | 0.x | Stable | gzip and raw inflate (`.xlsx`) |
| `node:test` | 18.0 (stable 20.0) | Stable | Test runner |
| `node:assert` | 0.x | Stable | Test assertions |
| `node:os` | 0.x | Stable | Temporary directories in tests |
| `node:util` | 0.x | Stable | `parseArgs` |
| `node:worker_threads` | 10.5 (stable 12) | Stable | Parsing off the main thread in Node |
| `node:readline` | 0.x | Stable | MCP stdio framing |
| `node:child_process` | 0.x | Stable | Launching the MCP server and browsers in tests |
| `node:sqlite` | 22.5 | Release candidate | Not required; listed so the gate refuses it |

Globals relied on: `fetch` (stable 21), `WebSocket` (stable 22.4), `Intl` with full ICU, `structuredClone`, `DecompressionStream`.

## Services used during development

None is called by a page or by the MCP server at runtime.

| Service | Use |
|---|---|
| The git host (GitHub) | Repository, CI runners, actions API |
| Locally installed browsers | End-to-end tests |
| Cloudflare | Hosting, deploys, the report endpoint, the watchdog handler |
| Two public research archives | Durable dataset deposits (`trust/data-continuity`) |
| A public code archive | Source at each release tag |
| Public data publishers | Data fetched at build time |
