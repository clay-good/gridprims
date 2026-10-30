## Purpose

Makes the "link, don't rebuild" promise auditable: one dated index of every tool, map, and dataset we deliberately send people to instead of copying.

## ADDED Requirements

### Requirement: Index entries carry their facts
Each entry SHALL record: name, who maintains it, what it covers, what it costs (free, free with an account, or paid), why we link rather than rebuild, the URL, and the date we last checked it. Entries SHALL be grouped by the question they answer.

#### Scenario: Hosting capacity entry
- **WHEN** a visitor looks for hosting capacity maps
- **THEN** the index names the federal atlas, who maintains it, its last-updated date, that we found it unmaintained with entries that may not resolve, and links our own dated per-utility directory

### Requirement: Launch coverage
At launch the index SHALL include, at minimum: the full storage and solar optimization tool we hand off to, the live interconnection queue site, the market-data service, the federal hourly grid monitor, the cleaned federal data project, the rate database, the federal hosting-capacity atlas, the policy rules database, the alternative-fuel price report, per-state commission tariff and docket search, and the sibling trades-calculation site.

#### Scenario: Index completeness
- **WHEN** CI checks the index against the handoff links in every tool manifest
- **THEN** every handoff target appears in the index, or the build fails naming the missing entry

### Requirement: Links are checked
A weekly job SHALL check every link in the index and report broken or redirected links with the pages that use them, and an entry unchecked for 12 months SHALL show a "needs review" chip.

#### Scenario: Moved target
- **WHEN** a linked tool moves to a new host
- **THEN** the weekly report names the entry, its new target, and every page that links it

### Requirement: No endorsement, no affiliate links
Entries SHALL describe what a thing does and what it costs, SHALL NOT rank or recommend between paid products, and SHALL carry no referral, affiliate, or tracking parameters.

#### Scenario: Clean URL
- **WHEN** a visitor follows an index link
- **THEN** the URL carries no referral or tracking parameter
