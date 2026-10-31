# gridprims

The US power grid's math, files, and public data in one free tab. Drop a meter file and get peaks, a line-by-line bill, cheaper rates, and hourly emissions without uploading anything. Read one cited, dated page for every utility, plant, and grid region. Developers get the same tools offline through a local MCP server.

No accounts, ads, tracking, or server compute. No third-party packages: only JavaScript, web platform APIs, and Node.js built-ins.

## Status

Phase 0 (the platform foundation) is being built. Nothing is deployed yet.

| Piece | State |
|---|---|
| Repository layout, zero-dependency gate, platform-API gate, own-implementations gate, file-count gate | Built and tested |
| Tool manifest schema, validator, and the shared `runTool` entry point | Built and tested |
| Reference tool `calc.energy-units.convert` | Built end to end: manifest, core, worked examples, page, command bar, MCP. Self-checked, experimental |
| Own parsers: delimited text (encoding, delimiter, quotes, chunks) and XML that refuses DTDs and entities | Built and tested |
| Time-zone and DST helper on `Intl` (spring gap, fall repeat, transitions) | Built and tested in Node, Chrome, Firefox, and Safari |
| `.xlsx` reader (own ZIP directory, `DecompressionStream` inflate, shared strings, date formats, cached values only) | Built and tested against 10 workbook shapes in Node, Chrome, Firefox, and Safari |
| Own browser driver (Chrome over CDP, Firefox over WebDriver BiDi, Safari through `safaridriver`) | Built; runs in CI on Linux and macOS |
| Static site build: escaped templates, string files, DESIGN.md tokens in both themes, the converter page prerendered with its worked example and hydrated live, share links in the URL fragment, a generated limits page | Built and tested in Node, Chrome, and Firefox (first paint, live recompute, share links, no third-party requests, 320 px) |
| Command bar: plain words such as "12 MWh to MMBtu" open the tool filled in, with a live answer preview; index and ranker generated from manifests in the shared core | Built and tested in Node and browsers |
| Style lint (no literal colors; every DESIGN.md contrast pairing recomputed in both themes) and literal-copy lint (visitor text only from string files or manifests) | Built and tested; run by `npm run check` |
| Local MCP server (`node mcp/server.mjs`): MCP `2026-07-28` plus legacy `2025-11-25` and `2025-06-18`, six meta-tools, `--allow-dir` file allowlist, no network | Search, describe, run, analyze-file (with handles and paged intervals), and report prep working; responses checked against the official schemas; every worked example matches the website in Node, Chrome, and Firefox, and passes with networking disabled |
| File intake core: format detection from content, header-row and column recognition, interval-start or -ending stamps, DST gap and repeat, duplicates, gaps, meters, channels, and units, with a receipt of every choice | Built and tested against 21 utility-shaped fixtures |
| Green Button ESPI 4.0 XML (plain or zipped): `uom` and multiplier scaling, delivered and received channels kept apart, local time from the file | Built; checked against an Apache-licensed OpenESPI sample whose receipt was computed independently. The parsing worker and receipt UI are next |
| Honesty gates: result sentences at grade 8 or below (own Flesch-Kincaid, checked on 21 hand-scored sentences), no accuracy or endorsement claims in prose, and result snapshots that fail a changed answer without a version bump; public changelog at `/changelog/` | Built and tested |
| Privacy and security: the Worker with a strict CSP (own origin only, the one inline script by hash) and security headers, no cookies; a third-party request audit of every page; a sentinel egress test; a settings page that lists and erases everything stored on the device | Built and tested in Node and browsers; not deployed yet |
| File workbench at `/files/`: opens on a labeled sample, parses a dropped or chosen file in a worker with progress and cancel, shows the peak, total, load factor, chart, and monthly peaks from the shared core, and an editable receipt that re-runs the read; refusals say what to do; a file is kept only with consent | Built and tested in browsers |
| Offline and installable: a build-versioned service worker precaches the app shell; after one visit the workbench parses files and calculators answer with no network | Built and tested in browsers |
| Performance budgets on the reference profile (Chrome, 4x CPU slowdown, throttled network): a year of 15-minute rows parses in about 650 ms (budget 1 s); the tool page answers in under 1 s with 23 KB of compressed JavaScript (budgets 1.5 s and 150 KB) | Measured and gated in CI |
| One source, every surface: page, command bar, MCP, and the generated [`docs/tools.md`](docs/tools.md) read labels, units, and citations from the manifest; the workbench and the MCP server agree on the peak and its time for the same file | Tested |
| SVG charts: peak-preserving downsampling, ticks inside the data, summary and table view, colors from tokens | Built and tested |
| Problem reports: a dialog that previews the exact payload (inputs only when ticked, never file contents), a Worker route with schema limits, honeypot, proof of work, and the host's rate limit, D1 storage, and retention cleanup (180 days after closing, 365 at most); agent-prepared reports open for a person to review | Built and tested against the real Worker locally; not deployed |
| Data pipeline: dataset registry with captured terms, posture matcher, CEII screen, and recipes as data; EIA-861 2025 snapshotted from EIA's own file into column shards and a gzip CSV with checksums; validators keep the previous version live on failure; the MCP server queries the same shards | Built and tested; scheduled refresh in CI is next |
| Data provenance: a page per dataset at `/data/<id>/` with its source stamp, posture and captured terms, credit, downloads and checksums; one lateness rule computed on the visitor's device; each table's license chosen from its inputs; at most one permanent version a month | Built and tested |
| Unattended automation: a daily EIA-861 release watch that refreshes in the same run with no approval, a weekly link check, a weekly canary on the floating runner, self-healing of host-disabled schedules, issues opened on failure, and a public health record at `/health/pipeline.json` shown on the limits page with staleness judged on the device; CI may use only GitHub's own SHA-pinned actions, enforced by gate and by repository policy | Running on schedule |
| Overpass fonts, deploy, Worker watchdog | Not started |

The plan is in [`openspec/changes/`](openspec/changes/): 22 changes, built in the phase order in [`plan-launch-and-value-proof`](openspec/changes/plan-launch-and-value-proof/). The shapes everything generates from are in [`docs/decisions-day-one.md`](docs/decisions-day-one.md).

## Run it

Needs only Node.js 24.12 or later. There is no install step.

```sh
npm test          # unit, worked-example, gate, and browser tests (node:test)
npm run check     # every repository gate (GRIDPRIMS_RECORD=1 refreshes result snapshots after a version bump)
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

## Use it from an AI agent

The MCP server runs the same tools locally over stdio and never touches the network:

```sh
node mcp/server.mjs                           # tools only
node mcp/server.mjs --allow-dir ~/meter-data  # also let it read files in one folder
```

Point your MCP client at that command. See [`mcp/README.md`](mcp/README.md).

## Layout

| Path | What |
|---|---|
| `core/` | Tool functions and manifests, shared by the website and the MCP server |
| `parsers/` | Own delimited-text, XML, `.xlsx`, and time-zone parsers |
| `pipeline/` | Dataset fetch, validate, normalize, and snapshot scripts that CI runs on schedule |
| `site/` | Templates, styles, and page modules for gridprims.com |
| `mcp/` | The local-only stdio MCP server |
| `data/` | Built dataset versions (EIA-861 today); `data/curated/` for hand-kept records |
| `worker/` | The Cloudflare Worker: static assets with security headers (problem reports and the watchdog to come) |
| `verify/` | Gates, tests, golden vectors, and stored reference outputs |
| `docs/` | Research briefs, decisions, platform APIs, own implementations |
| `openspec/` | Specs, designs, and tasks: the source of truth |

Product record: [`PRODUCT.md`](PRODUCT.md). Visual contract: [`DESIGN.md`](DESIGN.md).

## License

Code: MIT. gridprims' own page text and derived data: CC BY 4.0, except where an input's terms require otherwise.
