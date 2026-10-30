## Purpose

Lets anyone compare the terms utilities impose on very large new customers, with every term traced to a public order or tariff sheet.

## ADDED Requirements

### Requirement: Cited terms per tariff
Each tariff entry SHALL record utility, state, regulator, docket, order and effective dates, status, size threshold and load-factor condition, minimum bill percentages by component, contract term, ramp schedule, exit-fee formula, and collateral rule, with a citation (document and page or section) for every non-empty field. Fields not stated in public documents SHALL read "Not public" rather than be inferred.

#### Scenario: Confidential term
- **WHEN** an order says contract terms are filed under seal
- **THEN** those fields read "Not public" with a citation to the order saying so

### Requirement: Statewide rules as entries
Statewide rules (for example Texas 16 TAC §25.194) SHALL be entries of type "rule", listed beside utility tariffs, with the same citation and review fields, and SHALL apply to every utility in their scope in the comparison view.

#### Scenario: Texas rule shown for an ERCOT utility
- **WHEN** a user views terms for a utility in ERCOT
- **THEN** the §25.194 entry appears with its 75 MW threshold, study fee, and security, cited

### Requirement: Sources are primary documents only
Entries SHALL be built from regulator orders, tariff sheets, and statutes. Compilations whose license does not allow reuse SHALL NOT be copied; they may be linked as further reading.

#### Scenario: Pull request without a primary source
- **WHEN** a contributor adds a term citing only a news article
- **THEN** the data check fails and asks for the order or tariff sheet

### Requirement: Verification is automatic and public
Every non-empty field SHALL carry two independent archived primary citations per `trust/curated-contributions`, and the build SHALL check that automatically. Because the citations and the archived documents are published with the entry, any reader can check it; no second-person review record SHALL gate publication.

#### Scenario: Field with one citation
- **WHEN** a field cites only one document
- **THEN** the check fails for that field, the entry publishes without it marked "Not public", and nothing waits on a reviewer

#### Scenario: Reader can check it
- **WHEN** a visitor opens a tariff entry
- **THEN** every field shows both citations with their archived copies, so the entry is checkable without us

### Requirement: Comparison view
The table SHALL be filterable by state, status, and threshold, and SHALL let the user compare up to four tariffs side by side with differences highlighted.

#### Scenario: Compare two states
- **WHEN** a user compares AEP Ohio and Dominion GS-5
- **THEN** threshold, minimum bill by component, term, and exit fee appear side by side with citations

### Requirement: Freshness
Each entry SHALL show when it was last checked against its sources, and entries unchecked for 12 months SHALL be marked "needs review."

#### Scenario: Stale entry
- **WHEN** an entry was last checked 13 months ago
- **THEN** it shows "needs review" and its last-checked date
