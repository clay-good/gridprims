## Purpose

Publishes, reproducibly and with the arithmetic shown, how closely the open tariff database reproduces the bills regulators publish, so the industry has a number where it currently has none.

## ADDED Requirements

### Requirement: What the scorecard measures
For each testable rate, the scorecard SHALL compute the bill from the database's record at the regulator's consumption level, compare it with the regulator's published figure, and report the difference in dollars and percent, the charge types exercised, and the arithmetic. It SHALL report the share of rates it could not test and why.

#### Scenario: Disagreement reported
- **WHEN** a database record yields $142.10 where the commission publishes $138.55 at 1,000 kWh
- **THEN** the entry shows both figures, the difference in dollars and percent, the charge lines that differ, and links the commission document and the database record

#### Scenario: Untestable rate counted
- **WHEN** a rate cannot be matched to any regulator figure
- **THEN** it is counted as untestable with the reason, and excluded from every accuracy figure

### Requirement: Checks, not a score
The scorecard SHALL publish counts and distributions of disagreements by type, utility, state, and charge type. It SHALL NOT publish a composite accuracy index, a grade, a ranking of databases, or a ranking of utilities.

#### Scenario: No composite
- **WHEN** the scorecard is rendered
- **THEN** no single headline accuracy number stands for a whole database, and the page explains why it refuses one

### Requirement: Disagreements are questions first
Each disagreement SHALL be phrased as a disagreement between named sources, SHALL name the filed tariff sheet where we have it, and SHALL NOT assert that the database is wrong unless a maintainer has read the filed tariff and recorded that finding with the date.

#### Scenario: Unresolved disagreement
- **WHEN** neither source has been checked against the filed tariff sheet
- **THEN** the entry says the two sources disagree and that we have not determined which is right

#### Scenario: Confirmed error
- **WHEN** a maintainer reads the filed tariff and finds the database record wrong
- **THEN** the entry records the finding, the reader, the date, and the date it was reported upstream

### Requirement: Reported upstream before published as an error
A confirmed error SHALL be reported through the database maintainer's own correction process, with the report date recorded, before the scorecard describes it as an error.

#### Scenario: Upstream report recorded
- **WHEN** a confirmed error is published
- **THEN** its entry shows the date it was reported upstream and the maintainer's reference if one was issued

### Requirement: Reproducible by anyone
Each release SHALL publish its method, the database version and its checksum, the ground-truth release, the exact rate list tested, and its results as files, so a third party can rerun it and get the same numbers.

#### Scenario: Independent rerun
- **WHEN** a researcher reruns the published method against the stated versions
- **THEN** they obtain the same per-rate results, and any difference is attributable to a named version change

### Requirement: Our own engine is in the table
The scorecard SHALL report our own engine's disagreements with the ground truth in the same table and with the same prominence as the database's, so our errors are as visible as anyone else's.

#### Scenario: Our result shown
- **WHEN** the scorecard is published
- **THEN** our engine's disagreement counts appear beside the database's, with the same breakdowns

### Requirement: Feeds the limits page and the validation levels
The scorecard's results SHALL be the evidence behind the validation levels of the bill tools, and the limits page SHALL show its coverage and its date.

#### Scenario: Validation level raised
- **WHEN** the bill engine matches the regulator ground truth within 0.5% of the published bill, or $1.00, whichever is larger, on at least 20 rates spanning at least 5 states
- **THEN** its validation level rises to cross-checked, the evidence links the scorecard release, and the limits page reflects it the same build

#### Scenario: Sample too small to raise the level
- **WHEN** only 8 rates in 2 states have been tested
- **THEN** the level stays where it is, and the limits page states the sample reached so far against the 20-rate, 5-state bar
