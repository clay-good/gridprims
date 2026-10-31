## MODIFIED Requirements

### Requirement: One file, one set of numbers
Every tool that reads a loaded file SHALL read the one canonical record intake produced for that file's kind, with the receipt's current choices, and SHALL NOT re-parse the file or derive its own record. For meter files the record is the interval series; for a lines standards file it is the rule record; for a pole list it is the attachment list. Any quantity more than one tool reports (peak demand and its timestamp, total energy, load factor, monthly peaks, interval count) SHALL be computed once in the shared core, and CI SHALL fail when two surfaces or two tools report different values for the same fixture.

#### Scenario: Peak agrees everywhere
- **WHEN** a fixture is loaded and the workbench, the bill, the carbon tab, and the service-headroom report each state the March peak
- **THEN** all four show the same kW value and the same timestamp

#### Scenario: Receipt change propagates
- **WHEN** the user changes the assumed time zone on the receipt
- **THEN** every tool's results recompute from the rebuilt series, and none keeps a value from the previous assumption

#### Scenario: Standards choice propagates
- **WHEN** the user picks one of two conflicting rows in a standards receipt
- **THEN** the attachment and midspan tools both recompute from the updated rule record

## ADDED Requirements

### Requirement: List, length, and handle inputs
The manifest SHALL support three more input types: `rows` (a list with fixed, typed columns and a maximum row count), `length` (a distance accepting field formats such as `22'4"`, `22-4`, `22 ft 4 in`, decimal feet, and meters, with inches as its canonical unit), and `handle` (a loaded file of a named kind, with an `accepts` list). Each SHALL render on the page, validate over MCP, and round-trip through a share link, except that a `handle` is never encoded in a URL.

#### Scenario: Length input round trip
- **WHEN** a `length` input is entered as 6.81 m and the share link is opened
- **THEN** the input shows 6.81 m, and the tool reads it as 268.1 in.

#### Scenario: Handle kind checked
- **WHEN** a meter-file handle is passed to an input that accepts `lines-standards`
- **THEN** the tool refuses, naming the kind it expected
