## 1. Data

- [ ] 1.1 Define the curated tariff record schema with per-field citations; verify a record missing a citation fails the check
- [ ] 1.2 Enter and verify the seed tariffs and rules from primary documents (AEP Ohio, Dominion GS-5, Georgia Power, Xcel Minnesota, Missouri, Texas §25.194, and the Texas minimum-bill rule if adopted); verify each unverified item in `docs/research/06` is confirmed or marked "Not public"
- [ ] 1.3 Consume the FERC Form 714 annual-peak snapshot owned by `add-public-grid-data`; verify the request card reads the same values as utility pages for 10 sampled utilities

## 2. Tools

- [ ] 2.1 Terms table with filters, comparison, and freshness flags; verify the compare and stale-entry scenarios
- [ ] 2.2 Take-or-pay calculator with prefill, capacity ramps, and tiered minimum formulas; verify the slow-ramp, both AEP Ohio tier, prior-peak ratchet, and year-5 exit scenarios, plus one published-arithmetic fixture per tariff
- [ ] 2.3 Request context card; verify the 20%-of-peak and household-equivalent scenarios

## 3. Surfaces

- [ ] 3.1 Run worked examples through the MCP server; verify identical results
- [ ] 3.2 DESIGN.md gates (both themes, 320 px sweep, keyboard pass, print, performance budget); verify CI green
