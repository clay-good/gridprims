# 09 · Audiences and data access: households, and how anyone gets their data

Research date: 2026-10-29. Research only, no code. Tags: **[V]** = seen on a primary or named source page; **[U]** = from a third-party guide, search excerpt, or inference. Check every [U] in a live account before publishing it as a how-to.

## Bottom line

1. **Data access is the main barrier for households.** Of the 25 largest US distribution utilities (EIA-861 2024), about 8 have a verified self-serve Green Button or interval export. About 10 more have some download that isn't verified or isn't standard. Duke, PacifiCorp, and Alabama Power show no residential export at all. Expect hourly data, sometimes 15-min, usually 12–24 months back, as XML or a utility-specific CSV.
2. **Texas is the easiest big win.** Smart Meter Texas serves Oncor, CenterPoint, AEP Texas, and TNMP (about 8.2M meters) from one portal, with 15-min CSV and Green Button XML [V]. California IOUs (11.0M homes), Con Ed, and ComEd follow.
3. **Default residential time-of-use (TOU) now covers about 16M homes, roughly 11% of US residential customers.** This covers California IOUs (since 2020–2024), DTE and Consumers in Michigan, and Xcel Colorado (since Nov 1, 2025). Each of these utilities offers several TOU and EV variants, so "which plan is cheapest on my data" is a real, recurring question. Residential demand charges are rare and shrinking: SRP closed its pilot in Nov 2025 and APS made them optional. Georgia Power's Smart Usage is the main live case.
4. **Bill anxiety is at a record high.** Google searches for "electricity prices" peaked in March 2026 at about 8 times the historical average (USAFacts). In 2026 polls, 56–71% oppose a local data center and most expect it to raise their bill. The top questions are "why is my bill so high," "is TOU worth it," EV charging, and data centers.
5. **No current free tool reads your own interval data privately against several rates.** Utility calculators cover only their own plans and hide the math. Rewiring America models a typical home instead of reading your data. Arcadia, UtilityAPI, and Bayou are paid B2B APIs that need your utility login or consent. WattTime and Singularity are APIs and datasets, not consumer tools.
6. **Build for phones and in Spanish from day one.** 16% of adults are smartphone-only, including 28% of Hispanic adults and 34% of households under $30K [V Pew 2025]. 13.6% of households speak Spanish at home, and 2.7% are Spanish-speaking households with limited English [V ACS 2024]. Texas and California regulators already require Spanish materials in defined cases.

---

## 1. Getting interval data

### 1a. The 25 largest distribution utilities (EIA-861 2024, bundled plus delivery-only customers)

Counts come from my own aggregation of EIA-861 2024 `Sales_Ult_Cust` (Parts A and C) and `Delivery_Companies` (Texas wires companies). Part B and D retail sellers are excluded to avoid double counting [V].

| # | Utility (state) | Total cust. | Resid. cust. | Self-serve interval download | Format | Interval | History | Account path | Tag |
|---|---|---|---|---|---|---|---|---|---|
| 1 | FPL (FL) | 5.91M | 5.24M | Download button, not Green Button | unknown (CSV/XLS?) | 60 min (15 min business) | ~24 mo? | myFPL › Energy Dashboard › Hourly tab › Download | [V] button / [U] rest |
| 2 | PG&E (CA) | 5.73M | 5.05M | **Green Button DMD** | XML, CSV | 15 min | not stated | Your Account › Usage and rates › View Usage Details › Green Button "Download my data" | [V] |
| 3 | SCE (CA) | 5.30M | 4.59M | **Green Button DMD** | CSV, XML | 15 or 60 min | 13–36 mo [U] | My Account › "Green Button Download My Data" (or Data Sharing & Download) | [V] |
| 4 | ComEd (IL) | 4.13M | 3.73M | **Green Button DMD** | CSV, XML [U] | 30 min [U] | 13–24 mo [U] | My Account › My Usage › Green Button | [V] exists |
| 5 | Oncor (TX) via Smart Meter Texas | 4.01M | n/a | **SMT export, Green Button XML** | CSV, XML | 15 min | ~24 mo [U] | smartmetertexas.com › report "Energy Data 15 Min Interval" › dates › Export | [V] |
| 6 | Con Edison (NY) | 3.65M | 3.06M | **Green Button DMD** | CSV, XML | 15 min elec. | 12 mo | My Account › Download Your Energy Data (Green Button) | [V] |
| 7 | Duke Energy Carolinas (NC/SC) | 2.91M | 2.49M | No residential export found; view down to 30 min | none | 30 min view | 24 mo bills | Sign in › Energy Usage (view only) | [V] view / [U] no export |
| 8 | CenterPoint Houston (TX) via SMT | 2.81M | n/a | **SMT** (same as Oncor) | CSV, XML | 15 min | ~24 mo [U] | as row 5 | [V] |
| 9 | Georgia Power (GA) | 2.80M | 2.45M | Export from My Power Usage, not Green Button | XLSX? | hourly | ? | My Account › My Power Usage › Hourly › Export | [U] |
| 10 | Dominion Energy (VA/NC) | 2.78M | 2.49M | Download after enrolling in Detailed Energy Usage | CSV? | 30 min | ? | Manage Account › Detailed Energy Usage › enroll (data in 3–5 days) | [V] / format [U] |
| 11 | PSE&G (NJ) | 2.39M | 2.06M | CSV export (MyMeter-style portal) | CSV | 15 min–monthly | ? | My Account › energy usage › export | [U] |
| 12 | DTE Electric (MI) | 2.28M | 2.07M | Usage portal download | CSV/XLS/XML? | ? | ? | Energy Usage › download | [U] |
| 13 | PacifiCorp (6 states) | 2.10M | 1.84M | No export found (view only; paid Energy Profiler) | none | ? | ? | n/a | [U] |
| 14 | FirstEnergy PA | 2.09M | 1.81M | Green Button on Bill Comparison tab (Ohio wording) | XML? | 15/30 min? | ? | My Account › Analyze Usage › Bill Comparison › Green Button Download | [U] (sources conflict) |
| 15 | Duke Energy Florida | 2.01M | 1.79M | View only | none | ? | ? | n/a | [U] |
| 16 | Consumers Energy (MI) | 1.89M | 1.66M | **Green Button DMD** (also Connect My Data) | XML | ? | ? | Energy Dashboard › Cost and Use Trends › Share and manage data › Green Button | [U] |
| 17 | Duke Energy Progress (NC/SC) | 1.75M | 1.50M | No; Green Button "expected Jan 2027" | none | ? | ? | ask customer service | [U] |
| 18 | National Grid NY (Niagara Mohawk) | 1.72M | 1.53M | **Green Button DMD + CSV** | CSV, XML | depends on meter | up to 2 yr | My Account › usage › download | [V] (PDF excerpt) |
| 19 | PECO (PA) | 1.71M | 1.54M | Green Button DMD (Exelon/Opower) | XML, CSV | 60 min? | ~13 mo | My Account › Green Button | [U] |
| 20 | Xcel – PSCo (CO) | 1.59M | 1.37M | Download table exists; Green Button XML in other Xcel states | CSV; XML? | 15 min? | 6–24 mo | My Account › usage chart/table › download | [U] |
| 21 | Xcel – NSP (MN/ND/SD) | 1.58M | 1.41M | As PSCo | CSV | ? | 24 mo | as above | [U] |
| 22 | Alabama Power (AL) | 1.55M | 1.33M | No export mentioned | none | daily view | ? | My Account › My Power Usage | [V] no mention |
| 23 | AEP Ohio (OH) | 1.53M | 1.34M | Green Button (AEP joined in 2012) | XML | 15 min? | ? | Energy Tools › Green Button | [V] 2012 / [U] today |
| 24 | Eversource NSTAR (MA) | 1.53M | 1.30M | Green Button portal (usagelink.eversource.com); AMI still rolling out | XML | often monthly until AMI | 13 mo? | UsageLink | [V] portal / [U] rest |
| 25 | SDG&E (CA) | 1.53M | 1.36M | **Green Button DMD** | XML (CSV?) | 15 or 60 min | 13 mo | My Energy Center › Usage › meter › dates › format › Download | [V] |

Just outside the top 25: LADWP (#26, 1.51M; monthly data only, smart meters rolling out since Sep 2025 [U]); PPL (#27, 1.49M; Green Button and Excel export, hourly, 2 years per its own business brochure [V], residential [U]); APS (#28, 1.40M; own "Download Usage" hourly CSV, no Green Button [U]).

**Count:** 8 of the top 25 have a [V] self-serve interval file: PG&E, SCE, ComEd, Oncor, Con Ed, CenterPoint, National Grid NY, and SDG&E. About 10 offer a download that is non-standard or [U]. 5 show no residential export: the 3 Duke utilities, PacifiCorp, and Alabama Power. The 8 verified utilities serve about 34M customers.

### 1b. Co-ops and municipal utilities

| Platform | What members get | Tag |
|---|---|---|
| NISC SmartHub (most US co-ops, many munis) | My Usage › "Download My Data": zipped Green Button XML, up to ~14 months; some co-ops also allow CSV. Each co-op turns features on or off, so 15-min vs hourly varies (e.g., Pedernales CSV went hourly-only in Jan 2024). | [U] (Nectar co-op guides) |
| Oracle Opower portals (many IOUs: Exelon, others) | Built-in "Green Button – Download My Data" feature, usually XML and CSV | [V] Oracle doc title / [U] details |
| Itron, Hometown Connections | No consumer-facing export documented; Itron is meter/MDM back end | [U] |

### 1c. Authoritative counts

- **No current public certified list.** The Green Button Alliance (GBA) reported "75+" certified Connect My Data plus Download My Data implementations across the US and Canada in July 2023 [V]. It also runs a searchable utility directory, but I found no count of US DMD utilities in it.
- Older GBA statement: more than 150 utilities and providers "committed" to Green Button [U].
- Ontario reported 56 distributors with confirmed implementation in May 2024 [V]. It has a mandate; the US does not.

**Implication:** the product has to accept Green Button XML, SMT CSV, and at least the FPL, Dominion, Georgia Power, APS, and PSE&G CSV layouts. It also needs a "your utility doesn't export: here's what to ask for" path.

---

## 2. Residential time-of-use and demand charges (sizing "which plan is cheapest on my data")

| State / utility | Status in 2026 | Peak window | Residential customers | Tag |
|---|---|---|---|---|
| California: PG&E, SCE, SDG&E | Default TOU (rolled out Oct 2020–2024). Medical baseline customers exempt unless they consent. Many alternatives: E-TOU-C/D, EV2, E-ELEC (new Mar 2026 for EV, storage, heat pump), SCE TOU-D-4-9PM/5-8PM, SDG&E TOU-DR1/DR2 | 4–9 pm typical | 11.0M | [V] law and rollout; plan names [U] |
| Michigan: DTE | Default TOU since Mar 2023, no opt-out to flat | 3–7 pm weekdays | 2.07M | [V] |
| Michigan: Consumers | Default TOU summer-peak | 2–6 or 2–7 pm (sources differ) | 1.66M | [U] window |
| Colorado: Xcel PSCo | Default TOU since Nov 1, 2025 (simplified to on/off-peak), opt-out by contacting Xcel | 5–9 pm weekdays; summer peak about 2.7 times off-peak | 1.37M | [V] |
| Colorado: Fort Collins; California: SMUD (public power) | Default TOU | various | n/a | [V] APPA |
| Missouri: Evergy | Default TOU-style plan (Standard Peak Saver, then Smart Savers per later PSC order) | n/a | n/a | [V] PSC doc |
| Maryland: BGE, Pepco | No default TOU found; Pepco R-TOU-P pilot ended Jan 31, 2026 | n/a | n/a | [U] |
| Massachusetts | Working group recommends default TOU, phased behind AMI | n/a | n/a | [V] |
| New Mexico: PNM | Default TOU planned after full AMI | n/a | n/a | [V] testimony |
| Illinois: ComEd | Voluntary TOU being finalized for 2026, with an EV credit | n/a | n/a | [U] |

Default-TOU total for the [V] rows: ~16.1M residential customers, or 11% of 143.1M (EIA 2024).

**Residential demand charges (kW-based):**

| Utility | Plan | Status | Tag |
|---|---|---|---|
| SRP (AZ) | E-27P (no solar) / E-27 (solar) | E-27P closed to new sign-ups from Nov 2025 billing; both end Nov 2029, when customers move to E-16 | [V] ratebook |
| APS (AZ) | "TOU 4–7 pm with Demand," Saver Choice Plus (3–8 pm) | Optional; a rate-case settlement dropped the proposed mandatory demand charge. The 2025 case (13.99% ask, docket E-01345A-25-0105) had hearings from May 2026 | [V] KJZZ, APS FAQ / dates [U] |
| Georgia Power | Smart Usage: $12.21/kW for the highest on-peak hour | Default for homes built after Jan 1, 2021; ~14K enrolled at the time of the AJC report | [V] GA Power page / [U] current default |

**Implication:** a California, Michigan, and Colorado plan library covers most default-TOU households. A demand-charge explainer matters for Arizona and Georgia homes, and for anyone comparing against C&I rates.

---

## 3. Recurring residential bill questions

| Question | Evidence | Tag |
|---|---|---|
| "Why is my bill so high?" / electricity prices | Google searches for "electricity prices" set a record in March 2026, ~8 times the historical average, still elevated in June; about 1 in 10 also mention AI (USAFacts, Aug 2026) | [V] |
| "Are data centers raising my bill?" | Yale/GMU spring 2026: 56% oppose a local data center, 59% expect bills to rise. Heatmap (May 2026): over half blame data centers "a lot," up from 28% in Aug 2025. Gallup: 71% oppose a local AI data center | [V] excerpts |
| "Will TOU save me money / when is peak?" | Default TOU rollouts (section 2); Colorado PUC TOU explainer; municipal FAQs (Concord, MA, launched Apr 2026) | [V] |
| "What's the cheapest way to charge my EV?" | PG&E EV2 summer peak ~$0.538 vs off-peak ~$0.226/kWh (Jun 2026); municipal EV TOU FAQs | [V] |
| "Will a heat pump raise my bill?" | PG&E E-ELEC rate (Mar 2026) for heat pump, EV, and storage homes; Concord FAQ advising heat-pump users on the 3–7 pm peak; Rewiring America Bill Impacts Calculator (Sep 2025) | [V] |
| "What is a demand charge?" | Georgia Watch explainer and quote ("There's no predictability"); APS and SRP plan pages | [V] |
| Household bill growth | J.D. Power: utility costs +41% 2020–2025 (via USA Today); EIA average residential price ~17.24¢/kWh in 2025 (+6%, via solar.com) | [U] secondary |

---

## 4. Existing free or consumer tools (2026) and their gaps

| Tool | What it does | Uses your interval data? | Several rates or utilities? | Private / local? | Tag |
|---|---|---|---|---|---|
| SCE Rate Plan Comparison Tool | Ranks SCE plans on your past usage | Yes, server-side; needs 12 months as a customer and 8 months of data | SCE plans only | No (in account) | [V] |
| PG&E / other utility "compare plans" pages | Same idea, inside the account | Server-side | Own plans only | No | [U] |
| CCA calculators (e.g., Silicon Valley Clean Energy) | Compares PG&E vs. the community choice aggregator (CCA) on usage you type in | Manual entry | 2 suppliers | Partly | [V] |
| Rewiring America Personal Electrification Planner and Bill Impacts Calculator (Sep 2025) | Modeled bill impact of heat pump, EV, solar, and induction upgrades by address | No (modeled) | Modeled tariffs | No | [V] |
| Arcadia, UtilityAPI, Bayou | B2B utility-data APIs; Bayou ~$2/meter/mo with a free tier | Yes, via credential sharing or consent | n/a (raw data) | No | [V] vendor pages |
| WattTime | Marginal emissions API, built into thermostats and chargers | No | n/a | n/a | [V] |
| Singularity Open Grid Emissions | Free open hourly US emissions dataset, plus a paid API | No | n/a | n/a | [V] (2022 launch; 2026 status [U]) |
| Generic Green Button viewers | DOE app challenges and OpenEI listing (2012-era); no maintained free viewer found | Yes | No | Varies | [U] |

**Gaps gridprims fills:**
- Nothing processes the file on the device.
- Nothing compares across utility plans, CCA plans, and EV, heat-pump, or demand variants using your own 15- or 60-min data.
- Nothing shows the bill line by line.
- Nothing pairs your hourly use with hourly emissions.

---

## 5. Language access

| Metric (ACS 2024 1-year, table B16002) | Value | Tag |
|---|---|---|
| Households speaking Spanish at home | 18.03M of 132.74M = **13.6%** | [V] |
| Spanish-speaking, limited-English households | 3.56M = **2.7% of all households**; 19.8% of Spanish-speaking households | [V] |
| All limited-English households (any language) | 5.96M = 4.5%; Spanish = 60% of them | [V] (summed) |
| Spanish-at-home share of households, by state | TX 29.5%, CA 27.8%, FL 23.4%, AZ 20.1%, NY 15.3% | [V] |
| Limited-English household share, by state | TX 5.9%, FL 5.9%, CA 4.5%, NY 3.8%, AZ 2.8% | [V] |

**What regulators require:**
- **Texas.** 16 TAC §25.31 requires utility customer-information packets in English and Spanish, unless 10% or fewer of customers speak only Spanish. §25.26 requires a Commission-approved Spanish-language plan in counties with at least 2,000 Spanish speakers. §25.473 sets non-English language rules for retail electric providers, which publish the Electricity Facts Labels [V titles / U text]. Texas is the clearest state requiring bilingual rate information.
- **California.** The CPUC requires in-language outreach for wildfire and outage events wherever a language has at least 1,000 speakers (2020, R.18-10-007) [V]. Utilities publish rate-plan tools in several languages, e.g., SCE's comparison FAQ in Spanish, Arabic, and Chinese [V]. I found no rule specific to rate information [U].
- **New York.** S2258A (2025–26) would require emergency notices in Spanish and other languages; it passed the Senate but is not law [V].

**Implication:** ship Spanish UI and glossary at launch, Texas and California first. Add Chinese, Vietnamese, Korean, and Tagalog later; these are the CPUC's prevalent languages.

---

## 6. Phone-first access (Pew mobile fact sheet, survey Feb–Jun 2025, published Nov 2025) [V]

| Group | Smartphone-only (no home broadband) |
|---|---|
| All adults | 16% (15% in 2024) |
| Hispanic / Black / White | 28% / 19% / 13% |
| Household income under $30K / $75K+ | 34% / 4% |
| Ages 18–29 / 65+ | 27% / 17% |
| High school or less / college graduate | 27% / 6% |

91% of adults own a smartphone.

**Implication:**
- The groups most hit by bill stress are the most likely to be on a phone only.
- Onboarding must show the download flow on a phone, e.g., saving to the Files app on iOS or Downloads on Android, then picking the file. Utility portals often hide downloads on mobile [U].
- Charts must work at 360 px wide.

---

## 7. Journalists and local officials: demand for "how big is this request" context

| Example (2026) | The number reporters needed | Tag |
|---|---|---|
| Seattle City Council: emergency data-center moratorium (Jun) and new data-center rates (Jul) | 5 proposed data centers, 369 MW combined, "≈300,000 homes"; residential rates still up ~10% this year and next | [V] council, KUOW |
| Cleveland City Council: permit moratorium and hearings (Sep 24, Oct) | Proposed 150 MW hyperscale site, "≈100,000 homes" | [V] Cleveland19 |
| Boulder City, NV petition | 300 MW continuous (petitioners' claim) | [U] |
| Oncor large-load queue | 119 GW of requests, ~4 times current peak | [V] news excerpt |
| PPL | >50 GW of data-center requests vs. 7.2 GW of generation | [V] news excerpt |
| Georgia Power | Sales growth forecast of 9%/yr, driven by data centers | [V] news excerpt |

Each story converts MW into "homes" and compares it with utility peak or sales. Those conversions are exactly what a cited "how big is this request" card and the utility pages provide. Reporters also need duplicate-request caveats: the same project shops several utilities.

---

## 8. Students and educators

| Resource | Content | Use for gridprims glossary | Tag |
|---|---|---|---|
| NLR (formerly NREL) REopt curriculum: "Interpreting Utility Bills—Rate Data" | Energy ($/kWh) vs. demand ($/kW) charges, reading rate data, URDB | Align demand-charge and TOU definitions; link to it | [V] |
| FEMP/WBDG course on rates with REopt Lite | Life-cycle comparison of rates (federal audience) | Advanced reading | [V] |
| EIA Energy Kids teacher guide and lesson plans (Primary to Secondary; many by NEED) | Electricity basics, sources, math and science extensions | Cite for kWh, capacity, and generation-mix basics | [V] |
| NEED Project guides (e.g., Monitoring and Mentoring) | Students measure school energy use, cost, and emissions | Classroom exercise: "analyze a sample Green Button file" | [V] (2014 guide) |

No found curriculum uses real household interval data with multiple rates. A sample-file lesson would be new.

---

## Sources

- EIA-861 2024 data files (own aggregation): https://www.eia.gov/electricity/data/eia861/zip/f8612024.zip ; EIA Table 2.1: https://www.eia.gov/electricity/annual/html/epa_02_01.html
- PG&E: https://www.pge.com/en/save-energy-and-money/energy-usage-and-tips/understand-my-usage.html
- SCE: https://www.sce.com/clean-energy-efficiency/home/energy-management-center ; rate tool: https://sce.com/helpcenter/topics/rate-plans-pricing/rate-plan-comparison-tool
- SDG&E: https://www.sdge.com/node/85
- ComEd: https://www.comed.com/SmartEnergy/InnovationTechnology/Pages/GreenButtonDownload.aspx
- Con Edison: https://www.coned.com/en/save-money/make-better-energychoices-with-green-button
- Smart Meter Texas guide: https://www.smartmetertexas.com/commonapi/gethelpguide/help-guides/Smart_Meter_Texas_Residential_User_Guide.pdf
- FPL: https://www.fpl.com/my-account/residential-dashboard.html
- Duke: https://www.duke-energy.com/home/billing/track-energy-use
- Dominion: https://www.dominionenergy.com/about-us/electric-projects/smart-meters/detailed-energy-usage
- Alabama Power: https://www.alabamapower.com/residential/save-money-and-energy/energy-saving-programs/my-power-usage.html
- National Grid: https://www.nationalgridus.com/media/pdfs/billing-payments/howtoretrieveutilityusagestatement.pdf
- PPL brochure: https://www.pplelectric.com/-/media/PPLElectric/At-Your-Service/Docs/Business-Customers/Energyanalysis-businesscustomers.pdf
- AEP Green Button (2012): https://www.aep.com/news/stories/view/1249/AEP-Participates-In-Green-Button-Initiative-To-Give-Customers-Easy-Access-To-Energy-Consumption-Data/
- Eversource: https://usagelink.eversource.com/
- APS download guide (installer): https://www.sunvalleysolar.com/hubfs/APS%20Usage%20Download%20Instructions_2025.pdf
- Nectar Climate data-access guides (secondary): https://nectarclimate.com/utilities/ (e.g., /georgia-power-co, /dte-energy, /pacificorp, /pedernales-electric-cooperative)
- Oracle Opower DMD: https://docs.oracle.com/en/industries/energy-water/business-customer-engagement/business-energy-management-configuration/green-button---download-my-data.html
- GBA 75+ certified: https://www.greenbuttonalliance.org/news/press-release--gba-marks-green-button-certified-milestone-with-over-75-implementations-certified ; Ontario status: https://www.oeb.ca/sites/default/files/Green%20Button%20Status%20May2024.pdf
- CA default TOU law: https://california.public.law/codes/ca_pub_util_code_section_745
- DTE TOU: https://www.michiganpublic.org/environment-climate-change/2023-01-12/dte-energy-begins-time-of-day-pricing-for-electricity-in-march
- Colorado PUC TOU: https://puc.colorado.gov/time-of-use-rates ; Denver Gazette: https://www.denvergazette.com/2025/10/31/new-simplified-xcel-time-of-use-charges-take-effect-saturday/
- APPA default TOU: https://www.publicpower.org/resource/moving-ahead-with-time-use-rates
- Massachusetts: https://www.mass.gov/doc/topic-4-implementation-and-protections-targeted-conversation/download
- SRP E-27P: https://www.srpnet.com/assets/srpnet/pdf/price-plans/FY26/2025 Ratebook E-27P.pdf
- APS: https://kjzz.org/content/442380/aps-reaches-settlement-rate-case-rolls-back-mandatory-demand-charge-proposal ; https://www.aps.com/en/Residential/Service-Plans/Frequently-Asked-Questions
- Georgia Power Smart Usage: https://www.georgiapower.com/residential/rate-plans/smart-usage.html ; Georgia Watch: https://georgiawatch.org/wp-content/uploads/2024/09/ElectricityRates_DemandChargesExplained.pdf
- PG&E EV2 / E-ELEC: https://www.pge.com/tariffs/assets/pdf/tariffbook/ELEC_SCHEDS_EV2%20%28Sch%29.pdf ; https://www.pge.com/tariffs/assets/pdf/tariffbook/ELEC_SCHEDS_E-ELEC.pdf
- Concord MA FAQ: https://concordma.gov/2238/When-is-it-least-expensive-to-charge-my-
- USAFacts searches: https://usafacts.org/articles/are-ai-data-centers-driving-up-your-electric-bill/
- Polls: https://heatmap.news/energy/data-centers-electricity-prices-blame ; https://fortune.com/2026/10/15/data-center-opposition-six-americas-climate-poll/ ; https://spectrumnews1.com/ca/la/politics/2026/07/27/national-poll-finds-voters-favor-guardrails-on-data-centers-
- Rewiring America: https://www.rewiringamerica.org/newsroom/press-releases/bill-impacts-calculator-announcement
- Data APIs: https://nectarclimate.com/compare/arcadia-vs-utilityapi-vs-bayou-energy
- Singularity OGE: https://canarymedia.com/articles/emissions-reduction/open-sourcing-the-grid-emissions-data-needed-for-24-7-clean-energy
- ACS B16002 (2024 1-yr) via Census Reporter: https://censusreporter.org/tables/B16002/
- Texas PUC rules: https://www.law.cornell.edu/regulations/texas/16-Tex-Admin-Code-SS-25-31 ; https://www.law.cornell.edu/regulations/texas/title-16/part-2/chapter-25/subchapter-R
- CPUC in-language outreach: https://webproda.cpuc.ca.gov/news-and-updates/all-news/cpuc-requires-utilities-to-conduct-more-robust-public-outreach-to-non-english-speaking-communities
- NY S2258A: https://www.nysenate.gov/legislation/bills/2025/S2258
- Pew mobile fact sheet: https://www.pewresearch.org/internet/fact-sheet/mobile/
- Seattle: https://council.seattle.gov/2026/06/09/city-council-passes-emergency-data-center-moratorium-and-policy-framework/ ; https://www.kuow.org/governing/2026-07-22/seattle-approves-higher-electricity-rates-for-new-data-centers
- Cleveland: https://www.cleveland19.com/2026/09/24/cleveland-residents-invited-hearing-data-centers/
- Large-load requests: https://www.ajot.com/news/us-utilities-grapple-with-big-techs-massive-power-demands-for-data-centers
- REopt curriculum: https://www.nlr.gov/reopt/curriculum/interpreting-utility-bills-rate-data
- EIA Energy Kids: https://www.eia.gov/kids/for-teachers/teacher-guide
