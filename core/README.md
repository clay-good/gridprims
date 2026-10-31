# core

Tool functions and their manifests, shared by the website and the local MCP server. No DOM and no Node-only APIs, so the browser loads these exact files.

| Path | What |
|---|---|
| `contract/manifest.mjs` | The manifest schema and validator (docs/decisions-day-one.md §1) |
| `contract/run.mjs` | `runTool`: input checks, rounding, validation level; the one entry point both surfaces call |
| `lib/` | Shared routines more than one tool uses (precision and rounding today) |
| `tools/<tool-id>/` | One folder per tool: `manifest.mjs` and `tool.mjs` |
| `tools/index.mjs` | Every registered tool |
