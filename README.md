# gridprims

The US power grid's math, files, and public data in one free tab. Drop a meter file and get peaks, a line-by-line bill, cheaper rates, and hourly emissions without uploading anything. Read one cited, dated page for every utility, plant, and grid region. Developers get the same tools offline through a local MCP server.

No accounts, ads, tracking, or server compute. No third-party packages: only JavaScript, web platform APIs, and Node.js built-ins.

## Status

Phase 0 (the platform foundation) is being built. Nothing is deployed yet.

| Piece | State |
|---|---|
| Repository layout, zero-dependency gate, platform-API gate, own-implementations gate, file-count gate | Built and tested |
| Tool manifest schema, validator, and the shared `runTool` entry point | Built and tested |
| Reference tool `calc.energy-units.convert` (core and worked examples) | Built and tested; self-checked, experimental. No page or MCP surface yet |
| Own parsers: delimited text (encoding, delimiter, quotes, chunks) and XML that refuses DTDs and entities | Built and tested |
| Time-zone and DST helper on `Intl` (spring gap, fall repeat, transitions) | Built and tested in Node, Chrome, Firefox, and Safari |
| `.xlsx` reader (own ZIP directory, `DecompressionStream` inflate, shared strings, date formats, cached values only) | Built and tested against 10 workbook shapes in Node, Chrome, Firefox, and Safari |
| Own browser driver (Chrome over CDP, Firefox over WebDriver BiDi, Safari through `safaridriver`) | Built; runs in CI on Linux and macOS |
| Static site build: escaped templates, string files, DESIGN.md tokens in both themes, the converter page prerendered with its worked example and hydrated live, share links in the URL fragment, a generated limits page | Built and tested in Node, Chrome, and Firefox (first paint, live recompute, share links, no third-party requests, 320 px) |
| Command bar: plain words such as "12 MWh to MMBtu" open the tool filled in, with a live answer preview; index and ranker generated from manifests in the shared core | Built and tested in Node and browsers |
| Style lint (no literal colors; every DESIGN.md contrast pairing recomputed in both themes) and literal-copy lint (visitor text only from string files or manifests) | Built and tested; run by `npm run check` |
| Overpass fonts, file intake, data snapshots, Worker, MCP server | Not started |

The plan is in [`openspec/changes/`](openspec/changes/): 22 changes, built in the phase order in [`plan-launch-and-value-proof`](openspec/changes/plan-launch-and-value-proof/). The shapes everything generates from are in [`docs/decisions-day-one.md`](docs/decisions-day-one.md).

## Run it

Needs only Node.js 24.12 or later. There is no install step.

```sh
npm test          # unit, worked-example, gate, and browser tests (node:test)
npm run check     # every repository gate against the working tree
npm run build     # render the site into dist/
npm run serve     # serve dist/ at http://127.0.0.1:8080
```

Browser tests run in each installed engine and skip the ones that are missing. Set `GRIDPRIMS_CHROME` or `GRIDPRIMS_FIREFOX` to a browser's path to override the search, and `GRIDPRIMS_SAFARI_TESTS=1` on a Mac after `sudo safaridriver --enable` to include Safari.

Run a tool from the shared core:

```sh
node -e "import('./core/tools/index.mjs').then(async ({ getTool }) => {
  const { runTool } = await import('./core/contract/run.mjs');
  const t = getTool('calc.energy-units.convert');
  console.log(runTool(t.manifest, t.impl, { value: 12, from: 'MWh', to: 'MMBtu' }).sentence);
})"
# 12 MWh is 40.95 MMBtu.
```

## Layout

| Path | What |
|---|---|
| `core/` | Tool functions and manifests, shared by the website and the MCP server |
| `parsers/` | Own delimited-text, XML, `.xlsx`, and time-zone parsers |
| `pipeline/` | Dataset fetch, validate, normalize, and snapshot scripts that CI runs on schedule |
| `site/` | Templates, styles, and page modules for gridprims.com |
| `mcp/` | The local-only stdio MCP server |
| `data/` | Built dataset shards and manifests; `data/curated/` for hand-kept records |
| `worker/` | The Cloudflare Worker (static assets, problem reports, watchdog) |
| `verify/` | Gates, tests, golden vectors, and stored reference outputs |
| `docs/` | Research briefs, decisions, platform APIs, own implementations |
| `openspec/` | Specs, designs, and tasks: the source of truth |

Product record: [`PRODUCT.md`](PRODUCT.md). Visual contract: [`DESIGN.md`](DESIGN.md).

## License

Code: MIT. gridprims' own page text and derived data: CC BY 4.0, except where an input's terms require otherwise.
