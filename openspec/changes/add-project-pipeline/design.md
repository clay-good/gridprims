# Design

## D1. EIA-860M is the only source

**Decision.** Build from the `generators` table of `eia-860m`, already refreshed monthly. It is a U.S. government work, it reports a status for each generator, and its normalizer already drops EIA's latitude, longitude, and map links.

**Alternatives considered.**
- *Annual EIA-860.* It has the same stages but can be more than a year old.
- *Company announcements or news.* They are not comparable, are hard to cite consistently, and may carry license limits.
- *ISO and RTO queue files.* Most reserve redistribution rights (`docs/research/01`), and a queue request is not a commitment to build.

## D2. Five stages, using EIA's own status codes

**Decision.** P is Planned, L is Waiting for approval, T is Approved, and U, V, and TS are Being built. Each row keeps EIA's status wording, so "construction complete, not yet in commercial operation" stays visible inside Being built.

**Alternatives considered.** Showing all six codes is more exact, but harder to scan. A separate sixth stage for TS would hold only 157 generators.

## D3. Finished means online in the last 24 months

**Decision.** Finished holds generators in EIA's operating sheet whose first operating month falls in the 24 months ending at the inventory month. The window moves with each release.

**Alternatives considered.** Listing every operating generator would bury active work under 28,484 rows, and plant pages already cover the operating fleet. A calendar-year window would look nearly empty each January.

## D4. A row is one plant in one stage

**Decision.** Generators are combined by plant and stage. A plant with units in two stages gets two rows, which applies to 23 plants in progress. Capacity is the sum of nameplate MW.

**Alternatives considered.** One row per generator gives 2,358 in-progress rows and splits a single project into many lines. One row per plant would hide units at different stages.

**Known limit.** Solar and battery units at one site are both counted at nameplate (188 plants in progress). Their combined output may be capped lower, so the page says capacity is nameplate.

## D5. Show the queue beside the pipeline, never inside it

**Decision.** Each state page gives its active queue total as one separate, credited line with a link to `/queue/<st>/`. No total adds the two sources.

**Alternatives considered.** Matching queue requests to EIA plants by name and county would wrongly attribute some projects, and D2 of `add-siting-and-timing` rejected the same kind of join.

## D6. Static pages, with filtering added on top

**Decision.** Follow the `/queue/` pattern: server-rendered tables, one JSON file per state, and a small script that filters rows already on the page. Stage logic lives in `core/lib/project-stages.mjs`, so any later surface uses the same rules.

**Alternatives considered.** One national file would make every visitor download about 100 KB compressed. The largest state file measures about 16 KB compressed even at generator level.

## D7. County only, enforced by the build

**Decision.** Published project files carry no coordinates, connection points, substations, or lines. `verify/gates/ceii.mjs` scans `dist/projects/*.json` as well as the queue files, and also rejects coordinate field names. Plant names, owners, counties, capacity, and dates are published by EIA and are general information, not engineering detail (18 CFR 388.113(c)(2)(iv), `docs/research/01`).

**Alternatives considered.** A pin map is the obvious dashboard, but it would add precise locations that the site has chosen never to publish.

## D8. Odd records stay visible

**Decision.** We do not edit EIA's values. A blank or unmatched county goes under "County not confirmed" with EIA's text kept on the row. Four in-progress generators fall here today, including the 2,640 MW Coastal Virginia Offshore Wind project. Canceled or postponed generators (1,745 units, 185,357 MW) appear only as a separate count because EIA gives them no date or status.

## Scope note

`add-large-load-screen` lists project-level siting data as a non-goal for that screen. It does not limit this page, which republishes EIA's inventory and does not screen a site.

## Open questions

Both are settled by tasks 1.4 and 3.5, and the safer wording ships if neither can be confirmed.

1. **Coverage wording.** The inventory holds 49 planned generators under 1 MW, so the page cannot simply say "1 MW and larger." Confirm the threshold in EIA's form instructions. Until then, say "as reported to EIA."
2. **Independent check.** Compare stage totals with a planned-additions table EIA publishes, if its definitions line up. If they do not, the independent Python recount from EIA's own file is the reference.
