# mcp

The local-only gridprims MCP server for developers' AI agents (`openspec/changes/add-local-mcp-server`). It runs the same `core/` modules as the website, over stdio, and never opens a network connection.

```sh
node mcp/server.mjs                          # tools only, no file access
node mcp/server.mjs --allow-dir ~/meter-data # let it read files in one folder (repeatable)
```

The documented client commands add Node's permission model (`--permission` with one `--allow-fs-read` per path) as defense in depth; see `docs/platform-apis.md` for what it does and does not block on Node 24 and 26.

```sh
```

| Path | What |
|---|---|
| `server.mjs` | stdio entry: one JSON-RPC message per line on stdout, logs on stderr, exits when stdin closes |
| `protocol.mjs` | Dual-era dispatch: MCP `2026-07-28` (`server/discover`, `_meta` versions, `resultType`, `ttlMs`, `cacheScope`) and legacy `initialize` for `2025-11-25` and `2025-06-18`; error `-32022` for other versions |
| `surface.mjs` | The six meta-tools, their JSON Schema 2020-12 schemas, and annotations |
| `handlers.mjs` | What each tool does, through the shared core |
| `handles.mjs` | In-memory file handles with a 60-minute idle expiry |
| `lines.mjs` | Lines standards files and pole lists: kind-tagged handles, inline lists, and file text moved to `source_text` |
| `files.mjs` | The `--allow-dir` allowlist: realpath checks, symlink escapes, regular files only, 200,000,000-byte cap |
| `clients.mjs` | Setup snippets for Claude Code, Claude Desktop, VS Code, and Cursor; the README and the developer page are generated from it, and a smoke test launches each one |
| `eval/requests.mjs` | The agent evaluation set; CI checks its model-free half |
| `golden-surface.json` | The pinned tool surface; any change fails CI until this file changes with it |

| Tool | State |
|---|---|
| `gridprims_search`, `gridprims_describe`, `gridprims_run`, `gridprims_prepare_report` | Working; `gridprims_run` takes lines handles or `rules[]` and `attachments[]` lists, and a pole-list handle gives one answer per pole |
| `gridprims_analyze_file` | Working: CSV, Excel, and Green Button files inside `--allow-dir` folders, held in memory under handles for 60 idle minutes; receipt choices (zone, stamps, quantity) re-read from memory; intervals paged 1,000 rows at a time; a lines standards file or pole list is told apart by its header row and gets a `lines-standards` or `lines-pole-list` handle; file text only in `source_text` |
| `gridprims_query_data` | Answers that no datasets are built yet |

Resources: `gridprims://limits` (every tool's validation level and limits) and `gridprims://datasets` (the dataset catalog).
