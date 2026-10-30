## Purpose

Defines the manifest every gridprims tool publishes and the behavior every tool page guarantees, so hundreds of tools behave as one product.

## ADDED Requirements

### Requirement: Every tool publishes a manifest
Each tool SHALL publish a manifest with: id (`<domain>.<group>.<operation>`), title, purpose, archetype, inputs (unit, canonical unit, range, example value), outputs (unit, rounding), method, assumptions, citations, dataset ids, worked examples, related tools, handoff links, stability, validation level with its evidence (`platform/citations-and-verification`), and known limitations.

#### Scenario: Manifest fields present
- **WHEN** a tool manifest is validated
- **THEN** every listed field is present, and a missing validation level, limitations list, or citation fails the build naming the tool and the field

### Requirement: Every surface is generated from the manifest
The page, command-bar entry, MCP description and schemas, and docs SHALL be generated from the manifest; none SHALL restate a field by hand.

#### Scenario: One source for every surface
- **WHEN** a manifest's input unit changes
- **THEN** the page, the command-bar entry, the MCP schema, and the docs all change with it in the same build

#### Scenario: Missing citation blocks the build
- **WHEN** a tool manifest has no citation
- **THEN** the build fails and names the tool id and the missing field

#### Scenario: Page and manifest agree
- **WHEN** the build renders a tool page
- **THEN** every input label, unit, and citation on the page matches the manifest byte for byte

### Requirement: Stable means cross-checked
A tool SHALL NOT be marked stable below validation level 2 (cross-checked) as `platform/citations-and-verification` defines it. A tool at unvalidated or self-checked SHALL ship labeled experimental or not at all, and the build SHALL fail when a manifest claims stable at a lower level.

#### Scenario: Stable claimed at self-checked
- **WHEN** a manifest declares stability "stable" with validation level 1
- **THEN** the build fails and names the tool, its level, and the level stable requires

#### Scenario: Launch expectation
- **WHEN** the limits page is generated at launch
- **THEN** every stable tool reads cross-checked, no tool reads field-verified, and every tool below cross-checked carries the "Preview" label

### Requirement: Every tool works on both surfaces
A tool SHALL NOT be marked stable until its worked examples pass on the website and through the local MCP server with identical structured results.

#### Scenario: Web-only tool
- **WHEN** a tool passes its examples in the browser but fails through the MCP server
- **THEN** its stability stays experimental and the catalog says why

### Requirement: Tools open in a worked state
Every tool page SHALL load with its first worked example already computed and visible, labeled "Example values". File workbenches SHALL load a labeled sample file.

#### Scenario: First paint shows an answer
- **WHEN** a visitor opens any tool page
- **THEN** the answer card shows the example result without any user action, and the label "Example values" is visible next to it

### Requirement: Results are plain sentences with units
Every result SHALL render as a big number with its unit plus one plain sentence at reading grade 8 or below on the site's own Flesch-Kincaid check, whose module is built in phase 0 with the shell and reused by `add-learn-and-data-guides` later. Every numeric output SHALL state its unit and SHALL be rounded to the precision declared in the manifest.

#### Scenario: Unit shown with every number
- **WHEN** a result is displayed or copied
- **THEN** every number in it carries a unit or is explicitly unitless (a ratio or percent)

### Requirement: One file, one set of numbers
Every tool that reads a loaded file SHALL read the one canonical interval series intake produced, with the receipt's current choices, and SHALL NOT re-parse the file or derive its own series. Any quantity more than one tool reports (peak demand and its timestamp, total energy, load factor, monthly peaks, interval count) SHALL be computed once in the shared core, and CI SHALL fail when two surfaces or two tools report different values for the same fixture.

#### Scenario: Peak agrees everywhere
- **WHEN** a fixture is loaded and the workbench, the bill, the carbon tab, and the service-headroom report each state the March peak
- **THEN** all four show the same kW value and the same timestamp

#### Scenario: Receipt change propagates
- **WHEN** the user changes the assumed time zone on the receipt
- **THEN** every tool's results recompute from the rebuilt series, and none keeps a value from the previous assumption

### Requirement: Precision never exceeds the inputs
Each manifest SHALL declare the rounding of every output, and no output SHALL be shown or copied with more precision than its inputs and method support. A result that depends on a user-entered or published value SHALL NOT be shown to more significant figures than that value carries.

#### Scenario: Coarse rate entered
- **WHEN** a user enters a transmission rate of "$4" per kW-month, carrying one significant figure, and the raw product is $44,400.00
- **THEN** the result is shown as $40,000, with a note that the rate's single significant figure limits it, and entering "$4.00" instead yields $44,400

#### Scenario: Copied card matches the page
- **WHEN** a result card is copied
- **THEN** every number in the text is rounded exactly as shown on the page

### Requirement: Refusals are first-class answers
A tool asked for a capability on the published cannot-do list SHALL decline, state the reason in one plain sentence, link that list's entry, and SHALL NOT produce an estimate in its place. A refusal SHALL be a normal result on both surfaces, not an error.

#### Scenario: Refused capability
- **WHEN** a user or an agent asks a tool for a resource-adequacy figure
- **THEN** the tool returns a refusal naming the reason and linking the limits page entry, and no number is produced

### Requirement: Screening label
Every tool whose output could be mistaken for an engineering study, a bill, or a utility determination SHALL show a one-line screening label next to the answer stating what the result is not and who decides (for example: "Screening estimate. Your utility's study is the final word.").

#### Scenario: Battery savings label
- **WHEN** a battery savings estimate is shown
- **THEN** the screening label is visible in the same card as the dollar figure

### Requirement: Handoffs to deeper tools
Each manifest SHALL list handoff links to the free tool that goes deeper (for example, REopt for full storage and solar optimization, Interconnection.fyi for live queue status, roughlogic.com for building wiring). Handoffs SHALL be plain links that carry no user data.

#### Scenario: Handoff carries no inputs
- **WHEN** a user follows a handoff link from the load workbench
- **THEN** the destination URL contains no value the user entered or loaded

### Requirement: Shareable state in the fragment
A tool's inputs SHALL be encodable in the URL fragment so a result can be shared and reproduced. File contents SHALL never be encoded in a URL.

#### Scenario: Shared link reproduces a calculator result
- **WHEN** a user opens a copied calculator link in a new browser
- **THEN** the same inputs and the same result appear

### Requirement: Stable, versioned results
Each tool SHALL carry a version. A change that alters any output for the same input SHALL bump the version and SHALL be listed in the public changelog with the reason.

#### Scenario: Corrected formula
- **WHEN** a defect fix changes a result
- **THEN** the tool version increases and the changelog names the tool, the old and new values for a sample input, and the reason

### Requirement: Reused routines live in the shared core too
A derived routine more than one tool runs SHALL exist once in the shared core and SHALL be named in the manifest of every tool that calls it, so the one-implementation rule covers methods as well as quantities.

#### Scenario: The two known shared routines
- **WHEN** the manifests are built
- **THEN** the monthly-threshold dispatch names `load/storage-and-solar-screen` and `electrify/ev-fleet-charging` as its callers, and the load-shift what-if names `load/tariff-comparison`, `household/plan-finder`, and `carbon/cleanest-hours`, each pointing at one shared-core module

