## Context

Model landscape, solver options, compute budgets, and data obstacles are in `docs/research/15` (verified 2026-10-29). The findings that shape this: no free in-browser US grid model exists; merit-order dispatch for one region-year is well under 100 ms while a full-year linear program is not viable in a browser; tested heat rates are collected by the publisher and explicitly withheld; roughly a quarter of recent fuel-cost records are blank, structurally across the independent-producer fleet; and no redistributable forced-outage data exists, which rules out any reliability figure.

## Goals / Non-Goals

**Goals:** make "what if this plant closed" askable by anyone; publish the model's error beside its answer.

**Non-Goals:** a planning model, a market simulation, or any reliability number.

## Decisions

### D1. Merit order first, and perhaps only
The model is an economic dispatch by marginal cost against recorded demand, with recorded renewable output taken as given. It is not a commitment model: no start-up costs, no minimum run times, no ramp limits, no reserves.

| Alternative | Why not |
|---|---|
| Unit commitment over a year | Millions of binary decisions, impossible in a browser, and the inputs (minimum run, starts, ramps) do not exist publicly. |
| Full-year linear program in the browser | Not viable at hourly resolution; a representative-day version is possible and is held back by D7. |
| Replay precomputed scenarios only | That is what every existing public surface already does, and it cannot answer a question the publisher did not anticipate. |

### D2. Recorded demand and recorded renewables, not modeled ones
Demand and variable renewable output come from the recorded hourly data for the chosen hours. The model dispatches the thermal and storage fleet against the residual. This keeps the counterfactual anchored to a real year and makes the backtest meaningful.

Alternative: model renewable output from weather. Rejected: it would add a second error source on top of the dispatch error and make the backtest uninterpretable.

### D3. Heat rates are derived from monitored data, with the uncertainty shown
Because tested heat rates are withheld by the publisher, unit heat rates are derived from monitored hourly heat input and gross load where a unit is monitored, and from fleet averages by technology and vintage elsewhere. Every unit's heat rate carries its derivation method and a plausible range, and the dispatch reports how much of the region's capacity used a derived rather than measured rate.

| Alternative | Why not |
|---|---|
| Use a single heat rate per technology | Merit order would be wrong in exactly the band where units compete. |
| Request the withheld tested rates | Not available, and a model that waits for them never ships. |

### D4. Missing fuel costs are a stated gap, never imputed silently
Where a plant's reported fuel cost is blank, the model uses a regional monthly price by fuel with its source and marks every affected unit. The share of regional capacity running on a substituted price is shown on every result, because a quarter of recent records are blank and that concentration is structural rather than random.

Alternative for D4: impute a plant's fuel cost from similar plants. Rejected: the blanks are concentrated in one ownership class rather than scattered, so imputing from reporting plants would systematically misplace the non-reporting fleet in merit order.

### D5. The backtest is not optional and cannot be dismissed
Before any scenario is offered, the tool dispatches the unmodified fleet over the chosen hours and shows its generation by fuel against what actually happened, with the error by fuel and by hour. The scenario controls unlock only after that comparison has been displayed, and the error travels with every scenario result and every copied card.

| Alternative | Why not |
|---|---|
| Show the backtest in a tab | It would be the first thing ignored and the last thing quoted. |
| Skip the backtest for speed | The error is the most informative output; a screening model without it is a guess with a chart. |

### D6. Refuse the numbers the data cannot support
No loss-of-load, expected-unserved-energy, reserve-margin adequacy verdict, price, or emissions forecast is produced. A forced-outage sensitivity is offered only as an assumptions instrument where the user supplies the rates, labeled as their assumption, and it never yields a headline reliability figure.

Alternative for D6: publish a reliability figure with the caveat that the inputs are incomplete. Rejected: the missing input is correlated outages in extreme weather, which biases the number in the direction that matters most, so a caveat would not stop it being quoted as an adequacy finding.

### D7. No solver, so no third-party runtime code
Merit-order dispatch is a sort and a cumulative sum in our own code. The representative-day linear program that `docs/research/15` rates deliverable-but-least-defensible would require a third-party solver module (about 3.7 MB raw, 1.25 MB compressed, with a permissive license but a pinned-version requirement and a working-memory footprint that does not shrink between runs), and `platform/zero-dependency` forbids third-party runtime code with no exception but self-hosted fonts. So it is refused here rather than deferred: taking it would need a separate change that amends `platform/zero-dependency` on its own merits.

| Alternative | Why not |
|---|---|
| Ship the solver for the representative-day program | Breaks the zero-dependency guarantee, which is a product promise rather than a preference, for the least defensible view in the research. |
| Defer it as "maybe later" | A conditional deferral reads as permission; the rule is absolute until a change amends it. |
| Write our own linear-program solver | A general solver is a research project and would be far less trustworthy than the merit-order model we can verify. |

Alternative for D6: offer a reliability figure with wide error bars. Rejected: a number with bars still gets quoted as a number, and the missing input (correlated outages in extreme weather) biases it in the direction that matters most.

### D8. Say what it is, next to the real tools
Every page states that this is a screening model, names what it omits (commitment, network, reserves, market behavior), and links the national models that do it properly. A result card cannot be copied without that sentence.

Alternative for D8: let the screening label carry it. Rejected: a label says the result is approximate; it does not tell a reader which physical effects are absent, which is what makes a dispatch result misleading.

## Risks / Trade-offs

- **A browser model will be mistaken for a planning study.** Mitigation: the mandatory backtest, the omissions list on every page, the screening label in every copied card, and links to the proper models.
- **Derived heat rates and substituted fuel prices can invert merit order.** Mitigation: per-unit uncertainty, the share of capacity affected on every result, and the backtest, which exposes exactly this failure.
- **The backtest may look poor.** Mitigation: that is the honest outcome and the most useful thing we can publish; a poor fit is reported as a limit on what the scenario can tell you.
- **Scope creep toward a planning model.** Mitigation: the non-goals, D6's refusals, and D7's deferral.
