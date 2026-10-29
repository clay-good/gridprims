## Context

Research: `docs/research/01` (data and licensing), `02` (competitors and gaps), `03` (methods and audience sizes), `04` (MCP and zero-dependency stack), `05` (novel capabilities), `06` (rule status, 2026-10-29), `07` (methods and formats), `08` (licenses), `09` (households and data access). The realistic audience is specialist and in the low tens of thousands per month for the pro tools; scale beyond that comes from plain-language public data pages (estimate, 2026-10-27). The launch must be small, excellent, and easy to find, on both surfaces: the website for humans and the local MCP server for developers' agents.

## Goals / Non-Goals

**Goals:**
- Ship the phase 1 changes in D1, which no free tool covers, done well, on both surfaces.
- Decide in advance what evidence earns phase 2.

**Non-Goals:**
- Breadth at launch. Every phase 2 change is fully specified now so it is ready, but none ships until phase 1 meets the bar.

## Decisions

### D1. Phases

| Phase | Changes | Exit criteria |
|---|---|---|
| 0 | `establish-platform-foundation`, `add-local-mcp-server`, `add-site-experience` (shell, URLs, strings, trust page templates) | Foundation, MCP, and shell tasks verified; egress and no-network tests green; a fresh clone runs everything with only Node.js |
| 1 | `add-load-and-bill-analyzer`, `add-household-bill-check`, `add-public-grid-data`, `add-hourly-carbon`, `add-learn-and-data-guides`, rest of `add-site-experience` | Every hero tool launch-ready (D2) on web and MCP; both home-page doors working; public launch |
| 2 | `add-grid-calculators`, `add-large-load-screen`, `add-ratepayer-tools`, `add-electrification-tools` | Phase 1 meets the bar in D3 within 6 months of launch; order within phase 2 follows D3's evidence (search demand and requests) |

Alternative: one big launch with every change. Rejected: spreads verification and review thin, and launches tools nobody has asked for.

Phase 0 also builds the energy unit converter as the reference tool (foundation design D10).

Apply order inside phase 1, so every dataset has one owner and is built before it is used: `add-public-grid-data` tasks 1.0, 1.1, 1.3, and 1.4 (owns EIA-860, 860M, 861, 923, eGRID and its ZIP table, URDB, LBNL, Form 714, ZCTA), then `add-hourly-carbon` task 1 (owns EIA-930 hourly), then `add-public-grid-data` task 1.2 (rollups of the hourly snapshot) and the rest of that change, then `add-load-and-bill-analyzer` (owns ERCOT 4CP; uses URDB), then `add-household-bill-check` (owns typical residential shapes and Texas TDU tariffs; uses the bill engine), then the remaining carbon tasks, then `add-learn-and-data-guides` (its fixture check needs the intake fixture library) and the home and catalog tasks of `add-site-experience`.

Why these for launch: one dropped file powers the professional tools (bill, coincident peak, battery, hourly emissions); the household door works from bill totals because most households cannot easily get a meter file (8 of the 25 largest utilities have a verified download, `docs/research/09`); the public data pages and Learn guides are the broad doors. Hourly carbon is in launch because it is the most novel item found (`docs/research/05`, rank 1), uses only public-domain data, and reuses the load engine.

### D2. Launch-ready, per hero tool
- Stable manifest; every output has a unit, rounding, and citation.
- At least one worked example from an independent source passes, with third-party reference outputs stored as fixtures.
- Real-shaped fixtures pass: at least 20 utility export shapes, including Green Button XML, Smart Meter Texas CSV, DST, gaps, multiple meters, and every shape a launch get-your-data guide names.
- Identical structured results on the website and the local MCP server.
- Reviewed by one practitioner in the target audience, or the page says review is pending.
- DESIGN.md gates: both themes, 320 px sweep, keyboard pass, print, and performance budget; household pages are checked on a 360 px phone first.
- Sentinel egress test (web) and sandboxed no-network test (MCP) pass.

Alternative: launch when tests pass, review later. Rejected: practitioner trust is the product; an unreviewed tool says so on its page instead.

### D3. Value proof without tracking
Measured monthly and logged in `docs/value-log.md`:
- Search-console impressions and clicks (aggregate), by page type.
- Aggregate request counts for tool pages and dataset downloads from Cloudflare logs.
- GitHub clones, stars, and issues mentioning the MCP server; agent-evaluation pass rate per release.
- Problem reports and median time to fix.
- Citations: links from utility commission filings, news stories, course pages, and GitHub.
- Practitioner endorsements (named, with permission).

Alternative: client-side analytics. Rejected by `platform/privacy-and-security`.

A "visit" here is one HTML request for a tool page in Cloudflare's aggregate logs, excluding known crawlers, counted per month; no client script and no identifier is involved. The bar to start phase 2: 5,000 monthly visits to tool pages, or 25 independent citations or endorsements, within 6 months of launch. If neither is met, we improve the heroes instead of adding breadth.

Also measured, to steer phase 2 order: requests to household pages versus professional pages, get-your-data guide views by utility (where to verify next), and problem reports per guide.

### D4. Cut, defer, and link list

| Idea | Decision | Reason |
|---|---|---|
| Live interconnection queue tracker | Link to Interconnection.fyi | Free, daily; its terms forbid reuse |
| Market prices and LMP dashboards | Link to GridStatus and EIA Grid Monitor | Real-time feeds need servers; most ISO terms forbid redistribution |
| Full solar and storage optimization | Hand off to REopt with an exported clean file | Optimization is their strength |
| Building wiring and NEC math | Link to roughlogic.com | Sibling site already covers it |
| Backup-power sizer from county outage history | Phase 2, in `add-electrification-tools` | EAGLE-I v4 confirmed CC BY 4.0 (`docs/research/08`) |
| National hosting-capacity map index | Defer, links only when built | No national index; maps exist in a minority of states |
| Transmission line maps | Defer | HIFLD Next labels the layer "license: other", and about a third of sampled features cite OpenStreetMap, so share-alike may apply (`docs/research/08`) |
| SPP data | Link only | SPP terms require written permission for commercial publications and do not define the term (`docs/research/08`) |
| DSIRE incentives and net-metering data | Link only in v1 | CC BY-SA 4.0 would force share-alike on any table that uses it; EIA-861 net-metering data covers the main facts |
| Spanish pages | Phase 2, revisited at the phase 1 review | Owner chose translation-ready at launch (2026-10-29); research recommends Spanish at launch (D5) |
| PURPA Form 556 helper, community solar and net metering fact pages | Defer | Lower impact (`docs/research/05`, rank 12) |
| Grid model file linting (PSS/E, OpenDSS) | Defer | Small audience; CEII-adjacent files |
| PDF bill reading | Defer | Hard to do well on the device; interval data covers the main job |
| Hosted MCP endpoint, npm package, one-click bundles | Cut for now | Local clone is the distribution; no server compute |

### D5. Two doors, one engine
Households get their own front door at launch (owner decision, 2026-10-29): bill check from totals, usage benchmark, and plan finder, all on the professional bill engine. Alternative: professionals first. Rejected: households are the largest audience (about 143M residential customers) and bill anxiety is at a record (`docs/research/09`).

Spanish is held to phase 2 by the owner's choice, with every string translation-ready (`add-site-experience` design D6). The research case for launching in Spanish (16% of adults are smartphone-only, rising to 28% of Hispanic adults; 2.7% of households are Spanish-speaking with limited English; Texas requires Spanish customer materials) is re-weighed at the phase 1 review using the value log.

### D6. Visual direction
DESIGN.md commits to the public road-sign direction (owner choice, 2026-10-29): light by default, guide-green answer signs, and the federal sign color code for every caveat. It replaced a dark control-room concept that matched a common generated-UI look and printed poorly.

## Risks / Trade-offs

- **Audience is narrow.** Mitigation: public data pages and hourly carbon are broad doors; the MCP server reaches developers directly.
- **Zero dependencies cost build time.** Mitigation: own implementations are scoped narrowly and land in phase 0 before any tool work.
- **Practitioner review is slow to get.** Mitigation: launch with "review pending" labels rather than wait.
- **Get-your-data guides go stale.** Mitigation: verification levels and dates on every guide, 12-month re-checks, and problem reports per guide.
- **Rules change mid-build** (Texas 12CP proposal, PJM winter changes, FERC large-load). Mitigation: versioned program and tariff-term definitions; re-check `docs/research/06` items at each phase gate.
