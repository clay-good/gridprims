## Purpose

Turns the bill comparisons state commissions already publish into a free, dated, machine-readable national reference, with every figure traceable to the page it came from.

## ADDED Requirements

### Requirement: Dataset and provenance
The dataset SHALL contain, per row: state, commission, utility, tariff or service class as named in the source, consumption level with its unit, the published bill amount, the effective date the source states, the source document title and date, and the page the figure appears on.

#### Scenario: Row fields present
- **WHEN** a row is validated
- **THEN** every listed field is present, and a row missing its consumption level, its source document, or its page fails the check

### Requirement: Registered per commission
The dataset SHALL be registered with each state commission named as the source publisher (for example the Florida Public Service Commission's comparative rate reports, the Indiana Utility Regulatory Commission's residential bill survey, and the Public Utility Commission of Texas's monthly reports), the redistribution basis recorded per state as a public record, the source document date as the as-of date, and our extracted table published under CC BY 4.0 crediting each commission.

#### Scenario: Registry entry
- **WHEN** a visitor opens the ground-truth dataset in the data library
- **THEN** it names each contributing commission, the per-state redistribution basis, the source dates, and CC BY 4.0 on our extraction

#### Scenario: Row provenance
- **WHEN** a visitor inspects any ground-truth figure
- **THEN** it shows the commission, the document, its date, and the page, and links the document

#### Scenario: Redistribution basis per state
- **WHEN** a state's publication carries terms that restrict reuse
- **THEN** that state's rows are excluded and the registry records why

### Requirement: Extraction is reviewed and its error rate published
Figures extracted from published documents SHALL pass the curated-contribution rules (primary source, archive link, and either a second reviewer or two independent sources). A hand-checked random sample of at least 100 rows SHALL be re-read by a person each release, and the measured extraction error rate SHALL be published with the release.

#### Scenario: Extraction error rate published
- **WHEN** a release ships
- **THEN** it states the sample size, the number of rows found wrong on re-reading, and the resulting error rate with its date

#### Scenario: Figure that cannot be read confidently
- **WHEN** a value in a source document is ambiguous or illegible
- **THEN** the row is omitted and recorded in the release notes rather than guessed

### Requirement: What these figures do and do not prove
Every page and download SHALL state that these comparisons cover fixed consumption levels for mostly residential flat service, that commissions compute them on their own stated assumptions (which the row records where the source gives them), and that they prove nothing about time-of-use, demand, ratchets, holidays, or power factor.

#### Scenario: Limits stated
- **WHEN** a visitor opens the ground-truth dataset
- **THEN** the limits sentence appears before the table

### Requirement: Assumptions are captured where stated
Where a source states its assumptions (taxes included or excluded, riders and fuel adjustments included, the month or season the figure applies to, single-phase service), the row SHALL record them; where it does not, the row SHALL record that they are unstated.

#### Scenario: Unstated taxes
- **WHEN** a commission's table does not say whether taxes are included
- **THEN** the row records taxes as unstated, and vectors built from it widen their tolerance and say why

### Requirement: Coverage published
Each release SHALL publish how many states, commissions, utilities, and consumption levels it covers, and which states are absent and why (no publication found, restrictive terms, or not yet extracted).

#### Scenario: Missing state named
- **WHEN** a state publishes no bill comparison
- **THEN** the coverage table lists it as having no publication found, with the date we last looked
