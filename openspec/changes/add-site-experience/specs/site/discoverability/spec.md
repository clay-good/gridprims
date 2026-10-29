## Purpose

Makes every gridprims page easy to find in search engines, easy to share, and easy to follow for updates, using only metadata generated from the same manifests and registry that build the pages.

## ADDED Requirements

### Requirement: Page metadata from the record
Every page SHALL have a unique `<title>` of at most 60 characters, a meta description of at most 155 characters, a canonical URL, `lang="en"`, and Open Graph and Twitter card fields, all generated from the tool manifest, the entity record, or the guide's front matter. Duplicate titles across pages SHALL fail the build.

#### Scenario: Duplicate title
- **WHEN** two utility pages would both be titled "City of Springfield electric utility"
- **THEN** the build fails until the generator adds the state ("… (IL)" and "… (MO)")

### Requirement: Structured data that states only facts
Pages SHALL include JSON-LD: `BreadcrumbList` on every page, `Dataset` (with license, creator, temporal coverage, distribution URLs, and checksum) on data library pages, and `DefinedTerm` on glossary pages. Structured data SHALL NOT include ratings, reviews, prices, or any field not shown on the page.

#### Scenario: Dataset markup
- **WHEN** a crawler reads the EIA-861 library page
- **THEN** the JSON-LD names EIA as creator, the license, the data period, and each CSV.gz download with its SHA-256

### Requirement: Sitemaps dated by data
The build SHALL publish XML sitemaps of at most 50,000 URLs each with an index file, listing only published pages. Each `lastmod` SHALL be the newest as-of date of the data the page shows, or the tool version date for tool pages, and SHALL NOT change when a rebuild leaves the page's data unchanged. `robots.txt` SHALL allow all crawlers and point to the index.

#### Scenario: Rebuild without new data
- **WHEN** the site is rebuilt with no dataset version change
- **THEN** every sitemap `lastmod` value is unchanged

### Requirement: Feeds for people who follow updates
The site SHALL publish Atom feeds for the public changelog, data releases (one entry per dataset version), and corrections, so reporters and researchers can follow without an account.

#### Scenario: New EIA-860 version
- **WHEN** a new EIA-860 version is published
- **THEN** the data releases feed gains one entry with the version id, data period, row-change summary, and download link

### Requirement: Static social cards
Each section SHALL have one static 1200 × 630 px PNG social card of at most 100 KB, made by hand and committed with its source file. Pages SHALL reference their section's card. No share buttons or third-party widgets SHALL be included.

#### Scenario: Shared utility page
- **WHEN** a utility page URL is pasted into a chat app
- **THEN** the preview shows the page's own title and description with the Data section card

### Requirement: Content minimums protect search quality
Only pages that meet their content minimum (defined in each data spec) SHALL be generated, listed in sitemaps, or linked, and every generated page SHALL map to exactly one tool manifest, entity record, dataset, glossary entry, or guide record; the build SHALL fail on any page without one.

#### Scenario: Thin record
- **WHEN** a utility record has three sourced facts
- **THEN** no page exists for it and it appears only in its state page's list
