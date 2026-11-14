# 06: Status of rules left open on 2026-10-27

Checked 2026-10-29. **Verified** means I read it today on the agency, regulator, ISO, court, or statute page, or in a document filed there. **Unverified** means it came from trade press, a law firm, or a vendor, or I could not open the primary page. Hours are local prevailing time unless noted.

## Bottom line

- **ERCOT 4CP intervals for 2018–2025 are now Verified from ERCOT's own spreadsheets**, except 2021: only the dates are known (from trade press), not the times. ERCOT posts 2026's around late November. ERCOT's terms let us redistribute raw data with no notice required.
- **Texas is leaving 4CP behind.** PUCT Project 58000, the rulemaking that grew out of Project 58484, published a proposal on 2026-07-09 to replace 4CP with **12CP measured on 30-minute intervals**. It also proposes a large-load minimum billing demand held for at least 20 years. Comments closed 2026-08-11. SB 6 requires adoption by 2026-12-31. The tool needs a `method` field (4CP or 12CP) and an interval length field, not just a year.
- **16 TAC §25.194 is adopted and took effect 2026-10-08.** It covers loads of 75 MW or more and sets a **$100,000 study fee** and **$50,000/MW security**. Both are CPI-adjusted every 5 years starting in 2032.
- **PJM's 2025 5CP is Verified**, with hours given as hour ending EPT. The winter peak load change under ER25-1525 applies from 2027/28. A new PJM stakeholder issue (October 2026) may change it again.
- **FERC large-load: there is no final rule.** All six show-cause dockets were paused in abeyance. Responses or §205 filings are due **2026-11-16** (SPP reportedly 2026-11-20), and answers are due 2026-12-16 (PJM Verified). PJM went live with ambient-adjusted ratings on 2026-03-04, ISO-NE goes live on 2026-11-19, and MISO has until 2028-12-31.
- **eGRID2024 is still not out from EPA.** The current edition is eGRID2023 rev2 (2025-06-12). The Zenodo eGRID2024 is a third-party copy under CC BY 4.0. The GHG Protocol location-based emission-factor ranking is quoted verbatim below. The final Scope 2 standard is slated for Q4 2028. EIA has announced no delays.

---

## 1. ERCOT 4CP intervals

Source: ERCOT report NP9-83-M, "ERCOT Four Coincident Peak Calculations" (report type 13037). It lists each year's four intervals in its column headers. Older years are in a zip on ERCOT's 4CP page. MIS files expire after 4 years, which is why 2021's file is gone.

| Year | June | July | August | September | Source file | Status |
|---|---|---|---|---|---|---|
| 2018 | 6/27 17:00 | 7/19 17:00 | 8/23 16:45 | 9/19 16:30 | zip: ...Calculation2018.xlsx | Verified |
| 2019 | 6/19 17:00 | 7/30 16:30 | 8/12 17:00 | 9/06 16:45 | zip (file marked "REVISED" per Docket 50333) | Verified |
| 2020 | 6/08 17:45 | 7/13 16:45 | 8/13 16:45 | 9/01 14:30 | zip: ...Calculation2020.xlsx | Verified |
| 2021 | 6/23 | 7/26 | 8/24 | 9/01 | Trade press citing PUCT Project 51878 item 52; no times | Unverified (times missing) |
| 2022 | 6/23 17:00 | 7/20 16:45 | 8/02 17:00 | 9/20 17:00 | MIS docID 879528147 (posted 2022-11-28) | Verified |
| 2023 | 6/27 17:00 | 7/31 17:00 | 8/10 17:00 | 9/08 16:45 | MIS docID 961277079 (posted 2023-11-27) | Verified |
| 2024 | 6/30 17:45 | 7/01 17:00 | 8/20 17:00 | 9/20 16:00 | MIS docID 1055377059 (posted 2024-11-25) | Verified |
| 2025 | 6/19 17:00 | 7/30 17:00 | 8/18 17:00 | 9/04 17:30 | MIS docID 1164129560 (posted 2025-11-24) | Verified |
| 2026 | — | — | — | — | Not posted; expect late November 2026 | Verified (absent) |

- **Time label.** ERCOT's column headers give a date and time only (for example, "6/19/2025 17:00"). ERCOT settles on 15-minute intervals labeled by interval ending, so read these as interval-ending CPT. The header itself doesn't say "ending," so the label is ERCOT practice, not stated in the file (Unverified wording).
- **Where to get them.** Use the MIS JSON list `https://www.ercot.com/misapp/servlets/IceDocListJsonWS?reportTypeId=13037`. Download with `.../misdownload/servlets/mirDownload?doclookupId=<DocID>`. The 1996–2020 history is in the zip linked from `ercot.com/mktinfo/data_agg/4cp`. ERCOT also files the report each year in a PUCT project.
- **2021 gap.** To fill it, pull PUCT Project 51878 item 52 or ask ERCOT. Ship 2021 as date-only with a flag until then.
- **Redistribution (Verified, ercot.com/help/terms §5).** "The publicly available contents of this website may be used, reproduced, and redistributed," provided they aren't modified and notices are kept. Raw data "may be used, reproduced, and redistributed" in "compilations, charts, and analyses without maintaining such notices." Content is provided "AS IS." Using the ERCOT name or logo requires permission.
- **What it means for the tool.** Store each interval with date, time, and a 15-minute duration, plus a source document ID. From 2027 the methodology may change; see section 2.

## 2. Texas SB 6: 4CP replacement and large-load interconnection

| Item | Status as of 2026-10-29 | Key numbers | Status |
|---|---|---|---|
| Project 58484 (transmission cost evaluation) | Study project only. Staff draft report 2026-03-16; revised staff memo and draft report 2026-05-04. Last filing is a public comment on 2026-09-19. | — | Verified (PUCT Interchange filing list) |
| Project 58000 (the rulemaking) | Opened 2026-05-27 (58484 item 118). Commission approved the proposal for publication on 2026-07-09. Comments were due 2026-08-11. Not adopted yet. | Amends §25.192 and §25.193; adds new §25.252 | Verified |
| Proposed method | "replace the four coincident peak (4CP) methodology with a 12 coincident peak (12CP) methodology," "codify using a 30-minute interval." 12CP intervals are each month's ERCOT system peak, October through September. ERCOT files DSP 12CP loads by December 1 each year. | 12 × 30-minute intervals | Verified (58000 items 6 and 8) |
| Large-load minimum billing demand (proposed §25.193(d)) | The greater of contracted peak demand, the highest NCP in the past year, or 12CP demand. Billing starts when service is available and lasts **no less than 20 years**. Comments were asked on phasing. | — | Verified (proposal text) |
| Statutory deadline | SB 6 requires amended rules by 2026-12-31 | — | Unverified (from 58484 staff memo via search; statute not reread) |
| 16 TAC §25.194 (Project 58481) | **Adopted.** Signed order filed 2026-09-18 (item 218). **Effective 2026-10-08.** | See next rows | Verified |
| Applicability | New or expanded loads of 75 MW or more at one site in ERCOT, not yet energized, plus co-location with generation | 75 MW | Verified |
| Study fee | "$100,000," paid by the intermediate-agreement date; unused amount refunded | $100,000; CPI-adjusted every 5 years from 2032 | Verified |
| Security | "$50,000 per MW of the requested peak demand." At the SLLIA stage, the greater of $50,000/MW of contracted peak or allocated upgrade costs | $50,000/MW; CPI-adjusted from 2032 | Verified |

**What it means for the tool.** The 4CP calculator must version by **method and interval length**, not only by year. Plan for "ERCOT 4CP (15-minute), through the 2026 measurement year" and "ERCOT 12CP (30-minute), effective date TBD once 58000 is adopted." The effective date and first measurement window are not yet known; check the 58000 adoption order, expected by December 2026.

## 3. PJM 5CP, winter peak load, and PLCs

Source: PJM, "Summer 2025 Peaks and 5CPs," revised 2025-11-14. The PDF says: "All times are listed in Hour Ending EPT," "Peak loads are unrestricted."

| Rank | Date | Hour ending (EPT) | RTO MW | Status |
|---|---|---|---|---|
| 1 | Mon 2025-06-23 | 18:00 | 160,649 | Verified |
| 2 | Tue 2025-06-24 | 18:00 | 160,629 | Verified |
| 3 | Tue 2025-07-29 | 18:00 | 156,035 | Verified |
| 4 | Wed 2025-06-25 | 15:00 | 152,903 | Verified |
| 5 | Mon 2025-07-28 | 18:00 | 151,525 | Verified |

- The same PDF gives the weather-normalized summer 2025 RTO peak as 153,870 MW, plus per-zone values at each 5CP hour (Verified).
- **ER25-1525.** FERC accepted it on 2025-05-05, for the 2027/28 Delivery Year. Winter Peak Load now uses one fixed hour (currently hour ending 9 am) across the 5 winter coincident peak days, replacing each customer's highest hour on each day. Demand resources become available 24 hours a day (Unverified; from the PJM filing and order summary via search, not reread).
- **New issue.** The 2026-10-07 Market Implementation Committee packet flags that demand-response sites were curtailed during hour ending 9 on winter 5CP days in 2025/26, so the WPL method may change before 2027/28 registration (Unverified; I saw only the PJM document titles and snippets).
- **Summer PLC method.** I found no change. PLCs are still the 5CP hours, with each utility scaling them. Per-customer PLCs are not public (Unverified, no new filing found).
- **What it means for the tool.** Store 5CP as hour ending EPT. Keep summer PLC (capacity) and winter WPL (demand-response measurement) as separate rule sets, with WPL versioned by delivery year.

## 4. NYISO and ISO-NE 2025 peak hours

| ISO | Date | Hour | MW | Which number | Status |
|---|---|---|---|---|---|
| NYISO (NYCA) | Tue 2025-06-24 | HB18, i.e., hour beginning 18:00 EDT (6–7 pm) | 31,857 | Measured net peak; 101.2% of the Gold Book 31,471 MW forecast | Verified (NYISO Summer 2025 Hot Weather Operating Conditions deck) |
| ISO-NE | Tue 2025-06-24 | Hour ending 19:00 (6–7 pm) | **26,086** | FCM peak load, used for capacity tags | Verified (ISO-NE Nov 2025 COO report) |
| ISO-NE | Tue 2025-06-24 | Hour ending 19:00 | 26,024 | Telemetered (control room) | Verified |
| ISO-NE | Tue 2025-06-24 | Hour ending 18:00 | 26,586 | RQM settlement-quality peak (different hour) | Verified |

- Both ISOs peaked in the same clock hour. ISO-NE's three published numbers fall in **different hours**, so a capacity-tag tool must use the FCM figure. ISO-NE publishes it in its "Annual System Peak Day, Hour & Load" report, with the preliminary version on 2025-10-20 (Unverified; date from trade press).
- **NYISO tags.** Transmission owners set ICAP tags from the NYCA peak hour, and the peak appears in the Gold Book. I did not find a NYISO "tag hour" notice. That 31,857 MW was the 2025 *annual* peak is an inference from it being a summer record (Unverified).
- **What it means for the tool.** Store each ISO's hour convention (NYISO hour beginning, ISO-NE and PJM hour ending) next to the value.

## 5. FERC Order 881 (ambient-adjusted ratings) and dynamic line ratings

| RTO/ISO | Current date | Basis | Status |
|---|---|---|---|
| PJM | **Live 2026-03-04** | PJM Inside Lines, 2026-03-09 | Verified (PJM page) |
| ISO-NE | Seasonal ratings due 2026-10-23. AARs due 2026-11-17 for the 2026-11-18 day-ahead run, i.e., **operating day 2026-11-19** | ISO-NE readiness page, updated 2026-10-28; FERC accepted the deferral 2025-05-30 (ER22-2357, ER25-410) | Verified |
| MISO | Date to be set, **no later than 2028-12-31** | FERC order in ER22-2363-002 granting extension; Rosner concurrence | Verified (FERC concurrence page via search snippet); order date Unverified |
| NYISO | Requested December 2028 | NYISO motion, January 2024 | Unverified whether granted |
| SPP | About September 2026 go-live reported | Trade press | Unverified |
| CAISO | Asked for 2026-12-17 (CAISO) and 2027-10-15 (its transmission owners, EDAM/WEIM) | CAISO motion, 2025-01-27, ER22-2362; tariff accepted with effective date "12/31/9998" pending notice | Request Verified; grant Unverified |

- **RM24-6, dynamic line ratings.** Only the June 2024 ANOPR exists; I found no NOPR or final rule (Unverified; FERC pages returned 403).
- **What it means for the tool.** Earlier notes had PJM at December 2028 and NYISO at April 2026, and both were wrong. Show "AAR in effect since" per RTO, with "pending" where not live.

## 6. FERC large-load interconnection (RM26-4 and the show-cause orders)

| Item | Status | Status |
|---|---|---|
| RM26-4-000 | Open, no NOPR or final rule found | Unverified (ferc.gov/rm26-4 returned 403) |
| Show-cause orders, 2026-06-18 | PJM EL26-67, SPP EL26-68, NYISO EL26-69, MISO EL26-70, CAISO EL26-71, ISO-NE EL26-72. Preliminary findings under FPA §206; responses were due within 60 days (2026-08-17) | Verified (PJM order text; ferc.gov titles) |
| Proposed large-load definition | New commercial or industrial customer, single site, "peak load of 50 MW or greater," interconnecting "at a voltage level of greater than 69 kV," not co-located. RTOs may propose their own definition | Verified (196 FERC ¶ 61,214, n.9) |
| PJM abeyance | Granted 2026-08-14. Responses due **2026-11-16**, answers 2026-12-16. A §205 filing by 11-16 suspends the response obligation | Verified (196 FERC ¶ 61,214) |
| PJM rehearing | Requests dismissed 2026-09-21 (EL26-67-001) | Verified |
| Other RTOs | ISO-NE, NYISO, and CAISO asked for 90-day abeyance. CAISO, ISO-NE, and PJM TOs target §205 filings by 11-16. NYISO targets December. SPP reportedly 11-20 | Unverified (NEPOOL counsel memos and secondary sources) |

**What it means for the tool.** No federal large-load rule exists to encode yet. Expect six regional filings from mid-November. Use the 50 MW / greater than 69 kV definition only as a labeled FERC proposal.

## 7. GHG Protocol Scope 2 revision

| Item | Value | Status |
|---|---|---|
| First consultation | 2025-10-20 to 2026-01-31 | Verified |
| Feedback summary | 2026-07-29. The independent standards board (ISB) "called for further work on multiple market-based method reporting approaches" | Verified |
| ISB direction (September 2026) | Two market-based methods. Method 1 (hourly, deliverable, incremental) after a to-be-determined date; Method 2 (2015 rules) allowed until then | Verified (ghgprotocol.org blog, 2026-10-16) |
| Next consultation | Consolidated scopes 1, 2, and 3, **Q2 2027** | Verified |
| Final standard | Joint GHG Protocol–ISO Corporate Standard, **Q4 2028**; effective dates to be determined | Verified |

**Exact draft wording** (Scope 2 Public Consultation PDF, §4.1.3, p. 12):

> Companies shall use the most precise emission factor accessible based on the following order:
> 1. Start with the most detailed geographic area for which data is accessible.
> 2. Within that area, use the most temporally granular accounting interval accessible (e.g., hourly is more precise than annual). Where only emission factors older than the reporting period are accessible, the most recent accessible annual emission factors shall be used.
> 3. Within the best time resolution, choose factors based on consumption (what electricity users receive), rather than production (what generators produce), when those are accessible and appropriate.
> 4. If the temporal granularities of the activity data and emission factors do not match, the lowest (i.e. least precise) resolution granularity shall dictate the accounting interval to use.

- **"Accessible"** (§4.1.2): "publicly available, free to use, and from a credible source (such as a government agency, system operator, or recognized registry)."
- **Spatial tiers** (§4.1.1 table): local boundary, then balancing-area subregion, then grid balancing area or ISO, then grid-wide or national. Footnote: national factors "should not be used" in multi-grid countries, including the U.S.
- The location-based proposals got "mixed" support in feedback, and the September direction says nothing about them (Verified). All of this is draft only.

**What it means for the tool.** Label hourly location-based output "consistent with the 2025 consultation draft," not "compliant." Keep the 2015 guidance as the default.

## 8. eGRID2024

| Item | Value | Status |
|---|---|---|
| EPA official | Not released. The download page lists eGRID2023 (released 2025-01-15; rev1 2025-01-17; rev2 2025-06-12) and says nothing about 2024 | Verified |
| Zenodo 18968658 | "eGRID2024," v1.0.0, 2026-03-17, Cornerstone Sustainability Data Initiative. License **CC BY 4.0**. Built by running EPA's MIT-licensed eGRID code (development branch). Cornerstone says it differs from main-branch output by 1.1% or less and claims no authorship | Verified |

**What it means for the tool.** Default to eGRID2023 rev2. Offer the Zenodo 2024 set as "unofficial, CC BY 4.0, attribute Cornerstone."

## 9. EIA delays since 2026-10-01

| Product | Latest | Next | Notice | Status |
|---|---|---|---|---|
| EIA-860 | Final 2025, 2026-09-10 | Early 2026 data, June 2027 | None | Verified |
| EIA-861 | Final 2025, 2026-10-07 | Early release, August 2027 | None | Verified |
| EIA-923 | Monthly; August 2026 data due end of October 2026 | — | None | Unverified (search snippet of EIA page) |
| EIA-930 / Hourly Electric Grid Monitor | — | — | None found on the about or electricity pages | Verified (absence) |
| Electric Power Monthly | Updated 2026-10-23 | — | None | Verified |

**What it means for the tool.** Nothing changes. Keep the stale-data banners keyed to each release date.

## 10. Large-load tariffs

| Utility | Threshold | Minimum | Term and ramp | Source | Status |
|---|---|---|---|---|---|
| AEP Ohio (PUCO 24-0508-EL-ATA, order 2025-07-09; tariff effective 2025-07-23) | 25 MW | Greater of 85% of highest billing demand in the past 11 months, or: 25–75 MW contract = 15,000 kW + 85% of the amount over 25,000 kW; over 75 MW = 57,500 kW + 100% of the amount over 75,000 kW; **capped at 85% of contract** | Ramp of at most 4 years at 50/65/80/90% of contract capacity; term = ramp + 8 years. Exit fee = 36 months of minimums, allowed only after the 5th year past the ramp | AEP Ohio tariff page (utility, not PUCO docket) | Verified (utility page); PUCO docket blocked |
| Dominion GS-5 (Va. SCC PUR-2025-00058, 2025-11-25) | 25 MW or more at a contiguous site and load factor of 75% or more | Distribution 85%, transmission 85%, **generation 60%** of contracted demand | 14 years, ramp of up to 4 years. Contract terms apply to ESAs signed on or after 2027-01-01 | SCC final order | Verified |
| Georgia Power (PSC, 2025-01-23 vote) | More than 100 MW | Minimum bills allowed (no formula published) | Contracts may run 15 years instead of 5; contracts reviewed by the PSC | PSC news release | Verified |
| Xcel Minnesota (MN PUC, 2026-05-15) | 100 MW class (per ELPC) | 80% demand charge on early exit | 15-year minimum | Advocacy groups (Fresh Energy, ELPC) | Unverified (docket not read) |
| Missouri, RSMo **§393.130.7** (SB 4, effective 2025-08-28) | 100 MW or more for utilities with more than 250,000 customers; 50 MW or more for smaller ones | The statute only requires cost-based tariffs. Tariff terms come from PSC orders: demand charge at 80%, collateral of 2 years of minimum bills | 12 years plus an optional 5-year ramp; exit notice 24 months | Statute (revisor.mo.gov); PSC fact sheet (Ameren and Evergy approved; Liberty ET-2026-0184 pending) | Verified |

- **Worked minimum-bill example.** I found no dollar example in any filing. AEP Ohio's page gives only an exit-timing example. Its tier formula, applied to a 100 MW contract, gives 57,500 + 25,000 = **82,500 kW (82.5%)**. At 200 MW the formula gives 182,500 kW, which the cap holds to **170,000 kW (85%)**. This is my arithmetic from the published formula; use it as a test case.
- **Correction to earlier notes.** The 80% / 12-year / 5-year-ramp terms for Missouri come from PSC-approved tariffs, not from §393.130.7.
- **What it means for the tool.** Version each tariff by order date and by when the contract was signed (for example, GS-5 terms apply to ESAs signed from 2027-01-01). Model AEP Ohio's minimum as a piecewise function with a cap, not as a flat 85%.

---

## Sources

- ERCOT 4CP page and 1996–2020 zip: https://www.ercot.com/mktinfo/data_agg/4cp ; https://www.ercot.com/files/docs/2022/01/13/1996-2020_FourCoincidentPeakCalculations.zip
- ERCOT NP9-83-M: https://www.ercot.com/mp/data-products/data-product-details?id=NP9-83-M ; list https://www.ercot.com/misapp/servlets/IceDocListJsonWS?reportTypeId=13037 ; file https://www.ercot.com/misdownload/servlets/mirDownload?doclookupId=1164129560
- ERCOT terms: https://www.ercot.com/help/terms
- 2021 4CP dates (trade press): http://www.energychoicematters.com/stories/20211130d.html
- PUCT 58484 filings: https://interchange.puc.texas.gov/search/filings/?UtilityType=A&ControlNumber=58484 ; item 118 https://interchange.puc.texas.gov/Documents/58484_118_1649020.PDF
- PUCT 58000 proposal: https://interchange.puc.texas.gov/Documents/58000_6_1662424.PDF ; approved text https://interchange.puc.texas.gov/Documents/58000_8_1664102.PDF ; filings https://interchange.puc.texas.gov/search/filings/?UtilityType=A&ControlNumber=58000
- §25.194 rule: https://ftp.puc.texas.gov/public/puct-info/agency/rulesnlaws/subrules/electric/25.194/25.194.pdf ; order https://interchange.puc.texas.gov/Documents/58481_218_1684654.PDF
- PJM summer 2025 5CP: https://www.pjm.com/-/media/DotCom/planning/res-adeq/load-forecast/summer-2025-peaks-and-5cps.pdf
- PJM ER25-1525 filing: https://www.pjm.com/pjmfiles/directory/etariff/FercDockets/8762/20250306-er25-1525-000.pdf ; MIC 2026-10-07 WPL problem statement: https://www.pjm.com/-/media/DotCom/committees-groups/committees/mic/2026/20261007/20261007-item-05-1---winter-peak-load-calculation---problem-statement.pdf
- NYISO summer 2025: https://www.nyiso.com/documents/20142/54426374/05_Summer%202025%20NYISO%20Hot%20Weather%20Operating%20Conditions%20OC.pdf
- ISO-NE Nov 2025 COO report: https://www.iso-ne.com/static-assets/documents/100029/nov-2025-coo-report.pdf
- ISO-NE Order 881 page: https://www.iso-ne.com/participate/support/participant-readiness-outlook/ferc-order-no-881-mtlr
- PJM AAR go-live: https://insidelines.pjm.com/pjm-becomes-first-rto-to-implement-ambient-air-ratings-for-transmission-under-ferc-order-881/
- MISO extension concurrence: https://ferc.gov/news-events/news/commissioner-rosners-concurrence-order-granting-extension-time-re-miso-inc-under
- CAISO motion: https://www.caiso.com/documents/jan-27-2025-motion-for-extension-of-time-ferc-order-no-881-er22-2362.pdf
- NYISO request (trade press): https://www.rtoinsider.com/69986-nyiso-asks-ferc-extension-order-881/
- FERC show-cause press release: https://www.ferc.gov/news-events/news/ferc-launches-aggressive-targeted-action-speed-large-load-integration ; RM26-4: https://www.ferc.gov/rm26-4
- PJM EL26-67-001 order: https://www.pjm.com/-/media/DotCom/documents/ferc/orders/2026/20260921-el26-67-001.pdf
- NEPOOL counsel abeyance memo: https://www.iso-ne.com/static-assets/documents/100038/nepool_counsel_memo_motion_for_abeyance.pdf
- GHG Protocol Scope 2 draft: https://ghgprotocol.org/sites/default/files/2025-10/GHG-Protocol-Scope2-Public-Consultation.pdf ; feedback summary https://ghgprotocol.org/sites/default/files/2026-07/S2-ExecutiveSummary-PublicConsultation%20ummaryofFeedback-2026.07.29.pdf ; status https://ghgprotocol.org/blog/scope-2-market-based-method-update-2025-2026-public-consultation-current-status
- eGRID: https://www.epa.gov/egrid/download-data ; Zenodo https://zenodo.org/records/18968658
- EIA: https://www.eia.gov/electricity/data/eia860/ ; https://www.eia.gov/electricity/data/eia861/ ; https://www.eia.gov/electricity/gridmonitor/about ; https://www.eia.gov/electricity/
- AEP Ohio tariff: https://www.aepohio.com/company/about/rates/data-center-tariff
- Va. SCC GS-5 order (copy of SCC final order): https://npr.brightspotcdn.com/b6/ac/706130b64d2b8eee6a9832b97e48/20251125-virginiascc-dominionenergyruling.pdf
- Georgia PSC release: https://psc.ga.gov/site/assets/files/8617/media_advisory_data_centers_rule_1-23-2025.pdf
- Xcel MN (advocacy): https://fresh-energy.org/regulatory-update-commission-approves-xcel-energys-large-load-tariff ; https://elpc.org/news/final-order-encourages-affordable-clean-energy-for-minnesotans/
- Missouri statute: https://revisor.mo.gov/main/OneSection.aspx?section=393.130 ; PSC fact sheet https://psc.mo.gov/CMSInternetData/Community%20Outreach/Large%20Load%20Tariff%20Fact%20Sheet.pdf

## Scheduled rechecks

Written by `pipeline/rule-watch.mjs` each week. Each source is compared with what the previous check saw; a moved, dead, or changed source flags its item for rereading. Nothing here is a finding until a person rereads it.

- **2026-11-14.** 44 sources for 27 items checked. 2 items whose source moved: 2021 4CP dates (trade press); eGRID. 3 refused an automated reader and keep their last reading: MISO extension concurrence; FERC show-cause press release; GHG Protocol Scope 2 draft. Reread the flagged items before stating them at the next phase gate.
