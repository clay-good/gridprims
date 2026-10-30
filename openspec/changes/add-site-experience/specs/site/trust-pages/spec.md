## Purpose

Shows, rather than claims, why a free site deserves trust: who runs it, how each number is made, what happens to your data, how errors are fixed, and how to reuse what you find.

## ADDED Requirements

### Requirement: Trust page set
The site SHALL publish these pages, each linked from the footer: About, Methods, Privacy, Accessibility, Corrections, Changelog, License and how to cite, Sources and credits (every upstream publisher with its required credit text), Review status, Limits (`site/limitations`), Terms and disclaimer, Continuity (`trust/data-continuity`), and Developers. The footer SHALL also link the sister sites.

#### Scenario: Footer links
- **WHEN** any page is rendered
- **THEN** its footer links to every page in that set and the sister sites

### Requirement: Terms and disclaimer
The site SHALL publish a terms and disclaimer page, linked from the footer of every page and from the limits page.

#### Scenario: What it states
- **WHEN** a visitor reads the terms page
- **THEN** it states in plain words that gridprims is a free public utility provided as is with no warranty of any kind, express or implied, including fitness for a particular purpose; that every result is a screening estimate and not engineering, legal, tax, financial, or safety advice, and not a utility study, bill, or determination; that the visitor is responsible for decisions they make with it and should confirm anything that matters with their utility, their electrician, or their own professional; that we accept no liability for loss arising from use of the site, to the extent the law allows; that data belongs to its publishers under the terms each dataset page records; and how to report an error or ask for removal

#### Scenario: Linked everywhere
- **WHEN** any page renders
- **THEN** its footer links the terms and disclaimer page

#### Scenario: Plain language
- **WHEN** a visitor reads the page
- **THEN** it is written at the site's normal reading level, in short sentences, with no block of legal text a visitor would skip

### Requirement: The disclaimer never substitutes for care
The terms page SHALL state that the disclaimer is not a reason to publish a number we cannot support, and SHALL link the limits page and the refusal list, so a reader can see what we decline to compute rather than only what we disclaim.

#### Scenario: Disclaimer points at the limits
- **WHEN** a visitor reads the disclaimer
- **THEN** it links the limits page and says plainly that we refuse figures the public data cannot support, rather than estimating them behind a warning

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
The Corrections page SHALL state how errors are reported, triaged, fixed, and disclosed. Every fix that changes a published number SHALL add a log entry (generated from `docs/corrections.md`) with the date, tier, affected tool or page, old and new value for a sample input, cause, and the problem report id if any, and SHALL appear in the corrections feed.

#### Scenario: Automated refresh changes a number
- **WHEN** a scheduled refresh changes a published value beyond its dataset's declared threshold
- **THEN** that run writes a dated corrections entry naming the page, the old and new values, and the dataset version that changed it, with no person involved

#### Scenario: Log entry fields
- **WHEN** a fix changes a published number
- **THEN** the log gains a dated entry naming the tier, the page or tool, the old and new value for a sample input, and the cause, and the corrections feed gains the same entry

### Requirement: Three correction tiers
Corrections SHALL be recorded in one of three tiers: a **correction** (a number or statement was wrong and is now fixed), a **note of concern** (we suspect a problem and are checking, with the number still shown and flagged), and a **withdrawal** (the number or page is removed because we cannot stand behind it, with the page kept at its URL explaining why).

#### Scenario: Note of concern
- **WHEN** a publisher's own file is suspected of a unit error we have not confirmed
- **THEN** the affected numbers stay visible with a dated note of concern, and the log records the tier

#### Scenario: Withdrawal keeps its URL
- **WHEN** a page is withdrawn because its source dataset turns out to be unlicensed
- **THEN** the URL still resolves and explains what was removed and when, rather than returning 404

### Requirement: The old value stays readable
A corrected page SHALL carry a dated inline note at the affected number giving the previous value and what changed, for at least 12 months. A published snapshot SHALL NEVER be edited in place; a correction SHALL supersede it with a new version, and the superseded version SHALL stay downloadable, marked superseded with a link to its replacement.

#### Scenario: Corrected utility page
- **WHEN** a utility's average price is corrected from 14.4 to 12.9 cents
- **THEN** the page shows the new value with a dated note naming the old value and the cause, and the note stays for at least 12 months

#### Scenario: Snapshot superseded, not edited
- **WHEN** a dataset version is found to contain a parsing error
- **THEN** a new version is published, the old version stays downloadable with its original checksum and a "superseded" label linking the replacement, and no file in the old version changes

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
