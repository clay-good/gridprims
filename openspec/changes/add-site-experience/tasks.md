## 1. Shell and URLs (phase 0)

- [ ] 1.1 Implement the top rail, section landing pages, and the menu below 768 px; verify `aria-current` and the keyboard path in the browser driver
- [ ] 1.2 Implement the design D2 URL scheme and the generated `_redirects` file; verify the renamed-utility and removed-page scenarios and the published-URL check
- [ ] 1.3 Implement the 404 page with on-device suggestions; verify the `/utility/oncor/` scenario and that no request carries the path

## 2. Strings and locales (phase 0)

- [ ] 2.1 Create per-locale string files, the message formatter, and the literal-copy lint; verify the lint fails on a fixture template with literal text
- [ ] 2.2 Add the pseudo-locale and run the layout sweep at 320 and 1280 px; verify no overflow on every route template

## 3. Home and catalog (phase 1)

- [ ] 3.1 Build the home page with two lanes of tool cells generated from manifests; verify the 360 × 640 first-viewport and no-JavaScript scenarios
- [ ] 3.2 Build the tool catalog with filters; verify the bill-totals filter scenario and that unbuilt tools appear nowhere

## 4. Discoverability (phase 1)

- [ ] 4.1 Generate titles, descriptions, canonical URLs, and JSON-LD; verify the duplicate-title failure and the dataset markup scenario
- [ ] 4.2 Generate sitemaps with data-dated `lastmod` and `robots.txt`; verify an unchanged rebuild leaves every `lastmod` unchanged
- [ ] 4.3 Generate Atom feeds for changelog, data releases, and corrections; verify each validates against the Atom schema and the EIA-860 scenario
- [ ] 4.4 Commit six section social cards with sources; verify each is 1200 × 630 and at most 100 KB

## 5. Trust pages (phase 0 templates, phase 1 content)

- [ ] 5.1 Generate Methods, Changelog, Sources, Review status, and Corrections from manifests and records; verify the worked-example status and wrong-tariff scenarios
- [ ] 5.2 Write About, Privacy, Accessibility, License and how to cite, and Developers; verify every claim on About traces to an invoice or record and the copied citation scenario
- [ ] 5.3 Run DESIGN.md gates (both themes, 320 px, keyboard, print) on every trust page; verify CI green
