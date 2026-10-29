# 04 · MCP and Zero-Dependency Stack Memo

**For:** gridprims.com spec writers. **As of:** October 27, 2026. **Status:** research only, no code.

**What this gives you:** the MCP rules the local server must follow, proof that a website plus MCP server can run on Node and browser built-ins alone, and a recommended stack. Primary sources were fetched on October 27, 2026 unless marked. **[UNVERIFIED]** means memory or a secondary source; check before it ships.

---

## A. Model Context Protocol

### A1. Current version and what changed

**Latest stable: `2026-07-28`.** It is a break from earlier versions ([changelog](https://modelcontextprotocol.io/specification/2026-07-28/changelog)):

| Change | What it means for gridprims |
|---|---|
| **Stateless.** No `initialize` handshake or sessions. Every request carries `_meta` keys `io.modelcontextprotocol/protocolVersion` and `.../clientCapabilities`. | Each tool call stands alone. Any state (a loaded file) is a server-minted handle passed back as an argument. |
| **`server/discover` is required.** It returns supported versions, capabilities, and server info. | Implement it; stdio clients use it to probe. |
| **Every result has `resultType`** (`"complete"` or `"input_required"`). | Add it to every result. |
| Version mismatch returns `UnsupportedProtocolVersionError` (code `-32022`, with `data.supported`). | Validate `_meta` version on each request. |
| `ping`, `logging/setLevel`, and `notifications/roots/list_changed` removed. Log level is per-request in `_meta`. | Log to stderr only. |
| Server-to-client requests (roots, sampling, elicitation) replaced by **Multi Round-Trip Requests**. | Not needed for pure compute. |
| List and read results **require `ttlMs` and `cacheScope`**. `tools/list` **SHOULD** be in deterministic order. | Static catalog: long TTL, `public`, fixed order. |
| Tasks moved to an extension. `inputSchema`/`outputSchema` allow any JSON Schema 2020-12. Resource-not-found is now `-32602` (was `-32002`). | Use 2020-12; return `-32602`. |
| **Deprecated (12-month window): Roots, Sampling, Logging**, HTTP+SSE. The spec says to pass "directories or files via tool parameters, resource URIs, or server configuration instead of Roots." | **Do not build on Roots.** Take file paths as tool arguments, limited by launch configuration. |

**Compatibility.** The spec defines "dual-era" servers that answer both modern requests and a legacy `initialize` ([versioning](https://modelcontextprotocol.io/specification/2026-07-28/basic/versioning)). A modern-only server fails with legacy clients, which "have no fall-forward mechanism." Support `2026-07-28` and the legacy `2025-11-25` and `2025-06-18` until clients catch up. Which clients speak `2026-07-28` today is **[UNVERIFIED]**; record real handshakes in tests.

### A2. Core mechanics

- **stdio** ([spec](https://modelcontextprotocol.io/specification/2026-07-28/basic/transports/stdio)): one JSON-RPC message per line, UTF-8, no embedded newlines. The server **MUST NOT** write anything but MCP messages to stdout and **MUST NOT** send requests. It **MAY** log to stderr. It **SHOULD** exit when stdin closes.
- **Tools** ([spec](https://modelcontextprotocol.io/specification/2026-07-28/server/tools)): `name` (1–128 chars, `[A-Za-z0-9_.-]`), `title`, `description`, `inputSchema` (required; no-arg tools use `{"type":"object","additionalProperties":false}`), optional `outputSchema`, `annotations`. With an `outputSchema`, `structuredContent` **MUST** match it. Also send the JSON as a text block for older clients. Hints `readOnlyHint`, `destructiveHint`, `idempotentHint`, `openWorldHint` are untrusted by clients but required for Anthropic's directory. Mark every gridprims tool read-only, idempotent, closed-world.
- **Errors:** bad inputs and business-logic failures return a normal result with `isError: true`, so the model can fix them. Unknown tools and malformed requests are JSON-RPC errors (`-32602`).
- **Resources and prompts:** use for the dataset catalog (`gridprims://dataset/{id}`) and workflow prompts.
- **Pagination:** `cursor` in, opaque `nextCursor` out.
- **Progress and cancellation** ([spec](https://modelcontextprotocol.io/specification/2026-07-28/basic/patterns/cancellation)): progress uses the request's `_meta.progressToken`. On stdio the client **MUST** send `notifications/cancelled`; the server stops work and sends nothing more for that id.

### A3. Security for a local server that reads user files

gridprims will parse files the agent names (Green Button XML, interval CSV, utility `.xlsx`). With Roots deprecated, this is our job:

1. **Allowlist at launch.** `--allow-dir=<path>` (repeatable) in the client config. Tools take a `path` argument. Resolve with `fs.realpath`, then require the result to equal or sit under an allowed root, compared with a trailing separator. Catches `../` and symlink escapes. Reject device files and directories.
2. **Read-only and bounded.** Open read-only; cap size (say 200 MB) and rows; never write except to a declared cache.
3. **No network.** Pure compute. Test it like geoprims: run every example under `sandbox-exec` (macOS) or `unshare -rn` (Linux) and fail on any connect attempt.
4. **Node Permission Model as a seat belt.** `node --permission --allow-fs-read=<clone>,<data dir>` blocks other reads and, without `--allow-net`, network ([docs](https://nodejs.org/api/permissions.html); stable since v22.13.0/v23.5.0). The docs warn it is "not a security boundary against malicious code," follows symlinks, and does **not** cover `node:sqlite`. Use it as defense in depth, not the main control. The minimum version for `--allow-net` is **[UNVERIFIED]**.
5. **Prompt injection from file contents.** A CSV header or XML comment can say "ignore previous instructions." Return computed numbers and fixed-vocabulary field names, not raw free text. When text must be echoed (a meter name), truncate it and put it in a labeled `source_text` field. Tool descriptions should state that file text is data.
6. **Stay on stdio.** The spec's local-server guidance says "use the `stdio` transport to limit access to just the MCP client" ([best practices](https://modelcontextprotocol.io/docs/2026-07-28/tutorials/security/security_best_practices)). If HTTP is ever added: bind 127.0.0.1, check `Origin`/`Host`, require a token.

### A4. Zero-dependency server: feasibility and the geoprims precedent

**Feasible.** The protocol subset a compute server needs is line framing, JSON-RPC dispatch, version handling, and about eight methods. The sister project's `mcp/server.mjs` is 288 lines with `"dependencies": {}` and `engines.node >=22`.

What geoprims does well (`../geoprims/mcp/`, `openspec/changes/add-local-mcp-server/`):

| Practice | Why copy it |
|---|---|
| Clone-and-run: `node mcp/server.mjs`, no install; release tags carry built files | Auditable in one directory; no supply chain |
| Dual-era: answers `initialize` and `server/discover` for `2026-07-28`, `2025-11-25`, `2025-06-18` | Works with lagging clients |
| ~6 meta-tools (`search`, `describe`, `run`, `pipeline`…) instead of hundreds of tools | Keeps schemas small; avoids client tool caps |
| Same search ranker and compute core as the website | Agent and human answers match byte for byte |
| `structuredContent` plus a text copy; validation errors as `isError` | Matches spec |
| Message size cap (10 MB); handles cancellation even for queued calls; progress only with a valid token | Robust stdio handling |
| stderr logs never include argument values unless `--debug` | Privacy |
| `network.test.mjs` runs every example in an OS sandbox with no network | Turns "offline" into a test |
| `clients.mjs`: one source for setup snippets, README, site page, and a smoke test that launches each snippet | Docs can't drift |
| `surface.json` golden file of the tool surface; `verify.mjs` checks artifact digests | Catches accidental surface changes |
| `report_problem` prepares a report for the human to send; the server never sends it | No network, user stays in control |

Gaps to fix in gridprims's version (checked by grep, October 27, 2026): geoprims emits no `resultType`, no `_meta` server info, no `UnsupportedProtocolVersionError`, and still uses `-32002` for missing resources.

### A5. Client configuration from a clone

All use `node /abs/path/gridprims/mcp/server.mjs` as command plus args:

| Client | Where | Notes |
|---|---|---|
| Claude Code | `claude mcp add gridprims -- node /abs/path/...` or project `.mcp.json` (`mcpServers`) | Scopes `local`/`project`/`user`; `${VAR:-default}` expansion; asks approval for project servers ([docs](https://code.claude.com/docs/en/mcp)) |
| Claude Desktop | `claude_desktop_config.json`, `mcpServers` | Or a `.mcpb` bundle (geoprims ships one) |
| VS Code | `.vscode/mcp.json` with `servers` and `"type":"stdio"`; or portable `.mcp.json` with `mcpServers` (experimental setting) | `${workspaceFolder}`; optional `sandboxEnabled` on macOS/Linux ([docs](https://code.visualstudio.com/docs/agents/reference/mcp-configuration)) |
| Cursor | `.cursor/mcp.json` or `~/.cursor/mcp.json`, `mcpServers` | `${workspaceFolder}`, `${userHome}` ([docs](https://cursor.com/docs/context/mcp)) |
| Windsurf | `~/.codeium/windsurf/mcp_config.json` | **[UNVERIFIED]** from geoprims README |

Tool caps (VS Code 128 per request; Cursor reportedly 40) are **[UNVERIFIED]** here; the meta-tool design makes them moot.

---

## B. Zero-dependency platform feasibility

### B1. Node.js

**LTS line:** Node 24 (Krypton) entered Maintenance on October 20, 2026; **Node 26 becomes Active LTS on October 28, 2026** (tomorrow). Node 22 is in Maintenance until April 30, 2027. From Node 27, there is one major release per year and every line gets 30 months of LTS ([nodejs/Release](https://github.com/nodejs/Release)). **Target Node 24.12+ as the floor, test on 24 and 26.**

| Built-in | Status (docs for v26.12.1) | Minimum |
|---|---|---|
| `node:test` | Stable (since v20); snapshots stable v23.4; **coverage still experimental** | 20 |
| `node:sqlite` | **1.2 Release candidate** (v25.7); unflagged v22.13/v23.4 | 22.13 (RC on 25.7+) |
| `fetch` | No longer experimental since v21 | 21 |
| `WebSocket` (client) | No longer experimental since v22.4 | 22.4 |
| `zlib` (inflate, deflate, raw, gzip, brotli) | Stable for years | any |
| `CompressionStream`/`DecompressionStream` | Marked stable v22.15/v23.11; brotli v22.20/v24.7 | 22.15 |
| `crypto` SHA-256 (`createHash`, `crypto.subtle`) | Stable | any |
| Native type stripping (run `.ts`) | **Stable** in v24.12.0/v25.2.0; no enums, parameter properties, runtime namespaces, or `.tsx` | 24.12 |
| `module.stripTypeScriptTypes` | **1.2 Release candidate**; output "should not be considered stable across Node.js versions" | 22.13 |
| `util.parseArgs` | Stable (since v20) **[UNVERIFIED version]** | 20 |
| `fs/promises`, `worker_threads` | Stable | any |
| `Intl` | Official binaries are `full-icu` by default ([docs](https://nodejs.org/api/intl.html)); IANA zone list via `Intl.supportedValuesOf('timeZone')`; tz data tracks the bundled ICU | any |

**TypeScript caveat:** Node runs `.ts` with types stripped, but **nothing type-checks without `tsc`**, an npm dev dependency. Browsers can't run `.ts`, so the site build would rely on the RC `stripTypeScriptTypes`. Simplest zero-dependency choice: **plain `.mjs` with JSDoc types**, optionally checked by an editor's built-in TypeScript.

### B2. Browser built-ins

| Need | Built-in | Status |
|---|---|---|
| Read `.xlsx` (a zip) | Parse zip directory by hand; inflate entries with `DecompressionStream('deflate-raw')` | Formats gzip, deflate, deflate-raw, brotli, zstd listed; "available across browsers since May 2023," but per-format support varies ([MDN](https://developer.mozilla.org/en-US/docs/Web/API/DecompressionStream/DecompressionStream)). Feature-detect; brotli/zstd support **[UNVERIFIED]** |
| Off-main-thread compute | Web Workers; `OffscreenCanvas` for charts | Workers universal; OffscreenCanvas Baseline 2023 **[UNVERIFIED date]** |
| DST-correct local time | `Intl.DateTimeFormat` with `timeZone: 'America/Chicago'` and `formatToParts` to get offsets | Universal. `Temporal` is shipping in some engines **[UNVERIFIED]**; don't depend on it |
| Open local files | `<input type=file>` plus `File.stream()` | Universal. File System Access (`showOpenFilePicker`) is Chromium-only: optional extra |
| Offline site | Service worker | Universal |

### B3. Browser end-to-end tests without Playwright or Puppeteer

Feasible at roughly 300–600 lines **[estimate]**:

- **Chromium:** launch Chrome for Testing with `--headless --remote-debugging-port=0 --user-data-dir=<temp>`, read the port, connect with Node's `WebSocket`, send CDP commands (`Page.navigate`, `Runtime.evaluate`, `Input.dispatchMouseEvent`, `Page.captureScreenshot`). Since Chrome 136, debugging switches are ignored on the default profile, so `--user-data-dir` is required ([Chrome blog, March 17, 2025](https://developer.chrome.com/blog/remote-debugging-port)).
- **Firefox:** WebDriver BiDi over the same `WebSocket`. Firefox reportedly dropped CDP **[UNVERIFIED, secondary source]**.
- **Safari:** classic WebDriver over HTTP via the built-in `safaridriver`, using `fetch`. WebKit BiDi status unclear.
- WebDriver BiDi is still a W3C Working Draft ([spec](https://w3c.github.io/webdriver-bidi/)). Chrome exposes BiDi mainly through chromedriver, a separate binary, so CDP is simpler for Chromium.

Browsers are downloaded in CI, not npm dependencies. Pin versions.

### B4. A plain-Node static site generator for ~20,000 pages

A generator is template-literal functions writing HTML files. Build time should be well under a minute: rendering strings is fast, and the cost is writing ~20,000 files **[estimate; benchmark early]**.

**Hosting limit to plan around:** Workers static assets allow **20,000 files per version on Free and 100,000 on Paid**, 25 MiB per file ([limits](https://developers.cloudflare.com/workers/platform/limits/)). 20,000 pages plus CSS, JS, and data shards exceeds Free. Options: Workers Paid; fewer pages (one page per balancing authority and state, with utility detail rendered client-side from shards); or a small Worker that renders long-tail pages from data. Whether static asset requests are free and unlimited is **[UNVERIFIED]**.

**Deploy without Wrangler:** the [direct upload API](https://developers.cloudflare.com/workers/static-assets/direct-upload/) takes a manifest of path, 32-hex hash, and size, returns buckets to upload, then a completion token for the deploy. That is about 150 lines using `fetch` and `crypto`. Alternatively, Cloudflare's Git-connected Workers Builds runs Wrangler on Cloudflare's side, keeping it out of the repo **[UNVERIFIED that this needs no package.json dependency]**.

### B5. Columnar data without Parquet

**Parquet without a library is not realistic for general files.** It needs Thrift compact metadata, RLE/bit-packing, dictionary pages, and usually Snappy or Zstd, none of which browsers and Node expose as raw codecs **[from memory of the format spec; UNVERIFIED]**. A reader for files we write ourselves (uncompressed or gzip, plain encoding) is possible but buys little.

**Use instead:**

| Use | Format |
|---|---|
| Human download, archival | CSV + gzip (`zlib` in Node, `DecompressionStream('gzip')` in browsers) |
| Fast charts, hourly series | Custom binary columns: little-endian `Float32Array`/`Int32Array` per column, a JSON manifest (name, type, scale, offset, SHA-256), shards per year or region |
| Small lookups (utilities, tariffs) | JSON shards |

**`node:sqlite` as the MCP query store: yes, with care.** Build a `.sqlite` file from the same CSVs on first run or at release, then query with prepared statements. Risks: it is still release candidate, Node 24 lacks the RC label, and the Permission Model does not cover it. The compute core must not depend on SQL, because the browser doesn't have it. Use SQLite only for lookup and filtering, and feed results into the shared core.

### B6. PDF reports

**Use a print stylesheet** (`@media print`, `@page` size and margins, page-break rules) and the browser's "Save as PDF." It is free, accessible, and matches the page. Hand-written PDF is possible for simple text, but font embedding, Unicode, and tagged (accessible) PDF make it costly. Defer it.

### B7. Anti-abuse for the problem-report endpoint

In order of preference:

1. **No endpoint.** Prefill a GitHub issue link or `mailto:` from the page or the MCP's `report_problem` tool, like geoprims. Nothing to abuse.
2. **If an endpoint is needed (a Worker):**
   - **Honeypot field** and a minimum fill time.
   - **Proof of work:** the page fetches a signed challenge and finds a nonce whose SHA-256 has N leading zero bits (`crypto.subtle.digest`). The Worker checks it in microseconds. Tune for ~1 second on a phone.
   - **[Rate Limiting binding](https://developers.cloudflare.com/workers/runtime-apis/bindings/rate-limit/):** `[[ratelimits]]` with `limit` and `period` of 10 or 60 seconds. Counts are **per Cloudflare location and approximate**; use a Durable Object for a strict global limit. Docs advise against IP keys; for an anonymous form, a hashed `CF-Connecting-IP` plus the PoW challenge id is the practical key.
   - **Size caps** and plain-text-only storage.
3. **Turnstile** is Cloudflare's own CAPTCHA alternative ([docs](https://developers.cloudflare.com/turnstile/)). It fits "Cloudflare-native," but it loads Cloudflare's script on the page; pricing and cookie behavior are **[UNVERIFIED]**. Keep it as a fallback if PoW is beaten.

---

## Recommended stack

| Choice | Built-in it relies on | Minimum | Risk |
|---|---|---|---|
| Language: plain `.mjs` + JSDoc | ES modules | Node 22 / evergreen browsers | Low; no type checker without `tsc` |
| MCP server: hand-rolled, dual-era, stdio | `process.stdin/stdout`, `JSON` | Node 24.12 | Medium: spec churn (stateless model is new) |
| MCP file access: `--allow-dir` + realpath checks | `fs/promises`, `path` | Node 22 | Low if tested for traversal and symlinks |
| Seat belt: `--permission` | Permission Model | 22.13 (stable) | Low; not a real sandbox |
| MCP query store (optional) | `node:sqlite` | 22.13; RC on 25.7+ | Medium: API may still change |
| Tests | `node:test`, `node:assert` | Node 20 | Low; coverage experimental |
| E2E browser tests | Node `WebSocket` + CDP / BiDi; `fetch` + safaridriver | Node 22.4; Chrome 136+ needs `--user-data-dir` | Medium: maintenance of our driver |
| SSG + deploy | `fs/promises`, `fetch`, `crypto` SHA-256 | Node 22 | Low; 20,000-file Free cap is the real constraint |
| Data format | CSV+gzip, binary columns, JSON shards; `zlib`, `DecompressionStream` | Node 22.15; browsers 2023+ | Low |
| `.xlsx` reading | Hand zip parser + `deflate-raw` | Browsers 2023+; any Node | Low–medium: zip64 and odd files |
| Time zones / DST | `Intl.DateTimeFormat` with IANA zones | Full ICU (default) | Low; tz data tied to Node/browser release |
| Heavy compute | Web Workers / `worker_threads` | Any | Low |
| PDF | Print CSS | Any | Low |
| Report anti-abuse | Prefilled issue link; else honeypot + PoW + Rate Limiting binding | Wrangler 4.36+ if Wrangler is used | Low–medium: approximate per-location limits |
| Hosting | Workers static assets (Paid if >20,000 files) | n/a | Low |

---

## Sources

MCP
- Changelog 2026-07-28: https://modelcontextprotocol.io/specification/2026-07-28/changelog
- Versioning and compatibility: https://modelcontextprotocol.io/specification/2026-07-28/basic/versioning
- Transports: https://modelcontextprotocol.io/specification/2026-07-28/basic/transports
- stdio: https://modelcontextprotocol.io/specification/2026-07-28/basic/transports/stdio
- Tools: https://modelcontextprotocol.io/specification/2026-07-28/server/tools
- Cancellation: https://modelcontextprotocol.io/specification/2026-07-28/basic/patterns/cancellation
- Security best practices: https://modelcontextprotocol.io/docs/2026-07-28/tutorials/security/security_best_practices
- Claude Code MCP: https://code.claude.com/docs/en/mcp
- VS Code MCP configuration: https://code.visualstudio.com/docs/agents/reference/mcp-configuration
- Cursor MCP: https://cursor.com/docs/context/mcp
- Sister project: `/Users/user/Documents/development/public/geoprims/mcp/` and `openspec/changes/add-local-mcp-server/` (read October 27, 2026)

Node.js (docs for v26.12.1)
- Release schedule: https://github.com/nodejs/Release
- SQLite: https://nodejs.org/api/sqlite.html
- TypeScript: https://nodejs.org/api/typescript.html
- Modules (`stripTypeScriptTypes`): https://nodejs.org/api/module.html
- Globals (fetch, WebSocket, compression streams): https://nodejs.org/api/globals.html
- Test runner: https://nodejs.org/api/test.html
- Intl: https://nodejs.org/api/intl.html
- Permissions: https://nodejs.org/api/permissions.html

Browsers
- MDN DecompressionStream: https://developer.mozilla.org/en-US/docs/Web/API/DecompressionStream/DecompressionStream
- Chrome remote debugging change: https://developer.chrome.com/blog/remote-debugging-port
- WebDriver BiDi spec: https://w3c.github.io/webdriver-bidi/

Cloudflare
- Workers limits: https://developers.cloudflare.com/workers/platform/limits/
- Static assets: https://developers.cloudflare.com/workers/static-assets/
- Direct upload: https://developers.cloudflare.com/workers/static-assets/direct-upload/
- Rate Limiting binding: https://developers.cloudflare.com/workers/runtime-apis/bindings/rate-limit/
- Turnstile: https://developers.cloudflare.com/turnstile/
