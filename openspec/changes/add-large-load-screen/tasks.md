## 1. Data

- [x] 1.1 Define the curated tariff record schema with per-field citations; verify a record missing a citation fails the check
- [ ] 1.2 Enter and verify the seed tariffs and rules from primary documents (AEP Ohio, Dominion GS-5, Georgia Power, Xcel Minnesota, Missouri, Texas §25.194, and the Texas minimum-bill rule if adopted); verify each unverified item in `docs/research/06` is confirmed or marked "Not public" (AEP Ohio, Dominion GS-5, Georgia Power, and Texas §25.194 entered from captured primary documents, each field single source with its blocked second recorded; Missouri entered 2026-11-16 as Evergy Missouri West's Schedule LLPS, its term, minimum, and collateral confirmed in both the tariff and the PSC's fact sheet, and its 36-month exit notice taken from the tariff where the fact sheet says 24; Xcel Minnesota entered 2026-11-16 from the PUC's release on Docket 25-289, single source because eDockets refuses scripted requests; the Texas minimum-bill proposal, still a proposal in Project 58000, remains; rechecked 2026-11-21 on the PUCT's filing list: 71 items and no adoption order, the latest Oncor's residential rate-impact analysis of the proposal filed 2026-11-19, with SB 6 requiring adoption by 2026-12-31)
- [x] 1.3 Consume the FERC Form 714 annual-peak snapshot owned by `add-public-grid-data`; verify the request card reads the same values as utility pages for 10 sampled utilities

## 2. Tools

- [x] 2.1 Terms table with filters, comparison, and freshness flags; verify the compare and stale-entry scenarios
- [x] 2.2 Take-or-pay calculator with prefill, capacity ramps, and tiered minimum formulas; verify the slow-ramp, both AEP Ohio tier, prior-peak ratchet, and year-5 exit scenarios, plus one published-arithmetic fixture per tariff (grid.large-load.take-or-pay with the five scenarios and AEP Ohio and GS-5 fixtures; choosing a tariff prefills its minimums, ramp, term, ratchet, and exit rule and asks for the rates, which the cited pages do not give; Georgia Power and Texas publish no minimum formula, so they have no fixture)
- [x] 2.3 Request context card; verify the 20%-of-peak and household-equivalent scenarios (grid.large-load.context, with a ZIP picker that fills the Form 714 peak and EIA-861 figures, and three utilities recomputed by hand; with the "who pays" explanation, links to the terms that apply, or the regulator's docket search when none is on file)

## 3. Surfaces

- [x] 3.1 Run worked examples through the MCP server; verify identical results
- [ ] 3.2 DESIGN.md gates (both themes, 320 px sweep, keyboard pass, print, performance budget); verify CI green
