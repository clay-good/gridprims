## Purpose

The public front door to every dataset gridprims keeps: what it is, where it came from, its license, every version, and the files, so researchers and reporters can cite and reproduce what they see.

## ADDED Requirements

### Requirement: Library page per dataset
The library SHALL list every registered dataset with title, publisher, license, required credit, data period, as-of date, retrieved date, refresh cadence, staleness status, row counts, and a plain description of what it contains and what it does not.

#### Scenario: eGRID listed as late
- **WHEN** eGRID's next edition is overdue
- **THEN** its library entry says "waiting on publisher" with the expected and actual dates

### Requirement: Versions, checksums, and changelog
Each dataset SHALL list every version with gzip-compressed CSV downloads, SHA-256 checksums, and a summary of row-level changes from the previous version (rows added, removed, changed, by key).

#### Scenario: Revised EIA data
- **WHEN** EIA revises last year's EIA-860 in its final release
- **THEN** the new version's changelog counts changed generator rows and lists the five largest capacity changes

### Requirement: Stable file URLs anyone can use
Every dataset version's files SHALL live at documented, permanent URLs (`/data/<dataset-id>/<version>/<file>`) with a `latest` alias that redirects to the current version, and SHALL be served with `Access-Control-Allow-Origin: *` so other sites and notebooks can read them. The Developers page SHALL document the URL scheme and manifest format as a static data API.

#### Scenario: Notebook reads a file
- **WHEN** a researcher's notebook on another origin fetches the latest EIA-861 CSV.gz
- **THEN** the request succeeds without credentials and the response names the version in its manifest

### Requirement: License shown per file
Each download SHALL show its license (per foundation spec `platform/data-snapshots`) and the upstream credits it carries.

#### Scenario: LBNL-derived file
- **WHEN** a user views the queue snapshot download
- **THEN** it shows CC BY 4.0 and the credit "Lawrence Berkeley National Laboratory and GridTracker"

### Requirement: How to cite
Each dataset version SHALL show a ready-to-copy citation naming the original publisher first, then gridprims as the redistributor, with the version and checksum.

#### Scenario: Copy citation
- **WHEN** a user copies the citation for EIA-861 2025
- **THEN** the text names EIA, the form and year, the EIA release date, "redistributed by gridprims.com", the version id, and the checksum
