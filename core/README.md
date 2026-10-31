# core

Tool functions and their manifests, shared by the website and the local MCP server. No DOM and no Node-only APIs, so the browser loads these exact files.

| Path | What |
|---|---|
| `contract/manifest.mjs` | The manifest schema and validator (docs/decisions-day-one.md §1) |
| `contract/run.mjs` | `runTool`: input checks, rounding, validation level; the one entry point both surfaces call |
| `contract/command.mjs` | The command-bar index and ranker |
| `contract/limits.mjs` | The machine-readable limits record |
| `intake/` | File intake: detect a format, read a table into canonical interval series, and write the receipt |
| `lib/` | Shared routines more than one tool uses (precision and rounding today) |
| `tools/<tool-id>/` | One folder per tool: `manifest.mjs` and `tool.mjs` |
| `tools/index.mjs` | Every registered tool |
