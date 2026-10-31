## Purpose

Lets a designer check lines against their organization's own construction standards, kept only on their device, or against public rules when they have none. Every required value shows where it came from.

## ADDED Requirements

### Requirement: Standards template
The site SHALL publish a standards template as CSV and Excel from one source, with the columns `rule_id, applies_to, value, unit, source_document, source_locator, note` and one row for each supported rule id (design D1). Each row SHALL describe its rule in plain words and give the matching NESC rule or table number, with the value left blank.

#### Scenario: Template rows match the supported rules
- **WHEN** the build runs
- **THEN** the CSV template, the Excel template, and the list of rule ids the checks read are identical, or the build fails

#### Scenario: Template ships no NESC values
- **WHEN** the build scans the template
- **THEN** every `value` cell is blank, and every NESC reference is a rule or table number only

### Requirement: Sample files open by default
A filled sample standards file for a fictional "Example Electric Co-op" and a sample pole list SHALL open by default, labeled as samples. Each sample value SHALL be labeled an example value and cite one captured public utility document.

#### Scenario: Sample is labeled
- **WHEN** a user opens the attachment tool without loading a file
- **THEN** the rule source reads "Sample: Example Electric Co-op", and each value links to its cited document

### Requirement: Standards stay on the device
A loaded standards file SHALL be read in the browser and SHALL stay in memory for the tab unless the user chooses "Keep this file on this device". It SHALL never be sent anywhere or encoded in a URL. Over MCP, the server SHALL read it only from a folder passed with `--allow-dir`.

#### Scenario: No request carries the file
- **WHEN** a standards file is loaded and three checks are run, with the egress sentinel watching
- **THEN** no network request contains any byte of the file

#### Scenario: Share link leaves the file out
- **WHEN** a user copies a share link after checking a pole with their own file
- **THEN** the link holds the typed pole inputs and the words "your standards file", and opening it asks for the file

#### Scenario: Problem report leaves rule values out
- **WHEN** a user sends a problem report from a check with "include inputs" ticked
- **THEN** the report holds the pole inputs and the rule source's name, but no value from the user's file or typed NESC values, and the preview says the report can't be reproduced without those rules

### Requirement: Standards receipt
Reading a standards file SHALL produce a receipt listing each rule read, with its value, unit, row, and source, converting units at the boundary. A rule the file leaves out SHALL disable only the checks that need it, and those checks SHALL name the missing rule.

#### Scenario: Missing rule
- **WHEN** a file has no `ground.road.comm` row
- **THEN** the midspan check over a road shows the sag and lowest point, says "your file has no road clearance for communication lines", and gives no pass or fail

### Requirement: Messy standards files handled explicitly
The reader SHALL never guess. Unknown rule ids SHALL be listed as ignored. A rule given twice with different values SHALL be refused, naming both rows, until the user picks one. A value with no unit SHALL be refused unless the unit is written inside the value (such as "40 in"). Mixed units SHALL be converted row by row. A value outside the rule's plausible range SHALL be flagged and still used as written. Blank and footer rows SHALL be skipped and counted.

#### Scenario: Unknown rule id
- **WHEN** a file has a row with rule id `sep.antenna.comm`
- **THEN** the receipt lists it as ignored with its row number, and no check uses it

#### Scenario: Conflicting rows
- **WHEN** rows 8 and 14 both set `sep.comm.comm`, to 12 in. and 6 in.
- **THEN** checks that need it are refused, naming rows 8 and 14, until the user picks one in the receipt

#### Scenario: Implausible value
- **WHEN** a file sets `sep.comm.comm` to 120 ft
- **THEN** the receipt flags it as likely a unit mistake (120 in.?), the value is used as written, and every result that relies on it repeats the flag

#### Scenario: Unit inside the value
- **WHEN** a row has value "40 in" and a blank unit
- **THEN** it reads as 40 in., and the receipt says the unit came from the value

#### Scenario: Excel with an instructions sheet
- **WHEN** a workbook's first sheet is instructions and its second has the template header
- **THEN** the second sheet is read, using cached values only, and the receipt names it

### Requirement: Public and entered rule sources
Besides a standards file, the user SHALL be able to choose California GO 95, NESC values they enter from their own copy (recording the edition, 2023 or 2028), or no rules, which gives geometry only. Sources MAY be layered in an order the user sets, and the receipt SHALL show which source filled each value.

#### Scenario: GO 95 value with its source
- **WHEN** a user picks GO 95 and checks a communication line crossing an urban thoroughfare
- **THEN** the required clearance is 18 ft, shown as "GO 95 Table 1, Case 3, Column B" with a link to the official text

#### Scenario: Coverage
- **WHEN** the dataset is built
- **THEN** it holds Table 1 Columns B and E for Cases 3, 4, and 5, and Table 2 Columns C to E for Cases 8 to 10

#### Scenario: Pedestrian area
- **WHEN** the same line crosses an area only pedestrians can reach
- **THEN** the required clearance is 10 ft, from Table 1, Case 5, Column B

#### Scenario: Layered sources
- **WHEN** a file lacks `ground.road.comm` and the user lets GO 95 fill gaps
- **THEN** the road clearance is 18 ft, labeled as coming from GO 95, not from the file

#### Scenario: No rules
- **WHEN** a user picks "No rules"
- **THEN** checks show heights, gaps, sag, and lowest point with no pass or fail, and the sentence says no rules were loaded

### Requirement: GO 95 values as curated facts
Each built-in GO 95 value SHALL be a curated fact in the registered `go95-clearances` dataset, citing the GO 95 table page and the CPUC decision that last revised it, each with a stored capture and its SHA-256, and labeled "California only". Each fact SHALL list the footnote letters on its table cell. Every result that uses it SHALL show "Exceptions not checked:" followed by those letters.

#### Scenario: Footnotes named
- **WHEN** a GO 95 check uses the 48 in. separation from Table 2, Case 8, Column E
- **THEN** the result shows "Exceptions not checked: (k)" with a link to the footnote text

### Requirement: GO 95 change watch
A weekly `go95-watch` workflow SHALL compare the table text extracted from the official GO 95 pages and the CPUC's GO 95 change list with the stored captures. A difference SHALL mark affected facts "needs review", with a yellow chip on every check that uses them, until a curated update with a new capture lands. No step SHALL wait on a person.

#### Scenario: Changed official text
- **WHEN** the extracted text of Table 1 no longer matches its stored capture
- **THEN** the facts from Table 1 show "needs review" with a yellow chip, and the pipeline health record names the change

### Requirement: Results never claim approval
Results from `lines.*` tools SHALL say whether a design fits the separations in the named rule source and edition, or by how much it falls short. They SHALL carry the screening strip "Screening check against the rules you loaded. The pole owner and a qualified engineer have the final word." They SHALL also say that pole loading was not checked. A request to judge whether a pole will hold SHALL be refused with a link to the engineering sign-off cannot-do entry.

#### Scenario: Banned wording
- **WHEN** the honest-claims gate scans `lines.*` strings and manifests
- **THEN** none contains "meets code", "code compliant", "compliant", "approved", or the word "safe", including in negated sentences, or the build fails

#### Scenario: Asked if the pole will hold
- **WHEN** an agent asks the attachment tool whether the pole is strong enough for the new line
- **THEN** the result is a refusal that links the engineering sign-off entry and the RUS 1724E-150 bulletin, with no estimate
