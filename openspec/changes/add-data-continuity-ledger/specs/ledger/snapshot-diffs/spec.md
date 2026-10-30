## Purpose

Publishes what actually changed between two releases of a public dataset, including how much already-published history moved, which no one publishes for energy data today.

## ADDED Requirements

### Requirement: What a diff reports
For each new dataset version, the diff SHALL report: files added, removed, and changed with their checksums; columns added, removed, or renamed; row counts and their delta; rows added, removed, and changed by key; and the five largest changes by magnitude in the dataset's principal measure, each with its key and both values.

#### Scenario: Column dropped
- **WHEN** a publisher drops a column between releases
- **THEN** the diff names the column, the files affected, and the pages and tools that read it

#### Scenario: Largest changes listed
- **WHEN** a new release changes generator capacities
- **THEN** the diff lists the five largest capacity changes with their plant and generator keys and both values

### Requirement: Revisions to published history
Where a release changes values for periods a previous release already covered, the diff SHALL report the count of revised values, the periods affected, and the distribution of revision magnitude (median, 90th percentile, and maximum, each with its unit). It SHALL link the publisher's own revision policy and SHALL NOT describe a revision as an error.

#### Scenario: History revised
- **WHEN** a monthly release revises values from two years earlier
- **THEN** the diff reports how many values changed, the periods, and the magnitude distribution, and links the revision policy

#### Scenario: Neutral wording
- **WHEN** a revision is reported
- **THEN** no sentence calls it an error, a mistake, or a correction unless the publisher called it one

### Requirement: Diffs are published per version and kept
Each dataset version's diff SHALL be published at a stable URL, linked from the data library and the ledger row, and kept for every version we have ever published.

#### Scenario: Historical diff retained
- **WHEN** a researcher opens a three-year-old version
- **THEN** its diff against the version before it is still published

### Requirement: Breaking changes are flagged to our own build
A diff that removes or renames a column, or changes a unit, that any tool or page depends on SHALL fail the build until the dependency is updated, and the ledger SHALL record that the change was breaking for us.

#### Scenario: Breaking change
- **WHEN** a renamed column feeds a tool
- **THEN** the build fails naming the tool and the column, and the ledger row records the break

### Requirement: Machine-readable
Diffs SHALL be published as JSON alongside the page, under CC BY 4.0, with the two version identifiers and checksums they compare.

#### Scenario: Diff JSON
- **WHEN** a developer fetches a diff
- **THEN** it names both versions, both checksums, and every change category
