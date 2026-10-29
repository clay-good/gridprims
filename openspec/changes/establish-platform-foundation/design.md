## Context

Greenfield repository. Motivation is in `proposal.md`; research is in `docs/research/01`–`09` (gathered 2026-10-27 to 2026-10-29); the platform and MCP findings are in `docs/research/04`, formats in `07`, licenses in `08`. The visual contract is `DESIGN.md`; product truth is `PRODUCT.md`. Constraints that shape every decision:

- **Two surfaces, one core.** A static website for humans and a local-only MCP server (`add-local-mcp-server`) for developers' agents. Both run the same JavaScript modules and must return identical results.
- **Zero third-party code** (`platform/zero-dependency`). Only the JavaScript language, web platform APIs, and Node.js built-ins. Cloudflare hosts the site; public publishers supply data at build time. Nothing else.
- **No server compute.** The only server code is the problem-report endpoint.
- **User files are sensitive.** Interval data shows when a business runs; developers keep sites secret.
- **Page count.** About 15,000–20,000 entity pages plus app files exceed the Cloudflare Workers free limit of 20,000 static files per version; the paid limit is 100,000, with 25 MiB per file on both plans.
- **Public data is fragile.** HIFLD Open went offline in 2025, EIA lost a large share of its staff, and eGRID2024 is late. Snapshots must be immutable and reproducible.

## Goals / Non-Goals

**Goals:**
- A fresh clone builds, tests, serves, and runs the MCP server with only Node.js installed.
- One manifest per tool that generates the web page, the command-bar entry, the MCP tool description, and the docs.
- File workbenches that parse a year of 15-minute data in under 1 s on a mid-range phone.

**Non-Goals:**
- A hosted or remote MCP endpoint.
- Tiled basemaps, live market feeds, or any runtime call to a third-party service.

## Decisions

### D1. Plain JavaScript modules with JSDoc types
All code is `.mjs` (Node) and `.js` ES modules (browser) with JSDoc type annotations. No compile step: the browser loads the same files the tests run.

| Alternative | Why not |
|---|---|
| TypeScript with `tsc` | `tsc` is a package dependency. Node 24.12+ strips types natively, but nothing checks them without `tsc`, so types would be decoration. |
| Rust → WebAssembly (geoprims) | Needs a toolchain outside Node. geoprims needed bit-identical geodesy; grid math here is mostly arithmetic over arrays with engineering tolerances. |

### D2. Node.js 24.12 floor, tested on 24 and 26
Node 26 becomes Active LTS on 2026-10-28; Node 24 entered Maintenance on 2026-10-20 and stays supported into 2028, so it remains the floor while 26 is the primary line. When Node 24 reaches end of life, the floor moves to 26. Alternative: Node 22 as the floor. Rejected: native type stripping and several `Intl` and compression fixes arrived in 24.x, and 22 leaves maintenance in April 2027. Built-ins relied on: `node:test`, `node:crypto` (SHA-256), `node:zlib` (gzip, raw inflate for `.xlsx`), global `fetch` and `WebSocket`, `util.parseArgs`, `worker_threads`, `Intl` with full ICU. `node:sqlite` is a release candidate and is not required. Minimum browsers: the versions that ship `DecompressionStream('deflate-raw')`, module workers, and `Intl` IANA time zones (listed in `docs/platform-apis.md` with their sources).

### D3. Own static site generator
A Node script renders pages from templates (tagged template literals returning escaped HTML) and the normalized data. Facts and tables are static HTML; each interactive tool is a small module that hydrates its own section. Expected build: tens of thousands of pages in minutes on a laptop (estimate; measured in task 7.6).

| Alternative | Why not |
|---|---|
| Astro, Eleventy, Next.js | Package dependencies with frequent major-version churn. |
| Client-side rendering of entity pages | Breaks "facts work without JavaScript" and hurts search. |

### D4. Hosting: Cloudflare Workers static assets on the paid plan, deployed without Wrangler
Everything (pages, app code, datasets) is served from `gridprims.com` as static assets; no R2 bucket and no data subdomain. Datasets are split so no file exceeds 20 MiB. The paid plan ($5/month) is required for the file count. A deploy script uses Cloudflare's direct-upload API with `fetch` and `crypto` only, so Wrangler (a package) is not needed.

| Alternative | Why not |
|---|---|
| Free plan with fewer pages | Drops utilities and plants below a size cutoff; the long tail is where nobody else serves people. |
| A Worker that renders long-tail pages | Server compute, and every page view runs code. |
| R2 for data | A second storage product and upload signer for no user benefit at our sizes. |

### D5. Data formats without Parquet
Parquet is not realistic without a library. We ship:
- **Downloads:** CSV, gzip-compressed, split by year or state when large, each with a SHA-256.
- **Chart and query data:** one packed binary file per partition (a short JSON header with column names, types, units, offsets, and row count, followed by little-endian typed-array columns). Browsers and Node read them with `ArrayBuffer` views; no parser beyond the header.
- **Lookups:** small JSON shards partitioned by state, balancing authority, or year only (privacy spec).

**Versions and the file budget.** Only the current version of each dataset is served as shards. Permanent versions are cut on a fixed schedule (monthly at most, even when data refreshes weekly) and kept as CSV.gz downloads plus the raw publisher inputs, each split under 20 MiB. A CI gate counts deployable files and fails above 80,000, leaving 20% headroom under the 100,000-file paid limit. If archives outgrow the budget, old versions move to Cloudflare R2 behind the same origin; that is a hosting change, not a new dependency.

**Reproducibility.** Raw publisher files used for each version are archived with their checksums, so a release rebuild uses archived inputs, not live fetches.

The MCP server reads the same files from the clone's `data/` folder (see `add-local-mcp-server`).

### D6. Own parsers
- **Delimited text:** streaming parser with quote, delimiter, and encoding detection, run in a worker.
- **XML (Green Button):** a small streaming parser that refuses any file containing a DTD or entity declaration, so external-entity attacks cannot occur.
- **`.xlsx`:** read the ZIP central directory ourselves; inflate entries with `DecompressionStream('deflate-raw')` in browsers and `zlib.inflateRawSync` in Node; read shared strings and cached cell values only.
- **Time:** local-time conversion with `Intl.DateTimeFormat` and explicit IANA zones; DST gaps and repeats detected by comparing UTC offsets of adjacent intervals. A fixture suite pins results so engine time-zone data differences surface in CI.

Alternative: vendor small open-source parsers (for example a CSV library) as copied files. Rejected: still third-party code to audit and license-track; our formats are narrow enough to own.

### D7. Own charts, search, and print report
Charts are SVG built from DESIGN.md's Charts rules, with Canvas only for dense heatmaps. The command-bar index is a prebuilt JSON of manifests and entity names with a small ranking function. The one-page report is a print stylesheet on a dedicated report view; the browser's own "Save as PDF" produces the file. Alternative: a hand-written PDF generator. Rejected: fonts, Unicode, and tagged accessible PDF are costly to do right (`docs/research/04` B6).

### D8. Own test harness and browser driver
Unit and golden-vector tests use `node:test`. End-to-end tests (egress, accessibility checks, 320 px sweep, budgets) drive an installed Chrome over the DevTools Protocol and Firefox over WebDriver BiDi, using Node's built-in `WebSocket`; Safari runs a smaller suite through the built-in `safaridriver`. Estimated at 300–600 lines (`docs/research/04`). Alternative: Playwright or Puppeteer. Rejected: package dependencies with bundled browsers.

### D9. Problem reports
One Worker route stores reports in D1 (Cloudflare, the host). Abuse protection is a honeypot field, a SHA-256 proof-of-work done in the browser, payload limits, and the Workers Rate Limiting binding. The dialog also offers "Copy report text", so people who prefer email or GitHub can send it their own way.

| Alternative | Why not |
|---|---|
| Turnstile, hCaptcha, or reCAPTCHA | Third-party script on the page, against `platform/privacy-and-security`. |
| No endpoint, GitHub issue links only | Excludes people without a GitHub account. |

### D10. A reference tool in phase 0
The energy unit converter (`calc/energy-units-and-emissions`, conversion part only) is built in phase 0 as the reference tool that exercises the whole contract: manifest, page, command bar, MCP, golden vectors, and share links. The rest of `add-grid-calculators` stays in phase 2. Alternative: use a phase 1 hero as the reference. Rejected: too large to prove the contract quickly.

### D11. Fixture data in the repository
A small fixture subset of every dataset (three states, three balancing authorities, one year) is committed under `verify/fixtures/data/`, so a fresh clone can run every test and every worked example offline. Full data comes from release archives or the data commands. Alternative: no committed data, download on first run. Rejected: breaks offline tests and the fresh-clone promise.

### D12. Allowed development-time services
Outside the product, development uses only: the git host for the repository, locally installed browsers for end-to-end tests, Cloudflare for deploys, and public publishers for data. None is called by the website or the MCP server at runtime, and none is a package. Alternative: hosted CI services with marketplace actions. Rejected: each action is third-party code; CI runs our own scripts only.

### D13. Light theme first, following the device
The theme follows `prefers-color-scheme` and is light when the device states no preference (DESIGN.md, chosen 2026-10-29). Most use is in daylight at desks, on phones, and on printed handouts.

| Alternative | Why not |
|---|---|
| Dark by default (the first concept) | Matched a common generated-UI look, prints poorly, and fights daylight use. |
| Light only | Night use and user preference are real; the token set already defines both. |

### D14. Release watch, not auto-publish
Publisher changes open a refresh task; a person runs the refresh and validators decide whether it ships (spec `platform/data-operations`). Alternative: fully automatic refresh and deploy. Rejected: federal files change shape without notice (EIA-930 added fuel columns on 2025-01-01), and a silent bad release damages trust more than a late one.

### D15. Repository layout
One repository with separate top-level folders by role. Alternative: separate repositories for site, MCP, and pipeline. Rejected: the shared core would be copied or published as a package.


| Path | What |
|---|---|
| `openspec/` | Specs, designs, tasks (source of truth) |
| `docs/research/` | Research briefs behind the specs |
| `DESIGN.md` | Visual and interaction contract |
| `core/` | Tool functions and manifests; no DOM, no Node-only APIs |
| `parsers/` | CSV, XML, XLSX, time zones; shared by web and MCP |
| `pipeline/` | Dataset fetchers, validators, snapshot and render scripts |
| `site/` | Templates, page modules, styles, fonts, service worker |
| `mcp/` | Local stdio MCP server (`server.mjs`) |
| `data/` | Built dataset shards and manifests (checked into release archives) |
| `worker/` | The Cloudflare Worker (static assets and `/api/reports`) |
| `verify/` | Golden vectors, stored reference outputs, browser driver, egress test, budgets, claims gate |
| `data/curated/` | Hand-maintained records (glossary, get-your-data guides, large-load terms, regulator links), each with a schema |
| `docs/` | Research, runbooks, corrections log, review sign-offs, own-implementations list, platform APIs |

## Risks / Trade-offs

- **Maintaining our own parsers and driver.** More code to own. Mitigation: narrow scope (only what our formats need), fixture suites, and the own-implementations list.
- **Engine time-zone data differs.** Mitigation: fixture suite across Chrome, Firefox, Safari, and Node; results show the zone rules used.
- **Federal releases stall.** Mitigation: staleness notes and PUDL as a second path.
- **CEII mistakes.** Mitigation: CEII screen, public-source-only rule, no planning models.
- **Thin entity pages.** Mitigation: content minimums.
- **Cost.** $5/month for the paid Workers plan plus the domain. Still small.
