## 1. Shell and URLs (phase 0)

- [x] 1.1 Implement the top rail, section landing pages, and the menu below 768 px; verify `aria-current` and the keyboard path in the browser driver
- [x] 1.2 Implement the design D2 URL scheme, the generated `_redirects` file, and the 1,500-rule budget; verify the renamed-utility, redirect-budget, and published-URL checks against synthetic fixtures in phase 0, and the removed-page scenario once content minimums exist in phase 1
- [x] 1.3 Implement the 404 page with on-device suggestions; verify the `/utility/oncor/` scenario and that no request carries the path

## 2. Strings and locales (phase 0)

- [x] 2.1 Create per-locale string files, the message formatter, and the literal-copy lint; verify the lint fails on a fixture template with literal text
- [x] 2.2 Add the pseudo-locale and run the layout sweep at 320 and 1280 px; verify no overflow on every route template

## 3. Home and catalog (phase 1)

- [x] 3.1 Build the home page with two lanes of tool cells generated from manifests; verify the 360 × 640 first-viewport and no-JavaScript scenarios
- [x] 3.2 Build the tool catalog with filters; verify the bill-totals filter scenario and that unbuilt tools appear nowhere
- [x] 3.3 Enforce the simplicity budget in the build and the replace-not-add rule; verify the budget-exceeded, nothing-interrupts-arrival, and new-tool-promoted scenarios

## 4. Discoverability (phase 1)

- [x] 4.1 Generate titles, descriptions, canonical URLs, and JSON-LD; verify the duplicate-title failure and the dataset markup scenario
- [x] 4.2 Generate sitemaps with data-dated `lastmod` and `robots.txt`; verify an unchanged rebuild leaves every `lastmod` unchanged
- [x] 4.3 Generate Atom feeds for changelog, data releases, and corrections; verify each validates against the Atom schema and the EIA-860 scenario
- [ ] 4.4 Commit six section social cards with sources; verify each is 1200 × 630 and at most 100 KB

## 5. Limits page (phase 0, before any tool ships)

- [x] 5.1 Generate the limits page and its JSON from manifests, CI results, the registry, the corrections log, the curated cannot-do list, and the unverified-claim register; verify the reached-from-a-result, first-screen (at 320 px), phase-0-page, section-not-yet-populated, launch-reality, stale-evidence, three-axes, minimum-contents, cited-reason, asked-for-something-on-the-list, late-dataset, unverified-dependency, path-to-field-verified, no-invented-accuracy, unsupported-endorsement, pending-labels, agent-reads-the-limits, and capability-added scenarios
- [x] 5.2 Maintain the curated cannot-do list and the unverified-claim register as checked records; verify a shipped page citing an unverified claim with no register entry fails the build
- [x] 5.3 Run DESIGN.md gates on the limits page (both themes, 320 px sweep, keyboard pass, print); verify CI green

## 6. Trust pages (phase 0 templates, phase 1 content)

- [x] 6.1 Generate Methods, Changelog, Sources, Review status, and Corrections from manifests and records; verify the worked-example status and wrong-tariff scenarios
- [x] 6.2 Write About, Privacy, Accessibility, License and how to cite, Terms and disclaimer, and Developers; verify every claim on About traces to an invoice or record, the copied citation scenario, and the linked-everywhere, plain-language, and disclaimer-points-at-the-limits scenarios
- [x] 6.3 Run DESIGN.md gates (both themes, 320 px, keyboard, print) on every trust page; verify CI green
