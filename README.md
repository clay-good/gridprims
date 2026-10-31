# gridprims

The US power grid's math, files, and public data in one free tab. Drop a meter file and get peaks, a line-by-line bill, cheaper rates, and hourly emissions without uploading anything. Read one cited, dated page for every utility, plant, and grid region. Developers get the same tools offline through a local MCP server.

No accounts, ads, tracking, or server compute. No third-party packages: only JavaScript, web platform APIs, and Node.js built-ins.

## Status

Phase 0 (the platform foundation) is being built. Nothing is deployed yet.

| Piece | State |
|---|---|
| Repository layout, zero-dependency gate, platform-API gate, own-implementations gate, file-count gate | Built and tested |
| Tool manifest schema, validator, and the shared `runTool` entry point | Built and tested |
| Reference tool `calc.energy-units.convert` | Built end to end: manifest, core, worked examples, page, command bar, MCP. **Stable, cross-checked**: its SI conversions agree with NIST SP 811 Appendix B.8 to every figure NIST prints (fuel averages are EIA's own, with no independent source) |
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
| Data pipeline: dataset registry with captured terms, posture matcher, CEII screen, and recipes as data; EIA-861 2025 snapshotted from EIA's own file into three tables (sales, revenue, and customers; reliability as SAIDI, SAIFI, and CAIDI; the counties each utility serves) EIA-860 2025 into plants (county-level location only) and operable, proposed, and retired generators, EIA-923 2025 into monthly and annual net generation and fuel by plant, prime mover, and fuel, EIA-860M's September 2026 generator inventory, eGRID2023 (plant emissions, subregion total output and non-baseload rates, and EPA's ZIP-to-subregion lookup), the Census 2020 ZCTA-to-county file (land overlap only, each county's share, by state), OpenEI URDB's 32,339 rates in effect placed by state through EIA-861, LBNL's Queued Up 2026 edition (38,201 interconnection requests, active capacity by type matching LBNL's own summary), and FERC Form 714 annual peaks for 2006 to 2025 from PUDL's hourly table with its crosswalk to EIA ids (read by our own Parquet reader), each as column shards and a gzip CSV with checksums; validators keep the previous version live on failure; the MCP server queries the same shards, any table by name ; national sums match EIA's Electric Power Annual (sales and generation to the MWh, capacity, SAIDI, and SAIFI) and PUDL v2026.10.0 with every difference explained ([`docs/reference-artifacts.md`](docs/reference-artifacts.md)) ; cross-source joins on EIA ids (never on a name alone) with a report of every unmatched key at `data/joins/report.json` | Built and tested; utility, plant, and region pages are next |
| Data provenance: a page per dataset at `/data/<id>/` with its source stamp, posture and captured terms, credit, downloads and checksums; one lateness rule computed on the visitor's device; each table's license chosen from its inputs; at most one permanent version a month | Built and tested |
| Unattended automation: a daily release watch for EIA-861, EIA-860, EIA-923, the monthly EIA-860M, and URDB (taken once a month) that refreshes in the same run with no approval, a weekly link check, a weekly canary on the floating runner, self-healing of host-disabled schedules, issues opened on failure, and a public health record at `/health/pipeline.json` shown on the limits page with staleness judged on the device; CI may use only GitHub's own SHA-pinned actions, enforced by gate and by repository policy | Running on schedule |
| Deploy to Cloudflare with the direct-upload API (`pipeline/deploy.mjs`): only changed files upload, rate limits are honored, a token with an expiry date is refused, the Worker ships as its own module graph; a post-deploy smoke test rolls back on a header regression | Built and tested against a stand-in API; **not yet run**: it needs a Cloudflare account, a token scoped to the one Worker, and a D1 database |
| Off-host watchdog on the Worker: re-enables disabled schedules, restarts stale ones, and sends a heartbeat that every in-host run checks | Built and tested; goes live with the first deploy |
| Data honesty in operation: each refresh captures the publisher's terms page and lowers the posture if the recorded wording disappears; a takedown drops a dataset to link-only at once; raw publisher files go to GitHub Releases, not git; every manifest carries its generated-at time and pages show its age computed on the device; a secret scan covers outputs and tracked files | Built and tested |
| Release integrity: a version tag rebuilds and publishes SHA-256 digests of every deployed file, a deterministic MCP archive, and an SPDX SBOM listing zero third-party packages; every date comes from the tagged commit | Built and tested; first tag not cut yet |
| Accessibility gates on every page in both themes: an own audit (labels, names, headings, landmarks, 24 px targets, ids), no sideways scroll at 320, 360, 768, 1024, and 1280 px, keyboard reachability, and one screen-reader announcement 500 ms after typing settles | Passing in browsers; glossary popovers and print get their checks with the Learn guides |
| Grid pulse in the top rail: the 14 latest daily peaks with "as of", hidden until an EIA-930 snapshot exists | Built and tested; hidden today |
| Limits page (`/limits/`, with JSON and the MCP resource from one record): honest summary first, every tool's stability, level, review, evidence date, and path to a higher level, the cited cannot-do list, known problems from the health record, and the unverified-claim register | Built and tested, including print in Chrome |
| Site shell and URLs: six sections (Home, Bills, Data, Carbon, Grid, Learn) with landing pages listing only what exists, a keyboard menu below 768 px, a record of every published URL with redirects under a 1,500-rule budget, a 404 that suggests close matches on the device, and a pseudo-locale sweep proving layouts survive 35% longer text | Built and tested |
| Security disclosure: `/.well-known/security.txt` per RFC 9116 with an expiry generated eleven months after the commit's date and guarded in CI, a disclosure policy with scope, safe harbor, and 5-day and 90-day targets, and credited security fixes in the changelog | Built and tested |
| Contribution rules as code (`CONTRIBUTING.md`, `pipeline/lib/curated.mjs`): primary sources with stored captures and checksums, two independent sources for disputable fields (a recorded-unreachable second source publishes it labeled single-source), refused secondary sources and personal data, a recorded conflict-of-interest answer, and the bulk-batch rule | Built and tested; no curated facts exist yet |
| Trust pages, all linked from every footer with the sister sites: About, Methods (one per tool, with each example's last CI result), Privacy, Accessibility, Corrections, Changelog, License and how to cite, Sources and credits, Review status, Limits, Terms and disclaimer, Continuity, Developers, Security | Built and tested in both themes at every width |
| Plant pages at `/plants/<EIA plant code>/`: 16,231 plants with an operating or planned generator, each with its operator, county and state only, balancing authority, capacity, a generator table with EIA-860M's latest status and planned retirements, 2025 net generation, capacity factor prorated by month (or "net consumer of energy"), and eGRID carbon dioxide in metric tons with the factor shown and both years named; 20 sampled plants match an independent reading of EIA's tables, and a scan finds no coordinates | Built and tested; browser gates visit a fixed sample of five |
| Utility pages at `/utilities/<EIA utility id>/`: 1,474 utilities with at least four reported figures, each with customers, sales, and revenue by sector; an average price only for full service ("How we got this" shows the division) and delivery-only or energy-only revenue labeled not a full price; a comparison with the state average; the Form 714 peak, or "not reported to FERC" with the balancing authority's peak labeled as such; SAIDI and SAIFI or "not reported"; operated generation by fuel; and the count of OpenEI rates. State averages match EIA's Table 2.10 in all 51 states | Built and tested; price trends (they need EIA-861 history), state lists for thin records, and links to pages not yet built are next |
| Overpass fonts | Not started |

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

Point your MCP client at it:

<!-- mcp-snippets:start (generated from mcp/clients.mjs; do not edit) -->
Replace `/path/to/gridprims` with your clone and `/path/to/your/meter-files` with a folder of meter files the server may read.

**Claude Code** (terminal):

```sh
claude mcp add gridprims -- node --permission --allow-fs-read=/path/to/gridprims --allow-fs-read=/path/to/your/meter-files /path/to/gridprims/mcp/server.mjs --allow-dir /path/to/your/meter-files
```

**Claude Desktop** (claude_desktop_config.json):

```json
{
  "mcpServers": {
    "gridprims": {
      "command": "node",
      "args": [
        "--permission",
        "--allow-fs-read=/path/to/gridprims",
        "--allow-fs-read=/path/to/your/meter-files",
        "/path/to/gridprims/mcp/server.mjs",
        "--allow-dir",
        "/path/to/your/meter-files"
      ]
    }
  }
}
```

**VS Code** (.vscode/mcp.json):

```json
{
  "servers": {
    "gridprims": {
      "type": "stdio",
      "command": "node",
      "args": [
        "--permission",
        "--allow-fs-read=/path/to/gridprims",
        "--allow-fs-read=/path/to/your/meter-files",
        "/path/to/gridprims/mcp/server.mjs",
        "--allow-dir",
        "/path/to/your/meter-files"
      ]
    }
  }
}
```

**Cursor** (~/.cursor/mcp.json):

```json
{
  "mcpServers": {
    "gridprims": {
      "command": "node",
      "args": [
        "--permission",
        "--allow-fs-read=/path/to/gridprims",
        "--allow-fs-read=/path/to/your/meter-files",
        "/path/to/gridprims/mcp/server.mjs",
        "--allow-dir",
        "/path/to/your/meter-files"
      ]
    }
  }
}
```
<!-- mcp-snippets:end -->

See [`mcp/README.md`](mcp/README.md) for the tools and what each one does.

## Layout

| Path | What |
|---|---|
| `core/` | Tool functions and manifests, shared by the website and the MCP server |
| `parsers/` | Own delimited-text, XML, `.xlsx`, and time-zone parsers |
| `pipeline/` | Dataset fetch, validate, normalize, and snapshot scripts that CI runs on schedule |
| `site/` | Templates, styles, and page modules for gridprims.com |
| `mcp/` | The local-only stdio MCP server |
| `data/` | Built dataset versions (EIA-861, EIA-860, EIA-860M, EIA-923, eGRID, Census ZCTA-to-county, URDB, LBNL Queued Up, and Form 714 peaks through PUDL today); `data/curated/` for hand-kept records |
| `worker/` | The Cloudflare Worker: static assets with security headers (problem reports and the watchdog to come) |
| `verify/` | Gates, tests, golden vectors, and stored reference outputs |
| `docs/` | Research briefs, decisions, platform APIs, own implementations |
| `openspec/` | Specs, designs, and tasks: the source of truth |

Product record: [`PRODUCT.md`](PRODUCT.md). Visual contract: [`DESIGN.md`](DESIGN.md).

## License

Code: MIT. gridprims' own page text and derived data: CC BY 4.0, except where an input's terms require otherwise.
