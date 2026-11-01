# Design

## D1. The read-out is assembled from data already built, not a new pipeline

**Decision.** The siting answer joins four things the repository already produces: the ZIP lookup shards (`/lookup/<ST>.json`), the large-load prefill (`/large-load/utilities.json`, carrying each utility's FERC Form 714 peak and EIA-861 sales), a new per-state queue JSON emitted from the summaries `site/entities/queue.mjs` already computes, and the rule-based SGIP ladder in `interconnect.process.route`. No new dataset, no new publisher, no new licence question.

**Alternatives considered.**
- *Wait for hosting-capacity data.* It is the figure people actually want, but only California makes it a screen, four utilities publish per-feeder minimum load, and the rest is a patchwork (`docs/research/12`). Waiting would mean shipping nothing; the county-level answer is useful now and does not block the directory later.
- *Scrape utility queue portals.* Live status is Interconnection.fyi's job and the terms are inconsistent. We link.
- *Model headroom from peak and sales.* A utility's system peak says nothing reliable about a given feeder. Inventing that number is the one thing this product must not do.

## D2. County is the finest honest resolution

**Decision.** Queue figures are reported per county because that is the finest granularity LBNL publishes with a FIPS code, and because `poi_name` (the substation) is deliberately dropped at normalization as a CEII screen. The read-out states this limit beside the answer.

**Alternatives considered.** Per-utility aggregation of the queue is tempting since rows carry a `utility` field, but LBNL's utility strings are free text and do not join cleanly to EIA ids; a wrong join would silently attribute projects to the wrong company. County plus FIPS is exact.

## D3. Two numbers, not one verdict

**Decision.** The size the visitor types is reported two ways: against the serving utility's annual peak (a capacity sense) and against its annual retail sales once converted at an assumed load factor (an energy sense). Both are already implemented in `grid.large-load.context`; the read-out reuses that tool rather than recomputing. No combined score and no pass-or-fail.

**Alternatives considered.** A single "feasibility score" would be the most shareable output and the least defensible; the public data cannot support it, and the limits page already refuses pass-or-fail interconnection verdicts.

## D4. The withdrawal share needs a cohort, or it is omitted

**Decision.** `summarize()` already computes the withdrawal share only for the cohort that entered on or before 2020 and only when at least 20 requests exist. The read-out keeps both guards and, where a county fails them, says so and offers the state figure rather than showing a share computed from three projects.

## D5. Median years is labelled history

**Decision.** The median is of years already waited by active requests as of the dataset's period end. It is presented with its cohort and its as-of date and never as an expected wait, which keeps it inside the standing refusal on forecasts.

## D6. The shell loses its tabs before the home page changes

**Decision.** The rail description, footer cards, and centred command bar ship first and independently, because they are template and CSS work with no data dependency, and because they are what makes the site legible even before the read-out lands. The read-out then replaces the home page body.

**Alternatives considered.** Shipping both at once would mean one large unreviewable commit and no working intermediate state.

## D7. Places enter the command index

**Decision.** The index gains entity entries (state, county, utility, balancing authority) so the one search bar can answer a place as well as a tool. The index is already fetched whole on first focus, so size matters: entity entries carry only id, title, url, and words, and counties are included only with their state name attached to keep the file within the performance budget.

**Open.** Whether 3,000-plus county entries fit the budget is measured, not assumed; if they do not, counties are matched through the existing ZIP shard instead and only states, utilities, and balancing authorities join the index.
