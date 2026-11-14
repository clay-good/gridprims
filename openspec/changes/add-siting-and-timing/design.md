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

## D4a. A negative published capacity is shown, not corrected

**Decision.** LBNL's file carries 16 rows whose `mw_1` is negative, so a county's type total can come out below zero (Travis County, TX reads -53 MW of solar today, on the queue page as well as in the new JSON). We do not change a publisher's number. The read-out reports what the file says and names the oddity rather than hiding it.

**Settled (task 2.4).** The figure stays inline, exactly as published, and a note beside the totals names how many of the requests carry a negative capacity and what they come to (`queue.negativeNote` on the queue pages, `siting.out.negative` in the read-out). Texas reads "4 of these requests a negative capacity, -105 MW in all"; Travis County's solar column still reads -53 MW and the county figures still add up to the state's.

**Alternatives considered.** Clamping at zero or dropping those rows would make the page look tidier and would silently disagree with LBNL's own totals, which is the failure this project exists to avoid. Splitting the negative out into its own column or row was rejected: it would add a column to a table that is already 11 wide for 16 rows in the whole country, and a reader comparing our county total with LBNL's would still have to add the two back together.

## D5. Median years is labelled history

**Decision.** The median is of years already waited by active requests as of the dataset's period end. It is presented with its cohort and its as-of date and never as an expected wait, which keeps it inside the standing refusal on forecasts.

## D6. The shell loses its tabs before the home page changes

**Decision.** The rail description, footer cards, and centred command bar ship first and independently, because they are template and CSS work with no data dependency, and because they are what makes the site legible even before the read-out lands. The read-out then replaces the home page body.

**Alternatives considered.** Shipping both at once would mean one large unreviewable commit and no working intermediate state.

## D7. Places enter the command index

**Decision.** The index gains entity entries (state, county, utility, balancing authority) so the one search bar can answer a place as well as a tool. The index is already fetched whole on first focus, so size matters: entity entries carry only id, title, url, and words, and counties are included only with their state name attached to keep the file within the performance budget.

**Measured (task 4.2).** They fit. The index holds 4,825 entries — 23 tools, 43 glossary terms, 51 states, 27 eGRID subregions, 67 balancing authorities, 1,474 utilities with pages, and 3,140 counties — at **57 KB compressed** (541 KB raw), well inside the 150 KB compressed budget that §8 of `docs/decisions-day-one.md` sets for page JavaScript. The repeated `", TX"` and `"County"` strings compress to almost nothing, which is why 330 KB of raw county text costs so little on the wire. `verify/gates/index-size.mjs` holds the budget, and the site test prints the measured figure as a `BUDGET` line.

ZIP codes stay out of the index: 33,000 entries would have been the one thing that did not fit, and the ZIP shards already resolve one on the device. The ranker recognizes five digits and sends them to `/lookup/?zip=`. A county entry lands on `/lookup/?state=&county=`, which names its serving utilities, its subregion, and its balancing authority.
