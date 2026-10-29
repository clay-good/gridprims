## 1. Glossary

- [ ] 1.1 Define the glossary record schema and register it as a dataset; verify a record missing a citation fails the check
- [ ] 1.2 Implement the Flesch-Kincaid check with a syllable exceptions list; verify against 20 hand-scored sentences within 0.5 grade
- [ ] 1.3 Write the launch entries and the first-use popover; verify the coverage gate and the first-use-only scenario
- [ ] 1.4 Serve entries through `gridprims_search` and `gridprims_query_data`; verify the "what is 4CP" scenario

## 2. Get your data

- [ ] 2.1 Define the guide record schema with verification levels; verify the screenshot and personal-data checks fail fixtures
- [ ] 2.2 Write guides for the 25 largest utilities, Smart Meter Texas, and generic co-op and municipal portals from `docs/research/09`; verify each has a level, date, and source
- [ ] 2.3 Re-check the launch guides in live accounts where contributors have them; verify upgraded levels are recorded with dates and no personal data
- [ ] 2.4 Add the fixture-link check; verify the missing-fixture scenario fails
- [ ] 2.5 Add the fallback request letter and bill-totals route; verify the Duke Energy Carolinas scenario

## 3. Guides

- [ ] 3.1 Write the ten launch explainers with generated numbers and "Try it" links; verify every number has a source stamp or a dated citation
- [ ] 3.2 Add review-date and stale-number checks; verify the year-old explainer scenario
- [ ] 3.3 Run DESIGN.md gates on Learn pages (both themes, 320 px, keyboard, print); verify CI green
