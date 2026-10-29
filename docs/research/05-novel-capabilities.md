# 05: Novel capabilities

Research date: 2026-10-27. Planning only; not legal advice. Builds on 01 (data and licensing), 02 (competitors), and 03 (methods); it does not repeat them. **Verified** means read on the publisher's own page today. **[UNVERIFIED]** means secondary sources only, or not found.

## Bottom line

- **The biggest opening is hourly carbon from a user's own meter file.** EIA already publishes hourly, consumption-based CO2 estimates for every balancing authority (BA), as public-domain data. The GHG Protocol's draft location-based rules prefer exactly that kind of factor. No free tool applies it to a Green Button file. Paid APIs (Electricity Maps, WattTime) forbid what we would do with their data.
- **Large-load tariffs are the second opening.** More than 100 tariffs are approved or pending, and the terms differ (minimum bill percentages, contract length, ramps, exit fees). The one tracker (SEPA's DELTa) sits behind a form with no stated license. We can build our own term table from primary orders and add the take-or-pay math no one publishes.
- **Reuse the interval engine everywhere.** The same parsed meter file can feed carbon, NEC 220.87 existing-load checks, EV and heat pump what-ifs, rate case bill impacts, and backup-power sizing. That combination is what makes gridprims unique.
- **Avoid:** copying DELTa, DSIRE (license unclear), EAGLE-I yearly files from ORNL (marked "all rights reserved"), NERC data, or any IEEE or NFPA text.

## 1. Hourly carbon accounting

**Status of the rules (verified on ghgprotocol.org).** The Scope 2 consultation ran 2025-10-20 to 2026-01-31. In July 2026 the Independent Standards Board (ISB) backed **two market-based methods**: Method 1 with hourly matching, deliverability, and incrementality; Method 2 keeping the 2015 rules. Next comes a consolidated consultation in **Q2 2027** and a joint GHG Protocol–ISO Corporate Standard in **Q4 2028**. Effective dates are "to be determined." The draft also asks companies to use the **most precise location-based factor that is publicly and freely available**, ranked by spatial precision, then hourly over annual, then consumption-based over production-based [UNVERIFIED wording; from secondary summaries of the consultation draft].

**EIA does publish hourly CO2 by BA (verified).** The Hourly Electric Grid Monitor has had estimated total CO2, CO2 by fuel, and CO2 tied to imports and exports since 2018-07-01. Method: hourly net generation by fuel times **annual average** BA-and-fuel emission factors (from EIA-923 fuel use and EPA kg/MMBtu factors). A multiregional input-output model (de Chalendar et al., 2019) turns that into the **emissions intensity of load**, which is consumption-based. Caveats EIA states: CHP excluded, only metered units, fuel misassignment, pseudo-ties, and interchange errors distort results. Data post by about 4 pm ET the next day. Public domain.

**eGRID vs. hourly.** eGRID gives one annual rate per subregion. Official eGRID2024 is still not posted (see 01). An **unofficial eGRID2024**, built by running EPA's own published code, is on Zenodo under **CC BY 4.0** (Cornerstone Sustainability Data Initiative, March 2026). Usable if labeled "unofficial."

**24/7 carbon-free energy (CFE).** Google's CFE% combines the grid's hourly clean share with Google's own clean supply attributed to that grid in the same hour, averaged over the year (verified on Google Cloud's region page). EnergyTag's Granular Certificate standard (v2, 2024) adds an hourly time stamp to certificates; M-RETS supports it. Whether US registries issue hourly certificates at scale today is [UNVERIFIED].

| Competitor | What | Price / license |
|---|---|---|
| Electricity Maps | Hourly mix and intensity, real time | Free tier: personal, non-commercial, one zone, 24 h history. Paid: about €6,000/yr per signal. **No resale.** |
| WattTime | Marginal emissions (MOER) | Free: one region (CAISO_NORTH). History and forecast for subscribers only. License terms [UNVERIFIED]. |
| Singularity Open Grid Emissions | Hourly BA and plant data, 2019–2025 (2025 published Sept 2026) | **Data CC BY 4.0, code MIT** (verified). Paid commercial products, prices [UNVERIFIED]. |
| NLR Cambium | Hourly projected average and long-run marginal rates | 2024 edition latest; older workbooks CC BY. Projections, not history. |

**Can we compute hourly location-based emissions from a user's file using public-domain data only? Yes.** Steps: map the user's utility to its BA (EIA-861 BA field), pull that BA's hourly consumption-based intensity from EIA-930, multiply hour by hour, and show the annual eGRID result beside it. Precompute BA-hour tables as static files (about 66 BAs × 8,760 hours per year; small after compression). Offer OGE (CC BY 4.0) as a cross-check.

**What we ship:** (a) hourly location-based Scope 2 from a meter file, with eGRID comparison and the "your peak hours were dirtier than average" finding; (b) an hourly-matching simulator: upload a PPA or on-site solar profile and get an hourly matched CFE score alongside the annual-matching score, labeled as a preview of draft Method 1, not a compliance claim; (c) MCP tool `hourly_emissions(ba, start, end)`.

**Novelty: high. Impact: high. Legal risk: low** (EIA public domain; OGE and unofficial eGRID need attribution).

## 2. Large loads and data centers

**FERC (verified via multiple law-firm summaries and RMI; FERC docket not opened).** DOE sent FERC an ANOPR in October 2025 (Docket RM26-4) covering loads over 20 MW and asking for a final rule by 2026-04-30. FERC instead said on 2026-04-16 it would act by June. On **2026-06-18 it issued six show cause orders** (PJM, MISO, SPP, CAISO, ISO-NE, NYISO) covering loads over 50 MW at above 69 kV, finding current tariffs unjust and unreasonable and directing reforms. RM26-4 stays open. RTO responses [UNVERIFIED].

**Texas SB 6 (signed June 2025).** Covers loads of 75 MW or more in ERCOT. The PUCT proposed 16 TAC §25.194 (Project 58481) on 2026-03-12; trade press reports $50,000/MW security and a study fee of at least $100,000. **Final adoption [UNVERIFIED].** ERCOT tracked about 474.7 GW of large-load requests in June 2026, 90% data centers.

**State tariffs (sample, secondary sources unless noted).**

| Utility | Threshold | Minimum bill | Term | Notes |
|---|---|---|---|---|
| AEP Ohio (PUCO, 2025-07-09) | 25 MW | 85% of contract or peak demand | Up to 12 yr incl. 4-yr ramp [UNVERIFIED ramp] | Exit fee, collateral |
| Dominion GS-5 (Va. SCC, Nov 2025) | 25 MW, over 75% load factor | 85% T&D, 60% generation | 14 yr | Effective 2027-01-01 |
| Georgia Power (PSC rule, 2025-01-23) | 100 MW | Minimum bills allowed | Up to 15 yr | Contracts filed 30 days ahead; terms often confidential |
| Xcel Minnesota (PUC, 2026-05-15) | — | 80% demand charge on early exit | 15 yr minimum | — |
| Missouri (2025 law) | — | 80% demand charge | 12 yr + optional 5-yr ramp | — |

SEPA and NC Clean Energy Technology Center's **DELTa** database counted 104 approved and pending tariffs across more than 70 utilities (Q2 2026). Download requires a form; **no license found, so do not copy it.**

**What we ship:** (a) a cited term table built from primary orders and tariff sheets (facts, not DELTa's compilation); (b) a **take-or-pay calculator**: contract MW, ramp schedule, minimum percentages per component, and actual load give minimum bill, unused-capacity payments, and exit-fee exposure by year; (c) a **"how big is this request?" card**: proposed MW versus the utility's annual peak (FERC Form 714 via PUDL) and sales (EIA-861), with "who pays if it leaves" stranded-cost math; (d) extends the ramp calculator from 02, #8. Audience: city and county staff, co-ops, PUC intervenors, journalists, developers comparing states.

**Novelty: high. Impact: high. Legal risk: low** (tariffs and orders are public records; avoid confidential contract terms).

## 3. FERC Order 881 and line ratings

Order 881 (December 2021) requires ambient-adjusted ratings (AARs), hourly and seasonal, originally by 2025-07-12. Extensions moved dates: NYISO April 2026, SPP September 2026, CAISO and ISO-NE December 2026, MISO and PJM December 2028 [UNVERIFIED current; from a 2025 Burns & McDonnell summary and FERC extension orders]. The dynamic line rating ANOPR (RM24-6, June 2024) has **no NOPR found** as of today.

**What exists:** IEEE 738 is paywalled. Free code: **PyPacity** (Python, IEEE 738 and CIGRE TB 601) and **linerate** (CIGRE only). Commercial: ETAP, ConductorPro. **No free browser calculator found.**

**What we ship:** a browser IEEE 738 steady-state and transient calculator; an **AAR table generator** (temperature bins, day/night solar, wind assumption) that outputs a rating table an intervenor can compare to a posted rating; a "how much did this line gain from AAR?" explainer. Conductor data from manufacturer catalogs (facts), cited.

**Novelty: medium. Impact: medium** (small expert audience, strong student and intervenor use). **Legal risk: low-medium**: implement the heat-balance equations, cite IEEE 738-2023 and CIGRE TB 601, never reproduce standard text or tables. Validate against PyPacity.

## 4. Ratepayers and rate cases

**No free, national, structured rate-case source exists.** Insight Engine has one (paid plans). PowerLines publishes quarterly totals: $31B requested in 2025, **$18.6B in the first half of 2026**. H.R. 8947 (119th Congress) would create a federal "National Utility Rate Change Tracker"; it is only introduced. State dockets are per-state, mostly PDFs.

**What we can compute legally:**
- **Revenue requirement explainer**: O&M + depreciation + taxes + (rate base × weighted cost of capital), with sliders for ROE and equity ratio, showing what 1 point of ROE means per residential bill.
- **Utility starter kit**: FERC Form 1 rate base, O&M, and plant (PUDL, CC BY 4.0) plus EIA-861 price and sales trends, with a link to the state PUC docket search.
- **Bill impact on real data**: enter current and proposed tariffs; our existing tariff engine re-prices the user's year of intervals. Residents can cite their own number in a public comment. We never submit anything; we print a plain-language comment draft for the user to send.

**Novelty: high** (no free tool ties a proposed rate to your own meter data). **Impact: high. Legal risk: low.** Do not scrape PUC sites at scale; accept curated docket links by pull request.

## 5. Reliability and resilience

| Source | Status | Redistribution |
|---|---|---|
| EIA-861 Reliability (SAIDI/SAIFI, 2013 on) | Annual, with and without major events | Public domain |
| DOE-417 disturbance summaries (oe.netl.doe.gov) | Annual tables 2000–2023 in PDF/XLS; current-year summary page | US government work [UNVERIFIED terms] |
| EAGLE-I county outages, 15-min | Figshare v3 (2025-04-10) covers 2014–2024; ORNL yearly records for 2023–2025 | **License not confirmed.** ORNL's 2025 page says "All rights reserved." Figshare license [UNVERIFIED]. |
| NERC 2025 LTRA (2026-01-29) | 13 of 23 areas elevated or high risk | Link and summarize only |

**What we ship:** (a) a **utility reliability card**: SAIDI/SAIFI trend and peer rank, plus DOE-417 events for its region; (b) a **backup-power sizer**: from the interval file or a critical-load list, compute kW, motor-start surge, and kWh for N hours; size a generator or battery; (c) if EAGLE-I's license clears, **"cover 90% of outages your county has had since 2014"**, turning outage history into a battery kWh target. Hand off to REopt resilience mode for solar plus storage.

**Novelty: medium-high** (the outage-history-to-battery link is new). **Impact: medium-high. Legal risk: low** for EIA, **medium** for EAGLE-I until the license is confirmed (write to ORNL).

## 6. Electrification

- **NEC 220.87 existing-load check (standout).** The code lets an electrician size added load from **12 months of maximum demand data**, or 30 days of 15-minute readings, with max demand × 125% plus new load not exceeding the service rating. A Green Button 15-minute file is exactly that input. We ship a "220.87 report": peak 15-minute kW, kVA at a stated power factor, amps at service voltage, headroom for a heat pump or EV charger. Link to roughlogic.com for full NEC calculations. Section number and wording in the 2026 NEC [UNVERIFIED]; cite the section, paraphrase, never copy NFPA text, and tell users the local inspector decides. **Novelty: high. Risk: low-medium.**
- **EV fleet charging vs. demand charges.** Unmanaged vs. managed charging on the user's building load and real tariff, including demand-charge holiday rates (e.g., BC Hydro's six-year transition rate; California IOU commercial EV rates are being rewritten as of September 2026 [UNVERIFIED details]). **Novelty: medium.**
- **Heat pump impact.** Add an NLR ResStock/ComStock-style heat pump load shape to the user's file and re-price it; show the new winter peak. License of the End-Use Load Profiles to be confirmed (OEDI usually CC BY 4.0). **Novelty: medium.**
- **Make-ready programs.** EEI's database (voluntary, quarterly) and Atlas EV Hub (account and license agreement for most content) exist. **Link only.**

## 7. Other underserved jobs

| Idea | Finding | Ship? |
|---|---|---|
| Hosting capacity index | No national index (see 01) | Curated, dated link index |
| PURPA Form 556 helper | QFs ≤1 MW net are exempt (18 CFR 292.203); self-certification is free and filed through FERC eFiling | Plain-language checklist and field guide; user files. Low risk, low-medium novelty |
| Community solar | NLR Sharing the Sun: data.gov lists CC BY; latest confirmed file June 2025, metadata updated April 2026 | State fact pages, cited |
| Net metering by state | DSIRE: one page says CC BY-SA 4.0, but it is dated and the API is a subscription; trademark excluded [UNVERIFIED] | Use EIA-861 net metering data (public domain); link DSIRE |
| MCP server tools | All of the above as local tools: `hourly_emissions`, `large_load_min_bill`, `nec_22087_headroom`, `aar_rating` | Yes; same code as the site |

## Ranked top 12

| # | Capability | Who | Novelty / impact | Legal risk |
|---|---|---|---|---|
| 1 | Hourly location-based emissions from a meter file (EIA-930 consumption-based) vs. eGRID | Sustainability staff, schools, cities, auditors | High / high | Low |
| 2 | Large-load term table + take-or-pay and exit-fee calculator | Co-ops, city staff, intervenors, developers | High / high | Low |
| 3 | Rate case bill impact on your own data + revenue requirement explainer | Residents, advocates, PUC staff, press | High / high | Low |
| 4 | NEC 220.87 existing-load report from interval data | Electricians, contractors, homeowners, schools | High / high | Low-medium |
| 5 | Hourly-matching (draft Method 1) CFE score simulator | Corporate buyers, consultants, students | High / medium | Low |
| 6 | "How big is this data center?" utility context card (Form 714, EIA-861) | Journalists, city councils, ratepayers | High / medium | Low |
| 7 | Backup-power sizer tied to county outage history | Facilities, clinics, homeowners | Medium-high / medium-high | Medium (EAGLE-I license) |
| 8 | Browser IEEE 738 and AAR table generator | Transmission engineers, intervenors, students | Medium / medium | Low-medium |
| 9 | EV fleet managed vs. unmanaged charging on real tariffs | Fleets, school districts, transit | Medium / medium | Low |
| 10 | Utility reliability card (SAIDI/SAIFI, DOE-417) | Residents, local officials, press | Medium / medium | Low |
| 11 | Heat pump load and bill impact | Homeowners, small businesses, programs | Medium / medium | Low (confirm shape license) |
| 12 | Form 556, community solar, and net metering fact pages | Small developers, co-ops, residents | Low-medium / low-medium | Low |

## Flags and open questions

- GHG Protocol location-based hierarchy wording is from secondary summaries; read the consultation draft before claiming alignment.
- EIA-930 uses **annual** BA-fuel factors, so hourly variation comes from fuel mix only. State this on every result.
- Texas SB 6 rule adoption, RTO responses to FERC's show cause orders, and Order 881 dates after 2025 extensions are all [UNVERIFIED].
- AEP Ohio 4-year ramp from one source; check PUCO case 24-0508-EL-ATA.
- Licenses to confirm in writing: EAGLE-I (ORNL), DSIRE, NLR End-Use Load Profiles, DOE-417 summaries, WattTime free tier.
- Singularity commercial pricing and EnergyTag registry adoption in the US not found.

## Sources

- GHG Protocol Scope 2 status (2026-10-16): https://ghgprotocol.org/blog/scope-2-market-based-method-update-2025-2026-public-consultation-current-status
- GHG Protocol feedback summary (2026-08-25): https://ghgprotocol.org/sites/default/files/2026-08/S2-PublicConsultationSummaryofFeedback-2026.08.25.pdf
- Location-based hierarchy summaries: https://www.minimum.com/post/scope-2-gets-serious-hourly-matching-and-greater-precision ; https://energy.drax.com/insights/ghg-protocal-consult-scope-2/
- EIA-930 about page (CO2 method): https://www.eia.gov/electricity/930-content/about.html
- PUDL EIA-930 notes: https://docs.catalyst.coop/pudl/en/stable/data_sources/eia930.html
- Unofficial eGRID2024 (CC BY 4.0): https://zenodo.org/records/18968658
- Open Grid Emissions: https://singularity.energy/open-grid-emissions ; https://github.com/singularity-energy/open-grid-emissions
- Electricity Maps pricing and terms: https://help.electricitymaps.com/en/articles/13169258-pricing-and-quotes ; https://electricitymaps.com/terms-of-service
- WattTime plans: https://watttime.org/docs-dev/data-plans/ ; https://docs.watttime.org
- Cambium: https://www.nrel.gov/analysis/cambium ; https://data.nrel.gov/submissions/206
- Google CFE%: https://cloud.google.com/sustainability/region-carbon
- EnergyTag GC standard: https://www.trackingstandard.org/the-i-rec-standard-supports-energytags-new-granual-certificates-scheme-standard/ ; https://canarymedia.com/articles/corporate-procurement/can-24-7-carbon-free-energy-become-a-global-standard
- FERC large-load show cause orders: https://www.willkie.com/publications/2026/06/ferc-directs-grid-operators-to-reform-procedures-for-large-loads-connecting-to-the-bulk-transmission ; https://rmi.org/resources/understanding-fercs-large-load-orders/ ; https://www.mcguirewoods.com/client-resources/alerts/2026/6/ferc-issues-section-206-show-cause-orders-directing-all-six-rtos-isos-to-justify-or-reform-large-load-integration-rules/
- DOE ANOPR background: https://www.kirkland.com/publications/kirkland-alert/2025/11/potential-game-changing-rulemaking-for-data-centers
- Texas SB 6 and PUCT proposal: https://www.foley.com/insights/publications/2026/03/public-utility-commission-of-texas-issues-proposed-rules-for-large-load-interconn/ ; https://www.dlapiper.com/en/insights/publications/2026/03/texas-proposes-new-interconnection-standards-for-large-electric-loads ; https://powermag.com/abbott-orders-full-audit-of-texas-data-center-interconnection-queue-threatens-to-deny-grid-access/ ; https://www.ercot.com/files/docs/2025/09/15/89th-Legislative-Session-PPTX-ERCOT-Status-October-2026-Final-PDF.pdf
- AEP Ohio: https://www.utilitydive.com/news/Ohio-regulators-approve-aep-data-center-interconnection-rules/752690/ ; https://ohiocapitaljournal.com/2025/09/11/ohio-regulators-turn-down-appeal-ok-utilitys-data-center-billing-plan/
- Dominion GS-5: https://virginiamercury.com/2025/11/25/scc-approves-chesterfield-gas-plant-and-dominion-rate-hike-creates-new-rate-class-for-data-centers/
- Georgia Power: https://psc.ga.gov/site/assets/files/8617/media_advisory_data_centers_rule_1-23-2025.pdf ; https://georgiawatch.org/georgia-regulators-approve-new-billing-rules-for-large-energy-users-amid-data-center-boom/
- Xcel Minnesota: https://fresh-energy.org/regulatory-update-commission-approves-xcel-energys-large-load-tariff
- Missouri: https://psc.mo.gov/CMSInternetData/Community%20Outreach/Large%20Load%20Tariff%20Fact%20Sheet.pdf
- DELTa: https://sepapower.org/large-load-tariffs-database/ ; https://sepapower.org/knowledge/u-s-data-center-gold-rush-drives-surge-in-new-utility-tariffs/
- Order 881 extensions: https://blog.burnsmcd.com/5-powerful-reasons-for-early-action-on-ferc-order-881-compliance ; https://ferc.gov/news-events/news/commissioner-rosners-concurrence-order-granting-extension-time-re-miso-inc-under ; https://www.caiso.com/documents/jan-27-2025-motion-for-extension-of-time-ferc-order-no-881-er22-2362.pdf
- DLR ANOPR: https://www.ferc.gov/explainer-implementation-dynamic-line-ratings-rulemaking-anopr
- PyPacity and linerate: https://pypi.org/project/pypacity/ ; https://pypi.org/project/linerate
- Rate cases: https://powerlines.org/utilities-request-18-6-billion-in-rate-increases-in-first-half-of-2026/ ; https://help.insightengine.org/en/articles/8175410-rate-cases-what-s-included ; https://policyrisk.com/legislation/HR8947
- DOE-417: https://www.oe.netl.doe.gov/oe417.aspx ; https://www.oe.netl.doe.gov/print/oe417pfannualsummary.aspx
- EAGLE-I: https://figshare.com/articles/dataset/The_Environment_for_Analysis_of_Geo-Located_Energy_Information_s_Recorded_Electricity_Outages_2014-2022/24237376 ; https://impact.ornl.gov/en/datasets/eagle-i-power-outage-data-2025/ ; https://pmc.ncbi.nlm.nih.gov/articles/PMC10915145
- NERC 2025 LTRA coverage: https://www.powermag.com/nerc-warns-long-term-grid-reliability-risks-mounting/ ; https://www.utilitydive.com/news/nerc-overstates-reliability-risks-in-long-term-assessment-grid-strategies/814292/
- NEC 220.87: https://www.ecmag.com/magazine/articles/article-detail/when-a-local-requirement-went-national-using-optional-calculations-for-determining-existing-loads
- EV rates and make-ready: https://app.bchydro.com/accounts-billing/rates-energy-use/electricity-rates/fleet-electrification-rates.html ; https://www.eei.org/issues-and-policy/electric-transportation/ev-programs-access ; https://www.atlasevhub.com/about/
- Form 556: https://www.ferc.gov/docs-filing/forms/form-556/form-556.pdf
- Sharing the Sun: https://data.nrel.gov/submissions/244
- DSIRE API: https://dsireusa.org/dsire-api/
