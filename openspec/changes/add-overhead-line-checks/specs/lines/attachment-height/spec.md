## Purpose

Finds where one new communication line can attach on an existing pole. If it doesn't fit, it gives the fewest moves of other communication lines that make room, or the replacement pole length needed, checked against the rules the user loaded.

## ADDED Requirements

### Requirement: Height for a new attachment
From a pole's existing attachments (kind, owner, and height) and the loaded rules, the tool SHALL find every whole-inch height that keeps the required separation from each neighbor, by kind and voltage, and the required height above ground. It SHALL pick one by placement preference (default `highest`), and answer with an instruction in feet and inches plus each value it relied on and that value's source. Heights in the scenarios are exact to the inch (tolerance 0 in.).

#### Scenario: It fits as is
- **WHEN** the rules require 40 in. below the neutral, 12 in. between communication lines, and 18 ft above ground, and the pole has a neutral at 30 ft 2 in, cable TV at 24 ft 0 in, and telephone at 23 ft 0 in
- **THEN** the answer is "Attach at 26 ft 10 in. No other line needs to move."

#### Scenario: Sources shown
- **WHEN** that answer is shown
- **THEN** it lists 40 in. and 12 in. with the file row (or rule source) each came from

#### Scenario: Separation depends on the supply above
- **WHEN** the lowest supply attachment is a secondary, and the file has a `sep.secondary.comm` row but no `sep.neutral.comm` row
- **THEN** the space is measured from the secondary using `sep.secondary.comm`

#### Scenario: Primary voltage outside the file's range
- **WHEN** the lowest supply is a 34.5 kV primary and the file's `sep.primary.comm` rows cover only 0 to 8.7 kV
- **THEN** the check is refused, naming the missing voltage range

### Requirement: Inputs fit the simplicity budget
The first screen SHALL hold at most three inputs: rule source, existing attachments (a list), and the new line's kind. Pole length, placement preference, and a pole-list file SHALL sit under "More options". The page SHALL have one chart: a pole elevation drawing of attachments, the communication space, and the answer, with a text summary and a table view.

#### Scenario: First screen
- **WHEN** the manifest is validated
- **THEN** `firstScreen` lists rule source, existing attachments, and new line kind, and nothing else

### Requirement: Moves that make room
When no height fits, the tool SHALL search moves of existing communication lines within the communication space, at most two moves, where each moved line keeps every separation and no move creates a shortfall. Plans SHALL be ranked as in design D4. The best plan SHALL be given as ordered steps naming each owner, distance, and new height, with the next-best plan as an option. Supply attachments SHALL NOT move.

#### Scenario: One move makes room
- **WHEN** the rules require 40 in. below the neutral, 12 in. between communication lines, and 24 ft above ground, and the pole has a neutral at 30 ft 2 in, cable TV at 26 ft 4 in, and telephone at 24 ft 9 in
- **THEN** the answer is "Move the telephone line up 3 in. to 25 ft 0 in. Then attach at 24 ft 0 in."

#### Scenario: Ranked against other plans
- **WHEN** the same pole is checked
- **THEN** the cable TV move up 5 in., which also works, is listed as a second option, ranked lower because it moves 2 in. more

### Requirement: The move limit is ours, not the FCC's
The two-move limit SHALL be presented as a limit of our own, to keep plans readable, and results SHALL NOT call a plan simple or complex make-ready, which the FCC defines by outage and damage risk (47 CFR 1.1402(p) and (q)).

#### Scenario: No regulatory label
- **WHEN** a one-move plan is shown
- **THEN** it says moves are limited to two for readability, and nowhere calls the work simple or complex make-ready

### Requirement: Replacement pole length
When no plan of up to two moves makes room, the tool SHALL report the extra height needed above ground. When the pole's length and the rules' setting depth and length step are known, it SHALL give the shortest replacement length whose added height above ground covers the need. It SHALL state that supply attachments are assumed to move up by the same amount, and that replacement design is the pole owner's work.

#### Scenario: Pole too short
- **WHEN** the rules require 40 in. below the neutral, 22 ft above ground, a 5 ft length step, and setting depth of 10% of length plus 2 ft, and a 35 ft pole has a neutral at 25 ft 2 in and no communication lines
- **THEN** the answer is "No height fits. The pole needs 2 in. more height above ground. A 40 ft pole, 5 ft longer, gives 4 ft 6 in. more."

#### Scenario: Length unknown
- **WHEN** the same pole is checked without its length
- **THEN** the answer gives the 2 in. needed and asks for the pole's length to suggest a replacement length

### Requirement: Existing problems named, not blamed
Before placing the new line, the tool SHALL check existing attachments against the same rules and list each shortfall with its owner and amount, apart from the new line's answer.

#### Scenario: Existing line too close
- **WHEN** the rules require 40 in. below the neutral and cable TV sits 36 in. below it
- **THEN** the result lists "Cable TV is 4 in. closer to the neutral than your rules allow" as an existing condition, before the new line's answer

### Requirement: Messy attachment lists handled explicitly
Heights SHALL accept `22'4"` (straight or curly quotes), `22-4`, `22 ft 4 in`, `22.33 ft`, and meters, and SHALL be shown in the receipt in feet and inches. Kinds SHALL come from the fixed list in design D1; an unknown kind makes the row unreadable. Duplicate rows, two lines at the same height, a pole with no supply attachment, and a height that is negative or above the pole's length SHALL each be named in the receipt and never fixed silently.

#### Scenario: Metric height
- **WHEN** a height is entered as 6.81 m
- **THEN** it reads as 22 ft 4 in. in the receipt

#### Scenario: Two lines at one height
- **WHEN** the rules require 12 in. between communication lines, and cable TV and fiber are both entered at 24 ft 0 in
- **THEN** the receipt names both, and the existing-conditions list shows a 12 in. shortfall between them

#### Scenario: No supply attachment
- **WHEN** a pole list has a pole with only communication lines
- **THEN** that pole is not checked, and the receipt asks for the lowest supply height or confirmation that the pole carries no power, in which case the top of the space is the pole top

### Requirement: A list of poles from a field file
The tool SHALL accept a pole list (design D8), read in a worker with progress and cancel, and show one instruction per pole in a table that can be exported as CSV. Each row SHALL open that pole's in-page view; a share link from it SHALL carry no file rows. Rows it cannot read SHALL be listed with their row numbers and reasons. A list of 10,000 attachment rows SHALL be read and checked in under 2 s on the reference profile.

#### Scenario: Batch export
- **WHEN** a file with 120 poles is checked and exported
- **THEN** the CSV has 120 rows, each with the pole id, the instruction, any moves, any existing shortfalls, and the rule source and edition

#### Scenario: Unreadable row
- **WHEN** a row's height is "see photo"
- **THEN** that pole is listed as not checked, with the row number and "height could not be read"
