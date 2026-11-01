## Why

**Value up front:** someone deciding where to put a data center, a factory, a solar farm, or a fleet depot types a place and a size and gets, in one screen, who would serve it, how that size compares with that utility's own peak and annual sales, what is already queued in that county, how long those projects have taken, how many gave up, and which federal interconnection process applies. Every figure is cited and dated, and the page says plainly where the public record stops.

The inputs are already public and already in this repository: LBNL's Queued Up (38,201 requests, through 2025), FERC Form 714 annual peaks, EIA-861 territories and sales, and the federal Small Generator Interconnection Procedures. They sit in separate files that each take a day to join, so almost nobody joins them. Interconnection.fyi shows live queue status and GridStatus shows markets, but neither answers "is my 300 MW large here, and how long has this county been taking?" That join is the gap.

The price tools we have lower a bill. This answers whether a project happens at all, which is the question in front of the US grid in 2026: load growth, interconnection backlogs, and siting fights. It is also evergreen public-utility work, because the answer changes only when the publishers republish.

We deliberately do not rebuild live queue status (Interconnection.fyi), market data (GridStatus), or full DER optimization (REopt).

## What Changes

- **A siting read-out on the home page.** One input pair, a place (ZIP or county) and a size (MW, load or generation), returns a cited answer assembled from data already built. The home page carries this and nothing else above the search bar.
- **Queue data as fetchable JSON.** `site/entities/queue.mjs` already computes per-county active MW, project count, mix by type, median years in queue, and the withdrawal share of the historic cohort. Today those numbers only reach HTML. This change emits them per state so the browser can read one county's summary without downloading the nation.
- **A reframed shell.** The rail carries the wordmark and one line saying what the site answers, with the theme toggle pinned right. The command bar moves to the centre of the home page under the read-out. The footer becomes four cards: All tools, GitHub, Privacy and about, and the maintainer's credit.
- **Places in the command index.** States, counties, utilities, and balancing authorities join the index so the search bar can answer "queue in Travis County" or a bare ZIP, not only tool names.
- **An honest resolution statement.** Feeder and substation headroom is CEII. The read-out says so, at the point of the answer, and links to the serving utility's own hosting-capacity map where one exists rather than implying we know the feeder.

## Capabilities

### New Capabilities

- `siting/where-and-how-long`: The siting read-out: what a place and a size return, from which sources, with which refusals.
- `siting/home-and-shell`: The home page as that read-out, the centred command bar, the rail description, and the footer cards.

### Modified Capabilities

- `site/home-and-navigation`: The home page is no longer the meter-file workbench; it is the siting read-out, and the workbench moves behind the search bar and the tool catalog.

## Non-goals

- **No feeder or substation headroom.** It is CEII. We answer at utility, balancing-authority, and county level and never at a parcel.
- **No pass-or-fail interconnection verdict.** The federal screens have answers only a utility holds; we say which screens apply and which we cannot settle.
- **No live queue status.** Our figures carry the publisher's as-of date; Interconnection.fyi is linked for what changed this week.
- **No forecast.** Median time in queue is what the historic cohort took, not a prediction for a new request.
- **No hosting-capacity values**, only a link to the utility's own map, until the link-only directory in `add-interconnection-screens` ships.
