## Purpose

Shows what is planned, waiting for approval, approved, being built, and recently finished, by place, in plain language and with the limits of the public record stated beside the answer.

## ADDED Requirements

### Requirement: The national page answers first
`/projects/` SHALL open with one sentence stating the capacity in progress, in whole MW, and its inventory month. It SHALL then show generator count, plant count, and nameplate MW for each of the five stages, followed by capacity by stage for each state and each balancing authority.

#### Scenario: A reporter opens the national page
- **WHEN** the page is built from release 2026-10
- **THEN** the first sentence reports 290,242 MW in progress as of September 2026, and Finished is shown apart from that figure

### Requirement: Each state page lists its projects
`/projects/<st>/` SHALL show the state's stage totals, county totals, and project rows sorted by nameplate MW, largest first. Each row SHALL show plant name, reporting entity, county, balancing authority, stage, technologies, nameplate MW, and reported date. A plant name SHALL link to its plant page only where that page exists.

#### Scenario: A plant that has no page yet
- **WHEN** a proposed plant has no operating generator and so no plant page
- **THEN** its name appears as plain text and no broken link is produced

### Requirement: Filters narrow the list without leaving the device
A state page SHALL let a visitor filter rows by stage, technology, county, balancing authority, and minimum size. Filtering SHALL run on rows already loaded, SHALL send no filter choice over the network, and SHALL update a visible count of matching projects and MW. With JavaScript off, the full list SHALL remain readable.

#### Scenario: Solar being built in one county
- **WHEN** a visitor chooses Being built, Solar Photovoltaic, and one county
- **THEN** only matching rows remain, the count and MW update, and a screen reader is told the new count

#### Scenario: No project matches
- **WHEN** the filters match no row
- **THEN** the page says no reported project matches and offers one control to clear the filters

### Requirement: The limits are stated beside the answer
Every project page SHALL say that the list holds generators reported to EIA, that it omits transmission lines, pipelines, data centers, and projects not yet reported, that location stops at the county, that capacity is nameplate, that a reported date is not a forecast, and that owners update EIA monthly only in the last 12 months before a generator starts. The page SHALL NOT show a likelihood of completion or an estimated finish date.

#### Scenario: A visitor looks for a transmission project
- **WHEN** a visitor reads any project page
- **THEN** a plain sentence near the totals says transmission lines are not included

### Requirement: Queue requests stay separate
Where a state has a queue page, its project page SHALL show the state's active LBNL queue requests and MW as one separate line, with LBNL's credit, its as-of date, and a link to `/queue/<st>/`. No project total SHALL include queue requests, and the page SHALL say a queue request is not a commitment to build.

#### Scenario: Texas has both sources
- **WHEN** a visitor opens `/projects/tx/`
- **THEN** EIA stage totals and the LBNL queue line have separate sources and dates, and no figure combines them

### Requirement: Pages are reachable and meet the site's gates
The Grid section SHALL link to `/projects/`, and a state's queue and project pages SHALL link to each other where both exist. The home page SHALL NOT change. Project pages SHALL pass the `DESIGN.md` gates: both themes, a 320 px width without sideways scroll, full keyboard use, print, WCAG 2.2 AA, and the performance budget.

#### Scenario: The largest state on a phone
- **WHEN** `/projects/tx/` opens 320 px wide
- **THEN** the page does not scroll sideways and every row's values can be read
