## Purpose

Answers the load-ratio screens honestly: as a range across the minimum-load assumption the utilities themselves use, showing whether the answer is settled or hinges on data nobody publishes.

## ADDED Requirements

### Requirement: The 15%-of-peak screen
Given the line section's annual peak load and the aggregate generation on that section including the proposed project, the tool SHALL compute the ratio as a percent to 0.1 and compare it with the rule's threshold using the comparison the rule writes (for the federal peak-load screen, the aggregate must not exceed 15%), showing the arithmetic, the comparison direction, and the citation.

#### Scenario: Over the threshold
- **WHEN** aggregate generation is 500 kW on a line section with a 2,000 kW annual peak and the threshold is 15%
- **THEN** the ratio is 25.0% and the screen is reported not met, with the comparison shown

### Requirement: The minimum-load screen as a band
Where a screen compares proposed generation with minimum load and the user does not have a utility-provided minimum load, the tool SHALL compute the screen across the assumption band, report the result at both ends using the comparison the rule writes (for the federal supplemental screen, generation must be less than 100% of minimum load), and name the assumption at which the result flips.

#### Scenario: Exactly at the threshold
- **WHEN** proposed generation equals the minimum load exactly on a screen the rule writes as "less than 100% of minimum load"
- **THEN** the screen is reported as not met, and the result names the boundary

#### Scenario: Answer flips inside the band
- **WHEN** a 500 kW project is screened against 100% of minimum load on a line section with a 2,000 kW annual peak
- **THEN** the tool reports the screen met at a 40% assumption (800 kW minimum load) and not met at a 15% assumption (300 kW), and names 25% of peak as the assumption where it flips

#### Scenario: Settled either way
- **WHEN** a 60 kW project is screened on the same line section
- **THEN** the tool reports the screen met across the whole band and says the assumption does not change the answer

### Requirement: The band applies to daytime minimum load only
The 15%-to-40%-of-peak band is the assumption utilities apply to **minimum daytime load**, so it SHALL be used only for screens that turn on daytime minimum load. Where the applicable rule turns on **absolute** minimum load (which governs a project whose storage can export at night, per `interconnect/screen-explainer`), the tool SHALL say that the daytime band does not apply, SHALL NOT substitute it, and SHALL require a utility-provided value or report the screen as unanswerable.

#### Scenario: Storage project
- **WHEN** a solar-plus-storage project that can export at night is screened and no utility minimum load is available
- **THEN** the tool says the rule turns on absolute minimum load, that the daytime band does not apply, and reports the screen as unanswerable without utility data

### Requirement: Why the band exists, and whose numbers it is
The tool SHALL state that minimum daytime load is unavailable for most feeders, that the band comes from the assumptions utilities themselves apply, and SHALL name per-utility assumptions where recorded, each cited.

#### Scenario: Per-utility assumption named
- **WHEN** the user's utility has a recorded minimum-load assumption
- **THEN** it is shown as that utility's own assumption with its citation, alongside the band

### Requirement: State fallbacks, by technology and only when confirmed
A state that codifies a fallback percentage in its rules SHALL have that value shown as the state's own, separately from the band, with its own citation; where a state's rule splits the fallback by generator technology, every value SHALL be shown against its technology.

#### Scenario: Technology-split fallback
- **WHEN** a state's rule sets one percentage for inverter-based generators and another for rotating machines
- **THEN** both are shown against their technology as that state's rule, with its citation, separately from the band

### Requirement: A fallback appears only once its rule text is archived
A fallback SHALL be published as a state rule only when its entry carries the rule's own archived text per `trust/curated-contributions`; otherwise the band is shown with a note that a state fallback may exist and is not yet sourced. The check is automatic and nothing waits on a person.

#### Scenario: Rule text not archived
- **WHEN** a state's fallback has no archived rule text
- **THEN** the band is shown with that note, and the build does not wait or fail

#### Scenario: Codified fallback
- **WHEN** a user's state writes a percentage-of-peak fallback into its rules, with different values for inverter-based and rotating generators
- **THEN** each value is shown against its technology as the state's rule with its citation, alongside the band, and the result at the value matching the user's technology is given

#### Scenario: Unconfirmed fallback withheld
- **WHEN** a state's fallback is recorded only from a secondary source
- **THEN** it is not published as that state's rule, and the band is shown instead with a note that a state fallback may exist and is being verified

### Requirement: Real minimum load overrides the band
When the user enters a utility-provided minimum load, the tool SHALL use it, SHALL label the result as based on utility data, SHALL record whether the utility marked it measured or estimated when that flag is published, and SHALL show the band only as context.

#### Scenario: Published feeder value used
- **WHEN** a user's utility publishes per-feeder minimum load openly and the user enters their feeder's published value
- **THEN** the screen is computed on it, labeled as utility-published with the source and the date the user read it, and the measured-or-estimated flag is shown where the utility publishes one

#### Scenario: Pre-application report in hand
- **WHEN** a user enters a minimum daytime load from a pre-application report
- **THEN** the screen is computed on that value, labeled as utility-provided, and the band is shown only for comparison

### Requirement: Peak load is the user's input, never ours
The tool SHALL require the line section's annual peak load as a user input from a utility document or a hosting-capacity map, SHALL NOT estimate it, and SHALL NOT hold or publish any feeder's peak load.

#### Scenario: No peak load available
- **WHEN** a user has no line section peak load
- **THEN** no load-ratio result is produced, and the tool links to `interconnect/feeder-data-paths`

### Requirement: Verification
The screen arithmetic SHALL be checked against hand-computed fixtures, which are the standing gate, and, where a freely published worked screen example from a utility, a state commission, or a government laboratory report is located and its vintage read, against that example too for at least 6 cases spanning over-threshold, under-threshold, flips-inside-the-band, settled-both-ways, utility-provided minimum load, and a codified state fallback, matching exactly to 0.1 percentage point.

#### Scenario: Fixture set
- **WHEN** CI runs the six fixtures
- **THEN** every ratio and every met-or-not-met result matches the stored hand computation, and any registered published example reproduces within its printed precision
