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

### Requirement: Honest claims only
The site SHALL NOT claim review, verification, accuracy, or endorsement the build does not prove. Claims such as "matches REopt within 2%" SHALL be generated from CI results, with the date and test set.

#### Scenario: Unproven claim
- **WHEN** page copy states an accuracy figure not produced by a CI test
- **THEN** the claims gate fails the build
