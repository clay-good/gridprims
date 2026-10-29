## Purpose

Turns a customer's computed impact into a short, factual public comment draft that they edit and submit themselves.

## ADDED Requirements

### Requirement: Factual draft from computed numbers
The tool SHALL generate a draft containing only: the docket number and regulator the user enters, the user's customer type, the computed annual and monthly impact, the charges that drive it, and the method with gridprims tool version. It SHALL NOT add opinions, requests, or claims the user did not write.

#### Scenario: Draft content
- **WHEN** a user generates a draft after the impact calculation
- **THEN** the draft states the docket, the +$162 per year impact, and the largest contributing charge, with a blank paragraph for the user's own views

### Requirement: The user submits
The tool SHALL NOT submit, email, or post anything. It SHALL offer copy and print, and SHALL link to the regulator's comment instructions when a curated link exists.

#### Scenario: No submission path inside gridprims
- **WHEN** a user finishes the draft
- **THEN** the only actions are copy, print, and a link to the regulator's instructions

### Requirement: Verification
A snapshot test SHALL confirm that every number in the draft equals the corresponding computed result and that the draft contains no sentence outside the fixed template plus the user's own text.

#### Scenario: Template check
- **WHEN** CI renders a draft from a fixture
- **THEN** the text matches the stored snapshot except the user-text paragraph

### Requirement: Privacy
The draft SHALL include no account numbers, addresses, or meter data unless the user types them in.

#### Scenario: Meter data excluded
- **WHEN** a draft is generated from a loaded file
- **THEN** it contains computed totals only, not interval values or the file name
