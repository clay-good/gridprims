## Purpose

Shows, rather than claims, why a free site deserves trust: who runs it, how each number is made, what happens to your data, how errors are fixed, and how to reuse what you find.

## ADDED Requirements

### Requirement: Trust page set
The site SHALL publish these pages, each linked from the footer: About, Methods, Privacy, Accessibility, Corrections, Changelog, License and how to cite, Sources and credits (every upstream publisher with its required credit text), Review status, and Developers. The footer SHALL also link the sister sites.

#### Scenario: Footer links
- **WHEN** any page is rendered
- **THEN** its footer links to all ten trust pages and the sister sites

### Requirement: About states who runs it and how it is paid for
The About page SHALL name the maintainer, state how hosting and data costs are paid with the actual monthly cost from the hosting invoice (for example the $5/month Workers plan plus the domain), and state that gridprims takes no advertising, sponsorship, affiliate fees, or lead-generation payments. If funding is ever accepted, the page SHALL name each funder. It SHALL NOT invent users, partners, or endorsements.

#### Scenario: No sponsors
- **WHEN** gridprims has no funders
- **THEN** the About page says it is paid for by the maintainer and lists the costs

### Requirement: Methods generated from manifests
Each tool SHALL have a methods page generated from its manifest: the method in plain words, the formula or algorithm steps, assumptions with defaults, citations with edition and locator, worked examples with their independent sources and tolerances, the latest CI result for each example with its date, and known differences from reference engines.

#### Scenario: Worked example status
- **WHEN** a worked example's last CI run passed on 2026-11-02
- **THEN** its methods page shows "Passed on Nov 2, 2026" with the tolerance

### Requirement: Corrections policy and public log
The Corrections page SHALL state how errors are reported, triaged, fixed, and disclosed. Every fix that changes a published number SHALL add a log entry (generated from `docs/corrections.md`) with the date, affected tool or page, old and new value for a sample input, cause, and the problem report id if any, and SHALL appear in the corrections feed.

#### Scenario: Wrong tariff parse fixed
- **WHEN** a fix changes a bill result for a URDB rate
- **THEN** the corrections log lists the rate, the old and new monthly total for the fixture, the cause, and the date

### Requirement: License and how to cite
The License page SHALL state that gridprims code is MIT, gridprims page text and derived tables are CC BY 4.0 unless a table's inputs require otherwise (named per table, for example CC BY-SA 4.0 if a share-alike input is ever used), and that upstream data keeps its own terms with the credits listed on each dataset page. It SHALL give copyable citations for a page, a tool result, and a dataset version.

#### Scenario: Cite a utility page
- **WHEN** a reporter copies the citation for a utility page
- **THEN** the text names the page title, gridprims.com, the URL, the data sources with their as-of dates, and the access date

### Requirement: Review status from records only
The Review status page and each tool page SHALL show practitioner review only from entries in `docs/review-signoffs.md` (reviewer name and role as they consented to show, tool version, date, scope); tools without an entry SHALL say "Review pending".

#### Scenario: Unreviewed tool
- **WHEN** a tool has no sign-off record
- **THEN** its page shows "Review pending" in the work-zone strip, and no page implies review

### Requirement: Accessibility statement
The Accessibility page SHALL state the target (WCAG 2.2 AA), the date of the last automated and manual checks, known issues with planned fixes, and how to report a barrier.

#### Scenario: Known issue listed
- **WHEN** a chart lacks a keyboard path in one browser
- **THEN** the statement lists it with the browser and planned fix until the fix ships
