# Tools reference

Generated from the tool manifests by `node site/docs.mjs`. Do not edit by hand.

## Energy unit converter (`calc.energy-units.convert`)

Convert energy between kWh, MWh, Btu, therms, joules, and common fuels, with every constant and its source shown.

Version 0.2.0 · stable · validation level 2, cross-checked

| Input | Name | Unit | Range | Example |
|---|---|---|---|---|
| Amount | `value` | unit chosen in from | -1000000000000000 to 1000000000000000 | 12 |
| From | `from` | choice | `Wh`, `kWh`, `MWh`, `GWh`, `J`, `MJ`, `GJ`, `Btu`, `MMBtu`, `therm`, `ft3-natural-gas`, `short-ton-coal`, `bbl-distillate`, `bbl-residual`, `bbl-propane` | MWh |
| To | `to` | choice | `Wh`, `kWh`, `MWh`, `GWh`, `J`, `MJ`, `GJ`, `Btu`, `MMBtu`, `therm`, `ft3-natural-gas`, `short-ton-coal`, `bbl-distillate`, `bbl-residual`, `bbl-propane` | MMBtu |

| Output | Name | Unit | Rounding |
|---|---|---|---|
| Converted amount | `value` | unit chosen in to | 4 significant figures |

**Method.** Convert the amount to joules with its unit's definition, then from joules to the target unit. Fuels use EIA's published average heat content in Btu.

**Sources.**

- NIST Special Publication 811, Guide for the Use of the International System of Units, 2008, Appendix B.8, British thermal unit (IT) and kilowatt hour to joule (https://www.nist.gov/pml/special-publication-811)
- EIA, Heat Content of Natural Gas Consumed, Annual, 2025, US, delivered to consumers, Btu per cubic foot (https://www.eia.gov/dnav/ng/ng_cons_heat_a_EPG0_VGTH_btucf_a.htm)
- EIA, Monthly Energy Review, Appendix A, Table A1, approximate heat content of petroleum products (https://www.eia.gov/totalenergy/data/monthly/pdf/mer_A_FULL.pdf)
- EIA, Energy conversion calculators, 2026 estimates, Coal, electric power sector, Btu per short ton (https://www.eia.gov/energyexplained/units-and-calculators/energy-conversion-calculators.php)
- EIA, British thermal units (Btu), Energy Explained, Therm and MMBtu definitions (https://www.eia.gov/energyexplained/units-and-calculators/british-thermal-units.php)

**Known limits.**

- Fuel results use national averages; the gas or oil you buy can differ by a few percent.
- The coal figure is EIA's estimate for coal burned in power plants, not for home or industrial coal.
- Volumes and weights of fuels are not converted to each other except through their energy.

## Emissions from electricity use (`calc.energy-units.emissions`)

Estimate the CO₂ and other greenhouse gases from a year of electricity use at your eGRID subregion's average rates.

Version 0.1.0 · experimental · validation level 2, cross-checked

| Input | Name | Unit | Range | Example |
|---|---|---|---|---|
| Electricity used | `mwh` | MWh | 0 to 1000000000 | 1000 |
| eGRID subregion | `subregion` | choice | `AKGD`, `AKMS`, `AZNM`, `CAMX`, `ERCT`, `FRCC`, `HIMS`, `HIOA`, `MROE`, `MROW`, `NEWE`, `NWPP`, `NYCW`, `NYLI`, `NYUP`, `PRMS`, `RFCE`, `RFCM`, `RFCW`, `RMPA`, `SPNO`, `SPSO`, `SRMV`, `SRMW`, `SRSO`, `SRTV`, `SRVC` | ERCT |

| Output | Name | Unit | Rounding |
|---|---|---|---|
| CO₂ | `co2` | metric tons | 2 decimals |
| CO₂ equivalent | `co2e` | metric tons | 2 decimals |
| Methane (CH₄) | `ch4` | metric tons | 4 decimals |
| Nitrous oxide (N₂O) | `n2o` | metric tons | 4 decimals |

**Method.** Multiply the energy by the subregion's eGRID2023 total output emission rate for each gas (lb/MWh), convert pounds to metric tons (0.45359237 kg/lb), and add CH₄ and N₂O to CO₂ with the 100-year global warming potentials eGRID uses (AR5: 28 and 265).

**Sources.**

- EPA, Emissions & Generation Resource Integrated Database (eGRID2023), eGRID2023, served snapshot 2026-10, Subregion file: total output emission rates (lb/MWh) for CO₂, CH₄, N₂O, and CO₂e (https://www.epa.gov/egrid)
- EPA, eGRID2023 Technical Guide, January 2025, CO₂ equivalent emissions, PDF page 23: GWPs from AR5 without climate-carbon feedbacks (CH₄ 28, N₂O 265) (https://www.epa.gov/egrid/egrid-technical-guide)
- NIST Special Publication 811, 2008, Appendix B.8, pound (avoirdupois) to kilogram (https://www.nist.gov/pml/special-publication-811)

**Known limits.**

- Average annual rates miss the hour-by-hour changes in the grid's mix; use hourly data when you have it.
- This is location-based accounting; contracts for clean power (market-based accounting) are not reflected.
- Rates are eGRID2023's; a newer edition will change them.

## Power factor correction (`calc.power-factor.correct`)

How much capacitor correction raises your power factor to a target, and what the low power factor costs on your tariff.

Version 0.1.0 · experimental · validation level 2, cross-checked

| Input | Name | Unit | Range | Example |
|---|---|---|---|---|
| Real power | `kw` | kW | 0.001 to 10000000 | 500 |
| Measured as | `measured` | choice | `pf`, `kvar`, `kva` | pf |
| Measured value | `value` | power factor, kVAR, or kVA | 0 to 10000000 | 0.78 |
| Target power factor | `pfTarget` | power factor | 0.01 to 1 | 0.95 |
| Service voltage | `volts` | V | 1 to 1000000 | 480 |
| Service | `phases` | choice | `three`, `single` | three |
| Demand charge (0 if none) | `demandRate` | $/kW-month | 0 to 10000 | 18 |
| Tariff's power-factor threshold (0 if none) | `tariffPf` | power factor | 0 to 1 | 0.9 |

| Output | Name | Unit | Rounding |
|---|---|---|---|
| Correction needed | `kvar` | kVAR | 1 decimals |
| Apparent power now | `kvaBefore` | kVA | 1 decimals |
| Apparent power after | `kvaAfter` | kVA | 1 decimals |
| Current reduced by | `ampsSaved` | A | 1 decimals |
| Power-factor charge removed | `monthlySaving` | $/month | 2 decimals |

**Method.** Correction in kVAR is kW × (tan(arccos(PF now)) − tan(arccos(PF target))); apparent power is kW ÷ PF; line current is kVA × 1,000 ÷ (√3 × V) for three-phase service. On a tariff that bills demand scaled to a power-factor threshold, billing kW is kW × threshold ÷ PF when PF is lower.

**Sources.**

- U.S. Department of Energy, Energy Efficiency and Renewable Energy, "Reducing Power Factor Cost", Motor Challenge fact sheet, Power triangle example: 100 kW and 100 kVAR, corrected to 0.95 with a 67 kVAR capacitor (https://www.energy.gov/sites/prod/files/2014/04/f15/mc60405.pdf)
- Washington State University Energy Program and the Northwest Energy Efficiency Alliance, "Energy Efficiency Factsheet: Reducing Power Factor Cost" (published by Clark Public Utilities), Factsheet, Figure 4: a 100 kW load at 0.70 corrected to 0.95 with a 69 kVAR capacitor (https://www.clarkpublicutilities.com/wp-content/uploads/2016/05/ReducePowerFactor-4-page.pdf)

**Known limits.**

- The power factor is entered or derived from one kW and kVAR or kVA pair; a file with reactive readings gives a better basis.
- Only a tariff rule that scales billing demand to a power-factor threshold is priced here; kVA billing and per-kVAR charges are priced in the workbench's bill.
- Harmonics, resonance, and switching transients are not assessed.

## Transformer sizing and loading (`calc.transformer.size`)

How many kVA a load needs, and how heavily a transformer of the rating you are considering would carry it.

Version 0.1.0 · experimental · validation level 1, self-checked

| Input | Name | Unit | Range | Example |
|---|---|---|---|---|
| Load given as | `loadAs` | choice | `amps`, `kva`, `kw` | amps |
| Load | `load` | A, kVA, or kW | 0 to 10000000 | 600 |
| Service | `phases` | choice | `three`, `single` | three |
| Voltage (line-to-line for three-phase) | `volts` | V | 1 to 1000000 | 480 |
| Transformer rating you are considering | `rating` | kVA | 0.001 to 10000000 | 500 |
| Power factor (for a load in kW) | `pf` | power factor | 0 to 1 | 0.95 |

| Output | Name | Unit | Rounding |
|---|---|---|---|
| Apparent power needed | `kva` | kVA | 1 decimals |
| Loading | `loading` | % | 1 decimals |
| Headroom | `headroom` | kVA | 1 decimals |
| Current | `amps` | A | 1 decimals |

**Method.** Apparent power is √3 × V line-to-line × A ÷ 1,000 for three-phase service and V × A ÷ 1,000 for single-phase, or kW ÷ power factor. Loading is kVA ÷ rating, and headroom is rating − kVA.

**Sources.**

- NIST Special Publication 811, 2008, Section 8: apparent power (volt ampere) and its relation to voltage and current (https://www.nist.gov/pml/special-publication-811)
- IEEE C57.91, Guide for Loading Mineral-Oil-Immersed Transformers, and IEEE C57.96 for dry-type transformers, named only; not quoted or applied, Overload duration, hot-spot temperature, and loss of life

**Known limits.**

- Names no standard rating; the standard list is in a paid IEEE standard.
- Does not compute permissible overload time, hot-spot or top-oil temperature, or loss of life.
- Assumes a balanced three-phase load; unbalanced loads need each phase checked.

## Battery duration and usable energy (`calc.storage.basics`)

How long a battery runs at a given power, its C-rate, and how much energy it delivers and needs to recharge.

Version 0.1.0 · experimental · validation level 1, self-checked

| Input | Name | Unit | Range | Example |
|---|---|---|---|---|
| Rated power | `powerMw` | MW | 0.000001 to 1000000 | 100 |
| Rated energy | `energyMwh` | MWh | 0.000001 to 10000000 | 400 |
| Dispatch power | `dispatchMw` | MW | 0.000001 to 1000000 | 75 |
| Depth of discharge | `dod` | % | 1 to 100 | 90 |
| Round-trip efficiency | `roundTrip` | % | 1 to 100 | 85 |

| Output | Name | Unit | Rounding |
|---|---|---|---|
| Duration at dispatch power | `durationDispatch` | h | 2 decimals |
| C-rate at dispatch power | `cRate` |  | 4 significant figures |
| Duration at rated power | `durationRated` | h | 2 decimals |
| Usable delivered energy | `usable` | MWh | 1 decimals |
| Charging energy needed | `charging` | MWh | 1 decimals |

**Method.** Duration is energy ÷ power; C-rate is power ÷ energy. Depth of discharge limits the energy delivered, and round-trip efficiency is a loss taken on charging, so charging energy is delivered energy ÷ efficiency. The same convention holds in the workbench's battery screen.

**Sources.**

- NLR, Annual Technology Baseline (ATB): Utility-Scale Battery Storage, 2025, Definitions of power, energy, duration, and round-trip efficiency (https://atb.nlr.gov/)

**Known limits.**

- Real duration depends on power level, temperature, and age; these are nameplate figures.
- Auxiliary loads and standby losses are not modeled.

## Levelized cost of energy (`calc.cost.lcoe`)

The levelized cost of energy from capital cost, operating costs, and capacity factor, with each term's share shown.

Version 0.2.0 · experimental · validation level 2, cross-checked

| Input | Name | Unit | Range | Example |
|---|---|---|---|---|
| Fixed charge rate | `fcr` | per year | 0 to 1 | 0.07 |
| Capital cost | `capex` | $/kW | 0 to 1000000 | 1000 |
| Fixed O&M | `fom` | $/kW-year | 0 to 100000 | 20 |
| Capacity factor | `cf` | % | 0.01 to 100 | 25 |
| Variable O&M | `vom` | $/MWh | 0 to 100000 | 0 |
| Fuel cost | `fuel` | $/MWh | 0 to 100000 | 0 |

| Output | Name | Unit | Rounding |
|---|---|---|---|
| Levelized cost of energy | `lcoe` | $/MWh | 2 decimals |
| Capital share | `capital` | $/MWh | 2 decimals |
| Fixed O&M share | `fixed` | $/MWh | 2 decimals |

**Method.** LCOE = (fixed charge rate × capital cost + fixed O&M) ÷ (capacity factor × 8.76 MWh per kW-year) + variable O&M + fuel cost, as NLR's Annual Technology Baseline defines it.

**Sources.**

- NLR, Annual Technology Baseline (ATB): Levelized Cost of Energy, 2025, LCOE equation: (FCR × CAPEX + FOM) ÷ (CF × 8,760) + VOM + fuel (https://atb.nlr.gov/)

**Known limits.**

- A simple LCOE: no degradation, construction period, or tax detail beyond what the fixed charge rate carries.
- No defaults are offered; read the ATB for costs and capacity factors by technology.

## Overhead conductor ampacity (`calc.line-rating.ampacity`)

How much current a bare overhead conductor can carry in given weather, by the IEEE 738 heat balance.

Version 0.1.0 · experimental · validation level 2, cross-checked

| Input | Name | Unit | Range | Example |
|---|---|---|---|---|
| Units | `units` | choice | `us`, `si` | us |
| Conductor diameter | `diameter` | in or mm | 0.001 to 2000 | 1.108 |
| AC resistance at the low temperature | `r1` | Ω/mile or Ω/km | 0.000001 to 100 | 0.117 |
| Low resistance temperature | `t1` | °C | -50 to 300 | 25 |
| AC resistance at the high temperature | `r2` | Ω/mile or Ω/km | 0.000001 to 100 | 0.1396 |
| High resistance temperature | `t2` | °C | -50 to 300 | 75 |
| Maximum conductor temperature | `maxTemp` | °C | -40 to 300 | 100 |
| Air temperature | `ambient` | °C | -60 to 60 | 40 |
| Wind speed | `wind` | ft/s or m/s | 0 to 200 | 2 |
| Wind angle to the conductor | `windAngle` | degrees | 0 to 90 | 90 |
| Emissivity | `emissivity` | fraction | 0 to 1 | 0.8 |
| Solar absorptivity | `absorptivity` | fraction | 0 to 1 | 0.8 |
| Elevation | `elevation` | ft or m | -500 to 30000 | 0 |
| Latitude | `latitude` | degrees north | -90 to 90 | 30 |
| Line bearing | `lineAzimuth` | degrees east of north | 0 to 360 | 90 |
| Date | `date` |  |  | 2025-06-10 |
| Solar hour (12 is solar noon) | `solarHour` | h | 0 to 24 | 11 |
| Line-to-line voltage, for MVA (0 to skip) | `kv` | kV | 0 to 1500 | 230 |

| Output | Name | Unit | Rounding |
|---|---|---|---|
| Steady-state ampacity | `amps` | A | 0 decimals |
| Three-phase rating | `mva` | MVA | 1 decimals |
| Convective cooling | `convection` | W/ft or W/m | 2 decimals |
| Radiated heat loss | `radiation` | W/ft or W/m | 2 decimals |
| Solar heat gain | `solar` | W/ft or W/m | 2 decimals |

**Method.** At the maximum conductor temperature, the steady-state current is √((convective cooling + radiated heat loss − solar heat gain) ÷ AC resistance), following the IEEE 738-2023 heat balance: forced convection by the larger of its low- and high-wind correlations with the wind-angle factor, or natural convection if larger; radiation from emissivity and the temperatures; clear-sky solar gain from the sun's position, elevation, and line bearing; and resistance interpolated between the two values entered.

**Sources.**

- IEEE 738-2023, Standard for Calculating the Current-Temperature Relationship of Bare Overhead Conductors, 2023, Steady-state heat balance: convective, radiated, and solar heat terms and conductor resistance (cited, not reproduced)
- linerate 5.0.0 (Statnett), an open implementation of IEEE 738 and CIGRE 601, 5.0.0, IEEE738 thermal model, used only to generate the stored reference cases (https://github.com/statnett/linerate)
- pypacity 0.1.3, an open implementation of IEEE 738, 0.1.3, Steady-state rating mode, used only to generate the stored reference cases (https://github.com/gteasoft/pypacity)

**Known limits.**

- Steady state only: no transient or emergency rating.
- Resistance must be entered from the manufacturer's data; no public-domain resistance table exists.
- Clear-sky solar gain; haze, industrial atmosphere, and ground reflection are not modeled.

## Revenue requirement explainer (`ratepayer.revenue-requirement.explain`)

Where a utility's requested revenue comes from, and what one point of return on equity is worth on a home's bill.

Version 0.1.0 · experimental · validation level 1, self-checked

| Input | Name | Unit | Range | Example |
|---|---|---|---|---|
| Rate base | `rateBase` | $ | 0 to 10000000000000 | 2000000000 |
| Return on equity | `roe` | % | 0 to 50 | 10 |
| Equity share of capital | `equityRatio` | % | 0 to 100 | 50 |
| Cost of debt | `costOfDebt` | % | 0 to 50 | 5 |
| Operation and maintenance | `om` | $ a year | 0 to 10000000000000 | 400000000 |
| Depreciation | `depreciation` | $ a year | 0 to 10000000000000 | 150000000 |
| Taxes other than income | `otherTaxes` | $ a year | 0 to 10000000000000 | 50000000 |
| Income tax rate | `taxRate` | % | 0 to 99 | 25 |
| Residential share of revenue | `residentialShare` | % | 0 to 100 | 40 |
| Residential customers (0 to skip) | `residentialCustomers` | customers | 0 to 1000000000 | 500000 |

| Output | Name | Unit | Rounding |
|---|---|---|---|
| Revenue requirement | `total` | $ a year | 0 decimals |
| One point of return on equity | `perPoint` | $ a year | 0 decimals |
| One point, per home | `perCustomerMonth` | $ a month | 2 decimals |
| Return on rate base | `ret` | $ a year | 0 decimals |
| Income tax on the equity return | `incomeTax` | $ a year | 0 decimals |
| Weighted cost of capital | `wacc` | % | 3 decimals |

**Method.** Revenue requirement = O&M + depreciation + taxes other than income + income tax + rate base × weighted cost of capital, where the weighted cost of capital is equity share × return on equity + debt share × cost of debt, and income tax on the equity return is that return × t ÷ (1 − t).

**Sources.**

- Regulatory Assistance Project, Electricity Regulation in the US: A Guide, Second edition, 2016, Chapter 9, the revenue requirement and its components (https://www.raponline.org/knowledge-center/electricity-regulation-in-the-us-a-guide-2/)
- FERC Form 1, through Catalyst Cooperative's PUDL (CC BY 4.0), PUDL v2026.10.0, report year 2025, Income statement (schedule 114) and PUDL's rate-base derivation; see docs/derivations/rate-base.md (https://catalyst.coop/pudl/)

**Known limits.**

- A simplified cost-of-service formula: no deferred taxes, tax credits, or riders.
- Figures from FERC Form 1 are total-company and may cover more than one state or service.

## Service headroom (`electrify.service-headroom.check`)

How much room is left on an existing electric service, from the demand the meter already measured.

Version 0.1.0 · experimental · validation level 2, cross-checked

| Input | Name | Unit | Range | Example |
|---|---|---|---|---|
| Maximum demand | `demand` | kW |  | 120 |
| Service voltage | `volts` | V | 100 to 35000 | 480 |
| Phase | `phase` | choice | `1`, `3` | 3 |
| Service rating | `ratingA` | A | 1 to 10000 | 400 |
| NEC edition adopted locally | `edition` | choice | `2023`, `2026` | 2023 |
| Where the demand comes from | `basis` | choice | `recording`, `bills` | recording |
| Power factor | `powerFactor` | fraction | 0.01 to 1 | 0.95 |
| Solar, wind, a battery, or peak shaving on this service | `generation` | choice | `no`, `yes` | no |

| Output | Name | Unit | Rounding |
|---|---|---|---|
| Headroom | `headroomA` | A | 1 decimals |
| Headroom | `headroomKva` | kVA | 1 decimals |
| Demand × 125% | `amps` | A | 1 decimals |
| Maximum demand | `maxKw` | kW | 1 decimals |
| Maximum demand | `kva` | kVA | 1 decimals |
| Demand × 125% | `kva125` | kVA | 1 decimals |
| Headroom at power factor 0.90 | `headroomA90` | A | 1 decimals |

**Method.** Existing load = maximum demand ÷ power factor × 125%, in amps at the service voltage (single-phase: kVA × 1,000 ÷ V; three-phase: kVA × 1,000 ÷ (√3 × V)); headroom = service rating − existing load.

**Sources.**

- NFPA 70, National Electrical Code, 2023, Section 220.87, Determining Existing Loads (cited and paraphrased; read it through NFPA's free access); see docs/derivations/service-headroom.md (https://www.nfpa.org/freeaccess)
- Mike Holt, Code Q&A: Calculating feeder or service loads, EC&M, August 8, 2014, Worked existing-load example, 200 A single-phase service (https://www.ecmweb.com/national-electrical-code/qa/article/20899437/code-qa-calculating-feeder-or-service-loads)

**Known limits.**

- Not a code compliance decision; conductor sizing and full load calculations are out of scope.
- Sites with solar, wind, a battery, or peak shaving cannot use the 30-day option.

## Backup power size (`electrify.backup-power.size`)

A first-pass battery and generator size for the loads you need through an outage.

Version 0.1.0 · experimental · validation level 1, self-checked

| Input | Name | Unit | Range | Example |
|---|---|---|---|---|
| Critical loads | `loads` |  |  | refrigerator, 0.2 kW, 24 h well pump, 1.5 kW, 2 h lights, 0.3 kW, 6 h, from 18:00 |
| Outage to ride through | `hours` | hours | 0.25 to 336 | 12 |
| Largest motor, running (0 to skip) | `motorRunKw` | kW | 0 to 10000 | 1.5 |
| Largest motor, starting (0 to skip) | `motorStartKw` | kW | 0 to 10000 | 4.5 |
| Usable share of the battery | `usable` | % | 1 to 100 | 80 |

| Output | Name | Unit | Rounding |
|---|---|---|---|
| Battery, usable | `usableKwh` | kWh | 1 decimals |
| Battery, nameplate | `nameplateKwh` | kWh | 1 decimals |
| Generator | `generatorKw` | kW | 1 decimals |
| Daily critical energy | `dailyKwh` | kWh | 1 decimals |
| Critical load that can run at once | `peakKw` | kW | 1 decimals |

**Method.** Battery usable kWh = critical energy over the outage, starting at the hour with the most critical load; nameplate = usable ÷ usable share. Generator kW = peak critical kW − the largest motor's running kW + its starting kW.

**Sources.**

- NREL REopt, resilience analysis, REopt web tool, Critical load and outage duration inputs (https://reopt.nlr.gov/tool)

**Known limits.**

- County outage history means some customers in the county were out, not this address; durations are a typical guide, not a worst case.
- No inverter losses, battery aging, or temperature derating.

## Reliability indices (`reliability.outage-log.indices`)

The reliability indices you report, from your own outage log, with every exclusion shown.

Version 0.1.0 · experimental · validation level 1, self-checked

| Input | Name | Unit | Range | Example |
|---|---|---|---|---|
| Interruptions | `events` |  |  | 2025-03-14 18:40, 420, 95 2025-06-02 23:30, 400, 105 2025-07-19 14:05, 5200, 310 2025-09-08 09:15, 150, 4 |
| Customers served | `customersServed` | customers | 1 to 50000000 | 12000 |
| Period start | `from` |  |  | 2025-01-01 |
| Period end | `to` |  |  | 2025-12-31 |
| Sustained if longer than | `threshold` | minutes | 0 to 600 | 5 |

| Output | Name | Unit | Rounding |
|---|---|---|---|
| Interruptions per customer served | `perCustomer` | interruptions | 2 decimals |
| Minutes per customer served | `minutesPerCustomer` | minutes | 1 decimals |
| Minutes per interrupted customer | `minutesPerInterrupted` | minutes | 2 decimals |
| Service available | `availability` | % | 4 decimals |
| Sustained interruptions | `sustainedEvents` | interruptions | 0 decimals |
| Customer minutes | `customerMinutes` | customer-minutes | 0 decimals |

**Method.** Interruptions per customer = customers interrupted ÷ customers served. Minutes per customer = customer minutes ÷ customers served. Minutes per interrupted customer = customer minutes ÷ customers interrupted. Availability = 1 − minutes per customer ÷ minutes in the period.

**Sources.**

- Form EIA-861, Annual Electric Power Industry Report, instructions, OMB 1905-0129, Schedule 3 Part B: the two indices the form collects; a sustained interruption is one of more than 5 minutes; see docs/derivations/reliability.md (https://www.eia.gov/survey/form/eia_861/instructions.pdf)
- IEEE PES Boston chapter tutorial, John Teixeira, National Grid, February 19, 2019, Slides 75 to 90: the indices the federal form does not collect, and the major-event-day threshold (https://site.ieee.org/boston-pes/files/2019/03/IEEE-1366-Reliability-Indices-2-2019.pdf)

**Known limits.**

- Indices counting how often each customer was interrupted need per-customer records an event log does not hold; they are reported as unavailable, never estimated.
- Major event days need daily figures over several years: the workbench computes them from a whole log.

## Bill check (`household.bill-totals.check`)

Price your bills from the kWh printed on them, line by line, and see how they compare with what you paid.

Version 0.1.0 · experimental · validation level 1, self-checked

| Input | Name | Unit | Range | Example |
|---|---|---|---|---|
| Billing periods | `periods` |  |  | 2026-03-01 to 2026-03-30, 800 kWh, paid $131.40 |
| Tariff | `tariff` |  |  | {"fixedMonthly":10,"seasons":[{"name":"all year","from":"01-01","tiers":[{"upTo":500,"rate":0.12},{"rate":0.15}]}]} |
| Split a period that crosses a season by days | `prorate` | choice | `yes`, `no` | yes |

| Output | Name | Unit | Rounding |
|---|---|---|---|
| Computed bill | `total` | $ | 2 decimals |
| Effective price | `effectivePrice` | ¢/kWh | 2 decimals |
| Paid minus computed | `difference` | $ | 2 decimals |
| Paid minus computed, percent | `differencePct` | % | 1 decimals |

**Method.** Check the periods first (overlaps, duplicates, periods over 45 days, a month that reads like an extra digit, negative kWh). Then price each period on the tariff: the fixed charge, each tier's kWh at its rate, and the minimum bill, in exact micro-dollars rounded to the cent line by line. A period that crosses a season splits its kWh and tier allowances by days. Time-of-use bills are priced from the kWh in each period as the bill prints them.

**Sources.**

- OpenEI Utility Rate Database (URDB), snapshot 2026-10, Energy rate structure, weekday and weekend schedules, fixed and minimum charges (https://openei.org/wiki/Utility_Rate_Database)
- OpenEI, Utility Rates API documentation, version 7, Field definitions: energyratestructure (rate, adj, max, unit), fixedchargefirstmeter, mincharge (https://openei.org/services/doc/rest/util_rates/?version=7)

**Known limits.**

- Taxes, local fees, and riders that the tariff data leaves out are not included, so a real bill is usually higher.
- Time-of-use energy is priced only from the kWh in each period as the bill prints them; a tiered time-of-use rate cannot be priced from totals.
- Demand charges need meter data and are not priced here.
- Export credits for net-metered months are not modeled; such a month prices only the charges that do not depend on kWh.

## Is my use high? (`household.usage-benchmark.compare`)

Compare a year of your electricity use with the average home of your utility and your state, and see your seasonal swing.

Version 0.1.0 · experimental · validation level 2, cross-checked

| Input | Name | Unit | Range | Example |
|---|---|---|---|---|
| Billing periods | `periods` |  |  | 2025-01, 1,200 kWh 2025-02, 1,200 kWh 2025-03, 1,200 kWh 2025-04, 1,200 kWh 2025-05, 1,200 kWh 2025-06, 1,200 kWh 2025-07, 1,200 kWh 2025-08, 1,200 kWh 2025-09, 1,200 kWh 2025-10, 1,200 kWh 2025-11, 1,200 kWh 2025-12, 1,200 kWh |
| Utility average home | `utilityAverage` | kWh a year | 1 to 1000000 | 12000 |
| State average home | `stateAverage` | kWh a year | 1 to 1000000 | 12000 |
| Data year of the averages | `dataYear` | year | 1990 to 2100 | 2025 |

| Output | Name | Unit | Rounding |
|---|---|---|---|
| Compared with the utility average | `vsUtility` | % | 1 decimals |
| Compared with the state average | `vsState` | % | 1 decimals |
| A year of use | `annualKwh` | kWh | 0 decimals |
| Highest period over lowest, per day | `ratio` | × | 1 decimals |

**Method.** Sum the latest 12 periods, or scale fewer to 365 days by the days they cover. Compare with EIA-861's average residential use per customer (residential sales ÷ residential customers) for the utility and the state, as a percent difference. Then compare the highest and lowest periods by kWh per day.

**Sources.**

- EIA, Annual Electric Power Industry Report (Form EIA-861), 2025, Sales to Ultimate Customers: residential sales (MWh) and customers (https://www.eia.gov/electricity/data/eia861/)
- EIA, Electric Sales, Revenue, and Average Price, 2024, Table 5A, average monthly residential consumption by state (https://www.eia.gov/electricity/sales_revenue_price/)

**Known limits.**

- An average includes homes of every size, age, and heating type; a large or all-electric home can be well above it and use energy well.
- EIA-861 publishes no distribution of use, so this shows no percentile, rank, or "homes like yours".
- The averages are for the latest EIA-861 year, which may differ from the year of your bills.

## Cleanest hours and load shifting (`carbon.load-shift.estimate`)

The typical cleanest and dirtiest hours in your grid region, and the CO₂ a flexible load would avoid by moving to cleaner hours.

Version 0.1.0 · experimental · validation level 1, self-checked

| Input | Name | Unit | Range | Example |
|---|---|---|---|---|
| Flexible load | `kwhPerDay` | kWh a day | 0 to 10000000 | 200 |
| Typical intensity in the hours you use it now | `currentLbPerMwh` | lb CO₂/MWh | 0 to 5000 | 1000 |
| Typical intensity in the hours you could move it to | `proposedLbPerMwh` | lb CO₂/MWh | 0 to 5000 | 700 |
| Days a year | `days` | days | 1 to 366 | 365 |

| Output | Name | Unit | Rounding |
|---|---|---|---|
| Attributed CO₂ avoided | `changeLb` | lb a year | 0 decimals |
| Attributed CO₂ avoided | `changeT` | metric tons a year | 1 decimals |

**Method.** CO₂ avoided = kWh a day × (current − proposed typical intensity) ÷ 1,000 × days. Typical intensities are EIA-930 consumption-based CO₂ intensity, the median for each local clock hour of each month over the latest three complete years, averaged over the hours of each window and weighted by days in each month.

**Sources.**

- U.S. Energy Information Administration, Hourly Electric Grid Monitor (Form EIA-930), per-region workbooks, served snapshot 2026-10, CO2 Emissions Intensity for Consumed Electricity (lb/kWh) (https://www.eia.gov/electricity/gridmonitor/)
- NIST Special Publication 811, 2008, Appendix B.8, pound (avoirdupois) to kilogram (https://www.nist.gov/pml/special-publication-811)

**Known limits.**

- Typical hours come from the latest three complete years; a region adding solar or retiring coal changes them.
- Average intensity, not marginal: the generators that actually respond to a shift can be cleaner or dirtier.
- EIA computes hourly CO₂ from generation by fuel times annual average emission factors.

## Was it the weather? (`weather.change.explain`)

How much of a change in your electricity use was the weather, from 12 to 24 bills and the nearest weather station.

Version 0.1.0 · experimental · validation level 2, cross-checked

| Input | Name | Unit | Range | Example |
|---|---|---|---|---|
| Billing periods | `periods` |  |  | 2025-11-01 to 2025-11-30, 812 kWh |
| Daily temperatures | `weather` |  |  | station USW00023183 PHOENIX AIRPORT 2025-11-01 68.4 |
| A change in the home | `change` |  |  | none |

| Output | Name | Unit | Rounding |
|---|---|---|---|
| Total change | `total` | kWh | 0 decimals |
| Weather part | `weather` | kWh | 0 decimals |
| Use part | `use` | kWh | 0 decimals |
| Baseline fit part | `fit` | kWh | 0 decimals |
| Use change, weather-normalized | `usePct` | % | 1 decimals |
| Model band | `band` | ± % | 1 decimals |
| Use in a normal-weather year | `normalKwh` | kWh | 0 decimals |

**Method.** The bills before the latest year are fitted with the CalTRACK billing-period model: use per day against heating and cooling degree days, four candidates (flat, heating, cooling, both) over balance points 30 to 90 °F, negative coefficients rejected, the best adjusted R² kept. The latest year's change is split three ways that always sum to it: the weather part (the model on this year's weather less the model on the baseline's), the use part (this year's actual use less the model on its weather), and the baseline fit part (the model's own miss on the baseline).

**Sources.**

- CalTRACK Methods, version 2.0, CC0, Billing methods: candidate models, balance-point search, sufficiency, and CV(RMSE) (https://docs.caltrack.org/en/latest/methods.html)
- Recurve, OpenDSM data sufficiency and disqualification guidelines, 2025, Daily and billing models: CV(RMSE) above 1.0 unless PNRMSE is below 1.6 (https://docs.recurve.com/flex-programs/measurement/energy%20efficiency%20and%20electrification/project-based-measurement-data-sufficiency-and-disqualification-guidelines)
- NOAA NCEI, Global Historical Climatology Network - Daily, Menne et al. (2012), version 3.35, served snapshot 2026-11, Daily maximum and minimum temperature (TMAX, TMIN) (https://doi.org/10.7289/V5D21VHZ)
- NOAA NCEI, U.S. Climate Normals 1991–2020, daily normals, version 1.0.1, Daily heating and cooling degree-day normals (DLY-HTDD, DLY-CLDD) (https://www.ncei.noaa.gov/products/land-based-station/us-climate-normals)

**Known limits.**

- Bills give a looser answer than interval data; a change under 5%, or inside the model's band, is not a finding.
- The use part is what the weather does not explain; this tool never says what caused it.
- The station is the nearest first-order NOAA station, which may differ from your home in elevation or exposure.
