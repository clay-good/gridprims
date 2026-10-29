## Context

Tariff examples and DELTa's licensing are in `docs/research/05` §2; status as of 2026-10-29 is in `docs/research/06`: Texas 16 TAC §25.194 is adopted (effective 2026-10-08; loads of 75 MW or more; $100,000 study fee; $50,000/MW security); the PUCT has proposed a large-load minimum bill (the greatest of contracted peak, the prior year's highest peak, or 12CP demand, for at least 20 years); AEP Ohio ramps contract capacity 50/65/80/90% over four years, and its minimum demand is tiered: 15,000 kW plus 85% of contract above 25 MW, or 57,500 kW plus 100% above 75 MW, capped at 85% of contract, or 85% of the highest billing demand in the past 11 months if greater; Missouri terms come from approved tariffs under RSMo §393.130.7; FERC paused its large-load show-cause proceedings with no final rule (PJM responses due 2026-11-16). No filing found includes a dollar worked example of a minimum bill. Xcel Minnesota terms remain unverified.

## Goals / Non-Goals

**Goals:** a trustworthy, cited terms table and transparent minimum-bill math.

**Non-Goals:** project tracking, siting maps, or interconnection analysis.

## Decisions

### D1. Curated dataset in the repository
Terms live as one reviewed record per tariff in `data/curated/large-load-tariffs/`, each field with a citation. Changes come by pull request and pass a schema and citation check. Alternative: scrape regulator sites. Rejected: brittle, and sites' terms vary.

### D2. Form 714 for peaks
Utility annual peaks come from the FERC Form 714 snapshot that `add-public-grid-data` owns (PUDL, CC BY 4.0; v2026.10.0 covers 2006–2025) because EIA-861 does not report peaks for every utility. Alternative: EIA-930 balancing-authority peaks. Rejected: a balancing authority often spans many utilities. Where Form 714 has no record, the card says so and shows only the EIA-861 sales comparison (matches `large-load/request-context`).

### D3. Seed set
Launch with the five tariffs in the research and Texas's statewide rule, plus any others confirmed from primary documents, rather than wait for national coverage. The table states how many utilities it covers. Alternative: wait for national coverage. Rejected: rules change monthly; a cited partial table is useful now.

### D4. Minimums as formulas, ramps as capacity
Each tariff stores its minimum as a formula (flat percent, tiered piecewise, cap, and a percent-of-prior-peak ratchet over a lookback) applied to the contract capacity in force that year, and a separate capacity ramp by year. Alternative: one percentage per component. Rejected: misstates AEP Ohio-style tiered minimums and early-year obligations.

## Risks / Trade-offs

- **Fast-moving rules.** Mitigation: status field, last-checked dates, and "needs review" flags.
- **Political sensitivity.** Mitigation: facts and math only, every number cited, no characterization of projects or companies.
