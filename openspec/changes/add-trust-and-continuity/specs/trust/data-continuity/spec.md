## Purpose

Makes the data outlive the project: every published version is archived elsewhere under a citable identifier, the running costs are public, and someone is named to take over.

## ADDED Requirements

### Requirement: Every permanent version is archived off-site
Each permanent dataset version SHALL be deposited to a public research archive that mints a persistent identifier, with one identifier for the dataset series and one for each version. The data library SHALL show both, and citations SHALL use the version identifier.

#### Scenario: Citation uses the version identifier
- **WHEN** a researcher copies the citation for a dataset version
- **THEN** it carries that version's persistent identifier, not the series identifier alone

#### Scenario: Deposit is part of release
- **WHEN** a permanent version is published without a completed deposit
- **THEN** the release checklist is incomplete and the version is marked "archive pending" in the library

### Requirement: A second archive and the source
At least annually, the current snapshot set SHALL be deposited to a second, independent public archive, and the source code SHALL be archived to a public code archive. The continuity page SHALL list every archive location with the date of the most recent deposit.

#### Scenario: Annual deposit overdue
- **WHEN** the second-archive deposit is more than 13 months old
- **THEN** the continuity page shows it as overdue and CI warns

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
The deposited material SHALL be sufficient to rebuild the site: the normalized snapshots, their manifests and checksums, the archived raw publisher inputs for each release, and the source at that tag. A restore SHALL be tested at least once a year from the archives alone.

#### Scenario: Yearly restore test
- **WHEN** a maintainer rebuilds a release using only the archived deposits on a clean machine
- **THEN** the build succeeds and the deployed files' checksums match the published digests, and the result and date are recorded on the continuity page
