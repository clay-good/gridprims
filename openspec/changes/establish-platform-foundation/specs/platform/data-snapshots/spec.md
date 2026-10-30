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
Each registry entry SHALL declare its expected refresh cadence. When a dataset is late by the rule below, every page that uses it SHALL show a "may be out of date" note with the date we last checked for an update.

#### Scenario: Note appears on every page using it
- **WHEN** a dataset is late
- **THEN** every page showing a number from it carries the note with the last-checked date

### Requirement: The one lateness rule
Lateness SHALL be computed by one rule, defined here and cited rather than redefined by `ledger/continuity`: a dataset is due on the publisher's posted next-release date where one exists, otherwise on its historical cadence, and is late 30 days after that date. Every row SHALL state whether its due date was posted or inferred.

#### Scenario: One lateness rule
- **WHEN** an annual dataset's served version has an as-of date of 2025-10-07 and the publisher posted no next-release date
- **THEN** lateness is inferred from the annual cadence with the 30-day grace, so pages show the staleness note from 2026-11-06, by the same rule the ledger publishes

#### Scenario: Delayed federal release
- **WHEN** the publisher's next annual release is 90 days late
- **THEN** pages show the staleness note and the registry page lists the dataset as "waiting on publisher"

### Requirement: Version cadence and file budget
Datasets MAY refresh their current shards as often as their recipe's schedule allows, but permanent versions SHALL be cut at most monthly, by the pipeline on a schedule rather than by anyone deciding. The deployable file count SHALL stay at or below 80,000, checked in CI.

#### Scenario: Two versions in one month
- **WHEN** a second permanent version of the same dataset is cut in the same calendar month
- **THEN** CI fails and names the dataset and both versions

#### Scenario: Budget exceeded
- **WHEN** a build would deploy 80,001 files
- **THEN** CI fails and lists the largest contributors by dataset

### Requirement: Where each kind of file lives
Normalized outputs, manifests, checksums, and the ledger SHALL be committed to the repository. Raw publisher inputs for each version SHALL be published as release assets, because they are large and immutable. Durable copies of both SHALL be deposited to a public research archive on every release. CI artifacts and caches SHALL NOT be relied on for anything that must outlive a run, because the host deletes them.

#### Scenario: Large raw input
- **WHEN** a publisher's raw file is 400 MB
- **THEN** it is attached to the release and deposited to the archive, and the repository holds only its checksum and manifest entry

#### Scenario: Nothing depends on an artifact
- **WHEN** CI artifacts expire
- **THEN** no published page, download, or rebuild path breaks, because none pointed at an artifact

### Requirement: Snapshots are immutable and downloadable
Each dataset version SHALL be stored at a permanent, versioned URL and never edited in place. The data page SHALL offer every version for download as gzip-compressed CSV (split by year or state when large) with its checksum, and SHALL link the version's diff, which `ledger/snapshot-diffs` owns and computes; this capability SHALL NOT compute a second diff. The same version SHALL be available to the local MCP server in the shard format the website uses.

#### Scenario: Reproduce an old page
- **WHEN** a researcher downloads the 2026-10 snapshot of EIA-860 a year later
- **THEN** the file's SHA-256 matches the one published in the registry for that version

### Requirement: CEII screen
Before publication, every dataset that describes grid infrastructure SHALL pass a documented screen against FERC's CEII rules (18 CFR 388.113). We SHALL NOT publish non-public facility details, substation point locations, planning models (including FERC Form 715), one-line diagrams, bus-level impedances, or data obtained under a CEII or nondisclosure agreement. Infrastructure locations SHALL come only from publicly released sources recorded on the registry entry.

#### Scenario: Restricted source rejected
- **WHEN** a contributor proposes adding substation bus data from a non-public planning model
- **THEN** the screen fails and the dataset is not added

#### Scenario: Archived public map
- **WHEN** we later ship transmission line geometry from a public archive of a formerly public federal layer
- **THEN** the registry entry records the archive, its identifier, the terms captured from its own page, the posture derived from them, and the date the original layer was public

### Requirement: Redistribution posture is automatic, and never blocks a build
Every dataset's registry entry SHALL carry a posture the build derives from the terms recorded for it, with no human sign-off anywhere in the path:

#### Scenario: Posture derived from recorded terms
- **WHEN** the pipeline records a dataset's terms
- **THEN** it assigns `mirror` when those terms match the recognized set, `derive` when the terms are absent, unrecognized, or restrictive but the underlying values are facts we may compute over, and `link` when even that is unclear

#### Scenario: The recognized set is explicit
- **WHEN** the matcher is applied
- **THEN** it recognizes only this list, by identifier or by the publisher's own words: CC0-1.0, CC-BY-4.0, CC-BY-SA-4.0 (share-alike, kept in its own file), ODbL-1.0 (kept in its own file), Apache-2.0, MIT, and an explicit United States federal public-domain dedication; anything else, including a citation request with no license and any "non-commercial" or "educational use" wording, is unrecognized

#### Scenario: Hand-set posture wins while the matcher is young
- **WHEN** a registry entry carries an explicit posture set by hand
- **THEN** that posture is used, the matcher's verdict is recorded beside it as advisory, and a disagreement is published on the pipeline health record so the matcher can be promoted once it agrees across every launch dataset

#### Scenario: Unclear terms downgrade instead of blocking
- **WHEN** a dataset's terms cannot be recognized automatically
- **THEN** the build continues with the lower posture, publishes what that posture allows, and records why, and SHALL NOT fail or wait for a person

### Requirement: What each posture may publish
Under `mirror` we may republish the publisher's files and our derived tables. Under `derive` we SHALL publish only values we computed ourselves (counts, sums, averages, joins, and per-entity facts), credit the publisher, link the original, and SHALL NOT republish its files. Under `link` we SHALL publish no values from it, only a description and a link. Every page and download SHALL show the posture in force and the terms it rests on.

#### Scenario: Derive posture on a queue dataset
- **WHEN** a queue dataset's terms are not a recognized reusable license
- **THEN** the pages show our own computed counts and capacity by state, county, type, and status, credit the publisher, link the original file, and offer no copy of it

#### Scenario: Posture shown
- **WHEN** a visitor opens any dataset page
- **THEN** it states whether we mirror, derive, or only link, and quotes the recorded terms

### Requirement: Terms are captured, not interpreted
The pipeline SHALL fetch and archive the publisher's own terms page with each refresh, store its text and the date, and compare it with the previous capture. A change in that text SHALL reduce the posture to the safer option until the new text matches a recognized license again.

#### Scenario: Terms page changes
- **WHEN** a publisher's license wording changes between refreshes
- **THEN** the posture drops to the safer option automatically, the change is recorded with both texts, and the affected pages switch to what the lower posture allows

### Requirement: Takedown is honored without argument
Each dataset page and the terms page SHALL carry a contact for publishers and rights holders, and a stated practice of removing or reducing a dataset to `link` on a credible request, before any dispute about whether the request is correct.

#### Scenario: Publisher objects
- **WHEN** a publisher asks us to stop republishing their file
- **THEN** that dataset drops to `link`, the change is recorded in the changelog, and the removal is not contingent on agreeing with the request

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
Shards, derived tables, and normalized downloads SHALL be served from gridprims origins only, and tools SHALL NOT query agency APIs from the browser. Raw publisher inputs and archive deposits live off-origin by design (foundation design D16) and SHALL appear only as links a visitor may follow, never as a request a page makes.

#### Scenario: No agency API at runtime
- **WHEN** CI records the network requests of every data page
- **THEN** none targets eia.gov, epa.gov, openei.org, or any other third-party host, and the raw-input and archive entries appear only as anchors
