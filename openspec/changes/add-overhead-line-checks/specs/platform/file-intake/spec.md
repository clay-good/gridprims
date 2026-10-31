## MODIFIED Requirements

### Requirement: Drop anywhere, routed by content
Every page SHALL accept a dropped or chosen file. Intake SHALL detect the format from content, not only the extension, and route it to the matching workbench. Supported in v1: delimited text (CSV, TSV, semicolon), Excel workbooks (.xlsx, first sheet by default), Green Button ESPI XML, Green Button CSV, and the named utility export shapes in the foundation's fixture library (seeded from `docs/research/09` §1, for example Smart Meter Texas 15-minute CSV), each with a synthetic fixture. A delimited or Excel file whose header row matches the lines standards template or the pole list SHALL route to the lines workbench, and for Excel the first sheet with a matching header SHALL be read.

#### Scenario: CSV with a wrong extension
- **WHEN** a user drops a comma-separated file named `meter.txt`
- **THEN** intake recognizes it as delimited text and opens the load workbench

#### Scenario: Unsupported file
- **WHEN** a user drops a PDF bill
- **THEN** intake says PDF bills are not read in v1 and links to the instructions for downloading interval data or Green Button from the user's utility

#### Scenario: Pole list dropped on the home page
- **WHEN** a user drops a CSV whose header is `pole_id, owner, kind, height, note`
- **THEN** intake opens the attachment height tool with the list loaded, not the load workbench

#### Scenario: PDF standards
- **WHEN** a user drops a PDF of construction standards on a lines tool
- **THEN** intake says PDF standards are not read and links to the standards template
