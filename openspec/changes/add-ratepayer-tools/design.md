## Context

Research in `docs/research/05` §4. No free national structured rate-case source exists; paid services (for example Insight Engine) are not reusable. FERC Form 1 data is available through PUDL under CC BY 4.0 (v2026.10.0 covers 1994–2025), but many co-ops and municipal utilities do not file it.

## Goals / Non-Goals

**Goals:** help people compute and understand, then speak for themselves.

**Non-Goals:** docket scraping, advocacy, submission.

## Decisions

### D1. Reuse the bill engine and manual tariff form
Proposed tariffs are ordinary tariff records, so every charge type the bill engine supports works here, and unmodeled charges are named the same way. Monthly totals reuse `household/bill-totals`. Alternative: a simplified rate-change calculator. Rejected: it could not price demand or time-of-use changes.

### D2. Curated docket links
A small curated file maps states to regulator docket search and comment instruction pages, maintained by pull request. Alternative: per-docket scraping. Rejected: fragile and outside our public-data-only posture for systems with varied terms.

### D3. Approximations labeled
Per-customer revenue effects are allocated by residential revenue share, which ignores cost-of-service studies. The label says so. Alternative: model class cost allocation. Rejected: needs the utility's cost-of-service study, which varies by case and is often filed as PDF exhibits.

## Risks / Trade-offs

- **Perceived bias.** Mitigation: factual drafts only, math visible, no positions.
- **Proposed tariffs are complex documents.** Mitigation: the difference list lets users check each edit against the filing.
