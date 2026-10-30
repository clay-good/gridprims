## Purpose

Puts a utility's published reliability in context that means something: how it compares with utilities of the same ownership type, size, and region, as a percentile, with the reporting method shown.

## ADDED Requirements

### Requirement: Cohort before comparison
A comparison SHALL place the utility in a cohort by ownership type first, then customer-count size class, then state or census division, and SHALL report its percentile rank within that cohort along with the cohort's median and quartiles and the number of utilities in it.

#### Scenario: Co-op compared
- **WHEN** a cooperative with 232 minutes per customer is compared
- **THEN** the result gives its percentile among reporting cooperatives of similar size and names the cohort, its size, and its median

#### Scenario: Cohort too small
- **WHEN** a cohort holds fewer than 10 reporting utilities
- **THEN** the tool widens the cohort one step, says it did so, and names the wider cohort

### Requirement: Never compare across bases or methods
The comparison SHALL refuse to compare a figure that includes major event days with one that excludes them, and SHALL refuse to compare a utility reporting under the standard method with one reporting under a self-declared method unless both labels are shown on both figures.

#### Scenario: Mixed bases refused
- **WHEN** a user selects a with-major-events figure and a without-major-events cohort
- **THEN** the tool refuses, explains that the two measure different things, and offers the matching basis

#### Scenario: Method labels shown
- **WHEN** a cohort mixes standard-method and self-declared filers
- **THEN** every figure carries its method label and the note says self-declared major events are not comparable

### Requirement: Coverage is shown
Each utility's figure SHALL show the share of its customers covered by its reliability report, as the federal data provides it, and the tool SHALL note that this share can exceed 100% because the two schedules count customers differently.

#### Scenario: Partial coverage
- **WHEN** a utility's reliability report covers 95.0% of its customers
- **THEN** the figure shows that share beside it

### Requirement: No ranking, no judgement
The tool SHALL NOT publish a league table, a grade, a score, or language characterizing a utility as good or bad, and SHALL NOT infer a cause for a utility's position.

#### Scenario: Neutral wording
- **WHEN** a utility sits in the worst quartile of its cohort
- **THEN** the result states the percentile and the cohort, with no adjectives and no inferred cause

### Requirement: The cohort tables are registered and downloadable
The cohort statistics SHALL be a registered dataset with gridprims as publisher, CC BY 4.0 as its license, EIA-861 credited as the source, the source file's data year as the data period, and the derivation date as the as-of date, downloadable so anyone can check a percentile.

#### Scenario: Cohort data downloadable
- **WHEN** a reporter wants to check a percentile
- **THEN** the cohort table is downloadable with its source credit, data year, and derivation date

### Requirement: Verification
Cohort medians and quartiles SHALL be recomputed from the cited federal reliability file and checked against values recomputed independently by a maintainer for at least 3 cohorts, matching to 0.1 minute, with the file version recorded.

#### Scenario: Cohort recomputation
- **WHEN** CI compares cohort statistics with the stored independent recomputation
- **THEN** every median and quartile matches to 0.1 minute
