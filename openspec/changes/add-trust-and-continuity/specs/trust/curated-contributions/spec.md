## Purpose

Keeps hand-maintained facts (tariff terms, data-download guides, glossary entries, regulator links) trustworthy by making provenance and review rules rather than habits, so a stranger can check any fact and a single maintainer cannot quietly be wrong.

## ADDED Requirements

### Requirement: No fact without provenance
Every field in a curated record SHALL carry a primary source: a URL, the publisher, the retrieval date, and a link to an archived copy of that page. A field whose source is a news article, a vendor page, a compilation we may not reuse, or an unsourced claim SHALL NOT be published; it SHALL read "Not public" or be omitted.

#### Scenario: Secondary source rejected
- **WHEN** a contribution cites a trade-press article for a tariff's minimum bill percentage
- **THEN** the data check fails and asks for the order or tariff sheet, with its archive link

#### Scenario: Archive link missing
- **WHEN** a field cites a regulator page with no archived copy
- **THEN** the check fails and names the field, because regulator URLs move

### Requirement: Two independent primary sources, checked automatically
Every disputable field in a curated record SHALL cite two independent primary sources, each with an archived copy the build fetched and stored. The check is automatic: a field with fewer than two archived primary citations fails the data check. No human review step, named reviewer, or sign-off SHALL gate publication.

#### Scenario: Two sources present
- **WHEN** a tariff's threshold cites both the commission's order and the utility's filed tariff sheet, each archived
- **THEN** the record publishes, and both citations with their archive dates appear on it

#### Scenario: Only one source
- **WHEN** a field cites a single document
- **THEN** the data check fails and names the field, and the record publishes without that field rather than waiting for a person

### Requirement: Changes publish at once, and stay open to comment
A change that alters a number already published SHALL publish as soon as its two-source check passes, with the previous value kept visible per `site/trust-pages`, and SHALL be announced in the corrections feed with a comment thread that stays open for at least 30 days afterwards. Nothing SHALL wait on a comment period, a reply, or a merge decision by a person.

#### Scenario: Correcting upward
- **WHEN** a contribution changes a published minimum-bill percentage from 80% to 85% with two archived primary sources
- **THEN** it publishes on that build, the corrections feed records both values and the sources, and comments stay open afterwards

#### Scenario: Urgent removal
- **WHEN** a published figure is found to cite the wrong utility
- **THEN** it is removed or flagged immediately, and the corrections log records the removal the same day

### Requirement: Conflicts of interest are disclosed
The contribution template SHALL ask whether the contributor is employed by, paid by, or representing any party the record concerns, and the answer SHALL be recorded with the record. A contribution with an undisclosed conflict found later SHALL be re-checked against the two-source rule by the data check, and its record flagged on the page until it passes.

#### Scenario: Utility employee contributes
- **WHEN** an employee of the utility proposes a correction to its own tariff entry
- **THEN** the record notes the disclosed affiliation, and the change still needs its primary sources like any other

### Requirement: Bulk contributions are quarantined
A contribution touching more than 20 records or 500 lines SHALL be merged as a single revertible batch, labeled as bulk, and SHALL state how the contributor verified it. Bulk changes SHALL NOT mix a data refresh with an edit to a published number.

#### Scenario: Large guide import
- **WHEN** a contributor adds 60 data-download guides at once
- **THEN** the batch merges as one revertible change labeled bulk, with its verification method recorded

### Requirement: No personal data from contributors
Contributions SHALL NOT include meter files, account numbers, addresses, meter identifiers, screenshots of accounts, or any other personal data, enforced by the schema and the lint in `learn/get-your-data`.

#### Scenario: Personal data in a contribution
- **WHEN** a contribution includes a meter file as evidence
- **THEN** the check fails, explains the text-only rule, and asks for the receipt values typed by hand instead
