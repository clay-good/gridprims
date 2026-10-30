## Purpose

Clears up the equipment questions that cost applicants time: which inverter certification generation applies, what the common grid-support settings are, and how to size an inverter against an array.

## ADDED Requirements

### Requirement: Certification generations explained
The tool SHALL explain, in plain words, the difference between the inverter certification generations in current use and the newer certification for power control systems, which rules or jurisdictions call for which, and why an older certification may not satisfy a current requirement. Every statement SHALL cite a rule, a government document, or a certification body's own public page.

#### Scenario: Certification mismatch
- **WHEN** a user has equipment certified to an earlier generation and their jurisdiction requires the later one
- **THEN** the page explains the difference, cites the requirement, and says the authority having jurisdiction and the utility decide what they accept

### Requirement: Published settings, in our own structure
The tool SHALL present the commonly required grid-support settings (voltage and frequency ride-through categories, and the voltage-regulation modes) as facts, each cited to a government publication or a state rule that publishes the value, organized in our own structure. It SHALL NOT reproduce a copyrighted standard's tables, its table numbering, or its organization.

#### Scenario: Setting cited to a rule
- **WHEN** a default setting is shown
- **THEN** its citation names a state rule or government document that publishes the value, and the page states that the standard's own text is not reproduced

#### Scenario: Jurisdiction that publishes no tables
- **WHEN** a state's rule requires the standard but publishes none of its values
- **THEN** the page says the state's rule points elsewhere, names where that state's utilities publish their settings, and does not substitute another state's numbers

#### Scenario: No free source for a value
- **WHEN** a parameter has no free citable source
- **THEN** it is omitted with a note naming the standard and section where it is defined, rather than guessed

### Requirement: Inverter sizing
Given array capacity in kW of direct current and inverter capacity in kW of alternating current, the tool SHALL compute the ratio to 0.01 and explain what a high or low ratio means for clipping and for the capacity the interconnection screens see.

#### Scenario: Ratio computed
- **WHEN** a 150 kW array is paired with a 120 kW inverter
- **THEN** the ratio is 1.25, and the result explains that the screens generally see the inverter's alternating-current rating while the array's capacity affects energy, citing the rule for the capacity the screens use

#### Scenario: Benchmarks deferred
- **WHEN** a user asks whether 1.25 is typical
- **THEN** the page says it does not ship an industry benchmark table and links the public reports that publish distributions

### Requirement: Export limiting changes the capacity screened
The tool SHALL explain that an approved export-limiting or power control system can reduce the capacity the screens evaluate, that acceptance is the utility's decision, and SHALL cite the provision in each jurisdiction it holds that allows it.

#### Scenario: Limited export
- **WHEN** a 500 kW project proposes a 100 kW export limit
- **THEN** the page explains which figure each screen would use, cites the provision, and says the utility decides whether to accept the limiting method

### Requirement: Premises wiring is out of scope
The tool SHALL state that service, panel, busbar, and conductor questions are electrical-code matters it does not cover, and SHALL link the sibling trades-calculation site.

#### Scenario: Busbar question
- **WHEN** a user asks about a panel's busbar limit
- **THEN** the page says that is premises wiring, out of scope here, and links the sibling site
