## Context

Licenses, release dates, and the ship/avoid table are in `docs/research/01` (verified 2026-10-27). Release status at writing: EIA-860 2025 final on 2026-09-10, EIA-861 2025 final on 2026-10-07, EIA-923 monthly on 2026-10-23; eGRID2023 (revised 2025-06-12) is the newest eGRID, and eGRID2024 is about nine months late. NREL is now the National Laboratory of the Rockies (NLR), and some of its URLs have moved.

## Goals / Non-Goals

**Goals:**
- Every page's facts in the HTML, sourced and dated.
- A pipeline that one person can refresh in an afternoon per release.

**Non-Goals:**
- Maps with basemaps, transmission lines, or precise coordinates in v1.

## Decisions

### D1. Sources and keys

| Dataset | Source path | Key | License |
|---|---|---|---|
| EIA-860, 860M, 861, 923 | EIA bulk files, cross-checked with PUDL tables | EIA utility id, plant code, generator id | Public domain (EIA asks for a dated credit) |
| FERC Form 714 annual peaks | PUDL release (v2026.10.0 covers 2006–2025) with its respondent-to-EIA crosswalk | EIA utility id | CC BY 4.0, credit Catalyst Cooperative |
| eGRID ZIP-to-subregion | EPA Power Profiler table published with each eGRID edition | ZIP, subregion | Public domain |
| EIA-930 | Hourly snapshot owned by `add-hourly-carbon` (EIA bulk files, no key), rolled up daily and monthly here | BA code | Public domain |
| eGRID | EPA download page | plant code, subregion | Public domain |
| URDB | OpenEI bulk gzip JSON | URDB label | CC0 |
| LBNL Queued Up | LBNL data file | LBNL project id | CC BY 4.0, credit LBNL and GridTracker |
| ZCTA-to-county | Census 2020 `tab20_zcta520_county20_natl.txt` (pipe-delimited, land-area overlap) | ZCTA, county FIPS | Public domain |

All fetching uses Node's built-in `fetch`, `zlib`, and our own `.xlsx` and CSV readers (foundation design D6); no publisher SDK or package. Outputs are CSV.gz downloads and binary column shards (foundation design D5).

Alternative: PUDL as the only source. Rejected for v1 because PUDL releases lag EIA by weeks to months; we use EIA directly and PUDL as a validator, citing both.

### D2. Location precision
Plant pages show county and state only. Alternative: plant coordinates on a self-hosted map. Rejected for v1: needs map tiles we would have to build and host, and adds CEII review effort for no answer a county does not give. EIA publishes plant coordinates, so this is not a legal requirement; it keeps v1 free of basemaps and third-party map tiles, avoids implying precision we do not render, and keeps the CEII review simple. Revisit for phase 2 siting tools.

### D3. Page generation and budgets
Our own static site generator (foundation design D3) renders entity pages from the normalized shards at build. Each page has at most one chart island; facts and tables are static HTML. Expected counts: about 3,000 utility pages (fewer after the content minimum), roughly 12,000–14,000 plant pages, about 66 balancing authority pages, 51 state pages, 27 eGRID subregion pages. Total stays under the 100,000-file paid-plan limit with room for growth.

Alternative for D3: client-side rendering of long-tail pages. Rejected: facts must work without JavaScript and be indexable.

### D4. Refresh cadence

| Dataset | Cadence | Notes |
|---|---|---|
| EIA-860M, 923 monthly | Monthly | Plant status and generation |
| EIA-860, 861 annual | Annual (early release, then final) | Both versions kept |
| EIA-930 rollups | Weekly | Daily and monthly rollups derived from the hourly snapshot in `add-hourly-carbon` |
| eGRID | When released | Currently overdue |
| URDB | Monthly | Rates change continuously |
| LBNL Queued Up | Annual | Next edition expected mid-2027 |

Alternative for D4: refresh only when a person notices. Rejected: the release watch in foundation spec `platform/data-operations` makes checks cheap.

### D5. Search and naming
Utility and plant names are kept as EIA spells them, with a cleaned display name and aliases (for example "AEP Ohio" for "Ohio Power Co") in the command-bar index. Aliases are curated by hand and cited where a source exists.

Alternative for D5: fuzzy matching only, no curated aliases. Rejected: "AEP Ohio" shares no words with "Ohio Power Co".

## Risks / Trade-offs

- **Thin pages hurt search ranking.** Mitigation: content minimums in each spec; state pages absorb thin records.
- **ID mismatches across sources** (EIA vs eGRID vs LBNL). Mitigation: join on EIA ids where present, report unmatched rows in the library changelog, never guess a match.
- **Federal delays.** Mitigation: staleness notes and "waiting on publisher" status.
- **Queue data ages fast.** Mitigation: annual-snapshot labels and live-status handoff on every row.
