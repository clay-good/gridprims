## Context

Evidence: `docs/research/09` (data access per utility, verified 2026-10-29, with many paths marked unverified), `07` (Green Button formats), `08` (licenses: EIA public domain; Green Button Alliance sample files are not reusable for our fixtures). Visual contract: DESIGN.md learn-brown signs and the glossary term component.

## Goals / Non-Goals

**Goals:** a household can get a usable file, or a usable alternative, in under 10 minutes; every guide says how fresh and how verified it is.

**Non-Goals:** complete national coverage at launch; utility portal automation.

## Decisions

### D1. Text steps, not screenshots
Guides give menu paths in words ("My Account › Usage › Green Button › Download my data") with the date checked. Alternative: annotated screenshots. Rejected: utility site copyright, risk of exposing account details, and they go stale silently.

### D2. Curated records with verification levels
Each guide is a record in `data/curated/get-your-data/<eia-id>.json` with fields for steps, formats, interval length, history, portal name, and a verification level: `live-account` (a contributor downloaded a file on the stated date, with no personal data committed), `help-page` (from the utility's own help page, URL and date), or `third-party` (shown with the work-zone "Unverified" strip). Changes arrive by pull request and pass a schema check.

| Alternative | Why not |
|---|---|
| Scrape utility help centers | Brittle, and terms vary. |
| Link to a third-party guide site | Their accuracy and terms are outside our control. |

### D3. Guides are tied to parser fixtures
Every format a guide names (for example "Smart Meter Texas 15-minute CSV") must have a matching synthetic fixture in the intake fixture library, so a guide never sends people to a file we cannot read. Alternative: rely on generic CSV detection. Rejected: utility CSVs are not standardized (`docs/research/07`).

### D4. Own readability check
One-line definitions and result sentences are checked against grade 8 with our own Flesch-Kincaid implementation (syllable heuristic with an exceptions list). Alternative: a readability package. Rejected by `platform/zero-dependency`; the formula is short.

### D5. Glossary as a dataset
The glossary is registered like any dataset, so the MCP server returns definitions through `gridprims_search` and `gridprims_query_data`, and agents use the same words as the site. Alternative: glossary only in page templates. Rejected: agents would invent their own definitions.

### D6. Definitions may adapt the EIA glossary
EIA's glossary is public domain; entries adapted from it say so. NFPA, IEEE, and other copyrighted glossaries are not copied. Alternative: write every definition fresh. Rejected: EIA's wording is accurate and familiar to reporters; adapting it with credit is faster and consistent with federal usage.

## Risks / Trade-offs

- **Portal paths change often.** Mitigation: 12-month re-check rule, "needs review" chips, and problem reports on every guide.
- **Contributors may leak personal data.** Mitigation: no screenshots or files in pull requests; the schema has no free-text field for account details.
