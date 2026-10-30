## Purpose

Records, per public energy dataset, whether it is current, late, changed, or gone, with the publisher's own notice and an archived copy, so nobody has to discover a gap by having their analysis break.

## ADDED Requirements

### Requirement: What a ledger row contains
Each row SHALL record: dataset id and title, publisher, expected cadence, the vintage of the latest release we hold, the publisher's posted next-release date where one exists, days late (with whether that is measured against a posted date or inferred from cadence), the authoritative notice supporting the status, the canonical URL and its most recent HTTP status with the check date, the archive identifier of our deposited copy, and the date the row was computed.

#### Scenario: Row fields present
- **WHEN** a dataset is added to the registry without enough information for a ledger row
- **THEN** the build fails and names the dataset and the missing field

#### Scenario: Posted versus inferred lateness
- **WHEN** a publisher posts no next-release date
- **THEN** the row reports lateness as inferred from the historical cadence, shows that cadence, and does not cite a posted promise

### Requirement: The 30-day grace period
A dataset SHALL NOT be shown as late until 30 days past its posted or inferred due date, and the row SHALL show the due date and the grace period so the reader can see the rule.

#### Scenario: Within grace
- **WHEN** a dataset is 12 days past its posted date
- **THEN** the row shows it as due rather than late, with the due date and the grace rule

### Requirement: A deleted promise is itself recorded
When a publisher removes or changes a previously posted release date, the row SHALL record the previous text, the date we last saw it, the archived copy of that page, and the current text, without characterizing why it changed.

#### Scenario: Promise removed
- **WHEN** a page that said a release was expected in a given month no longer says so
- **THEN** the row records both versions with their dates and links the archived copy, and states no cause

### Requirement: Publishers can always reply, and nothing waits on them
Every row and finding SHALL link the publisher's own notice where one exists and SHALL carry a standing invitation to reply, with a contact that reaches us. Any reply SHALL be published inline beside the row, unedited and attributed. Publication SHALL NOT wait on a notice being sent, a reply being received, or any person taking an action first.

#### Scenario: Reply published
- **WHEN** a publisher replies explaining a delay
- **THEN** the reply appears beside the row, unedited, with its date and attribution

#### Scenario: Nothing is held back
- **WHEN** a dataset first qualifies as late
- **THEN** the row publishes on that build, with the publisher's own notice linked and the invitation to reply, and no step waits on a person

### Requirement: The on-time majority is stated first
The page SHALL state, above the table, how many tracked datasets are current and how many are late, so the ledger cannot be read as a claim that public energy data is broadly unreliable.

#### Scenario: Mostly current
- **WHEN** most tracked datasets are current
- **THEN** the page says so in its first sentence with the counts

### Requirement: Discontinued and moved datasets
A dataset that a publisher discontinues SHALL stay in the ledger marked discontinued, with the notice, the last vintage, the archive identifier, and any successor the publisher names. A dataset whose URL moves SHALL record both URLs and the date of the move.

#### Scenario: Dataset discontinued
- **WHEN** a publisher retires a dataset
- **THEN** its row stays, marked discontinued with its notice and archived copy, and names the successor if one was announced

### Requirement: Our own datasets are in the ledger
Datasets gridprims publishes SHALL appear in the ledger on the same terms, including our own lateness, broken links, and corrections.

#### Scenario: Our lateness shown
- **WHEN** one of our own derived datasets is past its cadence
- **THEN** it appears as late in the same table with the same fields

### Requirement: Link liveness
Every URL cited anywhere on the site SHALL be checked at least weekly, and the ledger SHALL publish the count and list of citations whose targets no longer resolve, with the archived copy where we have one.

#### Scenario: Dead citation
- **WHEN** a cited document stops resolving
- **THEN** the ledger lists it with the date it last worked, the pages that cite it, and the archived copy

### Requirement: Page and machine-readable form
The ledger SHALL be published as a page and as a JSON file at a stable URL, with the same fields, under CC BY 4.0, and SHALL be served to the local agent server from the same record.

#### Scenario: Machine-readable ledger
- **WHEN** a researcher fetches the JSON
- **THEN** it carries every row with the same fields and the generation date
