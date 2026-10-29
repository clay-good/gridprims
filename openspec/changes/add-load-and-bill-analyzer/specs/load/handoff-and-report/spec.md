## Purpose

Lets users take results to their boss, their utility, or a deeper tool: a clean load file REopt accepts, a shareable result card, and a one-page report, all made on the device.

## ADDED Requirements

### Requirement: REopt-ready export
The tool SHALL export the cleaned load as a CSV in the shape REopt accepts for a custom load profile, per NLR's REopt documentation as verified in `docs/research/07`: one column of average kW values, no header, and exactly 8,760, 17,520, or 35,040 rows, with the calendar year stated in the notes file. It SHALL export a companion notes file listing every repair (gaps filled, DST handling, leap-day handling) with counts.

#### Scenario: Partial year
- **WHEN** the file covers fewer than 12 months
- **THEN** export is refused with an explanation that REopt needs a full year, and the tool suggests getting more history from the utility rather than inventing months

#### Scenario: Resolution mapping
- **WHEN** the file is 5-minute data
- **THEN** the export aggregates to 15-minute averages (35,040 rows) and the notes file says so; 15-, 30-, and 60-minute files export at their own resolution (35,040, 17,520, or 8,760 rows)

#### Scenario: Export from a messy file
- **WHEN** a user exports a file that had two gaps and a DST repeat
- **THEN** the CSV has exactly 8,760 hourly or 35,040 15-minute rows, and the notes file lists both gaps and the DST handling

#### Scenario: File not on a calendar year
- **WHEN** a file covers July 2025 to June 2026
- **THEN** the export re-stitches the months into calendar year 2026 order aligned by weekday (each day mapped to the same weekday in the target year), and the notes file lists the mapping

#### Scenario: Leap year
- **WHEN** the data covers calendar year 2024
- **THEN** the export drops December 31 (REopt's leap-year convention) to keep 8,760 hourly rows, and the notes file says so

### Requirement: Gap filling only for export
Gaps SHALL be filled only when the user exports, using a disclosed method (the same weekday and time from the nearest complete weeks before and after, averaged), and filled values SHALL never feed any other tool's results.

#### Scenario: Filled values stay in the export
- **WHEN** a user exports a file with a 6-hour gap and then returns to the bill tools
- **THEN** the bill still states the gap is excluded, and only the CSV contains filled values

### Requirement: Result cards
Every result SHALL be copyable as plain text containing the result, the key inputs, the method in one line, sources, the screening label, and the tool version, with no file contents.

#### Scenario: Copy a bill comparison
- **WHEN** a user copies the tariff comparison card
- **THEN** the text lists the top three rates and annual costs, the data period, the URDB snapshot date, and "gridprims.com"

### Requirement: One-page report on the device
The tool SHALL generate a one-page report view with a print stylesheet (so the browser's own "Save as PDF" makes the file) containing the load summary, monthly peaks, bill breakdown, best alternative rate, coincident-peak exposure, and storage screen, each with sources and the screening label. Generation SHALL happen on the device with no PDF library.

#### Scenario: Report egress
- **WHEN** the sentinel egress test generates a report
- **THEN** no request contains any sentinel value
