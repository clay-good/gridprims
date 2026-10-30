## Why

**Value up front:** a household types twelve monthly kWh numbers from its bills, or drops its meter file, and gridprims answers three questions privately in seconds: is my bill computed the way my tariff says, is my use high for my utility, and which of my utility's plans would have been cheapest for how I actually use power. Every answer shows the math, the tariff, and the date.

Why (`docs/research/09`):
- **Bills are the top worry.** Searches for "electricity prices" hit a record in March 2026, and "why is my bill so high" leads household questions.
- **Plan choice is real and growing.** Default residential time-of-use now covers about 16M homes (California IOUs, DTE and Consumers in Michigan, and Xcel Colorado since Nov 1, 2025), each with several TOU, EV, and heat-pump variants.
- **No free tool compares plans on your own use, privately.** Utility calculators cover only their own plans and hide the math; Rewiring America models a typical home; Arcadia, UtilityAPI, and Bayou are paid business APIs that need your login.
- **Most households cannot get a meter file easily** (8 of the 25 largest utilities have a verified download), so the door must work from bill totals too.

It reuses the bill engine from `add-load-and-bill-analyzer` and the URDB snapshot and ZIP lookup from `add-public-grid-data`. We hand off to the utility's own rate calculator where one exists, to Texas's official Power to Choose site for retail offers, and to Rewiring America for electrification planning.

## What Changes

- **Bill totals check:** enter 1 to 24 billing periods (dates, kWh, optional dollars); price them on the chosen tariff, compare with what you paid, and see your effective price per kWh against your utility's average.
- **Mid-cycle forecast:** for the period you are partway through, the amount so far and the projected total, with the method shown.
- **Usage benchmark:** your yearly use against your utility's and your state's average home (EIA-861), and your month-to-month pattern, without invented percentiles.
- **Plan finder:** every residential plan your utility has in the URDB snapshot priced on your use, ranked by cost; time-of-use plans priced exactly from a meter file, or estimated from totals with a typical hourly shape for your area (labeled as an estimate). Retail-choice areas (Texas, default-service states) and California community choice aggregation (CCA) areas price delivery from the utility tariff and supply from the plan you enter. Discount programs (CARE, FERA, medical baseline) apply across every plan.

## Capabilities

### New Capabilities

- `household/bill-totals`: Bills priced from monthly totals, with an actual-bill comparison and effective price.
- `household/usage-benchmark`: Your use in the context of your utility's and state's average home.
- `household/plan-finder`: Residential plans ranked on your own use, including retail-choice supply.

### Modified Capabilities

None. (Uses `load/bill-explainer`, `load/tariff-comparison`, and `data/utility-lookup` without changing them.)

## Non-goals

- Recommending a retail electricity provider, brokering, referrals, or any lead generation.
- Reading PDF bills or logging into utility accounts.
- Net-metering and solar export credit math beyond what `load/bill-explainer` supports (named as not modeled).
- Weather normalization or diagnosing why use changed; we show patterns and a checklist, not a diagnosis.

## Impact

- Phase 1 (launch), per `plan-launch-and-value-proof`: the household door on the home page.
- Adds a "typical residential hourly shape" dataset derived from NLR End-Use Load Profiles (ResStock, CC BY 4.0 per `docs/research/08`) by county, packed into state shards, registered with credit.
- Adds Texas TDU delivery tariffs versioned by effective date, Electricity Facts Label (EFL) entry, CCA generation and exit-fee entry, and a supply-plus-delivery pricing path to the bill engine's inputs.
