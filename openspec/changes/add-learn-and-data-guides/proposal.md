## Why

**Value up front:** anyone who wants to use the bill and load tools can learn, in plain steps for their own utility, how to download their meter data on a phone or computer. If their utility offers no download, they get a short request to send it, or a way to start from bill totals instead. Every term of art on the site is one tap from a plain definition, and ten short explainers answer the questions people actually ask about bills, rates, and the grid.

Why (`docs/research/09`):
- **Getting the file is the hardest step.** Of the 25 largest US utilities, about 8 have a verified self-serve interval download; the rest have a download that is non-standard or unverified, show none for homes (Duke, PacifiCorp, and Alabama Power among them), or could not be checked. No utility-neutral, current guide exists.
- **People are asking.** Google searches for "electricity prices" hit a record in March 2026. Top questions are "why is my bill so high", "is time-of-use worth it", EV charging, and data centers.
- **Terms block understanding.** Demand charges, 4CP, and ratchets appear on bills with no explanation. DESIGN.md requires a definition on first use, but no glossary exists yet.

We link rather than rebuild: utilities' own help pages, the Green Button Alliance, EIA Energy Kids and the EIA glossary, the NLR (formerly NREL) REopt bill-reading lesson, and Texas's official Power to Choose site for retail plans.

## What Changes

- **Glossary:** about 150 terms used by phase 1 tools, each with a one-line definition at reading grade 8 or below, a worked example with numbers, the tools that use it, and a citation. It powers the glossary popover on every page.
- **Get your data:** one guide per utility for the 25 largest utilities and Smart Meter Texas, plus generic guides for common co-op and municipal portals. Each states its verification status and date, gives phone steps, and has a fallback request letter.
- **Guides:** eleven launch explainers, each with cited and dated numbers and a link that opens a tool prefilled with the example. "Where does my power come from" explains power content labels and which states require them, and points at the federal generation and emissions data we already ship, because no state publishes a reusable national file (`docs/research/13`).

## Capabilities

### New Capabilities

- `learn/glossary`: Plain definitions for every term the site uses, shown on first use.
- `learn/get-your-data`: Utility-by-utility steps to download meter data, with fallbacks.
- `learn/guides`: Short, cited explainers that link into the tools.

### Modified Capabilities

None.

## Non-goals

- News, opinion, advocacy, or positions on rate cases or projects.
- Screenshots of utility websites (copyright, personal data, and drift risk).
- Logging into utility accounts for users or automating downloads (Green Button Connect needs a registered third party with OAuth).
- Spanish at launch (phase 2, per `add-site-experience` design D6).

## Impact

- Phase 1, per `plan-launch-and-value-proof`; the glossary and the top-utility guides are launch blockers for the household and load tools.
- Adds curated data under `data/curated/glossary/` and `data/curated/get-your-data/`, maintained by pull request with a schema check.
- Links every utility page in `add-public-grid-data` to its guide, and every dropzone to the guide index.
