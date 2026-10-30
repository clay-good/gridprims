## Why

**Value up front:** people get a small set of excellent, private, cited tools on day one (their bill, their meter data, their utility, their grid's emissions) instead of a sprawling site of half-finished ones, and the next tools are chosen by what they actually use.

gridprims has to prove it is used before it tries to be everything about the grid. Free alternatives already cover pieces: NREL REopt optimizes solar and storage, Interconnection.fyi tracks queues, GridStatus covers markets, PUDL cleans federal data. What nobody free does is tell a household, facility, co-op, or city what its own meter data and bill are actually saying, privately and with sources, or keep a citable public copy of grid data now that federal sources are shrinking (`docs/research/02`).

Two surfaces ship together from day one: the static website for humans and a local-only MCP server for developers who point their agents at a clone of the repository. Both are built with no third-party code.

This change decides what ships first, what "ready" means, how we measure use without tracking, and what we cut. It changes no behavior, so it carries no spec deltas (`skip_specs: true`).

## What Changes

- **Phase 0, foundation:** `establish-platform-foundation` (zero dependencies, data operations), `add-local-mcp-server` (agents from day one), and the shell of `add-site-experience` (navigation, stable URLs, translation-ready strings, trust page templates).
- **Phase 1, launch (two doors, one engine):**
  - `add-load-and-bill-analyzer`: read any interval file, explain the bill line by line, re-price it on other tariffs, show coincident-peak exposure, screen a battery and solar, and export a clean REopt-ready file.
  - `add-household-bill-check`: check a bill from its totals, compare use with the average home, and find the cheapest plan on your own use.
  - `add-public-grid-data`: versioned snapshots of EIA, EPA, and LBNL data, plus one page per utility, plant, and balancing authority.
  - `add-hourly-carbon`: hourly emissions and hourly matching from the same meter file, on public-domain EIA data.
  - `add-learn-and-data-guides`: the glossary, per-utility guides to downloading meter data, and eleven explainers.
  - `add-program-fact-pages` (link index only): the dated list of everything we deliberately link to instead of rebuilding.
  - The rest of `add-site-experience`: the two-door home page, catalog, discoverability, and trust page content.
- **Phase 2, only if phase 1 meets its bar:** `add-tariff-conformance-suite` first (the test vectors and accuracy scorecard that move the bill tools off our own word), then the rest of `add-data-continuity-ledger`, `add-weather-normalization` (was it the weather or me?), `add-large-load-screen`, `add-ratepayer-tools`, and `add-electrification-tools` (now including a backup-power sizer).
- **Phase 3, only if phase 2 meets the same bar:** `add-grid-calculators` (line rating, ambient-adjusted rating tables, power-factor correction, transformer sizing), `add-reliability-tools` (indices from a co-op's own outage log), `add-measured-plant-emissions` (and the published error in our own hourly estimate), `add-program-fact-pages` (net metering, community solar, qualifying-facility checklist), `add-interconnection-screens`, Spanish pages, and last `add-grid-scenario-model`, held to the end because it is the easiest to mistake for a planning study.
- **Trust and continuity throughout:** security disclosure, contribution rules, and the limits page in phase 0; archive deposits, published costs, a succession plan, and the snapshot diff log in phase 1.
- **The referee work, phases 2 and 3:** `add-tariff-conformance-suite` (published test vectors and the first reproducible accuracy scorecard for US tariff data), `add-data-continuity-ledger` (per-dataset status, diffs, and the publisher-asserted identities nobody has measured), and `add-grid-scenario-model` (the first free in-browser US grid scenario model, which shows its own error against what actually happened before it answers anything).
- **A definition of launch-ready**, **value measures without tracking**, **declared validation levels with a public limits page**, and **the same gate on every phase** (see design).

## Capabilities

### New Capabilities

None (planning change; `skip_specs: true`).

### Modified Capabilities

None.

## Non-goals

- Paid acquisition or growth tactics that need tracking.
- Monetization. gridprims is a free public utility.
- Competing with tools we link to.

## Impact

- Sets the order in which other changes are applied (`AGENTS.md` should point here once the repository exists).
