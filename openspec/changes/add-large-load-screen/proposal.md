## Why

**Value up front:** when a 300 MW data center asks a county's utility for service, city staff, co-op boards, reporters, and residents can see in minutes how big that request is compared with the utility's whole system, what the utility's large-load tariff requires the customer to pay even if it never ramps up, and what happens if it leaves early. Developers can compare those terms across utilities. All from public orders and tariff sheets, cited line by line.

Why now (`docs/research/05` §2):
- Large-load requests are exploding. One Virginia co-op's data center requests went from 7,423 MW in 2024 to 22,426 MW in 2026 (`docs/research/02`).
- Utilities are adopting large-load tariffs with minimum bills and exit fees: AEP Ohio (25 MW threshold, tiered minimum capped at 85% of contract), Dominion GS-5 (85% T&D, 60% generation, 14 years), Georgia Power (100 MW, up to 15 years), Xcel Minnesota, and Missouri's 2025 law.
- FERC issued show cause orders to the RTOs on large-load interconnection on 2026-06-18 (now paused, no final rule); Texas adopted its large-load interconnection rule (16 TAC §25.194, effective 2026-10-08) and has proposed a statewide large-load minimum bill.
- The one national tracker (SEPA's DELTa) sits behind a form with no stated license. No free tool does the math.

## What Changes

- **Large-load tariff terms table:** threshold, minimum bill percentages by component, contract term, ramp, exit fees, collateral, and effective dates, built by us from primary orders and tariff sheets, each cell cited.
- **Take-or-pay calculator:** contract MW, ramp schedule, minimum percentages, and expected actual load give the minimum bill, payments for unused capacity, and exit-fee exposure by year.
- **"How big is this request?" card:** requested MW compared with the utility's annual peak (FERC Form 714 via PUDL) and annual sales (EIA-861), plus a plain "who pays if it leaves" explanation.

## Capabilities

### New Capabilities

- `large-load/tariff-terms`: A cited, comparable table of large-load tariff terms.
- `large-load/take-or-pay`: Minimum-bill and exit-fee math by contract year.
- `large-load/request-context`: A request's size in the context of the serving utility.

### Modified Capabilities

None.

## Non-goals

- Confidential contract terms, rumored projects, or project-level siting data.
- Interconnection feasibility or transmission studies.
- Copying DELTa or any compilation without a license.

## Impact

- Phase 2 (`plan-launch-and-value-proof`). Adds a curated terms dataset maintained by pull request with citations, plus FERC Form 714 annual peaks via PUDL (CC BY 4.0).
