## Purpose

Tells someone planning a generator or storage project which interconnection process applies to them, and what the rules say about how long it takes and what it costs.

## ADDED Requirements

### Requirement: Route from project facts
Given nameplate capacity (kW or MW), interconnection voltage, technology (inverter-based or rotating machine, with or without storage), whether the project exports, and the state and utility, the tool SHALL name the process that applies and the eligibility conditions it met or failed, each quoted from the governing tariff or rule with its citation.

#### Scenario: Fast-track eligible
- **WHEN** a 1 MW inverter-based project at 12.47 kV on a mainline is entered in a jurisdiction following the federal procedures
- **THEN** the tool names the fast-track process, shows the eligibility condition it satisfied with the tariff citation, and names the next process if it later fails a screen

#### Scenario: Above the fast-track ceiling
- **WHEN** a project's capacity exceeds every fast-track eligibility limit for its voltage
- **THEN** the tool says fast track does not apply, names the study process that does, and does not evaluate fast-track screens

### Requirement: Deadlines and fees from rule text
The tool SHALL show the published deadlines and fees for the applicable process (application fee, review and study deadlines, and the pre-application report's fee and deadline where the rules provide one), each cited to the tariff or rule with the vintage read, and SHALL state that utilities may post their own superseding schedules.

#### Scenario: Timeline shown
- **WHEN** a process is identified
- **THEN** each deadline appears in business or calendar days as the rule states it, with its citation and the date we last checked it

### Requirement: Jurisdiction coverage is explicit
The tool SHALL state which jurisdictions it holds screen and process data for, and for any other jurisdiction SHALL show the federal procedures as a reference only, labeled as not the applicable rule, with a link to that state's commission.

#### Scenario: Unsupported state
- **WHEN** a user picks a state with no record
- **THEN** the tool says it does not hold that state's rules, shows the federal procedures labeled as a reference, and links the state's commission

### Requirement: Not an application
The tool SHALL state that it does not file, submit, or track an application, and SHALL link to the utility's own interconnection portal where one is recorded.

#### Scenario: Next step
- **WHEN** a result is shown
- **THEN** it links the utility's portal and says the applicant files with the utility
