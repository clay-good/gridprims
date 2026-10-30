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

### Requirement: Succession plan
The continuity page SHALL name the maintainer, name at least one successor who has agreed in writing, state that if the maintainer is unreachable for 180 days the named successors may take over the domain, repository, and archive records, record where the domain registration and archive deposits sit, and carry a date it was last re-confirmed.

#### Scenario: Stale confirmation
- **WHEN** the plan was last re-confirmed more than 12 months ago
- **THEN** the page shows a "needs re-confirmation" note with the date and CI warns

#### Scenario: No successor yet
- **WHEN** no successor has agreed
- **THEN** the page says so plainly and states what would happen to the archives, rather than implying a plan exists

### Requirement: The archives are enough to rebuild
The deposited material SHALL be sufficient to rebuild the site: the normalized snapshots, their manifests and checksums, the archived raw publisher inputs for each release, and the source at that tag. A restore SHALL be tested at least once a year from the archives alone.

#### Scenario: Yearly restore test
- **WHEN** a maintainer rebuilds a release using only the archived deposits on a clean machine
- **THEN** the build succeeds and the deployed files' checksums match the published digests, and the result and date are recorded on the continuity page
