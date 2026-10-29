## Purpose

Defines the manifest every gridprims tool publishes and the behavior every tool page guarantees, so hundreds of tools behave as one product.

## ADDED Requirements

### Requirement: Every tool publishes a manifest
Each tool SHALL publish a manifest with: id (`<domain>.<group>.<operation>`), title, purpose, archetype, inputs (unit, canonical unit, range, example value), outputs (unit, rounding), method, assumptions, citations, dataset ids, worked examples, related tools, handoff links, and stability. The page, command-bar entry, MCP description and schemas, and docs SHALL be generated from the manifest; none SHALL restate a field by hand.

#### Scenario: Missing citation blocks the build
- **WHEN** a tool manifest has no citation
- **THEN** the build fails and names the tool id and the missing field

#### Scenario: Page and manifest agree
- **WHEN** the build renders a tool page
- **THEN** every input label, unit, and citation on the page matches the manifest byte for byte

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
Every result SHALL render as a big number with its unit plus one plain sentence at reading grade 8 or below on the site's own Flesch-Kincaid check (`add-learn-and-data-guides` design D4). Every numeric output SHALL state its unit and SHALL be rounded to the precision declared in the manifest.

#### Scenario: Unit shown with every number
- **WHEN** a result is displayed or copied
- **THEN** every number in it carries a unit or is explicitly unitless (a ratio or percent)

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
