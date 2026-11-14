# Day-one decisions

The shapes every later phase-0 task generates from (foundation task 3.1). When a task needs a file format, a path, or a schedule, it cites a section here rather than inventing one. Changing a shape means editing this file in the same commit as the code.

## 1. Tool manifest

**Location.** One folder per tool: `core/tools/<tool-id>/`, holding `manifest.mjs` (default export: a plain object) and `tool.mjs` (exports `compute(inputs)`). The folder name equals the tool id. A `.mjs` module rather than JSON so the browser and Node import it with no import attributes and no fetch.

**Validator.** `core/contract/manifest.mjs` (`validateManifest`). The build fails on any error and names the tool and the field.

| Field | Type | Cardinality | Notes |
|---|---|---|---|
| `id` | string | 1 | `<domain>.<group>.<operation>`, each segment lowercase kebab |
| `version` | string | 1 | semver; bumped when any output changes for the same input (task 3.5) |
| `title`, `purpose` | string | 1 | purpose is one plain sentence |
| `archetype` | enum | 1 | `calculator`, `file-workbench`, `entity-page`, `explorer` (DESIGN.md) |
| `firstScreen` | string[] | 1–5 | the inputs on the first screen; any others sit behind one "More options" control (simplicity budget) |
| `inputs` | object | 1+ | `name`, `label`, `type` (`number`, `enum`, `text`, `file`, `length`, `rows`, `handle`), `example` (not for `file` or `handle`); numbers add `unit`, `canonicalUnit`, `range {min,max}`, `precision` (`exact` or `measured`); enums add `options [{value,label}]`; a `length` is read as field crews write it and reaches the tool in inches, with an optional `range` in inches; `rows` add `columns [{name,label,type}]` (number, enum, text, or length) and `maxRows`; a `handle` adds `accepts`, the file kinds it takes, and never goes in a link |
| `outputs` | object | 1+ | `name`, `label`, `unit` (or `unitless: true`), `rounding {sigFigs}` or `{decimals}` |
| `method` | string | 1 | plain words |
| `assumptions` | string | 0+ | |
| `citations` | object | 1+ | `source`, `edition`, `locator`, `url` (or `paywalled: true`) |
| `datasets` | string | 0+ | registry ids |
| `examples` | object | 1+ | `id`, `title`, `inputs`, `expect {<output>: {value, tolerance {abs or rel}, display?}}`, `source` |
| `related` | string | 0+ | tool ids |
| `handoffs` | object | 0+ | `label`, `url`; plain links, never carrying inputs |
| `sharedRoutines` | string | 0+ | shared-core module paths the tool calls |
| `stability` | enum | 1 | `experimental` or `stable`; `stable` needs validation level 2+ |
| `validation` | object | 1 | `level` 0–3 and `evidence [{kind, summary, path?}]` |
| `limitations` | string | 1+ | |
| `commandForms` | string | 0+ | plain-word phrasings for the command bar, such as `{value} {from} to {to}`; each placeholder names a number or enum input, and enum options may list `aliases` |
| `toRaise` | string | 0–1 | what evidence would raise the validation level, shown on the limits page |
| `claims` | string | 0+ | ids from the unverified-claim register (`data/curated/claims.mjs`) the tool relies on |
| `screeningLabel` | string | 0–1 | required when the output could pass for a study, a bill, or a utility decision |

**Evidence kinds.** `own-examples` (supports level 1), `reference-output` (a committed file under `verify/reference/`, level 2), `published-example` (a cited published worked example with a committed file, level 2), `field-case` (level 3, at least 3). A level above what the evidence supports fails the build.

**Precision.** A number input marked `exact` (a stated quantity to convert) does not limit output precision; one marked `measured` (a rate, a reading) limits it to its own significant figures (`core/lib/precision.mjs`). This is how the converter's "12 MWh → 40.95 MMBtu" and the tool contract's "$4 → $40,000" both hold.

## 2. Structured result

`core/contract/run.mjs` (`runTool`) wraps every tool, so the web page and the MCP server return the same object:

| `status` | Carries |
|---|---|
| `ok` | `outputs {<name>: {value, unit, display}}`, `sentence`, `work {method, steps, constants, assumptions, citations}`, `toolId`, `toolVersion`, `validationLevel`, `validationMeaning`, `stability`, `screeningLabel?` |
| `invalid` | `errors [{field, message}]`, where the message says what to type instead |
| `refused` | `reason` (one plain sentence), `limitsUrl` |

## 3. Dataset registry and refresh recipes

One file per dataset: `pipeline/registry/<dataset-id>.mjs` (default export). Registry fields are the ones `platform/data-snapshots` lists. The recipe is an ordered list of steps from a closed vocabulary: `fetch`, `unzip`, `gunzip`, `read-xlsx`, `read-csv`, `normalize` (names a module in `pipeline/normalize/`), `validate` (names validators and bounds), `partition`, `write-shards`, `write-csv-gz`. Quirks are steps with a fixture, never prose.

A dataset's `recipe` holds the steps every table shares (today, `fetch`), and `tables` lists each table with its own `name`, `title`, and steps (it needs at least `unzip`, `normalize`, `validate`, and `partition`). One release zip can yield several tables: EIA-861 yields `sales`, `reliability`, and `service_territory`. Every table is read and validated before any file is written, so one failing table fails the whole release and the previous version stays live. Each table's row bounds are compared against the same table in the version being replaced.

| Step option | Meaning |
|---|---|
| `unzip.entry` with `*` | Matches any run of characters within a file name, so a file the publisher renames between years (EIA-923's `_Final_Revision`) still matches; more than one match fails |
| `read-xlsx.sheets` | Reads several sheets and hands the normalizer their rows by sheet name (EIA-860's operable, proposed, and retired generators) |
| `read-xlsx` with no `unzip` | The download is the workbook itself (EIA-860M) |
| `read-json` | Reads one JSON document, gunzipped when it starts with gzip's magic bytes (URDB's bulk file) |
| `join` | Reads named columns of another dataset's served table (URDB takes each utility's states from EIA-861); the table's manifest records the joined versions in `joinedFrom`, and the joined publisher's credit travels with the table |
| `partition.unmatched` | Rows a join could not place go to a shard of that name instead of failing (URDB's 707 rates of utilities not in EIA-861) |
| `releaseWatch.period: 'rolling'` | One address rewritten in place (URDB, daily) is taken at most once a month; the period is the retrieval month |
| `read-csv.delimiter` | Reads a delimited text file (the Census relationship file is pipe-delimited with a byte-order mark) and hands the normalizer rows of strings, the header first |
| `unzip.files` | Reads the same workbook (`{file}` in the entry name) from each named zip of a vintage and hands the normalizer rows by file (EIA-861's five years); a year missing its workbook fails the release |
| `read-xlsx.file` | Reads one named file of a multi-file vintage (eGRID's data workbook, or Power Profiler's ZIP lookup) |
| `partition.by: null` | One national shard (`US.bin`) for a small table, or one a later join splits by state (the ZIP lookup, split once ZCTAs give each ZIP its state) |
| `releaseWatch.period: 'month'` | Periods are months (`2026-09`); URLs take `{month}` (`september`) and `{year}`, and December rolls to January |
| `partition.by` | A row with no value in that column fails the release instead of landing in a `null` shard |
| `releaseWatch.nextYearFrom` | Look for next year's file only from this month and day of the year after (EIA-923 grows a year-to-date file all year) |
| `releaseWatch.finalOnly` | A found file without the final workbook is waited on, not a failure |
| `read-parquet.files` | Reads the named Parquet files of a vintage (`vintage.files`, each with its URL and pin) and hands the normalizer one reader per file, read a row group at a time; PUDL's Form 714 build reads 19.5 million hourly rows in about 3 s |
| no `releaseWatch` | The dataset is pinned to a release (PUDL); a new release is a hand-made bump after the cross-checks pass, and the daily watch skips it |

### Cross-source joins

`pipeline/joins.mjs` holds each join as data: two served tables and their keys, each key an id or a name. Every join keys on an id, and a name may only narrow one (a county name within a state, compared without accents, case, punctuation, or "County"). Counties EIA-861 still names by former areas map to their successors from the Census Bureau's county-changes record. `node pipeline/joins.mjs` writes `data/joins/report.json`: per join, the versions read, how many keys matched, and up to 20 unmatched keys on each side. The scheduled refresh rewrites it, and a test fails when it is stale.

### Entity pages

Families of pages generated by the thousand from data (today `/plants/`, listed in `ENTITY_FAMILIES` in `site/build.mjs`) are cached by the service worker as they are visited, never precached, and the browser gates visit a fixed sample chosen to cover every branch of the template (`verify/browser/pages.mjs`). Node tests check the whole family: every plant page is scanned for coordinates.

## 4. Build output

| Path | What |
|---|---|
| `dist/` | The deploy root: pages, app code, `data/` shards and downloads. The deploy manifest is the sorted list of `dist/` paths with SHA-256s, written to `dist/_manifest.json` |
| `data/` (repo) | Normalized shards, manifests, and checksums committed to git; copied into `dist/data/` |

The deployable file-count gate (`verify/gates/file-count.mjs`) counts `dist/` and fails above 80,000.

## 5. Tests and the one command

| Command | Runs |
|---|---|
| `npm test` | Unit, golden-vector, gate, and pipeline tests in parallel, then the browser tests one file at a time so browsers never compete for the machine |
| `npm run check` (or `node verify/check.mjs`) | Every repository gate against the working tree |

Tests live in `verify/tests/`, mirroring the folder they test, so nothing under `site/` or `core/` ships a test file. Gate fixtures live in `verify/fixtures/gates/`. No install step: `npm` only reads the scripts.

## 6. CI workflows

| Workflow | Trigger | Interval | Staleness threshold |
|---|---|---|---|
| `ci.yml` (unit tests on both Node versions, gates) | push, pull request | on change | n/a |
| `browser.yml` (Chrome and Firefox suite) | pull request, nightly 07:41 UTC, on demand | daily | 72 hours |
| `safari.yml` | weekly Thursday 06:53 UTC, on demand | weekly | 504 hours |
| `rule-watch.yml` (rechecks the sources in `docs/research/06`) | weekly Monday 08:19 UTC, on demand | weekly | 504 hours |
| `refresh-data.yml` | schedule | daily 09:17 UTC | 72 hours |
| `link-check.yml` | schedule | weekly, Tuesday 07:23 UTC | 504 hours |
| `canary.yml` | schedule (floating runner label) | weekly, Wednesday 05:41 UTC | 504 hours |
| `smoke.yml` | after deploy | with each deploy (task 8.6) | — |

Thresholds are three times the interval with a 48-hour floor, declared in `pipeline/workflows.mjs` and shipped in the health record. Self-heal is the first step of every scheduled run rather than its own workflow, so the host disabling one workflow is repaired by any other. Every step is `node <our script>` or `git`; actions are GitHub's own, pinned by full commit SHA, and the repository's Actions policy (set 2026-10-31) allows only GitHub-owned actions and requires SHA pinning.

## 7. Problem report endpoint

`POST /api/reports`, JSON, at most 16 KiB.

| Field | Type | Limit |
|---|---|---|
| `toolId`, `toolVersion` | string | 64 |
| `datasets` | `[{id, version}]` | 20 |
| `pageUrl` | string, no fragment | 512 |
| `message` | string | 4,000 |
| `attachment` | object, only when the user ticks the box; never file contents | 8 KiB |
| `website` | honeypot, must be empty | |
| `pow` | `{nonce, hash}` | |

**Storage (D1).** Table `reports (id TEXT PRIMARY KEY, received_at TEXT, closed_at TEXT, payload TEXT)`. Rate-limit counters live in the Rate Limiting binding, never in this table.

**Proof of work.** SHA-256 over `nonce + ":" + challenge`, where the challenge is the SHA-256 of the canonical payload (`core/contract/report.mjs`), so the cost does not grow with the message. 16 leading zero bits, about 65,000 hashes on average. Revised from 18 bits when the dialog was built (task 9.3): one `crypto.subtle` call per hash was far too slow, so the browser uses our synchronous SHA-256 (`core/lib/sha256.mjs`), about 1.1 million short hashes a second in Node on the build machine, which puts 16 bits near 60 ms there and an estimated 250 ms at the reference profile's 4x slowdown. The server checks one hash.

## 8. Reference machine and measured budgets

The throttled reference profile in `platform/app-shell` everywhere, including the parse budget: Chrome with 4x CPU slowdown, 150 ms round trips, 1.6 Mbps down, 750 kbps up (`verify/lib/reference-profile.mjs`). No separate reference machine. CI prints each run's figures as `BUDGET` lines.

Measured on CI (`ubuntu-24.04`, headless Chrome), 2026-10-31:

| Measure | Budget | First run | After fix |
|---|---|---|---|
| Parse 35,040 rows of 15-minute CSV in the worker | 1,000 ms | 1,245–1,276 ms (over) | 633–661 ms, after resolving local time once per wall-clock hour |
| Tool page first answer (largest contentful paint) | 1,500 ms | 744–932 ms | 844–920 ms |
| Tool page JavaScript, compressed | 150 KB | 22.6 KB in 15 files | 22.7 KB |
| Command index, compressed (fetched on first focus) | 150 KB | 57.3 KB with 4,825 entries, 3,140 of them counties | — |

The 1 s parse budget stays as set: the measured figure clears it with about 35% headroom.

The command index is measured the same way because it is fetched whole the first time the search bar is focused. Adding every state, county, utility with a page, balancing authority, and eGRID subregion took it from 43.5 KB raw to 541 KB raw, but only to 57.3 KB compressed: the repeated county and state names compress almost to nothing. ZIP codes stay out of it and are recognized by the ranker instead. `verify/gates/index-size.mjs` holds the budget.

## 9. MCP protocol choices

Checked against the published schemas on 2026-10-30 (committed under `verify/reference/mcp/`): `server/discover` returns `supportedVersions`, `capabilities`, `ttlMs`, and `cacheScope`; every result carries `resultType`; server identity goes in `_meta["io.modelcontextprotocol/serverInfo"]`; error `-32022` carries `data.requested` and `data.supported`.

| Case | Answer |
|---|---|
| A request whose `_meta` names an unsupported version | `-32022` listing `2026-07-28`, `2025-11-25`, `2025-06-18` |
| Legacy `initialize` with an unknown version | The newest legacy version we support, as the legacy versions require of servers |
| A request with no `_meta` version | Served, so legacy clients keep working after `initialize` |
| Unknown tool or resource | `-32602` |

## 10. Reproducing a snapshot from the publisher

`node pipeline/build-data.mjs` rebuilds every served dataset from the publisher's own file and compares checksums with the committed manifest. On 2026-10-31 it rebuilt EIA-861 (version 2026-10) live from `eia.gov`: the raw file's SHA-256 matched the pinned `f59f6c73…a396`, and all 51 shards and the CSV download matched byte for byte. On 2026-10-30, with three EIA-861 tables and EIA-860's plants and generators, both datasets rebuilt from EIA's pinned files (EIA-860 `2b27929d…08ba`) with every shard and download matching; EIA-923 (`1bff7092…84de`) rebuilt the same way the same day, and so did the Form 714 peaks from PUDL v2026.10.0's two Parquet files EIA-860M for September 2026 (`bcef74e1…da17`), eGRID2023 revision 2 with its ZIP lookup, the Census 2020 ZCTA-to-county file, URDB of 2026-10-30 (joined against the committed EIA-861), LBNL's Queued Up 2026 edition, and EIA-861 2021 to 2025 from five pinned zips: ten datasets. The rebuild also compares each table's data period. `node pipeline/get-data.mjs` fetches the same files from gridprims.com and accepts each only if it matches the digest committed in the clone.
