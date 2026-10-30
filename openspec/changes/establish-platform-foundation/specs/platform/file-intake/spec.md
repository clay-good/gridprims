## Purpose

One safe front door for user files: it recognizes the format, parses it on the device, and shows a receipt of every assumption so the user can correct it before trusting any result.

## ADDED Requirements

### Requirement: Drop anywhere, routed by content
Every page SHALL accept a dropped or chosen file. Intake SHALL detect the format from content, not only the extension, and route it to the matching workbench. Supported in v1: delimited text (CSV, TSV, semicolon), Excel workbooks (.xlsx, first sheet by default), Green Button ESPI XML, Green Button CSV, and the named utility export shapes in the foundation's fixture library (seeded from `docs/research/09` §1, for example Smart Meter Texas 15-minute CSV), each with a synthetic fixture.

#### Scenario: CSV with a wrong extension
- **WHEN** a user drops a comma-separated file named `meter.txt`
- **THEN** intake recognizes it as delimited text and opens the load workbench

#### Scenario: Unsupported file
- **WHEN** a user drops a PDF bill
- **THEN** intake says PDF bills are not read in v1 and links to the instructions for downloading interval data or Green Button from the user's utility

### Requirement: Parsing happens off the main thread with limits
Files SHALL be parsed in a worker on the device. Intake SHALL accept files up to 200,000,000 bytes and SHALL warn above 50,000,000 bytes. A parse of 35,040 rows (one year of 15-minute data) SHALL finish in under 1 second on the reference profile defined in `platform/app-shell`, which is the one reference machine the whole project uses.

#### Scenario: Large file
- **WHEN** a user drops a 120 MB multi-meter CSV
- **THEN** the page stays responsive, shows parse progress, and the user can cancel

### Requirement: Parsers make no network requests
Parsers SHALL NOT fetch anything referenced in a file. An XML file that contains a DTD or any entity declaration SHALL be refused as a whole. Spreadsheet parsing SHALL ignore external links and SHALL NOT evaluate formulas beyond reading cached values.

#### Scenario: XML with an external entity
- **WHEN** a Green Button XML file declares an external entity
- **THEN** nothing is fetched, the file is refused, and the message explains that Green Button files never need a DTD and asks for a fresh export

### Requirement: Parse receipt
After every parse, intake SHALL show a receipt of what it read and assumed: file and rows (name, size, rows read, rows skipped and why), columns and time (timestamp and value columns, interval length, whether stamps mark interval start or end, time zone, date range), values (kW or kWh, unit), quality (gaps, duplicates, daylight-saving handling), and parse time in milliseconds. Every detected choice SHALL be changeable from the receipt, and changing one SHALL re-run every result.

#### Scenario: Ambiguous kW or kWh column
- **WHEN** a column header says only "Usage" and values are consistent with either interpretation
- **THEN** the receipt states which interpretation was assumed and why, and offers a one-tap switch

#### Scenario: Interval-ending stamps
- **WHEN** an hourly CSV labels hours 1 to 24 or contains a "24:00" stamp
- **THEN** the receipt says "timestamps mark the end of each interval", shifts them to interval start, and offers a one-tap switch that re-runs every result

#### Scenario: Wrong time zone corrected
- **WHEN** the user changes the time zone on the receipt from Eastern to Central
- **THEN** every chart, peak time, and tariff window result recomputes using Central time

### Requirement: Messy files handled explicitly
Intake SHALL handle and report: header rows and footers, multiple meters in one file (one series per meter, user picks), mixed interval lengths, missing intervals, duplicate timestamps, the daylight-saving spring gap and fall repeat, negative values (export), and partial years. It SHALL NOT silently fill, drop, or average data; any repair SHALL be listed on the receipt with a count.

#### Scenario: Fall-back hour
- **WHEN** a 15-minute file contains the repeated 1:00–2:00 am hour on the November DST change
- **THEN** both hours are kept as distinct intervals and the receipt reports "4 repeated intervals kept (DST fall back)"

#### Scenario: Spring-forward day
- **WHEN** a local-time 15-minute file has no 2:00–3:00 am intervals on the March DST change
- **THEN** no gap is reported for that hour and the receipt says "spring-forward hour absent, as expected"

#### Scenario: Conflicting duplicates
- **WHEN** two rows share a timestamp outside the fall-back hour with 120 kW and 135 kW
- **THEN** the receipt reports one conflicting duplicate, keeps 135 kW for demand results, and names the rule

#### Scenario: Mixed units across meters
- **WHEN** one meter's column says Wh and another's says kWh
- **THEN** each series is converted to kWh on its own and the receipt lists each unit read

#### Scenario: Two meters and a partial year
- **WHEN** a file holds meters A and B and covers 7 months
- **THEN** the receipt lists both meters for the user to pick or aggregate, and states "7 months of data"

#### Scenario: Gaps
- **WHEN** a file is missing 96 consecutive 15-minute intervals
- **THEN** the receipt reports one gap of 24 hours with its dates, and peak and bill results state that the gap is excluded

### Requirement: Green Button fields read by the standard
The Green Button reader SHALL follow the Apache-2.0 ESPI schema (`espi.xsd` 4.0), citing each handled element's schema type and enumeration, and SHALL scale every value by its ReadingType `uom` and 10^`powerOfTenMultiplier` and SHALL never assume watt-hours; SHALL keep delivered (`flowDirection` 1) and received (`flowDirection` 19) channels as separate series; and SHALL read `intervalLength` and `duration` in seconds.

#### Scenario: Only the 4.0 schema is implemented
- **WHEN** the reader is built
- **THEN** it implements `espi.xsd` 4.0 only, because the published 4.1 schema still declares version 3.3.20190408 and no file is known to declare 4.1; a 4.1 branch is added when such a file is seen

#### Scenario: Kilowatt-hour multiplier
- **WHEN** a file declares `uom` 72 (Wh) with `powerOfTenMultiplier` 3
- **THEN** a value of 2 is read as 2 kWh, and the receipt shows the unit and multiplier

#### Scenario: Independent schema check
- **WHEN** CI validates the Green Button fixtures
- **THEN** each matches a receipt computed by hand from the schema's field definitions, and each element we read is checked against the schema's declared type and enumeration by our own narrow checker rather than a general schema validator

#### Scenario: No paywalled source required
- **WHEN** a reviewer traces any Green Button behavior to its source
- **THEN** every element cites the open schema, an openly licensed sample file, or a cited utility document, and nothing cites purchased text

#### Scenario: Solar export channel
- **WHEN** a file has both `flowDirection` 1 and 19 readings
- **THEN** the receipt lists two series, delivered and received, and no tool nets them before computing demand

### Requirement: Green Button local time from the file
The Green Button reader SHALL take local time from the file's `LocalTimeParameters` (`tzOffset`, `dstOffset`, and the DST start and end rule bitfields) rather than the browser's time zone, and SHALL show both on the receipt when they differ.

#### Scenario: Traveling user
- **WHEN** a user in Eastern time opens a file whose `LocalTimeParameters` give Pacific time
- **THEN** times are shown in Pacific time, and the receipt notes the device is in Eastern time

### Requirement: Files are never stored without consent
Loaded files SHALL live only in memory for the tab unless the user chooses "Keep this file on this device", which stores it locally and lists it in settings for deletion.

#### Scenario: Reload forgets the file
- **WHEN** a user reloads the page without choosing to keep the file
- **THEN** the workbench shows the sample file, not the user's file
