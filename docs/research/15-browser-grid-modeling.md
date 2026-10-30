# 15 — How ambitious can grid *system* modeling get in a static site?

Research date: 2026-10-29. Planning only; no code, no commitment. "Verified" means read on the publisher's own page, repo, or package registry on 2026-10-29, or computed by me from the artifact itself. "Unverified" means secondary source or not found. Arithmetic marked **(my estimate)** is my own reasoning, not a cited benchmark.

## Bottom line

- **No public, free, no-account, in-browser US grid *optimizer* exists today.** Every serious US model (ReEDS, GenX, PyPSA-USA, Switch, GridPath, REISE.jl) is local Python/Julia. Every public web surface for them (NLR Scenario Viewer, Cambium, PostREISE) is a **viewer of precomputed runs**, not a run. **Verified.**
- **The one client-side US energy model that exists is the Energy Policy Simulator** — a 7.2 MB WASM system-dynamics model in a Web Worker, GPL-3.0, 48 states. It is not a grid model: no dispatch, no merit order, no LP. **Verified.** That is the proof the delivery pattern works and the proof nobody has aimed it at dispatch.
- **The solver is not the blocker.** `highs` (npm, **MIT**, HiGHS 1.15.4, ~1.25 MB gzip, ESM, MILP) ships today and loads without a bundler. **Avoid `glpk.js` — it is GPL-3.0 and would copyleft the site.** **Verified.**
- **The blocker is honesty, not compute.** Merit-order dispatch, curtailment, retirement screening, and analytic LOLE all run in well under a second in plain JS for one balancing authority at 8760 hours. What is missing is defensible *inputs*: EIA-860's `Tested Heat Rate` is explicitly withheld, and **24.7% of 2025 fuel-receipt records have no cost — structurally, essentially the entire IPP fleet**. **Verified.**
- **The genuinely new capability is a screening model that scores itself.** Shipping dispatch alongside a built-in backtest against EIA-930 actual generation-by-fuel for the same hours is the thing no free tool does — and it is the only way a browser toy earns the right to show a number.
- **Do not ship an LOLE number.** No redistributable forced-outage rates exist, and no free data gives temperature-correlated outages, which is what actually drives US winter risk. Offer the calculator with user-entered EFORs as a sensitivity instrument, never as a forecast. **Verified (data gap).**

> Context note: NREL became the **National Laboratory of the Rockies (NLR)** on 2025-12-01. I confirmed by DNS that `nrel.gov` and `scenarioviewer.nrel.gov` **do not resolve at all**, while `nlr.gov` and `scenarioviewer.nlr.gov` return 200. GitHub `NREL/*` repos now redirect to `NatLabRockies/*`, and `NREL-Sienna` to `Sienna-Platform`. Consistent with brief `01`. **Verified.**

---

## 1. Free/open grid models and what they require

Licenses and dates below are from the GitHub API on 2026-10-29 unless noted. **Verified** for every row's license/language/last-push; "browser" column is Verified-absent (searched, not found) unless stated.

| Model | License | Language | Runtime needs | Last push | Browser/WASM? |
|---|---|---|---|---|---|
| ReEDS 2.0 (`NatLabRockies/ReEDS-2.0`) | BSD-3-Clause | Python | **Commercial solver in practice** (Gurobi/CPLEX), GAMS, hours–days, HPC | 2026-04-22 | No |
| Cambium / Standard Scenarios | US Gov data terms | — | Outputs only; ReEDS-derived | — | Viewer only (`scenarioviewer.nlr.gov`) |
| Sienna / `PowerSimulations.jl` | BSD-3-Clause | Julia | Julia + JuMP + solver | 2026-10-29 | No (Julia-in-WASM unusable, §1a) |
| PyPSA | **MIT** | Python | Python, linopy, HiGHS/Gurobi | 2026-10-29 | No official port |
| PyPSA-USA | **MIT** | Python | Snakemake pipeline, local solve | 2026-10-28 | No hosted UI |
| PowerGenome | MIT | Python | Python + PUDL database | 2026-10-28 | No |
| **GenX** (`GenXProject/GenX.jl`) | **GPL-2.0 — not MIT** | Julia | Julia + JuMP + HiGHS/Gurobi | 2026-10-15 | No |
| Switch | "Other" (Apache-family; GitHub reports NOASSERTION) | Python | Pyomo + solver | 2025-07-07 | No |
| Temoa | MIT | Python | Pyomo + solver | 2026-10-29 | No |
| OSeMOSYS | Apache-2.0 | GMPL/Python | GLPK/CBC; clicSAND is Excel+exe desktop | 2025-10-22 | No |
| Calliope | Apache-2.0 | Python | Python + solver | 2026-10-20 | No (NLR **Engage** is Calliope, server-side, **account required**) |
| GridPath (`sylvan-energy/gridpath`) | Apache-2.0 | Python | Pyomo + DB + solver | 2026-10-28 | No |
| Antares Simulator | "Other" (MPL-2.0 per project docs, **Unverified** via API) | C++ | Desktop/HPC binary | 2026-10-29 | No |
| MATPOWER | "Other" (BSD-3, **Unverified** via API) | MATLAB | MATLAB/Octave | 2026-10-12 | No |
| pandapower | "Other" (BSD-3, **Unverified** via API) | Python | Python | 2026-10-29 | No |
| PowerModels.jl | "Other" (BSD-3 LANL, **Unverified** via API) | Julia | Julia + JuMP | 2026-10-28 | No |
| OpenDSS / DSS-Python | BSD-3-Clause | C++/Python | Windows COM or `dss_python` | 2026-02-26 | No (DSS-Extensions has no wasm target found) |
| **Breakthrough Energy Grid** (REISE.jl, PowerSimData) | MIT | Julia/Python | Local/HPC DC-OPF | **REISE.jl 2023-02-24; PowerSimData 2023-08-02 — effectively abandoned** | PostREISE replays pre-generated results only |
| Open Energy Transition | varies | — | EU/global focus; PyPSA stewardship | — | No US browser tool |

**Reading:** the US-specific, actively maintained, permissively licensed option is **PyPSA-USA (MIT)** — but as a local Snakemake pipeline. The one project that had both a US grid and a web surface, Breakthrough Energy's Grid, stopped in 2023 and nobody picked it up. **Verified.** Note the GenX license correction: **GPL-2.0**, confirmed from its `LICENSE` file, so GenX formulations may be read for reference but GenX code cannot be vendored into a permissively licensed static site.

### 1a. Solvers that actually run in a browser

| Package | License | Size (raw / gzip, measured) | Loads w/o bundler | MILP | Latest |
|---|---|---|---|---|---|
| **`highs`** (lovasoa/highs-js) | **MIT** | 3.7 MB / **1.25 MB** | Yes (ESM) | **Yes** | 1.15.4, 2026-10-16 |
| `glpk.js` | **GPL-3.0 — disqualifying** | 505 KB / 278 KB | ESM | Yes | 5.0.0, 2025-12-23 |
| `yalps` | MIT | 6 KB / **2.6 KB** | Yes | Yes (small) | 0.6.4, 2025-12-24 |
| `clp-wasm` | EPL | ~0.8 MB | CJS only | No (LP only) | **dead, 2022** |
| Clarabel WASM / SCIP / SoPlex / Cbc / OSQP | — | — | — | — | **No browser build found** |
| Pyodide + `highspy` | MPL/MIT | **13.4 MB base + 0.86 MB** (+14 MB for SciPy) | Yes | Yes | Pyodide 314.0.7 |

All **Verified** (npm registry + jsDelivr byte measurement). Two caveats worth carrying: use `highs` **≥ 1.15.1** (1.14.0 presolve returned wrong "Optimal" on MIPs, upstream issue #53), and each `createModel()` holds WASM memory that never shrinks — matters for a long-lived SPA.

- **Julia in the browser: no.** `WebAssemblyCompiler.jl` is stale (last push 2024-02); `WasmCodegen.jl` is active but 3 stars, no releases, self-labeled experimental, and restricted to `juliac --trim=safe`, which forbids dynamic dispatch — the thing JuMP is built on. **Do not plan on it.** **Verified.**
- **PyPSA in Pyodide: no evidence it has ever been done.** Zero GitHub hits for `jupyterlite`/`webassembly` in the PyPSA org. `linopy` is pure Python but needs `numexpr` and `dask`, neither in Pyodide; PyPSA additionally needs `rapidfuzz`, `pydeck`, `plotly`. **Verified-absent, i.e. searched and not found.**
- **Largest confirmed `highs-js` model:** 5,687 columns × 2,924 rows solved Optimal (upstream issue #52, maintainer-confirmed). No published timing benchmark exists anywhere. The only browser-solver benchmark found is YALPS's: `glpk.js` solved 1,641×1,640 with 40 integers in **53 ms** in Node. HiGHS is materially faster than GLPK, so **(my estimate)** pure LPs of ~10⁴ × 10⁴ should clear in under a second, and a few hundred integer variables is the comfortable MILP ceiling.

---

## 2. Is there any public, free, in-browser US grid scenario tool today?

| Tool | US-specific | Free / no account | Compute | Live model or viewer | Verdict |
|---|---|---|---|---|---|
| **Energy Policy Simulator** (energypolicy.solutions) | **Yes, 48 states** | Yes | **Client-side WASM, Web Worker** | Live model | GPL-3.0 system dynamics. **No dispatch, no merit order, no LP.** Verified |
| En-ROADS / C-ROADS | No (global) | Yes | Client-side WASM | Live model | Proprietary model; climate, not grid. Verified |
| model.energy | No (global, EUR costs) | Yes | **Server-side** (Flask/Clp queue) | Live model | AGPL-3.0. Verified |
| model.energy/scenarios | **No — Europe only, 45 regions** | Yes | Server-side | Live model | Repo stale 2024-09. Verified |
| Energy Transition Model (Quintel) | **No — 428 areas, zero US** | Yes | Server-side API | Live model | Has a merit-order module; no US data. Verified |
| NLR Scenario Viewer / Cambium / Standard Scenarios | Yes | Yes | Server | **Viewer only** | Precomputed ReEDS archives. Verified |
| NLR **Engage** (Calliope) | Generic | **Account required** | Server cloud | Live model | BSD-3. Verified |
| SAM / PySAM | US data | Yes | **Desktop/Python** | Live model | No WASM build found |
| Breakthrough Energy Grid / PostREISE | **Yes** | Code free; no run UI | Local/HPC | Replays pre-generated results | **Abandoned 2023.** Verified |
| PyPSA-USA | **Yes, best US scope** | Free code | Local only | Live model | No hosted viewer. Verified |
| PyPSA Time Series Explorer | Agnostic | Yes | **Client-side** | **Viewer only** | MIT; drag-drop `.nc`. Verified |
| EIA AEO case browser / Electricity Data Browser | Yes | Yes | Server | **Viewer only** | NEMS is not publicly runnable. Verified |
| Grid Status (gridstatus.io) | Yes | Dashboard free; API needs account | Server | **Data, not modeling** | Verified |
| Electricity Maps / WattTime / Singularity / Climate TRACE | Mixed | Mixed/paid | Server | **Data, no simulator** | Verified |
| GridLAB-D / Arras + GLOW | Yes (distribution) | Self-host Docker | Server container | Live model | No public instance. Verified |
| PowerWorld demo | Generic | Windows, 13-bus cap | Desktop | Live model | Proprietary. Verified |
| EaSimPower (U Duisburg-Essen) | No (EU) | — | Server | Live teaching model | **Unverified** availability |

**The gap, stated precisely:** there is no page where a member of the public, with no account, sets fuel prices and a fleet for ERCOT or CAISO or PJM and sees a dispatch stack, a marginal unit, and an implied marginal cost computed on their own machine. All three ingredients ship today — a MIT WASM MILP solver, open US fleet data, and a proven client-side WASM-energy-model pattern (SDEverywhere, behind EPS and En-ROADS). Nobody has wired them together.

---

## 3. What is actually feasible client-side with shipped static data

Scope assumption throughout: **one balancing authority, 8760 hours, ~300–700 generating units.** Timings are **(my estimate)** from operation counts, not measured.

| # | Capability | Algorithm | Realistic in-browser cost | Data needed | Verdict |
|---|---|---|---|---|---|
| a | **Merit-order / economic dispatch screening** | Sort units by marginal cost once; prefix-sum cumulative capacity; binary-search per hour | 8760 × log n ≈ **under 50 ms**; even a naive 8760×700 walk is ~6M ops, **<100 ms** | EIA-860 fleet + derived heat rates + fuel prices + EIA-930 hourly demand | **Yes, trivially.** Interactive at 60 fps |
| b | **Add / remove / retire generators and re-dispatch** | Re-sort + re-prefix-sum + re-walk | Same as (a); **<100 ms per edit** | Same | **Yes.** This is the cheap part |
| c | **A real LP in the browser** | `highs` (MIT, 1.25 MB gz) | Full-year UC with 700 units = ~6M variables: **impossible**. Day-decomposed dispatch (365 LPs × ~700×24 = 17k vars) at a few tens of ms each ≈ **5–15 s total**. One representative week, or 12 representative days, lands **well under 2 s** | Same + ramp/min-load assumptions (**not in any free dataset**) | **Yes, but only on representative days.** Storage arbitrage breaks day decomposition — needs a rolling horizon |
| d | **Resource adequacy / LOLE** | **Do not Monte Carlo.** 8760 h × 1000 draws × 700 units ≈ 6 × 10⁹ Bernoulli draws = minutes. Use the textbook **capacity outage probability table**: 10 MW bins, convolve 700 units → vector ~5k, ~2M ops; then 8760 CDF lookups | **Under 100 ms for a full-year analytic LOLE/EUE** | Hourly load (EIA-930) ✅ + capacity (EIA-860) ✅ + **forced outage rates ❌ (no redistributable source)** | **Compute: yes, instantly. Data: no.** See §5 |
| e | **Renewable integration / curtailment screening** | Scale VRE profiles, subtract from load, count hours of negative net load and min-gen violation | 8760 ops, **under 10 ms** | EIA-930 generation-by-fuel (wind/solar shapes per BA, 2018→) + user build multiplier | **Yes.** Strongest ratio of insight to assumption |
| f | **"What if this plant retires"** | (b) + reserve-margin delta + marginal-hours delta + emission delta | **Under 200 ms** | (a)'s data + eGRID/CAMD emission rates | **Yes** |

**Payload sanity check (my estimate):** EIA-930 hourly demand plus ~8 fuel series for one BA, 2018-01 → now ≈ 77k hours × 9 series ≈ 700k values. Float32 with delta-encoding plus gzip lands in roughly **0.5–1 MB per BA**, so shard per BA and fetch on demand. The fleet table for one BA (≈700 units × ~20 fields) is tens of KB. Both are comfortable for a static site.

---

## 4. Heat rates and fuel prices — enough for a credible merit order?

| Item | Finding | Status |
|---|---|---|
| **EIA-923 Page 1** (`EIA923_Schedules_2_3_4_5_M_12_2025_Final.xlsx`, tab `Page 1 Generation and Fuel Data`) | Monthly `Elec_MMBtu <Month>` ÷ `Netgen <Month>` gives heat rate at **plant × reported prime mover × reported fuel type × month**. Use `Elec_*`, not `Tot_*`, or CHP thermal output inflates it | **Verified** (workbook downloaded, header row read) |
| Coverage / lag | Mandatory ≥1 MW grid-connected; ~3,034 monthly + ~9,528 annual-only plants. Monthly ~2-month lag (Aug 2026 out 2026-10-23); annual final ~9 months (2025 final out 2026-09-14) | **Verified** |
| Unit-level heat rate from EIA-923 | Pages 3 (boiler fuel) and 4 (generator net gen) exist but need the EIA-860 Schedule 6 boiler-generator association, which EIA does not publish completely. PUDL infers it and covers only **~55% of reported MWh** | **Verified** |
| **EIA-860 `Tested Heat Rate`** | **Collected and explicitly withheld.** Form instructions, Schedule 3 Part B line 16, collect it; the DISCLOSURE section names it as protected. Zero "heat rate" matches across all 379 field rows of `LayoutY2025.xlsx` | **Verified — important** |
| EIA Table 8.2 | "Average Tested Heat Rates by Prime Mover and Energy Source, 2015–2025", Btu/kWh, 4 prime movers × 4 fuels, capacity-weighted, some cells `W` (withheld) — **16 cells a year.** This is the public face of the withheld field | **Verified** |
| eGRID2023 | `PLNT` has `PLHTRT` = plant nominal heat rate (Btu/kWh). **`UNT` has heat input (`HTIAN`) but no unit MWh**, so unit heat rate is *not* derivable from eGRID alone. Annual, ~2-year lag | **Verified** |
| **EPA CAMD / CAMPD hourly** | **Hourly heat input (MMBtu) and gross load (MWh) per unit, 1995→**, ~96% of US fossil generation, >25 MW fossil EGUs, quarterly + 30-day lag, bulk FTP files by state-year plus REST API | **Verified — the best heat-rate source** |
| CAMD caveats | Gross ≠ net load; combined-cycle units are **not required to report steam-turbine generation**; steam-only units may report steam instead of MWh; blanks ≠ zero; invalid-monitor hours carry deliberately conservative **substitute data**, and CAMPD does not flag it (only FTP/FACT feeds do) | **Verified** |
| **EIA-923 Page 5 `FUEL_COST`** | Plant-level delivered cost, cents/MMBtu, monthly. Reporting threshold: ≥50 MW coal, or ≥200 MW combined gas/petcoke/distillate/residual/hydrogen | **Verified** |
| **Fuel cost redaction** | Of 36,790 2025 receipt records, **9,100 (24.7%) have `FUEL_COST = "."` — and the gap is structural: essentially every `UNR` (nonutility/IPP) record, including 6,565 gas records.** Instructions withhold nonutility delivered cost and commodity cost for *all* plants | **Verified — the binding constraint** |
| Henry Hub (`RNGWHHD`) | Daily $/MMBtu; Oct 27, 2026 = $2.76 | **Verified** |
| EPM Table 4.2 | Monthly $/MMBtu — but titled "**Electric Utilities**," consistent with the withholding; 2026 values preliminary | **Verified** |
| Gas delivered to electric power (`n3045us3m`) | Monthly, **$/Mcf not $/MMBtu** — convert | **Verified** |
| Terms | **EIA: public domain**, dated credit requested. **EPA is weaker:** "freely distributed and used for **non-commercial**, scientific and educational purposes," content "may be protected by copyright," only geospatial data is stated public domain | **Verified — flag if the site ever monetizes** |

**Answer to Q4:** yes, enough for a credible *average-cost* merit order — **CAMD hourly heat input ÷ gross load for the fossil fleet, EIA-923 monthly plant heat rate as the fallback and cross-check, EIA-923 Page 5 where fuel cost exists, Henry Hub plus a user-set basis where it does not.** What the free data cannot give at any price: incremental heat-rate curves, min-load, ramp rates, start costs, VOM. So this is a **supply stack, not a dispatch model**, and the UI must say so.

---

## 5. Resource adequacy — is a credible LOLE screening possible?

| Source | What it gives | Usable? |
|---|---|---|
| **NERC GADS** | Mandatory for conventional units ≥20 MW since 2013-01-01; solar ≥100 MW since 2024 | **Confidential. No public unit-level dataset found anywhere.** Verified-absent |
| NERC Generating Availability Report / class-average EFORd | Whether a current free class-average download exists | **Unverified** — the two NERC GADS pages are JS-rendered and returned only nav chrome. Needs a browser check |
| ISO-NE republished class averages | Only file locatable is **2010 vintage** | Verified; too stale to use |
| **NERC 2025 LTRA** (free PDF, Jan 2026) | Per-area 2026–2035 tables: `Total Internal Demand`, `Net Internal Demand`, Tier 1/2/3 additions, **`Anticipated Reserve Margin`**, **`Prospective Reserve Margin`**, **`Reference Margin Level`**; plus a cross-area summary (p. 175) with each area's RML and methodology, nearly all on a 0.1 day/yr LOLE basis | **Verified — the best free RA data in this set.** Companion spreadsheet **Unverified** |
| ELCC / capacity accreditation | Appears as **per-area narrative prose** in LTRA, not a machine-readable national table | Verified |
| EIA-860 `3_1_Generator` | `Planned Retirement Month/Year`, planned uprate/derate MW + dates, `Status`, `Summer`/`Winter Capacity (MW)`, `Time from Cold Shutdown to Full Load` | Verified; useful, but **not outage rates** |
| EIA-923 | **No outage data at all** | Verified |
| **ERCOT Hourly Resource Outage Capacity** (`NP3-233-CD`) | Aggregated active outaged capacity by load zone, next 168 h, hourly, listed **Public** | Verified; ERCOT redistribution terms **Unverified** (`/about/legal-notices` 404'd) |
| **PJM Data Miner 2 `mnt_efor`** | The only free **class-level EFORd** series found (`unit_type`, `rating`, `eford`) | **Unusable: "redistribution … is strictly prohibited without a PJM membership."** Verified |
| CAISO prior-trade-date outage report | Daily snapshot, CAISO BA only | Free/no-login **inferred, not stated** |
| **ERCOT CDR + MORA** | Capacity, Demand and Reserves XLSX + monthly adequacy outlook XLSX, no login indicated | **Verified free** |
| EIA-930 | Hourly `D`, `DF`, `NG`, generation by source, `TI`, `ID`; storage must be excluded from `D` and booked as negative `NG` — so demand is **not comparable across BAs that cannot do this**; published largely as-received; hourly gen does **not** reconcile to EIA-923 | Verified; revision-threshold rule and imputation methodology **Unverified** |

**Why a browser LOLE number would mislead, concretely:**

1. **No redistributable forced-outage rates at any granularity.** You would be hard-coding textbook EFORs into a metric that is roughly exponentially sensitive to them.
2. **No correlated or temperature-dependent outage data exists free.** US winter risk is dominated by correlated cold-weather failures. Independent-outage convolution will understate the tail by an order of magnitude **and look precise while doing it.** This is the single most dangerous possible feature on the roadmap.
3. **No public maintenance schedules**, so planned outages must be assumed flat.
4. **Accreditation is PDF prose**, so the ELCC assumptions that dominate the answer get hand-entered.
5. **One free hourly load series, with caveats** — EIA-930, as-submitted, no weather normalization, no multi-decade weather-matched history to build a risk distribution from.

**The defensible version:** re-present NERC LTRA's own ARM/PRM/RML and ERCOT's CDR as data, add the analytic COPT calculator with **user-entered** EFORs and a visible "these are your assumptions, not our data" frame, and report *sensitivity* (how many MW of accredited capacity moves the margin) rather than a reliability index.

---

## 6. What experts would call genuinely new — and where a browser tool is worse

**What already exists and we should link to, not rebuild:** Cambium for precomputed hourly marginal emission rates; NLR Standard Scenarios for national expansion futures; PyPSA-USA and GenX for anyone who can run Python or Julia; gridstatus.io for actual market outcomes; NERC LTRA for reserve margins.

**What a browser tool is honestly worse at, and would mislead if shipped:**

- **Anything needing the network.** No transmission means no congestion, no LMP, no binding-constraint story. Implied prices will diverge badly from actual LMPs, worst exactly where people care most: scarcity hours and hydro/nuclear-heavy BAs.
- **Unit commitment.** Without min-load, min-run, start costs, and ramps — none of which are in any free dataset — a merit-order stack will over-dispatch flexibility and under-predict both negative prices and scarcity prices.
- **Multi-decade capacity expansion.** ReEDS exists, is BSD-licensed, and needs a commercial solver and hours of HPC. A browser version would be a worse ReEDS wearing ReEDS's authority.
- **Any reliability index.** See §5.

**The new thing that is actually new:** every free screening model asks to be trusted. None of them show their error. Because EIA-930 publishes **actual hourly generation by fuel per BA since 2018**, a browser dispatch model can be scored against ground truth on the very hours it models, in the same page, every time it runs. That turns the weakest property of a simplified model — that it is simplified — into the feature: the user sees where it tracks and where it falls apart, by hour, by fuel, by season.

### What is genuinely new and feasible, ranked

1. **Counterfactual merit-order dispatch with a built-in backtest.** Pick a BA and a date range, dispatch the shipped fleet against EIA-930 demand, then **overlay modeled generation-by-fuel against EIA-930 actuals with a visible error metric.** Edit the fleet, re-dispatch, re-score. Verified-absent elsewhere; <100 ms per edit; defensible because it publishes its own residuals.
2. **Marginal-unit explorer with an editable fleet.** For any historical hour, which unit is marginal, at what implied marginal cost and implied marginal emission rate. Cambium gives precomputed marginal rates you cannot edit; this gives editable ones you can audit. Complementary, not competing.
3. **Retirement / addition screening.** Reserve-margin delta, marginal-hours delta, emission delta, and which unit becomes marginal instead. The question civic users, journalists, and commenters actually ask, and today it requires a Python stack.
4. **Net-load / curtailment screening.** Scale a BA's observed wind and solar shapes, show when net load goes negative or breaches a min-gen floor. Cheapest, most assumption-light, most immediately legible.
5. **Analytic COPT / LOLE sensitivity calculator with user-entered EFORs.** Shipped as an assumptions instrument next to NERC LTRA's published margins. Honest only if it refuses to present a headline reliability number.
6. **A representative-day LP via `highs`** (one BA, few technologies, storage, 12 representative days). Technically deliverable, least defensible, and the one most likely to be mistaken for GenX. Last, if ever.

### Do not attempt

| Do not | Reason |
|---|---|
| Security-constrained unit commitment, or any MILP UC over 8760 h | ~6M binaries; impossible in a browser and the input data (min-run, starts, ramps) does not exist free |
| AC power flow or nodal LMP | Needs network topology we deliberately will not publish (CEII, brief `01`) and a solver class that is not the point |
| Present an **LOLE or EUE number** as a result | No redistributable EFORs; no correlated-outage data; would understate winter tail risk while looking precise |
| National multi-decade capacity expansion | ReEDS does it with a commercial solver and HPC. We would be a worse ReEDS with ReEDS's authority |
| **`glpk.js`** | GPL-3.0 — copyleft on the shipped site bundle |
| `highs` **< 1.15.1** | Upstream presolve returned wrong "Optimal" on MIPs (issue #53) |
| Pyodide / PyPSA / linopy in the browser | 13.4 MB base before packages; `numexpr`, `dask`, `rapidfuzz`, `pydeck` absent; **no evidence anyone has ever run PyPSA in Pyodide** |
| Julia-to-WASM for JuMP | `--trim=safe` forbids dynamic dispatch, which JuMP requires. Not a maturity gap, a hard blocker |
| Redistribute **PJM Data Miner** anything, including `mnt_efor` | Redistribution explicitly prohibited without PJM membership |
| Assert EPA data is public domain | EPA's own disclaimer says "non-commercial, scientific and educational"; only its geospatial data is stated public domain. Flag before any monetization |
| Fork Breakthrough Energy's REISE.jl as a base | Abandoned since 2023; Julia + HPC; no browser path |

---

## Sources

Models and solvers: [NatLabRockies/ReEDS-2.0](https://github.com/NatLabRockies/ReEDS-2.0) · [GenXProject/GenX.jl](https://github.com/GenXProject/GenX.jl) (GPL-2.0) · [PyPSA](https://github.com/PyPSA/PyPSA) · [PyPSA-USA](https://pypsa-usa.readthedocs.io/) · [PowerGenome](https://github.com/PowerGenome/PowerGenome) · [switch-model](https://github.com/switch-model/switch) · [Temoa](https://github.com/TemoaProject/temoa) · [OSeMOSYS](https://github.com/OSeMOSYS/OSeMOSYS) · [Calliope](https://github.com/calliope-project/calliope) · [sylvan-energy/gridpath](https://github.com/sylvan-energy/gridpath) · [Sienna PowerSimulations.jl](https://github.com/Sienna-Platform/PowerSimulations.jl) · [MATPOWER](https://github.com/MATPOWER/matpower) · [pandapower](https://github.com/e2nIEE/pandapower) · [PowerModels.jl](https://github.com/lanl-ansi/PowerModels.jl) · [DSS-Python](https://github.com/dss-extensions/DSS-Python) · [Antares](https://github.com/AntaresSimulatorTeam/Antares_Simulator) · [Breakthrough-Energy](https://github.com/Breakthrough-Energy) · [npm highs](https://registry.npmjs.org/highs) · [lovasoa/highs-js](https://github.com/lovasoa/highs-js) (issues [#52](https://github.com/lovasoa/highs-js/issues/52), [#53](https://github.com/lovasoa/highs-js/issues/53)) · [ERGO-Code/HiGHS build_webdemo.sh](https://github.com/ERGO-Code/HiGHS/blob/master/build_webdemo.sh) · [glpk.js](https://github.com/jvail/glpk.js) · [YALPS](https://github.com/IanManske/YALPS) · [pyodide-lock.json](https://cdn.jsdelivr.net/npm/pyodide@314.0.7/pyodide-lock.json) · [WasmCodegen.jl](https://github.com/gbaraldi/WasmCodegen.jl) · [WebAssemblyCompiler.jl](https://github.com/tshort/WebAssemblyCompiler.jl)

Browser tools: [Energy Policy Simulator](https://energypolicy.solutions/) · [eps-us](https://github.com/EnergyInnovation/eps-us) · [SDEverywhere](https://github.com/climateinteractive/SDEverywhere) · [En-ROADS architecture](https://support.climateinteractive.org/support/solutions/articles/47001200009-how-does-en-roads-run-so-quickly-) · [model.energy](https://model.energy/) · [Energy Transition Model](https://energytransitionmodel.com/) · [NLR Scenario Viewer](https://scenarioviewer.nlr.gov/) · [NatLabRockies/engage](https://github.com/NatLabRockies/engage) · [PyPSA Time Series Explorer](https://ferrucci-franco.github.io/timeseries-explorer/) · [EIA AEO2026 cases](https://www.eia.gov/outlooks/aeo/case_descriptions.php) · [Arras Energy](https://www.arras.energy/about) · [Grid Status API docs](https://docs.gridstatus.io/grid-status-api/getting-started)

Data: [EIA-923](https://www.eia.gov/electricity/data/eia923/) + [instructions](https://www.eia.gov/survey/form/eia_923/instructions.pdf) · [EIA-860](https://www.eia.gov/electricity/data/eia860/) · [EIA-930 instructions](https://www.eia.gov/survey/form/eia_930/instructions.pdf) · [EPA Table 8.2](https://www.eia.gov/electricity/annual/html/epa_08_02.html) · [eGRID](https://www.epa.gov/egrid/download-data) · [CAMD Power Sector Emissions Data Guide](https://www.epa.gov/system/files/documents/2022-07/CAMD%27s%20Power%20Sector%20Emissions%20Data%20Guide%20-%2007182022.pdf) · [CAM API Portal](https://www.epa.gov/airmarkets/cam-api-portal) · [Henry Hub](https://www.eia.gov/dnav/ng/hist/rngwhhdD.htm) · [EPM Table 4.2](https://www.eia.gov/electricity/monthly/epm_table_grapher.php?t=epmt_4_02) · [EIA copyright and reuse](https://www.eia.gov/about/copyrights_reuse.php) · [EPA disclaimers](https://www.epa.gov/web-policies-and-procedures/epa-disclaimers) · [NERC 2025 LTRA](https://www.nerc.com/globalassets/our-work/assessments/nerc_ltra_2025.pdf) · [NERC GADS](https://nerc.com/pa/RAPA/gads/Pages/GeneratingAvailabilityDataSystem-(GADS).aspx) · [ERCOT NP3-233-CD](https://www.ercot.com/mp/data-products/data-product-details?id=NP3-233-CD) · [ERCOT CDR/MORA](https://www.ercot.com/gridinfo/resource) · [CAISO outage reports](https://www.caiso.com/market-operations/outages/curtailed-and-non-operational-generators) · [PUDL EIA-923 docs](https://docs.catalyst.coop/pudl/en/stable/data_sources/eia923.html) · [NLR rename](https://www.energy.gov/eere/articles/energy-department-renames-nrel-national-lab-rockies)
