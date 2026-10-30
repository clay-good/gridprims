# 11: Reliability metrics (IEEE 1366, EIA-861, major event days)

Checked 2026-10-29. **Verified** means I opened the primary source today (agency form, regulation text, live data file) and read or recomputed the item. **Unverified** means it came from trade press, a vendor, a secondary slide deck I could not cross-check, or a page I could not open. IEEE 1366 text is paywalled and is **not** quoted anywhere below; every formula here is taken from a free source that restates it.

## Bottom line

- **IEEE 1366-2022 is current** (approved 2022-09-21, supersedes 1366-2012), ~$74-$147 from IEEE/resellers. We do **not** need it. Every index we want to ship is restated, with formula, in at least one free citable source: the **EIA-861 instructions** (public domain, SAIDI/SAIFI only), **New Mexico 17.9.589 NMAC** (state regulation, SAIDI/SAIFI/CAIDI/ASAI/CELID/feeder SAIFI), **16 TAC § 25.52** (SAIDI/SAIFI, sustained vs momentary), and a free **IEEE PES Boston chapter tutorial deck** (all 12 indices plus a worked TMED example).
- **The free source for the major-event-day method is the IEEE Boston deck** (`site.ieee.org/boston-pes/files/2019/03/IEEE-1366-Reliability-Indices-2-2019.pdf`, John Teixeira, National Grid, 2019-02-19). It states every step: daily SAIDI, **days with no interruptions are excluded**, `ln(SAIDI/day)`, α = mean, β = stdev, `TMED = exp(α + 2.5β)`, five years of data, threshold applied to the *following* year. Backup source: **CEA's Major Event Day Determination Reference Guide** (2015, free PDF) which adds the design intent (2.5 chosen so P(exceed) = 0.000621 ≈ 2.3 days/yr).
- **EIA-861 does not define the MED method itself** and does not collect CAIDI or MAIFI. It accepts only **1366-2003 or 1366-2012**, takes SAIDI/SAIFI in three variants (all events / without MEDs / loss-of-supply removed), and defines a sustained interruption as **over 5 minutes**. CAIDI in EIA's published tables is derived as SAIDI ÷ SAIFI.
- **Test vectors exist and I verified the arithmetic.** The IEEE Boston deck gives two full SAIFI/SAIDI/CAIDI worked examples and a real 2011 daily table where CMI÷CS and ln(SAIDI) both reproduce exactly. CEA gives two TMED vectors; one (α=-2.86, β=1.31 → 1.51) reproduces exactly, two others are off by rounding. Flag the near-misses rather than hard-asserting them.
- **Benchmarking by ownership type is the defensible EIA-861 cut, and it is dramatic.** Computed today from `Reliability_2025.xlsx`: median SAIDI is **57.9 min** for municipals, **204.7** for investor-owned, **232.4** for cooperatives. Comparing a co-op to the 262.6-minute national average is close to meaningless; comparing it to the co-op median is defensible.
- **Ship the calculator, not another dashboard.** The highest-value outputs: (1) IEEE-1366 index set from an uploaded OMS CSV with the MED split shown both ways, (2) a TMED worksheet that shows α, β, and every day it classified, (3) a peer-cohort percentile card for any utility using ownership + size + state from EIA-861. Nothing uploaded leaves the browser, which is also the CEII answer.

---

## 1. IEEE 1366 indices: formulas and the free-source question

**Edition.** IEEE 1366-2022, *IEEE Guide for Electric Power Distribution Reliability Indices*, board approval 2022-09-21, supersedes 1366-2012 (itself superseding 1366-2003). Listed as an Active Standard. Price: IEEE member/non-member tiers; resellers quote **$74-$147 USD**; SIS (Sweden) quotes ~1,094 SEK. Page count differs between resellers (44 vs 63). *Verified* (IEEE standards listing + resellers). Redistribution of the text is not permitted.

Notation used below: **CS** = customers served, **CI** = customers interrupted (summed per event), **CMI** = customer-minutes interrupted, **N** = number of sustained interruptions.

| Index | Formula | Denominator | Free source |
|---|---|---|---|
| SAIFI | ΣCI / CS | customers **served** | EIA-861 instructions; 16 TAC 25.52; NMAC; deck |
| SAIDI | ΣCMI / CS | customers **served** | EIA-861 instructions; 16 TAC 25.52; NMAC; deck |
| CAIDI | ΣCMI / ΣCI = SAIDI / SAIFI | customers **interrupted** (event-weighted) | NMAC 17.9.589; deck |
| CAIFI | ΣCI / (distinct customers interrupted) | **distinct** customers interrupted | deck |
| CTAIDI | ΣCMI / (distinct customers interrupted) | **distinct** customers interrupted | deck |
| ASAI | (customer hours service available) / (customer hours service demand) | customer-hours demanded | NMAC; deck |
| MAIFI | Σ(customers experiencing momentary interruptions) / CS | customers **served** | APPA report; deck |
| MAIFI_E | as MAIFI but counts momentary **events**, excluding momentaries that belong to a sustained interruption | customers **served** | deck (definition only, no formula) |
| CEMI_n | (customers with **n or more** sustained interruptions) / CS | customers **served**; a **percent** | deck |
| CELID_s | (customers with **s or more** hours of interruption) / CS | customers **served**; a **percent** | deck; NMAC (CELID-12, CELID-24) |
| ASIFI | (connected kVA interrupted) / (connected kVA served) | **kVA served** | deck |
| ASIDI | (connected kVA-minutes interrupted) / (connected kVA served) | **kVA served** | deck |

Notes. *Verified* against the two free sources named per row.
- **CELID has two flavors** and they are not interchangeable: duration of a *single* interruption, or a customer's *total* interruption time in the period. NMAC states both. Our UI must make the user pick.
- **ASAI identity.** The deck's own table: ASAI 0.99 → 87.6 SAIDI-hours → 5,256 min; 0.999 → 8.8 h → 526 min; 0.9999 → 0.9 h → 53 min, on 8,760 annual hours. So `ASAI = 1 - SAIDI_minutes / (60 × 8760)`. *Verified* (recomputed: 8760×60×0.01 = 5,256 ✓).
- **CEMI/CELID need per-customer records, not per-event totals.** Most small-utility OMS exports give customers-affected counts per event, not customer IDs. CEMI_n is therefore **not computable** from a typical export. Say so rather than approximating.
- **"Not official" trap.** CPUC flags AIDI/AIFI as labels that are *not* IEEE 1366 metrics. Utilities invent local variants; the tool should refuse to silently map them.

---

## 2. EIA-861 instructions as the free citable source

Source: **Form EIA-861, Annual Electric Power Industry Report**, instructions PDF, `https://www.eia.gov/survey/form/eia_861/instructions.pdf`. OMB No. 1905-0129, expiration **2029-07-31**, burden 13.39 hours. Mandatory under 15 U.S.C. § 772(b). Due **April 30** following the calendar year. *Verified* (extracted the text today).

Work of the U.S. Government, so the instruction text and the published data files are **public domain** (no copyright under 17 U.S.C. § 105). *Verified by legal status, not by an explicit EIA license statement.*

| Item | What the instructions actually say | Status |
|---|---|---|
| Schedule | Schedule 3: Part A gating questions, **Part B = IEEE method**, **Part C = other method** | Verified |
| Allowed editions | "in accordance with the **IEEE 1366-2003 or IEEE 1366-2012** standard." 1366-2022 is **not** named | Verified |
| SAIFI | "[Sum of total number of customers interrupted over the year] / [Total number of customers served]" | Verified (quoted) |
| SAIDI | "[Sum of customer minutes interrupted over the year] / [Total number of customers served]" | Verified (quoted) |
| Sustained | "an interruption of more than 5 minutes" | Verified |
| CAIDI / MAIFI | **Zero mentions** in the instructions. Not collected | Verified |
| Variants | Lines 3-6: SAIDI and SAIFI, each **including** and **excluding** Major Event Days, plus **"Including MEDs but Excluding events initiated by a loss of supply from the high-voltage system"** | Verified |
| MED method | **Not described.** The instructions only require conformance to 1366; no TMED formula appears | Verified |
| Customer definition | "a metered electrical service point for which an active bill account is established at a specific location (e.g., premise). (IEEE 1366-2003 pg. 2)" | Verified (quoted) |
| Momentary | Part C line 14 only: utility states its own momentary cutoff. "Momentary outages are not included in determining SAIDI and SAIFI" | Verified |
| Threshold / who reports | **No size threshold for reliability.** EIA-861 is required of electric power industry entities generally; filers of the short form **EIA-861S do not report reliability at all** | Verified (861 instructions) / Unverified (861S exclusion is from secondary sources) |
| Other fields | Number of customers used, inactive accounts included Y/N, highest distribution voltage, whether an OMS records outages automatically | Verified |

**Published tables.** `eia.gov/electricity/annual/html/epa_11_01.html` (U.S. totals 2015-2025) and `epa_11_03.html` (by census division and state). Footnotes: "IEEE" = 1366-2003 or 1366-2012; "Any Method" merges IEEE and non-IEEE filers; MEDs for IEEE filers are days exceeding **Tmed**, "a duration statistic calculated from daily SAIDI values from the past five years"; for non-IEEE filers "Major Events" are **self-determined by the reporting utility**. *Verified.*

---

## 3. Major Event Day and the 2.5 beta method

**Procedure, as stated in the free IEEE PES Boston deck** (slides 75-90). *Verified* against the deck; cross-checked against CEA 2015 and SCE's CPUC filings.

1. Collect **daily SAIDI** for **five years** (the deck: "Typically use 5 years worth of data"). Daily SAIDI = CMI that day ÷ CS that day.
2. **Days with no interruptions are excluded.** The deck states this explicitly; its sample table contains only days with activity. (ln(0) is undefined, so this is both the rule and the arithmetic necessity.)
3. Compute `ln(SAIDI_day)` for each remaining day.
4. **α** = arithmetic mean of the ln values. **β** = standard deviation of the ln values.
5. **TMED = exp(α + 2.5β)**, in minutes.
6. Any day in the **following** year whose daily SAIDI **exceeds** TMED is a Major Event Day. "For 2019, calculate TMED using 2014-2018 data." Recompute annually.
7. Report indices **with** and **without** MED days.

**Design intent (CEA 2015, free PDF).** "The IEEE Working Group used a Gaussian (or normal) distribution... They chose the 2.5 multiplier so that the probability of exceeding T was **0.000621, or 2.3 days/year**." *Verified (quoted from CEA).*

**Open points we must disclose, not paper over.**

| Question | Finding | Status |
|---|---|---|
| Minimum number of days | Neither the deck nor CEA states a minimum. **APPA's variant** requires **at least 36 outage events** before any threshold is computed, else no exclusion is applied | Verified (APPA sample report); the 1366 minimum itself is **Unverified** |
| Fewer than 5 years available | Not addressed in any free source I found. SCE, CEA and the deck all assume 5 | Unverified |
| Multi-day events | NMAC: an interruption spanning calendar days is credited to **the day it began**. CEA: "events that run over the end of day create inaccuracies"; its proposed fix is a **two-day rolling SAIDI** | Verified (NMAC, CEA) |
| Catastrophic continuation | A Montana NWE filing uses a **0.2 × TMED** continuation threshold for multi-day CAT events | Unverified (could not open the PSC PDF: certificate error) |
| Log-normality | CEA: "If the data is not log-normal, the IEEE 2.5β method is not advisable," and small utilities' data generally will not pass a normality test. One CEA example utility got **zero** MEDs in a year where 2.3 were expected | Verified (CEA) |
| Known failure mode | A huge catastrophic day inflates TMED for the following five years, producing a step change in reported reliability. South Australia proposed a 3.7 multiplier instead | Unverified (AER filings; page timed out) |
| Alternatives | LBNL: "none of the alternatives perform uniformly better than the current Standard 1366 method" | Unverified (abstract only; PDF would not parse) |

**Implication for gridprims:** a small co-op with a few dozen outage days per year is exactly the case CEA warns about. Our TMED tool must show the number of qualifying days, α, β, the computed TMED, and a normality caveat, and it must refuse to compute below a stated day count.

---

## 4. What an outage log looks like, and what states require

**Fields present in real OMS exports.** Oracle NMS trouble-report export (vendor docs, the only field list I could read verbatim): **Substation, Feeder, Device Name, Event #, CI (customers interrupted), Begin Date Time, Restore Date Time**. Milsoft OMS brochure lists start time, customers affected, customers restored, feeder, transformer, cause code; whether those are export columns or only on-screen is **Unverified**. **No NISC, SEDC, or Futura export schema is published publicly** — I found none. *Verified for Oracle; Unverified for the rest.*

**Minimum viable import schema for our tool** (superset of what every system above emits):
`start_datetime, restore_datetime, customers_affected, cause_code, device_id, feeder_id` plus an optional `customers_served` either per row or as a single system figure. Partial restoration must be supported as **multiple rows per event** — the RUS and Oracle material both flag that a protective device can reclose while downstream customers stay out, and ignoring it understates CMI.

**Cause codes.** USDA RUS Bulletin **1730A-119** (public domain) separates **cause codes** (initiating condition: decay, animals, lightning, tree limbs) from **equipment codes** (what failed). *Verified.* **IEEE 1782-2022** is the interruption-cause-code standard and is paywalled; NMAC incorporates it by reference. Do not ship a cause taxonomy claiming 1782 conformance.

| State | Rule | Indices required | Thresholds / notable mechanics |
|---|---|---|---|
| Pennsylvania | 52 Pa. Code §§ 57.191-57.198 | **SAIFI, CAIDI, SAIDI**; MAIFI "if available" | Annual report due **Apr 30**; quarterly **rolling 12-month** indices (May 1 / Aug 1 / Nov 1 / Feb 1); **worst 5% of circuits** tracked; 5-year record retention; benchmarks set by order at Docket M-00991220. **Major event = beyond EDC control affecting ≥10% of customers** with interruptions ≥5 min — *not* the 1366 TMED method |
| Texas | 16 TAC § 25.52 (with § 25.81 reports) | **SAIDI, SAIFI** (rule defines no CAIDI or MAIFI) | System SAIDI and SAIFI may not exceed the utility's own standard by more than **5.0%**, standard based on its 1998-2000 average. **No feeder with ≥10 customers** may exceed **300%** of the all-feeder average in **two consecutive** years. **Major event = ≥10% of customers in a region over 24 hours** with incomplete restoration in 24 h. Momentary = "single operation of an interrupting device which results in a voltage zero and the immediate restoration of voltage" |
| New Mexico | 17.9.589 NMAC | **SAIDI, SAIFI, CAIDI, ASAI, feeder SAIFI, CELID-12, CELID-24**; MAIFI conditionally | Incorporates **IEEE 1366-2022** and **IEEE 1782-2022**. MAIFI only if the tech is installed and ≥6 months of data covers **80%** of the system. Worst-performing feeder = feeder SAIDI or SAIFI **≥ system value + 300%**, ≥10 customers, flagged **two consecutive years**. Report due **Mar 15**. Multi-day interruption credited to the day it began |
| Minnesota | Minn. R. 7826.0500 (reporting), 7826.0600 (standards) | **SAIDI, SAIFI, CAIDI** by **work center** | Annual report **Apr 1**; standards set per utility per work center by Commission order, benchmarked to a **five-year average** |
| California | CPUC GO 166 / annual reliability reports | SAIDI, SAIFI, MAIFI, CAIDI | Reported **with and without MEDs**; TMED per 1366. SCE's 2015 TMED was **1.736**, computed from the prior 5 years of ln(daily SAIDI) and recomputed annually |

*Verified:* PA (pacodeandbulletin.gov), TX (Cornell LII copy of the rule), NM (srca.nm.gov NMAC). *Unverified:* MN (I read only 2003-2014 rule versions via search, not the current text), CA (CPUC presentation and SCE filings, not GO 166 itself).

Pattern worth surfacing to users: **state major-event definitions mostly are not the 1366 TMED method.** PA and TX both use a fixed 10%-of-customers trigger. A utility's state-filed SAIDI and its EIA-861 SAIDI can legitimately differ.

---

## 5. Benchmarking

**National and division, 2025 (EIA, all events, with major events).** *Verified* from `epa_11_01` / `epa_11_03`.

| Area | SAIDI (min/yr) | SAIFI (/yr) | CAIDI (min) |
|---|---|---|---|
| **U.S. total, all events** | **262.6** | **1.338** | **196.3** |
| U.S. total, without major events | 120.8 | 1.053 | 114.7 |
| U.S., IEEE filers only, all events | 246.8 | 1.226 | 201.2 |
| New England | 186.5 | 1.164 | 160.2 |
| East South Central | 353.2 | 1.938 | 182.2 |
| Mountain | 171.6 | 1.105 | 155.3 |
| Pacific Noncontiguous | 378.8 | 2.464 | 153.7 |
| California / Texas / New York / Florida | 344.6 / 223.5 / 122.0 / 70.5 | 1.282 / 1.704 / 0.796 / 0.858 | 268.9 / 131.2 / 153.3 / 82.2 |

**Medians by ownership type, 2025 — computed by me today** from `Reliability_2025.xlsx` (IEEE SAIDI where present, else Other-method SAIDI). *Verified by recomputation; reproducible.*

| Ownership | n reporting | Median SAIDI | Median SAIFI |
|---|---|---|---|
| Cooperative | 465 | 232.4 | 1.94 |
| Municipal | 279 | 57.9 | 0.69 |
| Investor Owned | 171 | 204.7 | 1.36 |
| Political Subdivision | 40 | 163.6 | 0.92 |
| State | 8 | 88.9 | 0.74 |

**Coverage of the 2025 file:** 977 utility-state rows; **752** report SAIDI under an IEEE method, **213** under "other", the rest blank. EIA's `epa_11_03` carries a **"Percent of Customers Reported"** column (reliability-schedule meters ÷ sales-schedule customers) that **can exceed 100%** — that column is the honest coverage-gap disclosure and we should surface it per state. *Verified.*

**APPA eReliability Tracker**, now branded **PowerTRX Reliability**. Subscription service for public power utilities; APPA lists subscriptions **from $325/yr** for members (an older mailer showed $27/mo member / $35/mo non-member); some joint-action agencies (e.g. AMP) buy it for all members. Subscribers get an annual benchmarking report and can earn a Certificate of Excellence in Reliability (239 utilities recognized for 2025). *Verified for the service; pricing **Unverified** — APPA's own pages disagree.*

APPA publishes a **free sample report** (`Test Utility - 2023 Annual Reliability Benchmarking Report`) that is a usable free peer comparison and documents its own method. *Verified.* It computes SAIDI, SAIFI, CAIDI, MAIFI, ASAI; groups by **region** and by **five size classes** of ~114 utilities each (2023: class boundaries at 1,518 / 3,487 / 7,368 / 14,588 / 503,649 customers); weights each utility equally per customer; drops log-normal outliers above z = 3.25. Critically, its major-event threshold is **not** IEEE's: it is **event-based rather than daily-SAIDI-based**, uses up to **10 years** of history, and returns null below **36 prior events**.

2023 aggregates across 323 verified utilities, useful as a public-power yardstick: SAIDI mean 89.18 (median 50.84, Q1 18.18, Q3 111.36, max 1,028.99); no-MED mean 47.1. SAIFI mean 0.74 (median 0.56); no-MED 0.52. CAIDI mean 111.74 (median 89.06). MAIFI mean 0.41 (median 0.06, Q1 0 — many utilities simply do not log momentaries). *Verified.*

**Defensible peer comparison using only EIA-861.** Cohort on three axes, in this order of importance: **(1) ownership type** (the ownership table above shows a 4× spread in median SAIDI — this is the single biggest confounder), **(2) customer-count size class**, borrowing APPA's quintile approach but computed over EIA's own rows, **(3) state or census division**. Then report a **percentile rank within cohort**, not a ratio to a national average. Two mandatory guardrails: never compare an "all events" figure to a "without MEDs" figure, and never compare an IEEE filer to an "Other method" filer without labeling it, because "Other" major events are self-declared.

---

## 6. Independent test vectors

| # | Source | Vector | Reproduces? |
|---|---|---|---|
| 1 | IEEE Boston deck, slide 41 | CS 1,525; CI 3,075; CMI 242,975 → SAIFI **2.02**, SAIDI **159**, CAIDI **79** | **Yes.** 3075/1525 = 2.0164; 242975/1525 = 159.3; 242975/3075 = 79.02; SAIDI/SAIFI = 159/2.02 = 78.7 ✓ |
| 2 | IEEE Boston deck, slide 44 | 4 feeders: CS 6,525; CI 7,150; CMI 427,975 → SAIFI **1.10**, SAIDI **66**, CAIDI **60** | **Yes.** 7150/6525 = 1.0958; 427975/6525 = 65.59; 427975/7150 = 59.86 ✓ |
| 3 | IEEE Boston deck, slide 89 ("An Actual Dataset", 2011) | Per-day rows of Events, CI, CMI, CS, SAIDI, ln(SAIDI). E.g. 1/12/2011: CMI 20,198, CS 12,496 → SAIDI 1.6164, ln = 0.4802. 2/25/2011: 86 / 12,517 → 0.0069, ln = -4.9805 | **Yes, exactly.** 20198/12496 = 1.61636; ln = 0.48025. 86/12517 = 0.0068707; ln = -4.98052 ✓ **Best single regression fixture we have** |
| 4 | IEEE Boston deck, slide 86 | α = -0.557, β = 1.91 → **TMED = 66.7 min** | **No, off by 1.7%.** exp(-0.557 + 4.775) = **67.87**. Back-solving 66.7 needs α = -0.5749. The stated α/β are rounded. Use as a tolerance check (±2%), not an exact assertion |
| 5 | CEA 2015, p.10 (urban centre, 35,741 outages 2010-2014) | mean = -2.86, sd = 1.31 → threshold **1.51**; 2 MED days in 2014 | **Yes, exactly.** exp(-2.86 + 3.275) = 1.5144 ✓ |
| 6 | CEA 2015, p.9 (province-wide, 321,285 outages) | mean = -1.31, sd = 1.08 → threshold **4.04**; 8 days > threshold in 2014 (15 in 2013) | **Close.** exp(-1.31 + 2.70) = 4.0149 vs 4.04 stated (0.6% off, rounding) |
| 7 | CEA 2015, Table 1.0 | IEEE 2.5β: α = -1.98, β = 1.55 → TMED **6.23**, 7 MEDs. Modified: α = -3.30, β = 1.94 → **6.70**, 11 MEDs | **No.** exp(-1.98 + 3.875) = **6.65**, not 6.23; exp(-3.30 + 4.85) = **4.71**, not 6.70. **Do not use.** The table appears to mix units or report an un-shown intermediate |
| 8 | IEEE Boston deck, slides 67-69 | ASAI 0.99 / 0.999 / 0.9999 → 8,672 / 8,751 / 8,759 available hours; SAIDI 87.6 / 8.8 / 0.9 hours = 5,256 / 526 / 53 min | **Yes.** 8760 × 0.01 × 60 = 5,256 ✓ |
| 9 | APPA free sample report | Full 2023 aggregate/quartile tables for SAIDI, SAIFI, CAIDI, MAIFI, ASAI | Usable as a **comparison fixture**, not an arithmetic one (inputs not published) |

**Licenses.** Vectors 1-4 and 8: IEEE PES Boston Section chapter presentation, no license stated — presumed author copyright. **Cite and link; recompute from the inputs; do not reproduce the slides.** Vectors 5-7: Canadian Electricity Association, copyright CEA, no license stated — same treatment. Vector 9: APPA, copyright APPA. The EIA tables and the EIA-861 data files are **public domain** and are the only material here we can redistribute. The safe pattern is: our fixtures hold the **numeric inputs and our own computed outputs**, with a citation line pointing at the source for the reader to check.

**Unverified / dead ends.** The IEEE 1366-2022 annex examples (paywalled; a copy is filed as a public exhibit in an Indiana URC docket, which we should not rely on as a license). The LBNL/escholarship MED-evaluation paper (PDF would not parse; abstract only). AER's Major Event Day threshold workbook (page timed out; reportedly contains a worked 2.5β spreadsheet). Montana PSC's NWE reliability reports (TLS certificate error from here).

---

## 7. Related free data

| Source | Status today | Format / license |
|---|---|---|
| **EIA-861 reliability file** | **Reachable.** `eia.gov/electricity/data/eia861/zip/f8612025.zip` (4.76 MB) and `f8612024.zip` (4.57 MB) both HTTP 200. 2025 zip contains **`Reliability_2025.xlsx`** (203 KB, 977 utility-state rows) and `Utility_Data_2025.xlsx` | XLSX, **public domain**. *Verified* |
| Reliability file columns | Three-row banner header, then: Data Year, Utility Number, Utility Name, State, Ownership; **IEEE block** = SAIDI/SAIFI/CAIDI × {All Events, Without MEDs, Loss of Supply Removed}, Number of Customers, Highest Dist. Voltage, Outages Recorded Automatically; **Other block** = SAIDI/SAIFI/CAIDI × {All Events, Without MEDs}, Number of Customers, Inactive Accounts Included, Momentary Interruptions, Highest Dist. Voltage, Outages Recorded Automatically | *Verified by parsing the file.* Parser must skip 3 header rows and treat `.` as null |
| **Coverage gaps** | 977 rows for 2025: **752 IEEE**, **213 other**, remainder blank. No CAIDI or MAIFI collected (CAIDI in the file is derived). Ownership classes: Cooperative, Municipal, Investor Owned, Political Subdivision, State. EIA's "Percent of Customers Reported" can exceed 100% | *Verified* |
| **DOE / OE-417 electric disturbance events** | **Not reachable from here.** `www.oe.netl.doe.gov` resolves **IPv6-only** (2620:111:a002:153::10:75) with **no A record**; IPv4 fetch returns nothing, IPv6 connection refused. Annual summaries reportedly back to **2000** in **PDF and Excel** (no official CSV). `doe417.pnnl.gov` **is** up (HTTP 200) and serves the form PDF; OMB approval expires **2027-05-31** | PDF/XLSX, **public domain**. **Unverified** (could not open the data pages). Treat OE-417 as a nice-to-have, behind a reachability check |
| **EAGLE-I** | **Reachable** (`eagle-i.doe.gov`, HTTP 200). Already covered in `docs/research/08-license-verification.md` — see that doc for terms | Verified reachable only |
| USDA RUS Bulletin 1730A-119 | Reachable | PDF, **public domain**. Cause-code vs equipment-code taxonomy |
| APPA sample benchmarking report | Reachable | PDF, APPA copyright. Link, don't mirror |

---

## Recommended for gridprims

**(a) For a utility engineer with an outage log** — all computation client-side, file never leaves the browser.

1. **IEEE 1366 index calculator.** Upload a CSV of outage events → SAIFI, SAIDI, CAIDI, CTAIDI, CAIFI, ASAI, and ASIFI/ASIDI when kVA is present. Show the sustained cutoff (default >5 min, editable) and the exact CI/CMI/CS it used, so the engineer can tie the number back to their OMS. Grey out CEMI_n and CELID with a plain reason: "needs per-customer records; your file has per-event counts."
2. **TMED worksheet.** Daily SAIDI table → excluded zero days, qualifying day count, α, β, **TMED = exp(α + 2.5β)**, and a day-by-day MED flag list. Refuse below a stated minimum day count and show a log-normality warning with the CEA citation. Let the user paste a regulator-supplied TMED instead of computing one.
3. **Both-ways index card.** The same indices with MEDs included and excluded, side by side, plus the delta — because that pair is exactly what EIA-861 Schedule 3 lines 3-6 asks for.
4. **EIA-861 Schedule 3 pre-fill sheet.** Map the computed values onto the actual line numbers (3, 4, 5, 6, 7, 8, 9) with the instruction text quoted beside each. This turns an annual chore into a five-minute task and is the single most concrete value we can hand a co-op.
5. **Worst-performing feeder screen.** Feeder SAIDI and SAIFI vs system average, with the **+300% / ≥10 customers / two consecutive years** test from TX 25.52 and NM 17.9.589 shown as a rule the user picks.
6. **Partial-restoration linter.** Flag events whose customers-affected never steps down, overlapping rows on one device, restores before starts, and durations crossing midnight — the four errors that silently wreck CMI.

**(b) For a resident, reporter, or city council member with only EIA-861.**

7. **Peer-cohort percentile card.** "Your utility's SAIDI is 232 minutes — the median cooperative is 232.4 and the median municipal is 57.9." Cohort by ownership → size class → state, show percentile and cohort size, and refuse the comparison when the cohort is too small.
8. **"Why the two numbers differ" explainer.** With and without major event days, on the utility's own figures, with the national 262.6 / 120.8 pair as context and a one-line statement of what a major event day is.
9. **Method and coverage badge.** IEEE filer vs "Other method" (self-declared major events), percent of customers reported, whether outages are recorded automatically, and whether inactive accounts are counted. Four facts that decide whether the headline number means anything.

**CEII and privacy flags.**

- **Feeder and device identifiers plus outage history, in aggregate, approach CEII** (FERC, 18 CFR 388.113: information about critical infrastructure useful to someone planning an attack). Our design answer is structural, not procedural: **nothing is uploaded**, so we never hold it. Do not add a "share this analysis" or "save my log" feature, and do not let a feeder-level result be put in a URL.
- **Small-count outputs can identify a customer.** Any index computed on a feeder or event with a handful of customers, and especially CEMI/CELID per-customer work, can single out a household — a medical-baseline or life-support customer most of all. Suppress or warn below a small-n floor.
- **Do not build critical-customer tagging.** A list of hospitals, water plants, and cell sites by feeder is the most sensitive artifact in this space, and it has no place in a public tool.
- **EIA-861 and the EIA tables are public domain and carry no such risk** — the resident-facing tools (7-9) are safe by construction.

---

## Sources

1. IEEE, *IEEE 1366-2022 Guide for Electric Power Distribution Reliability Indices* (listing) — https://standards.ieee.org/ieee/1366/7243 — **Verified** (metadata only; text paywalled, $74-$147)
2. EIA, Form EIA-861 instructions PDF — https://www.eia.gov/survey/form/eia_861/instructions.pdf — **Verified** (text extracted 2026-10-29)
3. EIA, Electric Power Annual Table 11.1 (U.S. reliability, 2015-2025) — https://www.eia.gov/electricity/annual/html/epa_11_01.html — **Verified**
4. EIA, Electric Power Annual Table 11.3 (by state and census division) — https://www.eia.gov/electricity/annual/table.php?t=epa_11_03.html — **Verified**
5. EIA, Form EIA-861 2025 data zip (`Reliability_2025.xlsx`) — https://www.eia.gov/electricity/data/eia861/zip/f8612025.zip — **Verified** (downloaded and parsed)
6. J. Teixeira (National Grid), *IEEE 1366 — Reliability Indices*, IEEE Boston Section PES, 2019-02-19 — https://site.ieee.org/boston-pes/files/2019/03/IEEE-1366-Reliability-Indices-2-2019.pdf — **Verified** (all formulas, TMED steps, worked examples)
7. Canadian Electricity Association, *Major Event Day Determination Reference Guide*, 2015 — https://www.electricity.ca/files/reports/english/MED-Methods_CEA_2015.pdf — **Verified**
8. New Mexico, 17.9.589 NMAC, Reliability Metrics Reporting — https://www.srca.nm.gov/nmac/nmregister/xxxv/17.9.589.html — **Verified**
9. 16 Tex. Admin. Code § 25.52, Reliability and Continuity of Service (Cornell LII) — https://www.law.cornell.edu/regulations/texas/16-Tex-Admin-Code-SS-25-52 — **Verified**
10. 52 Pa. Code Subchapter N, Electric Reliability Standards — https://www.pacodeandbulletin.gov/Display/pacode?file=/secure/pacode/data/052/chapter57/subchapNtoc.html — **Verified**
11. Minn. R. 7826.0500 / 7826.0600 — https://www.revisor.mn.gov/rules/7826/version/2021/full — **Unverified** (read via search summaries of 2003-2014 versions)
12. CPUC, Electric System Reliability Annual Reports — https://www.cpuc.ca.gov/industries-and-topics/electrical-energy/infrastructure/electric-reliability/electric-system-reliability-annual-reports — **Unverified**
13. SCE, 2015 Annual Reliability Report (TMED = 1.736) — https://files.cpuc.ca.gov/egy_Reliability_GO165Reports/ReliabilityRpts/2015/SCE_2015_%20Annual_Reliability_Report.pdf — **Unverified**
14. APPA, *Test Utility — 2023 Annual Reliability Benchmarking Report* (free sample) — https://www.publicpower.org/system/files/documents/Test%20Utility%20-%202023%20Annual%20Reliability%20Benchmarking%20Report.pdf — **Verified**
15. APPA, Reliability Tracking / PowerTRX Reliability — https://www.publicpower.org/reliability-tracking — **Unverified** (pricing conflicts between APPA pages)
16. USDA RUS Bulletin 1730A-119 — https://www.rd.usda.gov/sites/default/files/UEP_Bulletin_1730A-119.pdf — **Unverified** (cause/equipment code split read via search)
17. Oracle NMS, Trouble Reporting Reports (export field list) — https://docs.oracle.com/en/industries/energy-water/analytics/2802/ouaw-nms-metric/NMS-METRIC-REFERENCE-GUIDE/NMS_BI_Content1.3.2.html — **Verified** (field names)
18. DOE, Electric Disturbance Events (OE-417) Annual Summaries — https://www.oe.netl.doe.gov/OE417_annual_summary.aspx — **Unreachable 2026-10-29** (IPv6-only, no A record)
19. DOE-417 form, PNNL — https://doe417.pnnl.gov/files/DOE-417_Form.pdf — **Verified reachable** (HTTP 200)
20. LBNL, *Evaluating the Performance of the IEEE Standard 1366 Method for Identifying Major Event Days* — https://emp.lbl.gov/publications/evaluating-performance-ieee-standard — **Unverified** (PDF would not parse)
21. EAGLE-I — https://eagle-i.doe.gov/ — **Verified reachable**; terms in `docs/research/08-license-verification.md`
