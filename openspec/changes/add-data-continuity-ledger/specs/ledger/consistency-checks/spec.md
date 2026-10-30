## Purpose

Measures the arithmetic identities publishers themselves assert, and publishes the result, so a reader can judge data quality from numbers rather than reputation.

## ADDED Requirements

### Requirement: Only publisher-asserted identities
A check SHALL test an identity or coverage statement the publisher itself asserts or implies by its own definitions, cited. Checks SHALL NOT test our opinion of what the data should look like.

#### Scenario: Identity cited
- **WHEN** a check is published
- **THEN** it cites the publisher's own documentation for the identity it tests

### Requirement: The interchange identity
The ledger SHALL publish, for the hourly grid dataset: for each pair of balancing authorities, the residual between what one reports as received and the other reports as sent; and for each balancing authority, the residual between the sum of its pairs and its reported total net interchange. Both SHALL be reported in energy and as a percent of throughput, per balancing authority, per pair, and per year, with the count of hours tested and the count unavailable.

#### Scenario: Pair residual
- **WHEN** one balancing authority reports receiving 100 MWh in an hour and its counterparty reports sending 50 MWh
- **THEN** the residual for that pair-hour is 50 MWh, and the annual summary reports the distribution of such residuals with the hours tested

#### Scenario: What a residual means
- **WHEN** a residual is shown
- **THEN** the page states that it is an inconsistency between two reports rather than missing or extra electricity, and links the publisher's own caveats

### Requirement: Cross-dataset coverage checks
The ledger SHALL publish coverage comparisons the publishers' own definitions imply, at minimum: which utilities report reliability metrics, under which method, and which are exempt or absent, by year; and the share of records missing a field our tools require, by dataset and field.

#### Scenario: Reliability coverage
- **WHEN** the coverage table is published
- **THEN** it gives, per year, how many utilities reported under each method, how many did not report, and the share of customers each group covers

#### Scenario: Missing field share
- **WHEN** a quarter of records lack a fuel cost
- **THEN** the table reports the share, the field, and which of our tools cannot use those records

### Requirement: Conservative reporting
Where a check could be read more than one way, the published reading SHALL be the one least damaging to the publisher, with the ambiguity named. Where coverage is partial, the result SHALL say so rather than extrapolate. A finding resting on an unverified reading SHALL NOT be published.

#### Scenario: Ambiguous identity
- **WHEN** a publisher's definition allows two readings of an identity and only one shows a residual
- **THEN** both readings are reported, the ambiguity is named, and the smaller residual leads

### Requirement: No composite, no ranking
Checks SHALL be published individually with their own counts and distributions. The ledger SHALL NOT combine them into an index, grade, or ranking of datasets, publishers, or utilities.

#### Scenario: No index
- **WHEN** the checks page is rendered
- **THEN** no combined figure stands for a dataset's overall quality, and the page explains why it refuses one

### Requirement: Method published and reproducible
Each check SHALL publish its method, the dataset versions and checksums used, the hours or rows tested, and its results as files, so anyone can rerun it and obtain the same numbers.

#### Scenario: Independent rerun
- **WHEN** a researcher reruns a published check against the stated versions
- **THEN** the results match, and any difference is attributable to a named version change

### Requirement: Deferred checks are named
Checks considered and not published SHALL be listed with the reason, so the absence is visible rather than silent.

#### Scenario: Deferred reconciliation
- **WHEN** a cross-dataset emissions reconciliation needs an unmaintained crosswalk
- **THEN** it appears in the deferred list with that reason and the prior published benchmark cited
