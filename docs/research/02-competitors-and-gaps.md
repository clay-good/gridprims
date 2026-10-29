# 02: Competitors and gaps

Research memo for gridprims.com. As of October 27, 2026. Planning only. No code.

## Our value-add, up front

REopt answers "what solar + storage should I build?" Paid tools answer "manage my portfolio" or "find me a site." **Nobody free answers "what is my meter data actually telling me, what is this bill really charging me for, and is the number right?"** That is gridprims' lane:

1. **Read any interval file in the browser, never upload it.** Green Button XML, utility CSVs, partial years, 15/30/60-minute data, leap years, gaps, several meters. REopt wants one clean CSV of exactly one year. We found no free Green Button viewer.
2. **Explain the bill, line by line, with citations.** Demand charges, ratchets, power factor penalties, coincident peak (4CP/5CP), TOU. Show which 15 minutes set this month's charge and what it cost. The free calculators we found use load-factor averages, not your actual intervals.
3. **Compare tariffs on your own data.** "What would last year have cost on rate B?" Utilities only offer this on their own sites, one utility at a time.
4. **Small engineering primitives that sit behind paywalls or in Python libraries.** IEEE 738 line ampacity, 4CP exposure, large-load ramp math, public-data snapshots that outlive federal takedowns.

Rule of thumb: if the job needs optimization, a market feed, or a queue database, link out. If it needs one file, a tariff, and an honest, explainable calculation, that is ours.

## 1. Landscape

| Tool | Who it serves | Price | Requires | Concrete gaps for our audiences |
|---|---|---|---|---|
| **REopt web tool** (NREL, renamed National Laboratory of the Rockies, NLR, on Dec 1, 2025) | Building/campus owners, federal sites, consultants | Free | Web form; CSV upload to NLR servers; API needs key | Sizing optimizer, not a bill auditor. See section 2. |
| **PVWatts** (NLR) | Anyone estimating PV output | Free | Web; API needs NLR developer key | Production only. No load, no tariff, no demand. |
| **SAM** (NLR) | Analysts, researchers | Free | Desktop install | Powerful but steep learning curve; not mobile; heavy for a quick bill question. *(Install requirement from general knowledge; page not fetched.)* |
| **HOMER Pro / Grid** (UL Solutions) | Microgrid and BTM storage developers | Pro $1,575–$4,650/yr; Grid by quote | Desktop/account, license | Paid; overkill for audits. |
| **Energy Toolbase** | Solar/storage installers selling C&I | $170–$224/user/month, billed annually | Account; upload | Sales-proposal tool; paid; data leaves the device. |
| **EnergyCAP** | Facility/energy managers (portfolio bill tracking) | ~$3.35–$4.28/meter/month list (vendor page); directories say ~$4,000–$5,000/yr floor | Account, onboarding, bill capture | Bill tracking, not tariff math on intervals; paid. Vendor pages disagree on price. |
| **Arcadia / UtilityAPI** | Developers who need utility data pipes | Contact sales; Arcadia production reportedly low five figures/yr (aggregator, unverified) | Account, customer authorization | Data access, not analysis. Not for one-off users. |
| **Aurora Solar** | Residential/commercial solar sales | Paid (price not found, unverified) | Account | Solar design and proposals; not grid or audit work. |
| **EIA Hourly Grid Monitor / Electricity Data Browser** | Analysts, journalists | Free | Web | Balancing-authority level, not customer level. EIA lost ~40% of staff in 2025 and cut or delayed products, so continuity is a risk. |
| **GridStatus** | Traders, analysts | Free Python lib (BSD-3); hosted API free tier reportedly 500,000 rows/month, paid tiers above | Account for API; Python for lib | Market data. Its 4CP Monitor is trial/contact-sales. Not a bill tool. |
| **Interconnection.fyi / GridTracker** | Developers, analysts, press | Free public site; GridTracker paid, no public price | None for free site | 40,000+ projects, 50+ queues, daily refresh. Gaps: deeper detail paywalled; no load-side math. **Do not compete.** |
| **Catalyst PUDL** | Data analysts | Free, open data | Python/SQL skills | Clean data, no end-user calculators. **Source, not competitor.** |
| **OpenEI URDB** | Everyone modeling rates | Free | Web/API | 3,700+ utilities, but only a subset checked annually; manually transcribed, errors possible; demand modeling known to break on overlapping periods. |
| **Enverus (Pearl Street SUGAR)** | Developers, ISOs, financiers | Enterprise | Contract | Acquired Mar 2025. Interconnection study automation. Not our users. |
| **Nira Energy** | Generation developers | Subscription by users/regions, quote only | Account | ISO interconnection cost and capacity. Not our users. |
| **LandGate, Paces, Transect** | Renewable and data center siting teams | SaaS, quote or trial; no free plan found | Account | Paid siting GIS. Our role: free explainers on the public layers they repackage. |
| **Squid (YC W2026)** | Utility planners (UK DSOs first: National Grid, Northern Powergrid) | Enterprise | Design partnership | Network models for utilities. Not public-facing. |
| **Rough Logic** (roughlogic.com, ours) | Electricians, plumbers, HVAC, builders | Free, 2,283 calculators | None | Trades math (voltage drop, Ohm's law). No interval data, tariffs, or grid-scale tools. **Sibling, link both ways.** |
| **Free tariff/bill calculators** (electricrates.org, Texas Electricity Ratings, utility-specific like Nova Scotia Power) | Small business | Free | Web form | Use a single peak number or load factor, not real interval data. One utility each. Many are lead-gen for retail suppliers. |
| **Green Button viewers** | Anyone with a smart meter | None found free | n/a | **Gap.** Energy Toolbase accepts Green Button but is paid. Raw XML is "highly technical." |
| **IEEE 738 / DLR calculators** | Transmission engineers, students, intervenors | `linerate` (Python, free); INL GLASS (Java, alpha); IEEE standard paywalled | Python install or license | **Gap.** No free browser calculator found. FERC Order 881 makes ambient-adjusted ratings live across RTOs through 2026–2028. |

Sources for each row are in the Sources list. Reddit could not be searched by our tools (blocked), so forum evidence below is from Eng-Tips, Mike Holt, trade press, and filings.

## 2. What REopt does not do well

REopt is excellent at what it is built for: optimal sizing and dispatch for PV, storage, CHP, and more. Its weaknesses for our audiences:

| Area | Finding | Confidence |
|---|---|---|
| **Speed** | The tool page warns that since moving to open-source solvers, users "may experience longer solve times and timeout errors," especially with net metering, resilience, or 3+ technologies. | High (NLR banner) |
| **Privacy** | Load files are uploaded to NLR servers. No account needed, but data leaves the device. Some public entities and utilities can't send customer data offsite. | High |
| **Input format** | CSV only; hourly, 30-minute, or 15-minute; "no commas and no blank or text entries." One year implied. No Green Button XML. Leap years, gaps, DST, partial years, and multiple meters are left to the user to fix. | High for CSV rules; medium for one-year/no-XML (from 2020 tutorial and API conventions) |
| **Coincident peak (4CP/5CP)** | The REopt.jl engine has `coincident_peak_load_active_time_steps` and `coincident_peak_load_charge_per_kw`. Whether the web form exposes them is **unverified**. Either way, it can't tell you when ERCOT's peaks happened or what your exposure was. | Medium |
| **Power factor penalties** | No power factor input in the ElectricTariff code. kVA billing and PF adjustments can't be modeled. | High (source code) |
| **Overlapping demand periods** | EPRI benchmarking found tools including REopt Lite mis-handled overlapping demand windows (e.g., SCE TOU-8). Current status unverified. | Medium |
| **Bill audit** | Not a goal of the tool. It models a future bill, not "does my actual bill match the tariff?" | High |
| **Tariff comparison** | One rate per run. Comparing five rates means five runs. | High |
| **Explainability** | Outputs are optimal sizes and savings; no "this interval set your demand charge" trace. | Medium (our assessment) |
| **Mobile / offline** | Desktop-oriented web app; needs connection to solve. | Medium (not tested on phone) |
| **URDB dependence** | Inherits URDB errors and staleness. | High |

**Bottom line:** do not rebuild sizing. Do the step before REopt (clean and understand the data, pick the right rate) and the step after (explain the bill). Hand users a clean REopt-ready CSV.

## 3. Practitioner pain we could verify

- **Interval data is inconsistent and hard to read.** Utility exports vary: some offer only daily data, some hourly, some 15-minute; some have no Green Button at all (Liberty, Greenville Utilities per Nectar guides). A critic in Sustainable Business News called Green Button data "highly technical."
- **Demand charges dominate and confuse.** EnergyCAP: demand can be up to 40% of charges. Eng-Tips threads keep asking what demand means and note intervals vary (15, 20, 30, 60 minutes) by utility.
- **Power factor penalties are hidden.** Engineers on Mike Holt and Colorado Springs Utilities' white paper explain that PF penalties are often folded into billed demand, not shown as a line. You have to back them out from kW vs. kVA.
- **4CP is high stakes and opaque.** ERCOT customers' whole-year transmission cost hinges on four 15-minute intervals. The free options we found are trial or paid (GridStatus, GridBeyond).
- **Large loads swamp small utilities.** Rappahannock Electric Cooperative's requested data center capacity rose from 7,423 MW (2024) to 22,426 MW (2026), and it uses probability weights, 70% utilization, and 3-year ramps. NRECA built a large-loads task force and report series. EPRI says there is "limited broadscale information" on how utilities review these requests.
- **Siting teams lack public capacity data.** 79% of site selectors put power in their top factors (2026 survey). Hosting capacity maps exist in only ~26 states (DOE atlas, May 2024); some need an account (PG&E). Ohio requires public maps by May 31, 2026.
- **Public data is disappearing.** HIFLD Open was terminated; archived copies live at Data Rescue Project and DataLumos. EIA cut ~40% of staff and dropped or delayed reports.
- **Ratepayer advocates are outgunned.** Minnesota and Economic Liberties filings describe utility resources "far outweighing" intervenors. California's intervenor compensation is the exception.

**Unverified:** Reddit threads (our search tools are blocked from reddit.com) and LinkedIn posts. Worth a manual pass before final scoping.

## 4. Underserved audiences

| Audience | Job they need done | Why current tools fail |
|---|---|---|
| Co-op and muni engineers | Screen a large-load request; check a member's bill; quick ampacity checks | Enterprise tools are priced for IOUs; NRECA tools are member-only |
| City/county staff | Evaluate a data center or EV hub proposal; budget building bills | No neutral, free explainer; consultants expensive |
| PUC staff, intervenors, ratepayer advocates | Test a proposed tariff on real load shapes; check line ratings | No free tool runs a rate against interval data; IEEE 738 paywalled |
| School districts | Electric bus charging vs. demand charges; building bill audits | AFLEET is a spreadsheet; utility calculators are one-utility |
| EV fleet managers | Managed vs. unmanaged charging peak cost | Vendor tools are sales funnels |
| Data center siting teams | First-pass power screening from public data | Paid SaaS; HIFLD gone |
| Journalists | "What will this rate case do to bills?" "What did that peak cost?" | No citable, plain-language calculator |
| Students | Learn demand charges, 4CP, ampacity with real numbers | Textbooks, Python, or paywalled standards |

## 5. Top 10 value-add opportunities (ranked)

| # | Who | Job | Why existing tools fail | What we'd ship | Evidence |
|---|---|---|---|---|---|
| 1 | Facility managers, school districts, small businesses | See what my meter data says | No free Green Button viewer; REopt needs one clean CSV and uploads it | In-browser interval file reader: Green Button XML/CSV, any interval, gaps/DST/leap year flagged, multi-meter, heat map, load duration curve, top peaks | High |
| 2 | Same, plus consultants | Know which interval set my demand charge and what it cost | Free calculators use load factor, not intervals; REopt optimizes, doesn't explain | Demand charge explainer with "this 15 minutes cost $X," ratchet tracking, citation to tariff sheet | High |
| 3 | Bill payers, auditors | Check that my bill matches my tariff | EnergyCAP is paid; REopt has no PF; PF penalties hidden in demand | Bill audit: enter bill lines, compare to computed charges incl. power factor/kVA | Medium-high |
| 4 | Anyone choosing a rate; PUC staff; intervenors | Compare rates on my real data | Utility comparers are one-utility; REopt runs one rate at a time | Side-by-side tariff comparison on a year of intervals, URDB import with an "edit/verify" step | High |
| 5 | Texas C&I, crypto miners, co-ops in ERCOT | Know my 4CP exposure | Paid/trial monitors only | 4CP/5CP calculator: past peak intervals from ERCOT data, your contribution, next-year cost at PUCT rate | Medium-high |
| 6 | All REopt users | Get a file REopt will accept | REopt rejects messy files with blanks/commas/wrong length | "Make REopt-ready" export: 8,760/17,520/35,040-row CSV with fill log | High |
| 7 | Transmission engineers, students, intervenors | Compute line ampacity | IEEE 738 paywalled; only Python/Java options | Browser IEEE 738 steady-state calculator with ambient-adjusted rating table (Order 881 context) | Medium |
| 8 | Co-op/muni engineers, city staff, press | Sanity-check a large-load request | Enterprise tools; no neutral explainer | Large-load ramp calculator: MW requested × probability × utilization × ramp, peak and energy impact | Medium |
| 9 | Fleet managers, school districts | Unmanaged vs. managed charging demand cost | AFLEET spreadsheet; vendor funnels | Charging schedule vs. tariff calculator layered on building load | Medium |
| 10 | Siting teams, journalists, researchers | Use public grid data after HIFLD | HIFLD Open terminated; paid siting SaaS | Cited, versioned pointers to archived HIFLD and EIA-860 data with plain-language caveats; small static snapshots where licenses allow | Medium (licensing and freshness unverified) |

## Do not build, link instead

- **Solar + storage sizing:** REopt, SAM, PVWatts.
- **Interconnection queues:** Interconnection.fyi.
- **ISO market prices and load:** GridStatus, EIA Grid Monitor.
- **Clean EIA/FERC datasets:** Catalyst PUDL.
- **Rate catalog:** OpenEI URDB (we read it; we don't maintain a rival).
- **Trades calculators:** Rough Logic.
- **Enterprise siting, interconnection studies, utility network models:** LandGate, Paces, Transect, Enverus, Nira, Squid.

## Flags (unverified or soft)

- REopt web form support for coincident peak; current behavior on overlapping demand periods; mobile usability.
- Exact REopt row-count and one-year requirement come from 2020 tutorials and the API, not the current form.
- Prices for Aurora, UtilityAPI, Arcadia, GridTracker, Nira, Paces, LandGate, Transect.
- No free Green Button viewer or browser IEEE 738 calculator found; absence is not proof.
- Reddit and LinkedIn not searched (tool blocked); forum evidence is from Eng-Tips, Mike Holt, filings, trade press.
- HIFLD successor dataset status as of August 2026 unclear.

## Sources

- NREL rename to NLR: https://www.energy.gov/eere/articles/energy-department-renames-nrel-national-lab-rockies
- REopt tool and solver banner: https://reopt.nrel.gov/tool
- REopt capabilities (FEMP): https://www.energy.gov/cmei/femp/articles/unlock-expert-energy-analysis-reopt
- REopt load profile tutorial: https://www.nrel.gov/docs/fy20osti/76674.pdf and https://nrel.gov/docs/fy20osti/76673.pdf
- REopt.jl ElectricTariff source: https://github.com/NREL/REopt.jl/blob/master/src/core/electric_tariff.jl
- REopt bill curriculum: https://www.nrel.gov/reopt/curriculum/interpreting-utility-bills-rate-data
- EPRI storage valuation benchmarking: https://storagewiki.epri.com/index.php/Benchmarking
- PVWatts API: https://developer.nrel.gov/docs/solar/pvwatts/v8
- HOMER Pro pricing: https://homerenergy.com/homer-pro/pricing
- Energy Toolbase pricing: https://www.energytoolbase.com/?p=1870
- EnergyCAP pricing: https://energycap.com/utility-bill-energy-management-software/pricing/ and https://www.capterra.com/p/56928/EnergyCAP/
- Arcadia pricing (aggregator): https://apis.io/plans/arcadia-power/arcadia-power-plans-pricing/
- GridStatus plans (aggregator): https://apis.io/plans/gridstatus/gridstatus-plans-pricing/
- GridStatus 4CP: https://blog.gridstatus.io/predicting-ercot-4cp/
- Interconnection.fyi / GridTracker: https://www.interconnection.fyi/about-gridtracker
- PUDL release notes: https://docs.catalyst.coop/pudl/en/latest/_sources/release_notes.rst.txt
- URDB: https://openei.org/wiki/Utility_Rate_Database
- URDB demand caveats: https://catalog.data.gov/dataset/maximum-demand-charge-rates-for-residential-commercial-and-industrial-electricity-tariffs-
- Enverus acquires Pearl Street: https://enverus.com/newsroom/undo-the-queue-enverus-acquires-pearl-street-technologies-to-solve-for-a-more-reliable-resilient-grid
- Nira (profile): https://app.dealroom.co/companies/nira_energy
- Transect (directory): https://netzerocompare.com/software/transect
- Siting tools overview: https://pv-magazine-usa.com/2023/03/14/technology-toolkit-solar-siting-permitting-and-land-use/
- Squid: https://www.ycombinator.com/companies/squid and https://www.ycombinator.com/launches/PHP-squid-ai-powered-grid-planning-in-your-browser
- Rough Logic: https://roughlogic.com
- EIA Grid Monitor: https://www.eia.gov/todayinenergy/detail.php?id=40993
- EIA cuts: https://www.propublica.org/article/the-latest-trump-and-doge-casualty-energy-data and https://www.ehn.org/trump-administration-quietly-curbs-key-u-s-energy-reports-amid-staff-cuts
- HIFLD transition: https://www.napsgfoundation.org/navigating-the-hifld-transition/ ; archives https://portal.datarescueproject.org/datasets/hifld-open-transmission-lines/ and https://www.datalumos.org/datalumos/project/240591/version/V1/view ; NGAC talk https://www.fgdc.gov/ngac/meetings/August_2026_Public_Meeting/HIFLDNext_LightningTalk_Aug2026
- Green Button: https://greenbuttondata.org/ ; utility access guides https://nectarclimate.com/utilities/liberty-granite-state-electric and https://nectarclimate.com/utilities/greenville-utilities-commission ; critique https://sustainablebiz.ca/green-button-energy-data-program-many-red-flags-expert
- EnergyCAP on interval data and PF: https://www.energycap.com/blog/interval-data-a-valuable-complement-to-billing-data-updated-5-20-21/ and https://www.energycap.com/blog/why-do-i-have-a-power-factor-charge-on-my-utility-bill/
- Power factor forums: https://forums.mikeholt.com/threads/power-factor.61644/post-61644 ; https://csu.org/hubfs/39606065/Document%20Library/PowerFactorCorrection.pdf
- Eng-Tips demand: https://www.eng-tips.com/threads/would-like-to-understand-demand-charge-and-energy-charge.223366/
- Free demand calculators: https://electricrates.org/business/costs/calculators/ ; https://www.texaselectricityratings.com/commercial-electricity/tools/demand-charges-explained ; https://nspower.ca/your-business/save-money-energy/compare-your-rate
- IEEE 738 tools: https://pypi.org/project/linerate ; https://inl.gov/content/uploads/2023/07/General-Line-Ampacity-State-Solver-GLASS2021.pdf ; https://standards.globalspec.com/std/14649010/738
- FERC Order 881 timelines: https://blog.burnsmcd.com/smart-budgeting-can-keep-utilities-ahead-of-ferc-881-compliance-curve ; https://www.rtoinsider.com/tag/ferc-order-881
- NRECA large loads: https://www.cooperative.com/programs-services/bts/Pages/Large-Loads-and-Data-Centers.aspx
- Rappahannock PJM presentation: https://www.pjm.com/-/media/DotCom/committees-groups/subcommittees/las/2026/20260929/20260929-item-5c---rappahannock.pdf
- EPRI large-load survey: https://restservice.epri.com/publicdownload/000000003002030643/0/Product
- Site selection and power: https://www.credaily.com/?p=224026 ; https://www.datacenterknowledge.com/data-center-site-selection/power-availability-now-determines-where-data-centers-get-built
- Hosting capacity atlas: https://www.energy.gov/eere/us-atlas-electric-distribution-system-hosting-capacity-maps ; Ohio law https://codes.ohio.gov/ohio-revised-code/section-4928.83
- Ratepayer advocates: https://www.house.mn.gov/comm/docs/NYq87EwCdkmll9QSiXp25g.pdf ; https://www.economicliberties.us/press-release/new-economic-liberties-brief-reveals-how-lawmakers-can-intervene-against-utility-rate-hikes/
- School bus charging: https://afdc.energy.gov/vehicles/electric_school_buses_p2_m2.html ; AFLEET https://cleancities.energy.gov/files/u/news_events/document/828/file/AFLEET%20Tool%202023%20Update.pdf
