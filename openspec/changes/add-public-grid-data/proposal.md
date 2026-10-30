## Why

**Value up front:** one plain-language, cited page for every US electric utility, power plant, and balancing authority, built from public federal data, plus a library where anyone can download the exact dated files behind every page. "Who is my utility, what does it charge, how reliable is it, what does my region's grid run on, and what is waiting to connect near me?" in one place, without an account, a Python install, or knowing which agency form holds the answer.

Why now and why us (`docs/research/01`, `02`):
- Public grid data is fragile. HIFLD Open went offline in September 2025. EIA lost about 30% of its staff (353 to 246, per `docs/research/01`), and eGRID2024 is about nine months late. A versioned, checksummed copy with provenance is a public good in itself.
- The data is free but scattered across EIA forms 860, 861, 923, and 930, EPA eGRID, LBNL's queue file, and OpenEI's rate database, each with its own ids and formats. PUDL cleans much of it for analysts; nobody turns it into pages a city staffer, reporter, or ratepayer can read.
- Every core source's redistribution posture is derived from the publisher's own captured terms, never assumed: EIA's works are federal public domain, URDB is CC0, PUDL and LBNL Queued Up are CC BY 4.0, and EPA's terms are captured verbatim because EPA's own disclaimer limits use rather than dedicating the content (`emissions/measured-plant-emissions`).

These pages are also the broad door to the site: they answer common searches and lead specialists to the load and bill tools.

## What Changes

- **Utility pages** (about 3,000): ownership type, customers and sales by sector, average price by sector, reliability (SAIDI/SAIFI) where reported, service-area counties, owned generation by fuel, and its rates in URDB.
- **Plant pages** (roughly 12,000–14,000 plants with their generators): capacity, fuel, technology, operating and planned retirement dates, annual generation, and emissions where eGRID covers the plant.
- **Region pages** for balancing authorities, states, and eGRID subregions: demand and generation by fuel (daily and monthly rollups of EIA-930), emission rates, and the plants and utilities inside.
- **Utility lookup** by ZIP code or county.
- **Interconnection queue snapshot** from LBNL Queued Up 2026: projects by state, county, type, and status, with a link to Interconnection.fyi for live status.
- **Data library**: every dataset version, its license, checksums, row-level changelog, and gzip-compressed CSV downloads.

## Capabilities

### New Capabilities

- `data/utility-pages`: One cited page per utility.
- `data/plant-pages`: One cited page per power plant.
- `data/region-pages`: Pages for balancing authorities, states, and eGRID subregions.
- `data/utility-lookup`: ZIP or county to serving utilities, privately.
- `data/queue-snapshot`: A dated, citable view of the national interconnection queue.
- `data/data-library`: The public catalog of dataset versions and downloads.

### Modified Capabilities

None.

## Non-goals

- Live queue status, market prices, or LMPs (link to Interconnection.fyi, GridStatus, EIA Grid Monitor).
- Data from PJM, MISO, NYISO, ISO-NE, SPP, or Interconnection.fyi, whose terms reserve rights or forbid redistribution.
- Substation locations, one-line diagrams, planning models, or anything CEII-like.
- Transmission line maps in v1 (the archived HIFLD layer's license is unconfirmed; revisit in phase 2).
- Hourly EIA-930 data here; `add-hourly-carbon` registers and ships it, and region pages link to it.

## Impact

- Phase 1 (launch), per `plan-launch-and-value-proof`.
- Adds roughly 15,000–20,000 prerendered pages, which requires the paid Workers plan (foundation design D4).
- Adds datasets to the registry: EIA-860, EIA-860M, EIA-861 (its sales, customers, revenue, reliability, and service-territory files; the net metering and distributed generation files belong to `add-program-fact-pages`), EIA-923, EIA-930 rollups, EPA eGRID and its ZIP-to-subregion table, LBNL Queued Up, URDB, FERC Form 714 annual peaks via PUDL (used by utility pages, the Learn data-center explainer, and phase 2 large-load tools), and the Census ZCTA-to-county relationship file for lookup; PUDL is also a cross-check.
