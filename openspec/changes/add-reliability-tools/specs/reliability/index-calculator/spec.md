## Purpose

Turns a utility's own outage log into the reliability indices it must report, with every assumption and exclusion visible, so an annual spreadsheet chore becomes a few minutes of checking.

## ADDED Requirements

### Requirement: Outage log intake
The tool SHALL accept an outage log through the existing file intake and SHALL require, per event, an interruption start, a restoration time or duration, and the number of customers interrupted. Optional fields SHALL include cause, feeder, device, and whether the interruption was planned. The receipt SHALL show the mapping it chose for every column and let the user change it.

#### Scenario: Column mapping corrected
- **WHEN** a log's "Cust Out" column is mapped as cause
- **THEN** the user changes it to customers interrupted on the receipt and every index recomputes

#### Scenario: Required field missing
- **WHEN** a log has no customer count
- **THEN** no index is computed and the message names the missing field and what the indices need it for

### Requirement: Log errors that wreck the math are caught
Intake SHALL detect and report, per event: a restoration time before the interruption start; rows overlapping in time on the same device or feeder; several rows describing one interruption's partial restorations; and durations crossing midnight or a daylight-saving change. Partial-restoration rows SHALL be summed as customer minutes rather than counted as separate interruptions when the user confirms they belong to one event, and nothing SHALL be merged or dropped silently.

#### Scenario: Restore before start
- **WHEN** an event's restoration time precedes its start
- **THEN** the event is reported as invalid, excluded from every index, and listed on the receipt

#### Scenario: Partial restorations
- **WHEN** three rows show 300, 200, and 100 customers restored at different times for one interruption
- **THEN** the tool asks whether they are one event, and on confirmation counts 600 customers interrupted once with their customer minutes summed

#### Scenario: Crossing midnight
- **WHEN** an interruption starts at 23:30 and ends at 01:15
- **THEN** its duration is 105 minutes, and the daily attribution rule in `reliability/major-event-days` decides which day it counts toward

### Requirement: Customers served and the reporting period
The user SHALL enter customers served (the index denominator) and the reporting period, and the tool SHALL state which figure it used and ask the user to confirm it matches what they report, because the federal form asks for the total number of customers served without prescribing how to average it. A log whose events fall outside the stated period SHALL be reported and excluded.

#### Scenario: Events outside the period
- **WHEN** 12 logged events fall before the reporting period starts
- **THEN** the receipt reports 12 events excluded as outside the period

### Requirement: Sustained-interruption indices
The tool SHALL compute, for the reporting period: customers interrupted per customer served; customer minutes of interruption per customer served; average minutes per customer interrupted; and service availability as a percent. Each SHALL be shown with its unit, its formula, and the counts that produced it.

#### Scenario: Formula and counts shown
- **WHEN** an index is displayed
- **THEN** its unit, its formula, and the customer and minute counts that produced it are visible beside it

### Requirement: Each index cites its own source
The two indices the federal form collects SHALL be cited to that form's instructions; the others SHALL be cited to the free published sources recorded in `docs/derivations/reliability.md`. No index SHALL be attributed to a source that does not define it.

#### Scenario: Availability citation
- **WHEN** service availability is shown
- **THEN** its citation names the free published source that defines it, not the federal form, which does not collect it

### Requirement: Declared rounding per index
Each index SHALL be rounded as its manifest declares: interruptions per customer to 0.01, minutes to 0.1, and availability to 4 decimal places as a percent, and no index SHALL be shown to more figures than its inputs support.

#### Scenario: Rounding applied
- **WHEN** an index is displayed and copied
- **THEN** both carry the manifest's declared rounding for that index

#### Scenario: Annual indices
- **WHEN** 18,000 customer interruptions and 2,400,000 customer minutes are logged against 12,000 customers served for a full year
- **THEN** the results are 1.5 interruptions per customer, 200.0 minutes per customer, 133.33 minutes per interrupted customer, and 99.9619% availability

### Requirement: The five-minute threshold is stated and changeable
Interruptions longer than 5 minutes SHALL count as sustained, matching the federal form's definition. The receipt SHALL state the threshold and the number of logged events below it. The user MAY set a different threshold for a state rule, which SHALL relabel every result with the threshold used.

#### Scenario: Momentaries excluded
- **WHEN** 340 logged events last 5 minutes or less
- **THEN** the receipt says 340 events were treated as momentary and excluded from the sustained indices

### Requirement: Momentary index where momentaries are logged
Interruptions of 5 minutes or less (that is, not longer than the sustained threshold) SHALL count as momentary, so every logged event is exactly one of sustained or momentary. Where the log contains momentary interruptions, the tool SHALL compute the momentary interruption index per customer served and SHALL state that many utilities do not log momentaries, so a low value may mean they were not recorded.

#### Scenario: No momentaries logged
- **WHEN** no event is 5 minutes or shorter
- **THEN** the momentary index reads "not computed: no momentary interruptions in this log" rather than zero

### Requirement: Indices needing per-customer records are unavailable, not estimated
Indices that count how many times each individual customer was interrupted, or how many experienced a long duration, SHALL be shown as unavailable with the records they would require, and SHALL NOT be estimated from per-event customer counts.

#### Scenario: Customers-experiencing-multiple-interruptions
- **WHEN** a user asks for the count of customers interrupted more than a set number of times
- **THEN** the tool says it needs per-customer interruption records, which the log does not contain, and does not approximate it

### Requirement: Planned, major, and excluded events
The tool SHALL report indices with all events, without planned interruptions, and without major event days (per `reliability/major-event-days`), as separate labeled results. It SHALL NEVER present one basis as another.

#### Scenario: Three bases shown
- **WHEN** indices are computed on a log containing planned work and two major event days
- **THEN** all three bases are shown with their labels and counts of excluded events

### Requirement: Federal form sheet
The tool SHALL produce a sheet listing each computed index against the line of the federal reliability schedule it belongs to, with that line's instruction text beside it, the basis used, and a statement that the filer is responsible for what they file. It SHALL be copyable and printable, and gridprims SHALL NOT submit it anywhere.

#### Scenario: Transcription sheet
- **WHEN** an engineer opens the form sheet
- **THEN** each index appears against its form line with the instruction text and the basis, and the only actions are copy and print

### Requirement: Feeder detail stays local
Breakdowns by feeder, device, or cause MAY be shown on screen but SHALL NOT appear in a URL, a copied result card, or a generated report unless the user explicitly includes them, and any breakdown row covering fewer than 100 customers SHALL be suppressed with the reason.

#### Scenario: Small feeder suppressed
- **WHEN** a feeder breakdown row covers 60 customers
- **THEN** the row is suppressed and the note explains that small groups are hidden

### Requirement: Verification
The calculator SHALL reproduce published worked examples of the sustained indices to the precision the source prints them (for example 2 decimal places where the source prints 2), with the tolerance recorded per fixture.

#### Scenario: Published precision respected
- **WHEN** a source prints an index as 2.02 and our computation gives 2.0164
- **THEN** the fixture passes at the source's 2-decimal precision and records that tolerance

### Requirement: Fixtures hold inputs, not published tables
Fixtures SHALL store a published example's **inputs** plus our own computed outputs and a citation to the source, never the source's published output values, so no copyrighted table is reproduced.

#### Scenario: Fixture contents
- **WHEN** a reviewer opens a reliability fixture
- **THEN** it contains the source's inputs, our expected outputs, and the citation, and no table copied from the source

### Requirement: Bad published examples are recorded, not used
Published examples found to be arithmetically wrong on recomputation SHALL be recorded in the method notes as unusable, with the recomputed values, and SHALL NOT be used as fixtures.

#### Scenario: Regression fixture
- **WHEN** CI runs the stored daily interruption fixture
- **THEN** every daily duration index matches the fixture's recorded expected value, which a maintainer computed from the source's inputs and checked against its printed values at their printed precision

#### Scenario: Bad published example recorded
- **WHEN** a maintainer recomputes a published example and finds it inconsistent
- **THEN** the method notes record the source, the published value, our recomputed value, and that it is not used
