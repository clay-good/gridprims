## Why

**Value up front:** anyone can pick a state and see which power plants are planned, waiting for approval, approved, being built, or recently finished, with each project's size, county, owner, technology, and reported date.

The queue pages show who has asked to connect, and many of those requests are never built: 24,221 of LBNL's 38,201 requests were withdrawn. Siting teams, reporters, and commission staff also need to know what owners have reported to the federal government about their projects. EIA publishes that every month, but as a national workbook of 39,908 generators with status codes. The data is already in this repository and refreshes monthly, yet the site has no view of it by stage, and plant pages leave out plants that are only proposed.

| Stage | EIA status | Generators | Plants | Capacity |
|---|---|---:|---:|---:|
| Planned | P | 695 | 320 | 100,557 MW |
| Waiting for approval | L | 406 | 269 | 64,727 MW |
| Approved | T | 228 | 189 | 27,036 MW |
| Being built | U, V, TS | 1,029 | 849 | 97,922 MW |
| Finished, last 24 months | Online Oct 2024 to Sep 2026 | 2,176 | 1,831 | 118,972 MW |

*EIA-860M, September 2026 inventory (release 2026-10).*

We hand off live queue status to Interconnection.fyi, as the queue pages already do. What we add is EIA's inventory, read by stage and by place.

## What Changes

- **A national page at `/projects/`.** Totals by stage, then capacity by stage for each state and balancing authority.
- **A page per state at `/projects/<st>/`.** Stage totals, county totals, and a list of projects, largest first, that can be filtered by stage, technology, county, balancing authority, and size. The full list is readable with JavaScript off.
- **Open JSON at `/projects/<st>.json`.** The same rows the state page shows.
- **A wider CEII gate.** The build fails if any project file carries a coordinate or a grid connection field.
- **A way in from the Grid section.** A page cell beside the queue, and links between each state's queue and project pages. The home page does not change.

## Capabilities

### New Capabilities

- `projects/stages`: How EIA's records become stages and project rows, and how those rows are checked and published.
- `projects/pipeline-pages`: What the national and state pages show, and the limits they state.

### Modified Capabilities

None.

## Non-goals

- **No map or coordinates.** Location stops at the county.
- **No transmission lines, pipelines, or data centers.** EIA-860M covers generators only, and the page says so.
- **No unfiled or rumored projects**, and no press or company announcements.
- **No odds that a project will finish**, and no forecast of its date. Dates are what owners reported.
- **No merging with the LBNL queue.** The two sources share no project ID, so they stay separate.
- **No ranking of sites by how critical they are to the grid.**
- **No month-to-month change tracking and no new MCP tool** in this change.
