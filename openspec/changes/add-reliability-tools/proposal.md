## Why

**Value up front:** a co-op or municipal utility engineer drops their outage log and gets the reliability indices their regulator and their federal form ask for, with the major-event-day threshold computed the standard way, every excluded day shown, and a sheet mapped to the lines of the federal form they have to file. A resident or reporter gets their utility's published reliability put in honest context: how it compares with utilities of the same ownership type and size, as a percentile, not as a ratio against a national average that means nothing for a rural co-op.

Why this is a real gap (`docs/research/11`):
- **Co-ops and municipal utilities are the underserved audience** named in our competitor research, and 465 co-ops and 279 municipal utilities report reliability to the federal government each year. Doing it by spreadsheet is an annual chore; the only benchmarking service for public power is subscription-only.
- **The standard that defines the indices costs money, but the formulas do not.** The federal form's own instructions give the sustained-interruption indices verbatim in the public domain, and a free published utility-engineering deck gives the rest, including every step of the major-event-day threshold. We can implement and cite all of it without buying anything.
- **The published numbers are routinely compared wrongly.** Median annual outage duration runs about 58 minutes for municipal utilities, 205 for investor-owned, and 232 for co-ops, against a national average of 263 — so ownership type is the dominant confounder, and comparing a figure that includes major events with one that excludes them is meaningless.

We link rather than rebuild: the subscription benchmarking service for public power, each state commission's own reporting rules, and the federal disturbance-event reports.

## What Changes

- **Index calculator:** drop an outage log and get the sustained-interruption indices (customers interrupted per customer served, minutes per customer served, minutes per customer interrupted, service availability, and the momentary index where momentaries are logged), with every assumption on a receipt, plus a sheet laid out as the federal form's reliability lines with the instruction text beside each.
- **Major event days:** the standard threshold computed from the daily duration index over five years, showing excluded days, the fitted parameters, the threshold, every day it flags, and a warning when the data is not distributed the way the method assumes, which is the common case for a small utility.
- **Peer comparison:** a utility's published reliability as a percentile within a cohort of the same ownership type, size class, and region, with the reporting method and coverage shown, so nobody compares across methods by accident.

## Capabilities

### New Capabilities

- `reliability/index-calculator`: Reliability indices from a utility's own outage log, and the federal form sheet.
- `reliability/major-event-days`: The major-event-day threshold, its inputs, its flags, and its limits.
- `reliability/peer-comparison`: Published reliability in an honest cohort, as a percentile.

### Modified Capabilities

- `data/utility-pages`: already shows published reliability and gains a link to the peer comparison this change adds, rendered by that capability.

The owning change is applied first; the requirements here describe only what this change supplies.

## Non-goals

- Reproducing the paywalled standard's text, tables, or annex examples.
- Any feeder-level, device-level, or per-customer output that would expose protected infrastructure detail or identify a customer.
- Predicting outages, scoring a utility, ranking utilities in a league table, or recommending investment.
- Filing anything with a regulator or agency on anyone's behalf.
- Momentary-event-count indices that need per-customer interruption records our users' exports do not carry; they are shown as unavailable with the reason.

## Impact

- Phase 3, per `plan-launch-and-value-proof`.
- Uses the EIA-861 reliability file already owned by `add-public-grid-data`; adds no new dataset beyond the cohort tables derived from it, which this change owns.
- The outage log is a user file and goes through the existing intake, which means it never leaves the device.
