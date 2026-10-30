## Purpose

Gives planners, reporters, and local officials a dated, citable view of what is waiting to connect to the grid in their state or county, built from LBNL's open queue dataset, while live status stays with Interconnection.fyi.

## ADDED Requirements

### Requirement: Annual snapshot with required credit
The queue snapshot SHALL come from LBNL's Queued Up dataset (2026 edition, data as of end of 2025), licensed CC BY 4.0, and every page that uses it SHALL show the credit "Lawrence Berkeley National Laboratory and GridTracker" and the data as-of date. Data from Interconnection.fyi's site SHALL NOT be used.

#### Scenario: Credit present
- **WHEN** a visitor views a county's queue summary
- **THEN** the LBNL and GridTracker credit and "as of end of 2025" appear on the page

### Requirement: Posture decides what ships, automatically
The queue pages SHALL ship under whichever posture `platform/data-snapshots` derives from the recorded terms, with no confirmation step and no human sign-off. Under `derive`, the pages carry our own computed counts, capacity, and medians by place, type, and status, credit the publisher as required, and link the original file instead of republishing it. The pages SHALL NOT be withheld for want of a written answer from anyone.

#### Scenario: Terms not a recognized license
- **WHEN** the recorded terms do not match a recognized reusable license
- **THEN** the queue pages still build, showing only values we computed, with the credit, the link to the original, and the posture stated

#### Scenario: Terms are a recognized license
- **WHEN** the recorded terms match a recognized reusable license captured from the publisher's page
- **THEN** the posture is `mirror` and the file is offered for download with its required credit

### Requirement: Summaries by place, type, and status
The explorer SHALL summarize queued capacity (MW) and project counts by state, county, resource type (solar, wind, storage, gas, hybrid, other), status (active, withdrawn, operational), and queue-entry year, and SHALL show median time in queue and withdrawal rates where the data supports them.

#### Scenario: County view
- **WHEN** a user filters to one county
- **THEN** the page shows active MW by type, project count, and median years in queue, each with the data as-of date

### Requirement: Totals checked against LBNL
National and per-region totals of active capacity by type SHALL match the figures LBNL publishes in Queued Up's summary tabs for the same edition within 0.5%.

#### Scenario: National solar total
- **WHEN** CI sums active solar MW from project rows
- **THEN** it matches LBNL's published active solar total within 0.5%

### Requirement: Live-status handoff
Every project row and summary SHALL link to Interconnection.fyi for current status and SHALL state that our view is an annual snapshot.

#### Scenario: Stale status warning
- **WHEN** a visitor looks at a project row
- **THEN** a note says the status is as of the snapshot date and links to live status
