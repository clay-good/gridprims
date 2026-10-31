# mcp

The local-only gridprims MCP server for developers' AI agents (`openspec/changes/add-local-mcp-server`). It runs the same `core/` modules as the website, over stdio, and never opens a network connection.

```sh
node mcp/server.mjs                          # tools only, no file access
node mcp/server.mjs --allow-dir ~/meter-data # let it read files in one folder (repeatable)
```

| Path | What |
|---|---|
| `server.mjs` | stdio entry: one JSON-RPC message per line on stdout, logs on stderr, exits when stdin closes |
| `protocol.mjs` | Dual-era dispatch: MCP `2026-07-28` (`server/discover`, `_meta` versions, `resultType`, `ttlMs`, `cacheScope`) and legacy `initialize` for `2025-11-25` and `2025-06-18`; error `-32022` for other versions |
| `surface.mjs` | The six meta-tools, their JSON Schema 2020-12 schemas, and annotations |
| `handlers.mjs` | What each tool does, through the shared core |
| `handles.mjs` | In-memory file handles with a 60-minute idle expiry |
| `files.mjs` | The `--allow-dir` allowlist: realpath checks, symlink escapes, regular files only, 200,000,000-byte cap |
| `golden-surface.json` | The pinned tool surface; any change fails CI until this file changes with it |

| Tool | State |
|---|---|
| `gridprims_search`, `gridprims_describe`, `gridprims_run`, `gridprims_prepare_report` | Working |
| `gridprims_analyze_file` | Working: CSV, Excel, and Green Button files inside `--allow-dir` folders, held in memory under handles for 60 idle minutes; receipt choices (zone, stamps, quantity) re-read from memory; intervals paged 1,000 rows at a time; file text only in `source_text` |
| `gridprims_query_data` | Answers that no datasets are built yet |

Resources: `gridprims://limits` (every tool's validation level and limits) and `gridprims://datasets` (the dataset catalog).
