## Purpose

Walks through every fast-track screen in order, says exactly what each one tests and at what threshold, and is honest about which ones only the utility can answer.

## ADDED Requirements

### Requirement: Every screen, in order, with its threshold
The tool SHALL list each screen of the applicable process in the order the rules state, with what it tests in plain words, its exact numeric threshold quoted from the rule, and its citation including the vintage read.

#### Scenario: Screen list
- **WHEN** the fast-track screens are shown for a jurisdiction following the federal procedures
- **THEN** each screen appears in rule order with its threshold and citation, and the list names the rule's own section numbers

#### Scenario: Screens that do not exist here
- **WHEN** a user looks for a starting-voltage-drop screen or a penetration test in the federal procedures
- **THEN** the page states that neither is part of them, names the jurisdictions whose rules contain each, and links those rules

### Requirement: Correct the thresholds people misquote
The explainer SHALL carry a short, cited list of screen thresholds and requirements that are widely misstated, giving the value the rule actually contains, because a wrong remembered threshold sends projects down the wrong path. Each entry SHALL cite the rule text and the vintage read.

#### Scenario: Misremembered state threshold
- **WHEN** a user believes a state's minimum-load screen uses a lower percentage than its rule states
- **THEN** the page gives the rule's actual value with its citation and notes the commonly repeated figure is not in the rule

### Requirement: Hosting capacity as a screen where a state makes it one
Where a state's rules use a published hosting-capacity value as an actual screen rather than as information, the tool SHALL say so, name the screen and its percentage, and explain that the applicant reads the value from that state's own map.

#### Scenario: Hosting capacity is the screen
- **WHEN** a jurisdiction screens against a percentage of the lowest published hosting-capacity profile value
- **THEN** the tool names that screen and its percentage, cites the rule, and directs the user to the state's map rather than to the load band

### Requirement: Who can answer each screen
Each screen SHALL carry one of three labels: answerable by the applicant, answerable by the installer or equipment data sheet, or answerable only by the utility. The label SHALL name the specific input that decides it.

#### Scenario: Utility-only screen
- **WHEN** a screen depends on the line section's annual peak load
- **THEN** it is labeled answerable only by the utility, names that input, and links to `interconnect/feeder-data-paths`

### Requirement: Locally answerable screens are evaluated
Screens whose inputs are entirely owned by the applicant or available from equipment data sheets (including line configuration and grounding, shared secondary, single-phase imbalance on a center-tapped service, and backfeed against the service transformer rating) SHALL be evaluated from the user's entries and reported as met, not met, or not applicable, with the arithmetic shown.

#### Scenario: Service transformer backfeed
- **WHEN** a 75 kW project is proposed behind a 50 kVA service transformer
- **THEN** the screen reports not met, shows the comparison, and names the rule's threshold

### Requirement: No verdict on screens needing a circuit model
The tool SHALL NOT report a pass or fail for fault current contribution, interrupting capability, transient stability, voltage or power quality, or the safety and reliability review, and SHALL state for each that it needs the utility's circuit model.

#### Scenario: Fault current asked
- **WHEN** a user asks whether their project passes the fault current screen
- **THEN** the tool explains what the screen tests, gives its threshold, and says only the utility's model can answer it

### Requirement: Overall result is a status, not a prediction
The tool SHALL summarize as: screens met so far, screens not met, and screens still open, with the count of each, and SHALL NOT state or imply a likelihood of approval.

#### Scenario: Mixed result
- **WHEN** three screens are met, one is not met, and six remain open
- **THEN** the summary gives those three counts and says the utility decides, with no probability or likelihood language

### Requirement: State threshold comparison
The tool SHALL present the same screen family across the federal procedures and every jurisdiction it holds, side by side, with each threshold cited, and SHALL highlight where a state's threshold or test differs materially from the federal one.

#### Scenario: Different load-ratio test
- **WHEN** a state's level-two review tests against 100% of minimum load where the federal screen tests against 15% of annual peak
- **THEN** the comparison shows both with their citations and notes that they are different tests, not different numbers for the same test

### Requirement: Storage changes which minimum load applies
Where the rules distinguish absolute minimum load from daytime minimum load for projects including storage, the tool SHALL say which applies to the entered configuration and cite the provision.

#### Scenario: Solar plus storage
- **WHEN** a project pairs solar with a battery that can export at night
- **THEN** the tool states that the absolute minimum load applies rather than the daytime minimum, with its citation

### Requirement: The threshold dataset is registered
The jurisdiction threshold records SHALL be a registered dataset with gridprims as publisher, CC BY 4.0 as its license, each row crediting its own primary sources, the last-checked date as the as-of date, and downloadable rows, so anyone can audit or reuse the comparison.

#### Scenario: Comparison downloadable
- **WHEN** a researcher opens the state comparison
- **THEN** the rows are downloadable with every citation and last-checked date, under CC BY 4.0, crediting the underlying tariffs and rules

### Requirement: Freshness
Each jurisdiction's screen record SHALL show when it was last checked against its sources, and a record unchecked for 12 months SHALL show a "needs review" chip.

#### Scenario: Stale jurisdiction
- **WHEN** a state's record was last checked 13 months ago
- **THEN** its thresholds show the chip and the last-checked date
