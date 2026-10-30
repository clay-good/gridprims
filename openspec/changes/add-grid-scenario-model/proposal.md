## Why

**Value up front:** anyone can open a browser tab, pick a US balancing authority and a past year, retire or add a generator, and see what the grid would plausibly have done instead, hour by hour, with the model's own error against what actually happened shown on the same screen. The question "what happens if this plant closes?" currently needs a Python stack, a data pipeline, and a week; a city council, a reporter, or a student has no way to ask it at all.

Why this is possible now and genuinely absent (`docs/research/15`):
- **No free, account-free, in-browser US grid scenario model exists.** ReEDS, GenX, PyPSA-USA, Switch, GridPath, and Breakthrough Energy's REISE.jl are all local Python or Julia (and REISE.jl has been unmaintained since 2023); the public web surfaces (the national laboratory's Scenario Viewer, Cambium, PostREISE) only replay precomputed runs. Energy Innovation's Energy Policy Simulator does run client-side, and has no dispatch, merit order, or optimization at all.
- **No solver is needed.** Merit-order dispatch is a sort and a cumulative sum, so it needs none of the optimization machinery that keeps grid models on desktops. `docs/research/15` estimates a full region-year at well under a second from operation counts (an estimate, not a measurement); the spec sets one second on the reference profile as the testable budget.
- **We already ship the data.** EIA-930 hourly demand and generation by fuel per balancing authority since 2018, the EIA-860 generator fleet, EIA-923 generation and fuel costs, and EPA CAMD monitored emissions are all in our snapshots.
- **And it can hold itself accountable.** Because EIA-930 records what actually happened in the same hours, the model can score its own output against it and show the residual, which is exactly the posture the rest of the site takes.

We are deliberately not building a planning model. The national capacity-expansion and production-cost models are better than anything we could write and carry the authority to match; we link to them and say so.

## What Changes

- **Fleet data:** a per-balancing-authority generating fleet assembled from our snapshots with capacity, fuel, technology, a derived heat rate, a fuel cost, and a variable cost, each field carrying its source and its own uncertainty, and every gap shown rather than filled.
- **Counterfactual dispatch:** a merit-order economic dispatch of that fleet against the recorded hourly demand, with renewables taken from recorded output, on the device in our own code, re-running in under a second when the fleet is edited.
- **Self-backtest:** the model's generation by fuel laid over what actually happened in those same hours, with a published error metric, by fuel and by hour, shown before any scenario result is offered.
- **Screening views:** retirement and addition screening, a marginal-unit explorer, and net-load and curtailment screening, each stated as a screening estimate with its error carried through.

## Capabilities

### New Capabilities

- `scenario/fleet-data`: The per-region fleet with derived costs, sources, and gaps.
- `scenario/counterfactual-dispatch`: On-device merit-order dispatch over recorded demand.
- `scenario/self-backtest`: The model's error against recorded history, published and unavoidable.
- `scenario/screening-views`: Retirement, addition, marginal-unit, and curtailment screening.

### Modified Capabilities

None.

## Non-goals

- Any linear or mixed-integer program, and therefore any third-party solver. A browser solver module would be third-party runtime code, which `platform/zero-dependency` forbids outright; taking one would require a separate change amending that capability, and this change does not propose it.
- Security-constrained unit commitment, or any commitment model over a full year.
- Alternating-current power flow, nodal prices, or anything needing network topology, which we will not publish.
- Any published reliability figure (loss of load, expected unserved energy): the outage data required is confidential and the only openly published class averages are long out of date, so a number would look precise and understate winter risk.
- National or multi-decade capacity expansion. ReEDS does this with a commercial solver on high-performance computing, and GenX, Switch, PyPSA-USA, and GridPath do it properly on a desktop; we link to them rather than be a worse version of them.
- Forecasting prices, loads, or emissions.
- Presenting dispatch output as a market simulation, a price forecast, or a substitute for a production-cost study.

## Impact

- Phase 3, per `plan-launch-and-value-proof`, after the tools that serve people's own data and after the measurement work that establishes our honesty.
- Adds the derived fleet and cost tables as datasets we own, built from snapshots already registered.
- Adds no third-party runtime code. Merit-order dispatch needs no solver, so `platform/zero-dependency` holds unchanged; the representative-day linear program that would need one is a non-goal (design D7).
