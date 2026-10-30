## Purpose

Makes the data outlive the project: every published version is archived elsewhere under a citable identifier, the running costs are public, and anyone can revive it without permission from us or cooperation from anybody.

## ADDED Requirements

### Requirement: Every permanent version is archived off-site
Each permanent dataset version SHALL be deposited by the pipeline, through the archive's own interface on the same run that cuts the version, to Zenodo (whose versioning interface `docs/research/17` verifies, with a sandbox for canaries), with one identifier for the dataset series and one for each version. The deposit SHALL NOT require anyone to upload anything. The data library SHALL show both, and citations SHALL use the version identifier.

#### Scenario: Version bundled to fit the archive
- **WHEN** a dataset version consists of more shard files than the archive accepts in one record
- **THEN** the run bundles the version into at most the archive's per-record file limit, with a manifest listing what each bundle contains

#### Scenario: Deposit interface exercised regularly
- **WHEN** the scheduled canary runs against the archive's sandbox
- **THEN** it creates a new version of a test record and reports failure before a real deposit is due

#### Scenario: Citation uses the version identifier
- **WHEN** a researcher copies the citation for a dataset version
- **THEN** it carries that version's persistent identifier, not the series identifier alone

#### Scenario: Deposit is part of the run
- **WHEN** a run cuts a permanent version
- **THEN** the same run creates the archive's new version, records its identifier, and publishes it in the library; if the archive is unreachable the version is marked "archive pending", the run retries on its next schedule, and the ledger shows the gap

#### Scenario: Archive without an interface
- **WHEN** a secondary archive offers no programmatic deposit
- **THEN** that deposit is best-effort and its absence SHALL NOT block a release or require a person, and the continuity page says which archives are automatic and which are not

### Requirement: A second archive and the source
At least annually, and automatically wherever the archive offers an interface, the current snapshot set SHALL be deposited to a second, independent public archive, and the source code SHALL be archived to a public code archive.

#### Scenario: Annual run deposits both
- **WHEN** the annual scheduled run executes
- **THEN** it deposits the current snapshot set to the second archive and the source to the code archive wherever an interface exists, and records each deposit's date

### Requirement: Archives without an interface are best-effort
Where an archive offers no programmatic deposit, that deposit is best-effort, SHALL NOT block a release, and SHALL NOT be presented as something anyone is obliged to do by hand. The continuity page SHALL state which archives are automatic, which are best-effort, and the date of the most recent deposit to each.

#### Scenario: Annual deposit overdue
- **WHEN** the second-archive deposit is more than 13 months old
- **THEN** the continuity page shows it as overdue with whether that archive is automatic or best-effort, and CI publishes the gap

#### Scenario: Archive with no interface
- **WHEN** an archive offers no programmatic deposit
- **THEN** the continuity page lists it as best-effort, nothing blocks on it, and the primary archive plus the public repository remain the paths a reviver uses

### Requirement: Running costs are published
The About page SHALL state the actual annual running cost from invoices (hosting plan, domain, and any archive fees), the date of the figure, and who pays it. The continuity page SHALL state what happens to the site and the archives if the bill goes unpaid.

#### Scenario: Cost stated with its date
- **WHEN** a visitor reads the About page
- **THEN** it gives a dollar figure for the last 12 months with the date it was computed, and no estimate presented as a fact

### Requirement: Anyone can revive it, with no handover
The continuity page SHALL explain, in steps a stranger can follow, how to bring gridprims back if nobody is maintaining it: clone the archived source at a release tag, fetch that release's archived inputs from the public archives by their identifiers, run the build with the stated runtime, and deploy the static output anywhere. It SHALL NOT name a successor, require anyone to agree to anything, or depend on contacting the maintainer.

#### Scenario: Revival steps published
- **WHEN** a visitor opens the continuity page
- **THEN** it gives the archive identifiers, the release tags, the runtime version, the build command, and the licenses that permit all of it, with no step that waits on a person

#### Scenario: Maintainer unreachable
- **WHEN** the maintainer stops responding
- **THEN** nothing on the page or in the archives needs their action, because the source, the inputs, and the licenses already permit anyone to rebuild and host it

### Requirement: The licenses make revival legal without permission
The continuity page SHALL state that the code is under a permissive license, that gridprims' own text and derived tables are under an attribution license, and that each upstream dataset carries its own recorded terms, so a reviver needs no permission from us and knows exactly which upstream terms travel with what.

#### Scenario: No permission needed
- **WHEN** someone forks the project to revive it
- **THEN** the page confirms they need nothing from us, and names the upstream terms they inherit per dataset

### Requirement: The archives are enough to rebuild
The deposited material SHALL be sufficient to rebuild the site: the normalized snapshots, their manifests and checksums, the archived raw publisher inputs for each release, and the source at that tag. A restore SHALL be tested automatically at least once a year, on a schedule, from the archives alone.

#### Scenario: Yearly restore test
- **WHEN** the scheduled restore workflow rebuilds a named release from the archived deposits alone on a clean runner
- **THEN** the build succeeds, the deployed files' checksums match the published digests, and the result and date are published on the continuity page
