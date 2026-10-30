## Purpose

Makes every gridprims result traceable to a published standard or dataset and proves each tool against independent worked examples, so users can trust a free tool as much as a paid one.

## ADDED Requirements

### Requirement: Citations name edition and locator
Every citation SHALL name the source, edition or version, the section, table, or equation used, and a free-access link where one exists. Paywalled standards (for example IEEE 738) SHALL be cited by section without reproducing copyrighted text or tables; their values SHALL come from public sources or user input.

#### Scenario: Paywalled standard
- **WHEN** a tool implements a method from a paywalled standard
- **THEN** the citation names the standard, edition, and clause, states that the text is not reproduced, and links to any public summary or reference implementation used

### Requirement: Worked examples from an independent source
Every stable tool SHALL pass at least one worked example taken from a source independent of our code (a standard's annex, an agency test case, a peer-reviewed paper, or an established open implementation such as PySAM or REopt), with a stated tolerance in the output's unit.

#### Scenario: Reference outputs are stored, not installed
- **WHEN** a worked example comes from a third-party engine such as PySAM, REopt, or `linerate`
- **THEN** the engine's inputs, version, run date, and outputs are committed as a fixture file, and CI compares against that file without installing or calling the engine

#### Scenario: Example drift fails the build
- **WHEN** a code change moves a worked-example result outside its tolerance
- **THEN** CI fails and names the tool, example, expected value, actual value, and tolerance

### Requirement: Show the work
Every result SHALL offer a "How we got this" panel with: the method in plain words, the formula or algorithm steps, every assumption with its value, intermediate values, and the citations.

#### Scenario: Bill re-pricing work
- **WHEN** a user opens "How we got this" on a re-priced bill
- **THEN** the panel lists each charge line (fixed, energy by period, demand by period) with the quantity, rate, and subtotal that produced the total

### Requirement: Every tool declares a validation level
Each tool SHALL declare one of four validation levels in its manifest and SHALL NOT claim a level its committed evidence does not support. The levels are 0 unvalidated, 1 self-checked, 2 cross-checked, and 3 field-verified.

#### Scenario: Level definitions and their evidence
- **WHEN** a contributor reads the manifest schema
- **THEN** it defines level 0 as a cited method with nothing independent checking it; level 1 as our own worked examples and consistency tests passing, from committed fixtures with tolerances; level 2 as agreement with an independent implementation or a cited published worked example within a stated tolerance, from stored reference outputs; and level 3 as agreement with real-world ground truth in at least 3 recorded cases (an actual bill, a utility's or regulator's own published figure, or a practitioner's own calculation)

#### Scenario: Level shown with its evidence
- **WHEN** a visitor opens any tool page
- **THEN** its validation level appears with one plain sentence naming the evidence behind it and a link to that evidence

#### Scenario: Claimed level exceeds evidence
- **WHEN** a manifest declares level 2 but no third-party reference output or cited published example is committed
- **THEN** the build fails and names the tool and the missing evidence

### Requirement: Unvalidated and self-checked tools say so where the answer is
A tool at level 0 or 1 SHALL carry the work-zone strip beside its answer stating that no independent check has been run yet and inviting a problem report. The strip SHALL NOT be dismissible or hidden behind a tab.

#### Scenario: Level 0 tool
- **WHEN** a level 0 tool returns a result
- **THEN** the strip beside the answer reads that the method is cited but unvalidated, and links the limits page and the report control

#### Scenario: Copied result carries the level
- **WHEN** a user copies a result card from a level 1 tool
- **THEN** the copied text includes the validation level and its one-sentence meaning

### Requirement: Levels are declared per surface and per tool
The local agent server SHALL return the validation level in every structured result, so an agent cannot present an unvalidated number as settled.

#### Scenario: Agent result
- **WHEN** an agent runs a level 0 tool
- **THEN** the structured result carries `validationLevel: 0` and its plain-sentence meaning

### Requirement: Honest claims only
The site SHALL NOT claim review, verification, accuracy, or endorsement the build does not prove. Claims such as "matches REopt within 2%" SHALL be generated from CI results, with the date and test set.

#### Scenario: Unproven claim
- **WHEN** page copy states an accuracy figure not produced by a CI test
- **THEN** the claims gate fails the build
