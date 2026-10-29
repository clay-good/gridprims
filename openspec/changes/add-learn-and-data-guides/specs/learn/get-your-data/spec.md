## Purpose

Gets people from "I have a smart meter" to "I have a file gridprims can read", utility by utility, honestly labeled by how well each path has been checked, with a fallback when no download exists.

## ADDED Requirements

### Requirement: One guide per covered utility
Each guide SHALL show: the utility (linked to its utility page), portal name, steps as menu paths in words for computer and phone, file formats offered (Green Button XML, Green Button CSV, utility CSV, Excel), interval length (5, 15, 30, or 60 min), history available (months), which file to choose for gridprims, and how to save it on iPhone and Android and then pick it in gridprims.

#### Scenario: Smart Meter Texas
- **WHEN** a visitor in Oncor's area opens their guide
- **THEN** it explains the Smart Meter Texas "Energy Data 15 Min Interval" report export, shows 15-minute CSV and Green Button XML as formats, and opens the bill tools with Oncor selected

### Requirement: Verification level and date on every guide
Every guide SHALL show its verification level, the date checked, and the source: `live-account` (a contributor downloaded a file on that date), `help-page` (the utility's own help page, linked), or `third-party` (shown in the work-zone strip as "Unverified: steps from a third-party guide"). Guides not re-checked for 12 months SHALL show a yellow "Needs review" chip.

#### Scenario: Unverified path
- **WHEN** a guide's steps come only from a third-party guide
- **THEN** the page shows the Unverified strip and asks readers to report what they see

#### Scenario: Stale guide
- **WHEN** a guide was last checked 13 months ago
- **THEN** it shows "Needs review" with the last-checked date

### Requirement: Launch coverage
At launch, guides SHALL exist for the 25 largest US distribution utilities by customers (EIA-861, using delivery customers for Texas wires utilities) and Smart Meter Texas, plus generic guides for the common co-op and municipal portals named in `docs/research/09`. A utility with no self-serve download SHALL get a page that says so and offers the fallbacks.

#### Scenario: No download found
- **WHEN** a Duke Energy Carolinas customer opens their guide
- **THEN** the page says no self-serve interval download was found as of the check date, and offers the request letter and the bill-totals tools

### Requirement: Fallback request letter
Every guide SHALL offer a short request the user copies and sends to their utility, asking for 12 to 24 months of interval data in Green Button or CSV format, with no personal data filled in by gridprims.

#### Scenario: Copy the request
- **WHEN** a user copies the request
- **THEN** the text asks for interval data, the format, and the date range, and leaves name and account number as blanks

### Requirement: Every named format is readable
Every file format a guide names SHALL have a matching synthetic fixture in the intake fixture library that parses with the expected receipt; a guide naming a format with no fixture SHALL fail the build.

#### Scenario: New utility CSV named
- **WHEN** a pull request adds a guide naming "Georgia Power hourly export (XLSX)" without a fixture
- **THEN** the build fails and asks for a synthetic fixture in that shape

### Requirement: Contributions without personal data
Guide changes SHALL arrive by pull request, pass a schema check whose only free-text fields are step text and notes, and contain no screenshots, downloaded files, account numbers, addresses, or meter ids; a lint SHALL reject runs of 8 or more digits and street-address patterns in any text field.

#### Scenario: Account number in a step
- **WHEN** a step's text contains "account 4471 2093 8812"
- **THEN** the lint fails and names the field

#### Scenario: Pull request with a screenshot
- **WHEN** a pull request adds an image under the guides folder
- **THEN** the data check fails and explains the text-only rule
