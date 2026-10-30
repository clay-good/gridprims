## Purpose

One page that says plainly what gridprims cannot do, what has not been checked, and what is known to be wrong or missing, generated from the project's own records so it cannot drift from reality.

## ADDED Requirements

### Requirement: The limits page exists and is reachable from every result
The site SHALL publish a limits page at a stable URL, linked from the footer of every page, from every work-zone strip, and from every tool's validation stamp. Its first screen SHALL state, in plain words, that gridprims gives screening estimates, that most tools have not been checked against real-world outcomes yet, and that the project depends on user reports to find its errors.

#### Scenario: Reached from a result
- **WHEN** a visitor taps the work-zone strip beside any answer
- **THEN** the limits page opens at the section for that tool

#### Scenario: First screen is the honest summary
- **WHEN** the limits page loads at 320 px
- **THEN** the first screen states the screening nature, the validation status in one sentence, and the invitation to report problems, without scrolling

### Requirement: What the page contains at each phase
The page SHALL ship in phase 0 with the sections whose inputs then exist: the honest summary, the cannot-do list, the validation level and known limitations of every tool published so far, and the unverified-claim register.

#### Scenario: Phase 0 page
- **WHEN** the limits page ships before the reference tool, which is the first tool phase 0 builds
- **THEN** it carries the summary, the cannot-do list, and the unverified-claim register, and says the per-tool table is empty until the first tool ships; once the reference tool lands, the same build gives it the table's first row

### Requirement: Sections not yet populated say so
Sections whose inputs arrive in a later phase SHALL appear as soon as those inputs do, and until then SHALL state that they are not yet populated and name what will populate them: evidence dates from continuous integration results, staleness and known-problem rows from the dataset ledger, and the corrections list from the corrections log.

#### Scenario: Section not yet populated
- **WHEN** the dataset ledger does not yet exist
- **THEN** the staleness section says so and names the change that will populate it, rather than appearing complete

### Requirement: Validation status table, generated
The page SHALL list every published tool with its validation level, the evidence behind that level, the date that evidence last passed in CI, and its known limitations, generated from the manifests and CI results rather than written by hand. The page SHALL also give the count of tools at each level.

#### Scenario: Launch reality
- **WHEN** the site launches with no field-verified tools
- **THEN** the page says plainly that no tool has yet been checked against a real bill or a utility's own study, and gives the counts at each lower level

#### Scenario: Stale evidence
- **WHEN** a tool's evidence last passed more than 90 days ago
- **THEN** its row shows the date with a yellow "needs a fresh run" chip

### Requirement: What we cannot do, with reasons
The page SHALL carry a curated list of capabilities gridprims does not and will not offer, each with the reason in one plain sentence and a citation where the reason is legal, licensing, data availability, or safety.

#### Scenario: Minimum contents
- **WHEN** the cannot-do list is built
- **THEN** it includes at least: anything needing a utility's circuit model (fault current, interrupting capability, voltage and power quality, transient stability); nodal or locational prices, which need a grid operator's own network model; any resource-adequacy figure (loss-of-load expectation, expected unserved energy, or an adequacy verdict), as distinct from the reliability indices we do compute from a user's own outage log; any pass-or-fail interconnection verdict; utility studies, engineering sign-off, legal, tax, or investment advice; real-time or operational grid data; forecasts of prices, loads, or peak days; anything requiring protected infrastructure information; and any feeder-level or address-level result **we** publish, as distinct from what a user computes from their own data on their own device

#### Scenario: Reason is cited
- **WHEN** a visitor reads why gridprims publishes no loss-of-load figure
- **THEN** the entry explains that unit-level forced-outage data is confidential, that the only freely locatable class averages we found are a 2010 vintage, and that one operator's otherwise-free feed forbids redistribution, with the sources and the note that this is an absence we could not fully verify

#### Scenario: Asked for something on the list
- **WHEN** a user asks a tool for a capability on the cannot-do list
- **THEN** the tool declines per `platform/tool-contract`, explains why in one sentence, and links this page's entry

### Requirement: Known problems and open questions, generated
The page SHALL list, from the project's records: whether the automation that keeps the site fresh is running or stalled, with the last successful run's date; every dataset currently past its staleness window with how late it is; every open correction and note of concern; every tool whose reference engine cannot check a charge type; and every dataset whose derived posture limits what we publish, with the terms that produced it.

#### Scenario: Automation stalled
- **WHEN** no scheduled refresh has succeeded for longer than its published interval
- **THEN** the limits page says the automation is stalled, gives the last successful run's date, and notes that every page's data is as old as that date

#### Scenario: Late dataset listed
- **WHEN** an emissions dataset is two years past its expected release
- **THEN** the page lists it with its expected and actual dates and the pages that use it

### Requirement: The unverified-claim register
The page SHALL list every research claim a shipped page depends on that is still unverified, from a curated machine-readable register (the research briefs stay prose; the register is the structured artifact) in which each entry names a claim id, the research brief and section, the pages or tools that rely on it, and what would confirm it. Each page or manifest SHALL declare the claim ids it relies on, and the build SHALL fail when a declared id has no register entry.

#### Scenario: Unverified dependency listed
- **WHEN** a shipped page relies on a research item still tagged unverified
- **THEN** the register entry names the claim, its brief and section, the page that uses it, and what would confirm it, and the page lists it

### Requirement: The three axes are distinguished
The page SHALL present stability, validation level, and practitioner review as three separate columns, and SHALL state in one sentence that they answer different questions, so a cross-checked tool with no practitioner review is not read as reviewed and an experimental tool is not read as unvalidated.

#### Scenario: Cross-checked but unreviewed
- **WHEN** a tool is stable, cross-checked, and has no sign-off record
- **THEN** its row shows those three values separately, and no column implies the others

### Requirement: What would change our mind, per tool
Each tool's entry SHALL state what evidence would raise its validation level: the specific comparison, ground truth, or review that is missing. The page SHALL invite the specific contributions that would supply it.

#### Scenario: Path to field-verified
- **WHEN** a visitor reads the bill explainer's entry
- **THEN** it says that three matched real bills with their tariff sheets would raise it to field-verified, and how to send one without sending personal data

### Requirement: Accuracy is never claimed beyond the evidence
The page SHALL carry no accuracy figure that CI did not produce, and every figure it does carry SHALL name its test set, tolerance, and date. Phrases implying review, certification, approval, or endorsement SHALL NOT appear anywhere on the site unless a record in `docs/review-signoffs.md` supports them.

#### Scenario: No invented accuracy
- **WHEN** the claims gate scans the limits page
- **THEN** every accuracy figure traces to a CI result with its date, or the build fails

#### Scenario: Unsupported endorsement phrase
- **WHEN** a page says a tool is "verified by" a party with no sign-off record
- **THEN** the claims gate fails and names the page and the phrase

### Requirement: Absence-of-review vocabulary is exempt
The claims lint SHALL exempt, by name, the generated vocabulary that states the **absence** of review: "Review pending", "Unreviewed", "Needs review", "Unvalidated", "Self-checked", "Unverified", and "not yet checked".

#### Scenario: Pending labels are not claims
- **WHEN** the claims gate scans a page showing "Review pending"
- **THEN** it passes, because that phrase is on the exempt list as a statement that review has not happened

### Requirement: Machine-readable
The page's contents SHALL also be published as a JSON file at a stable URL, with the same validation levels, limitations, cannot-do entries, and known problems, so agents and other sites can read our limits rather than infer them. The local agent server SHALL expose the same record as an MCP resource, so an agent can read our limits without one of the six tools being spent on it.

#### Scenario: Agent reads the limits
- **WHEN** an agent asks what gridprims cannot do
- **THEN** it receives the same cannot-do list and validation levels the page shows, from the same record

### Requirement: Dated and versioned
The page SHALL show the date it was generated and the release it describes, and each change to the cannot-do list SHALL appear in the public changelog.

#### Scenario: Capability added
- **WHEN** a capability moves off the cannot-do list because its blocker cleared
- **THEN** the changelog records the removal, the reason, and the date
