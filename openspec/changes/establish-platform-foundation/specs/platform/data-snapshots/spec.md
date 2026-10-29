## Purpose

Keeps a dated, licensed, checksummed copy of every public dataset gridprims uses, shows its provenance wherever it appears, lets anyone download it, and keeps restricted infrastructure information out.

## ADDED Requirements

### Requirement: Dataset registry
Every dataset shipped SHALL have a registry entry with: id, title, publisher, source URL, license or terms with a link, redistribution basis (public domain, named license, or written permission), required attribution text, data period, publisher's as-of date, retrieved date, SHA-256 of each file, row counts, refresh cadence, and next expected release. A dataset without a redistribution basis SHALL NOT ship.

#### Scenario: Missing license blocks the build
- **WHEN** a dataset is added without a redistribution basis
- **THEN** the build fails and names the dataset

### Requirement: Source stamp wherever data appears
Every number derived from a dataset SHALL be shown with a source stamp naming publisher, dataset, data period, as-of date, and retrieved date. Required attribution text SHALL appear on every page that uses the dataset.

#### Scenario: Utility page stamp
- **WHEN** a visitor reads a utility's average residential rate
- **THEN** the stamp beside it names EIA-861, the data year, the EIA release date, and our retrieval date

### Requirement: Staleness is visible
Each registry entry SHALL declare its expected refresh cadence. A dataset's age is today minus the publisher's as-of date of the version we serve; when the age exceeds the cadence plus 60 days, every page that uses it SHALL show a "may be out of date" note with the date we last checked for an update.

#### Scenario: Stale date computed
- **WHEN** an annual dataset's served version has an as-of date of 2025-10-07
- **THEN** pages show the staleness note from 2026-12-06 (365 + 60 days later)

#### Scenario: Delayed federal release
- **WHEN** the publisher's next annual release is 90 days late
- **THEN** pages show the staleness note and the registry page lists the dataset as "waiting on publisher"

### Requirement: Version cadence and file budget
Datasets MAY refresh their current shards as often as weekly, but permanent versions SHALL be cut at most monthly. The deployable file count SHALL stay at or below 80,000, checked in CI.

#### Scenario: Two versions in one month
- **WHEN** a second permanent version of the same dataset is cut in the same calendar month
- **THEN** CI fails and names the dataset and both versions

#### Scenario: Budget exceeded
- **WHEN** a build would deploy 80,001 files
- **THEN** CI fails and lists the largest contributors by dataset

### Requirement: Snapshots are immutable and downloadable
Each dataset version SHALL be stored at a permanent, versioned URL and never edited in place. The data page SHALL offer every version for download as gzip-compressed CSV (split by year or state when large) with its checksum and a changelog of row-level differences from the previous version. The same version SHALL be available to the local MCP server in the shard format the website uses.

#### Scenario: Reproduce an old page
- **WHEN** a researcher downloads the 2026-10 snapshot of EIA-860 a year later
- **THEN** the file's SHA-256 matches the one published in the registry for that version

### Requirement: CEII screen
Before publication, every dataset that describes grid infrastructure SHALL pass a documented screen against FERC's CEII rules (18 CFR 388.113). We SHALL NOT publish non-public facility details, substation point locations, planning models (including FERC Form 715), one-line diagrams, bus-level impedances, or data obtained under a CEII or nondisclosure agreement. Infrastructure locations SHALL come only from publicly released sources recorded on the registry entry.

#### Scenario: Restricted source rejected
- **WHEN** a contributor proposes adding substation bus data from a non-public planning model
- **THEN** the screen fails and the dataset is not added

#### Scenario: Archived public map (phase 2, only if its license is confirmed)
- **WHEN** we later ship transmission line geometry from a public archive of a formerly public federal layer
- **THEN** the registry entry records the archive, its DOI, its confirmed license, and the date the original layer was public

### Requirement: License per output table
Every file gridprims publishes SHALL carry a license chosen from its inputs: CC BY 4.0 by default for gridprims-derived tables; the stricter share-alike license when any input requires it (for example CC BY-SA 4.0 for DSIRE-derived data); and ODbL in a separate file for any OpenStreetMap-derived data. Files under different share-alike licenses SHALL NOT be merged.

#### Scenario: Incompatible share-alike inputs
- **WHEN** a contributor proposes one table built from DSIRE (CC BY-SA 4.0) and OpenStreetMap (ODbL)
- **THEN** the license check fails and asks for two separate files

### Requirement: ISO data keeps its publisher's terms
Tables taken from ISO or RTO publications (for example ERCOT 4CP intervals) SHALL carry the publisher's own terms, retained and not relicensed, with the publisher's required notices.

#### Scenario: ERCOT intervals download
- **WHEN** a user views the ERCOT 4CP snapshot download
- **THEN** it shows ERCOT's terms, not CC BY 4.0

### Requirement: Credits travel with every file
Each published file's manifest SHALL list every upstream source with its required credit and a "modified by gridprims" note, and SHALL include any notice text an upstream license requires to travel with copies (for example the NLR data license notice for Cambium workbooks).

#### Scenario: Mixed inputs
- **WHEN** a derived table joins EIA-861 (public domain) with PUDL Form 714 (CC BY 4.0)
- **THEN** the output is CC BY 4.0 and its manifest credits EIA and Catalyst Cooperative with "modified by gridprims"

### Requirement: Data stays on our origin
Datasets SHALL be served from gridprims origins only. Tools SHALL NOT query agency APIs from the browser.

#### Scenario: No agency API at runtime
- **WHEN** CI records the network requests of every data page
- **THEN** none targets eia.gov, epa.gov, openei.org, or any other third-party host
