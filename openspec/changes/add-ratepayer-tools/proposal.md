## Why

**Value up front:** when a utility asks its regulator to raise rates, any resident, school, or small business can price the proposed rate on their own past year of meter data and see exactly what it would have cost them, then understand where the utility's requested revenue comes from and how much a one-point change in allowed return moves a typical bill. They leave with a plain-language public comment draft containing their own numbers, which they send themselves.

Why this matters (`docs/research/05` §4): utilities requested about $18.6B in rate increases in the first half of 2026 (PowerLines). Public comment periods are short, and people comment with opinions because they cannot compute impacts. No free, national, structured rate-case source exists, and no free tool ties a proposed rate to a person's own meter data. Our tariff engine from `add-load-and-bill-analyzer` already does the hard part. Paid trackers (Insight Engine) and quarterly totals (PowerLines) describe rate cases in aggregate; we hand off to them and to each regulator's docket search for case documents.

## What Changes

- **Proposed-rate impact:** enter the current and proposed rate (or pick the current one from URDB and edit it), re-price the user's last year of intervals, and show the change by month and by charge type.
- **Revenue requirement explainer:** the standard formula (operations and maintenance, depreciation, taxes, and return on rate base) with the utility's own FERC Form 1 figures where available and sliders for return on equity and equity ratio, showing the effect per average residential bill.
- **Comment draft:** a short, factual draft public comment with the user's computed numbers and the docket number they enter, for the user to edit and submit through the regulator's own process.

## Capabilities

### New Capabilities

- `ratepayer/proposed-rate-impact`: A proposed tariff priced on the user's own load.
- `ratepayer/revenue-requirement`: The revenue requirement formula with the utility's public figures and what-if sliders.
- `ratepayer/comment-draft`: A factual comment draft the user sends themselves.

### Modified Capabilities

None.

## Non-goals

- Scraping regulator docket systems; docket links are curated by pull request.
- Submitting comments or contacting regulators on anyone's behalf.
- Advocacy positions. Tools compute; users decide what to say.

## Impact

- Phase 2. Reuses the bill engine and manual tariff form. Adds FERC Form 1 figures via PUDL (CC BY 4.0).
