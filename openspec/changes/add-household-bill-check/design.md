## Context

Evidence: `docs/research/09` (households, data access, TOU defaults), `08` (End-Use Load Profiles CC BY 4.0, URDB CC0), `07` (URDB units including $/day charges). Engines: the bill engine and tariff record from `add-load-and-bill-analyzer` design D2.

## Goals / Non-Goals

**Goals:** a useful answer from bill totals alone; exact answers from a meter file; honest labels on every estimate.

**Non-Goals:** a separate engine; personalized advice.

## Decisions

### D1. One bill engine, a second front door
Household tools are thin pages over the existing bill engine and tariff comparison, with household copy and the totals input. Alternative: send households to the load workbench. Rejected: it assumes a meter file and professional vocabulary.

### D2. Billing periods split by day
Totals arrive per billing period, not calendar month. When a period crosses a season or rate change, kWh and tier allowances are split in proportion to days in each part, which is the most common utility proration method; the tool names the method and lets the user switch to "no proration" for tariffs that bill the whole period at one season. Alternative: assume calendar months. Rejected: misprices about half of periods near season changes.

### D3. Time-of-use from totals uses a labeled typical shape
From totals alone, TOU energy is split across periods using a typical residential hourly shape for the user's county (ResStock baseline, by heating fuel when the user says it), aligned to the weekdays of the user's billing year and scaled to each period's kWh. The result is labeled "Estimate from a typical home's hourly pattern". When a TOU bill prints kWh by period (common in California), the user enters those and pricing is exact; with a meter file it is exact. County shapes are packed into state shards so no request names a county (foundation `platform/privacy-and-security`).

| Alternative | Why not |
|---|---|
| Refuse to price TOU from totals | Leaves most households, who cannot get a file, with no answer on their most common question. |
| A national average shape | Ignores climate; a Phoenix home and a Boston home peak at different hours. |

### D4. Retail choice and CCAs as supply plus delivery
Where customers choose a supplier (Texas competitive areas; default service in states such as PA, OH, IL, MD, NJ, NY, MA, CT) or are served by a California community choice aggregator, the bill is the utility's delivery tariff plus the supply price (and, for CCAs, the utility's exit fee, the PCIA). In Texas, the user enters their plan from its Electricity Facts Label (energy charge, base charge, and any usage credits); TDU delivery charges come from tariffs versioned by effective date, since they change at least twice a year. For CCAs, the user enters the CCA generation rate and the PCIA vintage rate from the bill. Alternative: scrape Power to Choose offers or CCA rate pages. Rejected: brittle, terms unverified, and offers change often; we link instead.

### D6. Discount programs modify every plan
CARE, FERA, and medical baseline are not plans; they are discounts or extra baseline allowances applied on top of a plan. The user ticks the programs they are on, and the engine applies each program's percent discount or added kWh to every plan it covers. Alternative: list them as plans. Rejected: misprices every plan for income-qualified homes.

### D5. No invented percentiles
EIA-861 gives totals and customer counts, not distributions, so the benchmark compares to averages only and says so. Alternative: estimate a percentile from ResStock. Rejected: a modeled stock is not the utility's customers.

## Risks / Trade-offs

- **Typical shapes mislead unusual homes** (EVs, home businesses). Mitigation: estimate label, the shift what-if for EV charging, and a push to get the meter file.
- **URDB residential plans can be stale.** Mitigation: per-plan last-updated date and the staleness warning from `load/tariff-comparison`.
- **Riders and fuel adjustments are often missing** in URDB. Mitigation: the actual-bill comparison names them as the likely gap, never a billing error.
