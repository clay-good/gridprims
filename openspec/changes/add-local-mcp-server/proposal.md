## Why

**Value up front:** a developer clones the gridprims repository, adds one line to their agent's config, and their agent can read a meter file on their own disk, explain a bill, re-price it on other tariffs, compute hourly emissions, look up any utility or plant, and run grid calculators. The results are the same cited numbers the website gives, computed offline, with nothing sent anywhere.

Agents doing energy work today guess. They invent tariff math, use annual emission factors where hourly ones matter, call token-gated APIs (the EIA Open Data API and OpenEI's rate API both need keys; GridStatus's hosted API needs an account), or install heavy Python stacks (PySAM, PUDL, `gridstatus`). We do better for these jobs by staying offline and cited; agents still hand off to those tools for live market data and full optimization. No local, offline, cited MCP server for US grid data and meter analysis was found in our research (`docs/research/02`, `04`).

The website is for humans; the local MCP server is for developers who point their agents at it. Both are built from day one on one core, so neither can drift. This change is part of phase 0.

## What Changes

- **A local stdio MCP server** at `mcp/server.mjs` with zero dependencies, run with `node mcp/server.mjs` from a clone.
- **Dual-era protocol support:** MCP `2026-07-28` (stateless, `server/discover`, `resultType`) plus the legacy `initialize` flow for `2025-11-25` and `2025-06-18` clients.
- **A small set of meta-tools** instead of hundreds of tools: search, describe, run, analyze a local file, query public data, and prepare a problem report.
- **Local file analysis with a launch-time allowlist** (`--allow-dir`), since MCP Roots is deprecated.
- **Offline by design:** the server never opens a network connection. Public data comes with release archives, or from an explicit, separate command that downloads checksummed snapshots from gridprims.com or rebuilds them from publishers.
- **Setup snippets** for Claude Code, Claude Desktop, VS Code, and Cursor, generated from one source and smoke-tested.
- **An agent-evaluation set** that checks agents pick the right tool and report results with citations.

## Capabilities

### New Capabilities

- `agent/mcp-server`: The local MCP server's protocol support, tool surface, file access rules, offline guarantee, data, setup, and tests.

### Modified Capabilities

None. (The foundation's `platform/tool-contract` already generates MCP descriptions from manifests.)

## Non-goals

- No hosted, remote, or HTTP MCP endpoint run by gridprims.
- No npm, PyPI, or registry package; the repository is the distribution.
- No writes to the user's files; no network access from the server process.
- No CLI beyond the server and the data commands; the server's tools cover scripted use.

## Impact

- New directory `mcp/` and data commands in `pipeline/`.
- Every tool change must pass its worked examples through the MCP server before it is done.
- Adds protocol conformance, sandboxed no-network, and agent-evaluation jobs to CI.
