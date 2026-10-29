## Purpose

Lets gridprims add Spanish (planned for phase 2) and other languages by adding string files and review, with no code or layout changes.

## ADDED Requirements

### Requirement: No literal copy in templates or modules
Every user-facing string (labels, sentences, errors, screening labels, alt text, metadata) SHALL come from a per-locale string file keyed by message id, with plural and select forms. A lint SHALL fail the build when a template or page module contains literal user-facing text.

#### Scenario: Literal string added
- **WHEN** a template contains the text "Drop a meter file"
- **THEN** the lint fails and names the file, line, and the message id to use

### Requirement: Locale-aware formatting
Numbers, currency, dates, and times SHALL be formatted with `Intl` APIs from the page locale (en-US at launch). Unit symbols (kW, kWh, MWh, lb/MWh, °F) SHALL NOT be translated. Data files and CSV downloads SHALL stay locale-neutral (ISO 8601 dates, `.` decimal separator).

#### Scenario: Same data, two locales
- **WHEN** a pseudo-locale with `,` as the decimal separator renders a 12.5 MW value
- **THEN** the page shows the locale's format and the CSV download still contains `12.5`

### Requirement: Layout tolerates longer text
Every page template SHALL pass the 320 px and 1280 px layout checks under a pseudo-locale that lengthens every string by 35% and adds accented characters.

#### Scenario: Pseudo-locale sweep
- **WHEN** CI renders all route templates in the pseudo-locale
- **THEN** no text overflows its container and no page scrolls sideways

### Requirement: Reserved language paths
The URL scheme SHALL reserve `/es/` for Spanish. When a translated page exists, both versions SHALL carry `hreflang` links to each other; untranslated pages SHALL NOT be generated under `/es/`.

#### Scenario: Partial translation
- **WHEN** only the home page and utility lookup are translated
- **THEN** only those two pages exist under `/es/` and each links to its English twin with `hreflang`
