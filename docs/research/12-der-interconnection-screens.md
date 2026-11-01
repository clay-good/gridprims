# 12: DER interconnection fast-track screens — what a free screening tool can honestly do

Researched 2026-10-29. **Verified** means I read the primary text today (tariff, rule, CFR, agency page) and the numbers are quoted from it. **Unverified** means trade press, a law firm, a vendor, a forum or a secondary summary, or I could not open the primary page. This is research for a *screening estimate from published rules* — not an interconnection study, and nothing here should ship in a form that implies one.

## Bottom line

- **The FERC pro forma Fast Track screens are fully public, fully numeric, and we may reproduce them verbatim** — they are tariff text, not a copyrighted standard. Two screens the brief asked about **do not exist in FERC's SGIP**: there is no starting-voltage-drop screen (that is California Rule 21 Screen C and Massachusetts Screen 7, both at **< 2.5% primary / < 5% secondary**) and nothing named "penetration test" (that is Rule 21 Screens M/N, New York Screens 3/E/G, and Hawaii Screen 5).
- **The crux has a better answer than expected. Minimum-load data is genuinely missing for most feeders — a New York DPS industry document puts it at 70–80%, and utilities fall back to assuming 15–40% of peak, a 2.7x spread that varies by utility.** But **four utilities now publish per-feeder minimum or daytime-minimum load through unauthenticated endpoints**: Portland General (`Net_Daytime_Minimum_Load_MW`, 559 feeders), Xcel Minnesota and Colorado (`fdml_kva` on 225,981 of 226,107 features, plus a flag for whether it is metered or estimated), Duke Energy Ohio (`min_load` on 5,415 hexes), and National Grid Rhode Island (a 10-year peak forecast, though 2.5 years stale). **In those territories the 100%-of-minimum-load screen is genuinely computable. Everywhere else we must output a band.**
- **Of roughly a dozen FERC screens, four are evaluable from inputs a user owns** (configuration/grounding, 20 kW shared secondary, 20% of transformer nameplate imbalance, eligibility). **Six require a circuit model and must never produce a verdict from us** (fault contribution, interrupting capability, transient stability, utility-side construction, voltage/power quality, safety and reliability). The honest product is a **screen explainer and self-assessment with a data-sourcing path**, not a pass/fail oracle.
- **California is the only state where hosting capacity is a screen, and nowhere else comes close.** Rule 21 Screen M compares the project to **90% of the lowest value in the published ICA-SG and ICA-OF 576-hour profiles**, and Supplemental Screen N uses **100%**. New York, Hawaii, Massachusetts, Minnesota and Colorado all treat hosting capacity as informational — Massachusetts' tariff does not mention it at all, and Hawaii's PUC expressly **deferred** adopting a hosting-capacity screen. Outside California the real data path everywhere is the **pre-application report**.
- **States diverge enough that a national "will it pass" answer is meaningless, and the divergence is the content.** Same screen family, different numbers: interrupting capability is **85%** in Massachusetts, **87.5%** under FERC and in CA/HI/MN/CO, and **90%** in Ohio and New York. Ohio's aggregate screen is **100% of minimum load** where FERC's is **15% of peak**. A side-by-side comparison does not exist anywhere free. **Several widely repeated numbers are simply wrong** — there is no 67% Massachusetts screen, no 120% Hawaii DML screen in any tariff (the 2015 administrative figure was **250%**), no 30%/40% seasonal fallback in CA, CO or MN, and Texas has no screen ladder at all.
- **Ship the explainer, the comparison, the minimum-load band, and a maps directory. Never ship a verdict on a screen we cannot compute, and never host grid data.** IEEE 1547 must be handled by citation with our own table structure — cite CPUC Rule 21 § Hh first, since it writes the numbers into approved tariff text. Nothing we publish should be CEII under **18 CFR 388.113(c)(2)**: no feeder topology, no substation coordinates, no protective device or interrupting-capability values, and no mirrored hosting-capacity datasets.

---

## 1. FERC SGIP Fast Track — current text and exact thresholds

**Source read:** PNM *Attachment M — Small Generator Interconnection Procedures (<20 MW)*, the FERC-accepted pro forma as amended by Order No. 792 (2013), carried forward through Order No. 2023 (2023). Downloaded and read in full today. **Verified.**

The equivalent pre-792 text (flat 2 MW Fast Track, no eligibility table, no supplemental review screens) is still circulating on utility sites — the Entergy copy I first opened was that older version. **Check the vintage before citing any utility copy.**

### 1.1 Fast Track eligibility — SGIP § 2.1 (Verified)

Eligibility is **not** a screen. The tariff says so explicitly: "Fast Track eligibility is distinct from the Fast Track Process itself, and eligibility does not imply or indicate that a Small Generating Facility will pass the Fast Track screens."

| Line voltage at POI | Eligible regardless of location | Eligible on a mainline **and** ≤ 2.5 electrical circuit miles from substation |
|---|---|---|
| < 5 kV | ≤ 500 kW | ≤ 500 kW |
| ≥ 5 kV and < 15 kV | ≤ 2 MW | ≤ 3 MW |
| ≥ 15 kV and < 30 kV | ≤ 3 MW | ≤ 4 MW |
| ≥ 30 kV and ≤ 69 kV | ≤ 4 MW | ≤ 5 MW |

Also verified in § 2.1:
- The table applies to **certified inverter-based** systems only.
- **All synchronous and induction machines must be ≤ 2 MW**, regardless of location.
- **Anything on a line > 69 kV is ineligible for Fast Track regardless of size.**
- "Mainline" = "the three-phase backbone of a circuit. It will typically constitute lines with wire sizes of **4/0 AWG, 336.4 kcmil, 397.5 kcmil, 477 kcmil and 795 kcmil**."
- Certified inverter-based facilities **≤ 10 kW** go to the separate Attachment 5 **10 kW Inverter Process**, not Fast Track (§ 1.1.1).
- Facilities ≤ 20 MW that fail eligibility or fail Fast Track go to the § 3 Study Process (§ 1.1.1).

### 1.2 Initial Review screens — SGIP § 2.2.1 (Verified, all numbers quoted)

Utility has **15 Business Days** from a complete request to run these and must hand over "copies of the analysis and data underlying" its determinations (§ 2.2).

| § | Screen | Exact threshold | Can we evaluate it? |
|---|---|---|---|
| 2.2.1.1 | POI is on tariffed Distribution System | n/a | **Partly** — user knows their utility |
| 2.2.1.2 | Aggregate generation on a radial circuit | **≤ 15% of the line section annual peak load as most recently measured at the substation**. "Line section" = portion "bounded by automatic sectionalizing devices or the end of the distribution line" | **No** — needs line-section peak + existing aggregate DER |
| 2.2.1.3 | Load side of spot network protectors | Inverter-based required; aggregate inverter generation **≤ the smaller of 5% of spot network maximum load or 50 kW** | **No** — needs network max load |
| 2.2.1.4 | Fault current contribution | Aggregate generation contributes **≤ 10% of the circuit's maximum fault current** at the primary-level point nearest the change of ownership | **No** — needs circuit fault duty |
| 2.2.1.5 | Interrupting capability | No protective device (substation breakers, fuse cutouts, line reclosers) or customer equipment exceeds **87.5% of short circuit interrupting capability**; and the circuit must not **already** exceed 87.5% | **No** — device ratings are not public (and arguably CEII) |
| 2.2.1.6 | Line configuration / grounding | Three-phase **three-wire** line → 3-phase or single-phase **phase-to-phase** = pass. Three-phase **four-wire** line → **effectively-grounded** 3-phase or single-phase **line-to-neutral** = pass. (Any other combination is not listed as passing.) | **Yes** — user knows their service type; purpose is to limit loss-of-ground overvoltage |
| 2.2.1.7 | Single-phase shared secondary | Aggregate generation on the shared secondary **≤ 20 kW** | **Yes** — user can know this |
| 2.2.1.8 | 240 V center-tap neutral | Addition must not create imbalance between the two sides **> 20% of the service transformer nameplate rating** | **Yes** — user knows both numbers |
| 2.2.1.9 | Transient stability | Aggregate generation on the transmission side of the feeding substation transformer **≤ 10 MW** where there are known/posted transient stability limitations "in the general electrical vicinity (e.g., three or four transmission busses from the point of interconnection)" | **No** |
| 2.2.1.10 | No utility-side construction | "No construction of facilities by Transmission Provider on its own system shall be required" | **No** |

Outcomes (§ 2.2.2–2.2.4): pass → executable agreement in **5 Business Days**; fail but still interconnectable → agreement in **5 Business Days**; fail and indeterminate → **customer options meeting** offered within **10 Business Days**.

### 1.3 Supplemental Review screens — SGIP § 2.4.4 (Verified)

Customer-elected, customer-paid, **30 Business Days** from deposit. Customer may **specify the order** the screens are run (§ 2.4.2) — a real, cheap tactical lever worth telling developers about.

| § | Screen | Exact threshold |
|---|---|---|
| 2.4.4.1 | **Minimum Load Screen** | Where 12 months of line-section minimum load data "are available, can be calculated, can be estimated from existing data, or determined from a power flow model," aggregate generating capacity on the line section is **< 100% of the minimum load for all line sections bounded by automatic sectionalizing devices upstream** of the facility |
| 2.4.4.1.1 | Which minimum load | **Solar PV with no battery storage uses daytime minimum load: 10 a.m.–4 p.m. for fixed panel, 8 a.m.–6 p.m. for tracking.** All other generation (including PV **with** storage) uses **absolute minimum load** |
| 2.4.4.1.2 | Station service | Only **net injection** counts toward aggregate generation |
| 2.4.4.1.3 | Double counting | Generation "known to be already reflected in the minimum load data" is excluded |
| 2.4.4.2 | **Voltage and Power Quality Screen** | Voltage regulation compliant under all system conditions; voltage fluctuation within **IEEE 1453** limits (or similar utility practice); harmonics meet **IEEE 519** limits |
| 2.4.4.3 | **Safety and Reliability Screen** | No numeric threshold — six enumerated discretionary factors (2.4.4.3.1–.6): minimum loading dominated by a few large customers; uniformity of loading along the section; proximity to substation (**"i.e., less than 2.5 electrical circuit miles"**) and whether the section is a mainline rated for normal/emergency ampacity; presence of a reconnect **time delay** function; reduced operational flexibility on circuit transfer; use of certified equipment for islanding / reverse power / voltage quality |

Critically, § 2.4.4.1 anticipates failure of the data: "If minimum load data is not available, or cannot be calculated, estimated or determined, Transmission Provider shall include the reason(s) that it is unable to calculate, estimate or determine minimum load." **FERC's own pro forma concedes the data often does not exist.**

Post-pass timelines (§ 2.4.5): **10 Business Days** to an agreement if no utility construction; **15** if interconnection facilities/minor modifications are needed; otherwise → § 3 Study Process.

### 1.4 The pre-application report — § 1.2 (Verified, and the most useful thing on this page)

For a **non-refundable $300 fee**, the utility must deliver, within **20 Business Days**, a non-binding pre-application report for one specific POI. § 1.2.3 enumerates 13 required data items, including the ones our screens need:

- **.1–.4** total, existing aggregate generation, queued generation and available capacity (MW) of the substation/bus/bank/circuit · **.5–.7** substation and circuit nominal voltage, approximate circuit distance to substation · **.9** number/rating of protective devices, number/type of voltage regulators, whether the substation has an LTC · **.10–.11** phases available, distance from three-phase, limiting conductor ratings to the substation · **.12–.13** spot/grid network or radial, known constraints
- **.8 is the one that matters: "Relevant line section(s) actual or estimated peak load and minimum load data, including daytime minimum load as described in section 2.4.4.1.1 below and absolute minimum load, when available"**

§ 1.2.4: the report "need only include existing data" and does not obligate a study. **This is the honest answer to "where do I get feeder data": pay $300 and ask.** Telling a developer exactly which section to cite and which 13 items to demand is high-value, zero-data content.

### 1.5 Later FERC orders — relevance to small DER

Order No. 2006 (2005) created the pro forma SGIP/SGIA for facilities ≤ 20 MW.

| Order | Date | Relevance to Fast Track screens | Status |
|---|---|---|---|
| **No. 792 / 792-A** | 2013-11-22 | **The order that set everything in § 1.1–1.3 above**: eligibility table replacing the flat 2 MW, pre-application report, supplemental review with the three screens, raised the inverter minimum-load basis to 100%. 792-A clarified a utility may seek a § 205 variance from the pro forma | Verified (text read in an accepted tariff) |
| **No. 2222 / 2222-A** | 2020 | **Does not change the screens.** FERC declined jurisdiction over distribution-level interconnection for DERs participating only via aggregation; those stay with states/RERRAs. It does add an RTO-tariff process for timely **distribution utility review** of individual DERs in an aggregation. Carve-out: customers of utilities distributing ≤ 4 million MWh/yr need state consent to participate | Unverified (secondary summaries only) |
| **No. 2023 / 2023-A** | 2023-07-27 | Amended **both** LGIP and SGIP, but on queue process, alternative transmission technologies, and abnormal frequency/voltage ride-through — **not** the § 2.2.1 or § 2.4.4 screens, which the 2023-vintage tariff I read carries forward unchanged | Verified (screens unchanged); Unverified (DC Circuit reportedly denied all petitions 2026-07-31) |
| **No. 901** | 2023-10-19 | Directs NERC to write IBR reliability standards across data sharing, model validation, planning/operational studies, and performance. FERC's framing covers both utility-scale and behind-the-meter/DER, but the NERC SARs delivered so far are largely scoped to **transmission-connected** IBRs; a NERC Glossary definition of "DER" was petitioned separately (docket RD26-1-000). **No effect on fast-track screens today.** | Unverified — do not state a DER applicability threshold |

**Order 902:** no FERC interconnection order numbered 902 relevant to small DER was found. Do not cite one. **Verified (absent).**

---

## 2. IEEE 1547 — editions, price, and free citable sources

### 2.1 Edition status, 2026-10-29 (Verified via IEEE SA)

| Document | Status |
|---|---|
| **IEEE 1547-2018** | Active base edition, within its 10-year lifecycle, not superseded |
| **IEEE 1547a-2020** (Amendment 1) | Active. Revises **allowable ranges of adjustability** for voltage/frequency trip clearing times — e.g. Cat I UV1 range to 2.0–21.0 s, UV2 0.16–2.0 s; Cat III UV1 2.0–50.0 s, UV2 0.16–21.0 s. **Defaults unchanged** |
| **IEEE 1547.1-2020** | Active conformance-test standard (the basis of UL 1741 Supplement SB) |
| **IEEE 1547.2-2023** | Application guide, non-normative (Unverified) |
| **1547b / corrigendum** | **Does not exist.** IEEE SA's 1547 page lists one amendment and no corrigenda |
| **P1547 full revision** | PAR approved 2022-03-24, listed as superseding 1547-2018, **not published**. EPRI's 2025 status brief worked from Draft 0.6a (July 2025). **There is no "IEEE 1547-2026"** |

**Price: Unverified.** The IEEE/Accuris and ANSI stores are behind Cloudflare. Snippet-level indications only: 1547-2018 PDF ~**$172** (Accuris list) / ~**$198** (ANSI), member ~$138, print ~$215; 1547.1-2020 PDF ~**$225** / ~**$259**. Techstreet now redirects to Accuris. **Confirm in a browser before publishing a price.**

### 2.2 Free citable sources for the parameter tables

| Source | What it reproduces | Status |
|---|---|---|
| **PG&E Electric Rule 21 § Hh** (CPUC tariff, Advice 7692-E, eff. 2025-08-29, Cal. P.U.C. Sheets 60223-E–60229-E) | Table Hh-1a trip settings (OV2 1.20 p.u./0.16 s; OV1 1.10/13.0; UV1 0.88/21.0; UV2 0.50/2.0); Hh-1b ride-through zones with mode, min ride-through and max response time; Hh-2a/2b frequency trip + ride-through; Hh-3 volt-VAR defaults (V1 92%/Q1 30% inject, V2 97%/0, V3 103%/0, V4 107%/30% absorb, OLRT 5 s); volt-watt in prose (above 106% V, reduce 25% of nameplate per 1% V); Hh-4 default activation states; enter service 15 s delay + 50 s ramp; reactive capability "shall comply with IEEE 1547-2018, Section 5.2 **Category B**" | **Verified.** **Best source — CPUC-approved tariff is state regulatory law.** Hh-1a/1b are embedded images, so cite by sheet number |
| **NERC, *Reliability Guideline: BPS Reliability Perspectives on the Adoption of IEEE 1547-2018*** | **The most complete single document.** Table 2.2 = IEEE Tables 11/12/13 in full — OV2/OV1/UV1/UV2 **defaults and allowable ranges** for Cat I, II, III, with 1547a-2020 changes footnoted. Table 2.3 frequency trip (OF2 62.0 Hz/0.16 s; OF1 61.2/300; UF1 58.5/300; UF2 56.5/0.16) plus ranges. Prose on mandatory/permissive/momentary-cessation zones, frequency ride-through, enter service (Cl. 4.10/6.6), frequency droop | **Verified.** Free and public, but NERC-copyrighted, not a US-government work |
| **Sandia PVPMC / EPRI, *Smart Inverters and Grid Support Requirements*** | **Best source for Clause 5 normal operation.** Cat A vs B minimum reactive capability: both 0.44·S_rated injection; **Cat A absorption 0.25·S_rated, Cat B 0.44·S_rated**; break points at 0.05/0.2·P_rated and 0.06/0.11·S_rated. Which modes are mandatory per category. Default volt-VAR curves: Cat A ±25% at 0.9/1.1 p.u.; Cat B 44% with V1 0.92, V2 0.98, V3 1.02, V4 1.08. Unity-PF constant-PF is the default mode | **Verified.** Hosted on a DOE lab site but © 2018 EPRI — cite the host |
| **Unitil, *Default IEEE 1547-2018 Setting Requirements*** | **Cleanest ride-through zone tables as selectable text** (Tables 14/15/16 equivalent): Cat II 1.10<V≤1.20 momentary cessation, 0.5≤V<0.88 mandatory operation, V<0.50 momentary cessation; Cat III 1.1<V≤1.20 permissive, 0.70≤V<0.88 mandatory, 0.5≤V<0.70 permissive. Frequency ride-through zones, trip tables, enter service 300 s delay + 300 s ramp, default mode table | **Verified.** IOU handbook filed with MA/NH regulators |
| **MISO, *Guideline for IEEE Std 1547-2018 Implementation*** | Trip tables for Cat I/II/III with MISO-recommended vs IEEE-allowable columns; frequency trip; Table 8 frequency-droop; **Table 9 = IEEE Table 4 enter-service criteria** incl. 300 s soft-start ramp; full 1547.1 parameter-name crosswalk with default/valid flags; momentary-cessation threshold (0.5 p.u.) | **Verified.** RTO guideline, MISO-copyrighted |
| **FirstEnergy PA, *IEEE 1547-2018 Specified Inverter Settings*** | Flat parameter list in 1547.1 naming: all OV/UV/OF/UF values + clearing times, enter-service 300 s/300 s, **volt-VAR point by point** | **Verified.** State-filed utility setting sheet |
| **NRECA, *Guide to IEEE 1547-2018 and Its Impacts on Cooperatives*** (Mar 2019) | Side-by-side 1547-2003 vs Cat I/II/III thresholds **and** clearing times, voltage and frequency; Cat A/B reactive capability in prose. Best for "what changed" | **Verified.** Trade association, NRECA-copyrighted |
| **EPRI "Crash Course on IEEE 1547-2018," hosted on a PUCO docket library (dam.assets.ohio.gov)** | Ride-through region graphics (continuous / mandatory / permissive / momentary cessation) per category; enter service; Cat A/B framing. Values live in the figures | **Verified.** Useful because a **state agency** published it |
| **Mass.gov TSRG *Inverter Source Requirements Document*** | Titled "Default IEEE 1547-2018 Setting Requirements"; expected to mirror the Unitil sheet. Best public-document posture of the lot (state government) | **Unverified** — mass.gov returned 403. Open in a browser and confirm |
| **NREL PES-TR67 *Impact of IEEE 1547 on Smart Inverters*; NREL/TP 81028 *Highlights of IEEE 1547-2018 Implementation Considerations*** | Expected to carry ride-through figures and defaults. DOE national-lab work is the cleanest thing to cite | **Unverified** — the lab domain was unresolvable on every attempt today. **Check these first; if they carry the numbers, promote them to the top** |

**Do not link or host:** full-text copies of 1547-2018 or 1547.1-2020 found on university servers (`aulasvirtuales.udistrital.edu.co`, `web.nit.ac.ir`), `coipsi.com`, or Scribd. They are unauthorized. Linking them creates contributory-infringement exposure.

**Hawaii Rule 14H does NOT publish the numbers (Verified).** The current Rule 14 Appendix I (revised sheets 34B-xx, Order No. 38070, Docket 2019-0323) **no longer contains numeric trip or ride-through tables**; it requires certification to IEEE 1547-2018 and pushes all default settings to Hawaiian Electric's separate, non-tariff **URP** document. The tariff does state a few overrides as facts (volt-watt and volt-VAR mandatory activation; soft-start ramp mandatory with randomized delay deactivated; constant power factor mandatory deactivation). Older HECO ride-through tables (Table 4A-1, via Rule 30) are **legacy pre-2018 values — do not mix them with 1547-2018 numbers.**

### 2.3 What we may state as a fact

| | Posture |
|---|---|
| **Reproducing IEEE's tables verbatim** | **Don't.** A standard's tables are protected as a compilation and IEEE enforces. Never paste Table 11 with IEEE's row/column structure and captions |
| **Stating a numeric default as a fact with citation** | **Safe.** Individual facts are not copyrightable (*Feist*). "Under IEEE 1547-2018 the default OV2 trip is 1.20 p.u. with a 0.16 s clearing time" is a factual assertion. Use our own headers, ordering and groupings, add our own commentary, and cite a free, fetchable source. Our natural angle — tables organized by developer use case rather than by IEEE clause order — **is** the defense: an independent compilation of facts, not a copy of IEEE's |
| **Citing a government rule that carries the numbers** | **Safest.** CPUC Rule 21 § Hh is commission-approved tariff text containing the values. **Where Rule 21 and 1547 agree, cite Rule 21.** Where we must state a value Rule 21 does not carry (allowable ranges, Cat I/II, Cat A/B reactive capability), cite NERC or the Sandia-hosted deck and frame it as a reported fact |

**Public.Resource.Org case law.** *ASTM v. Public.Resource.Org*, 896 F.3d 437 (D.C. Cir. 2018) reversed and remanded for a factor-by-factor fair-use analysis; the 2023 decision (No. 22-7063, D.C. Cir., 2023-09-12) held that **non-commercial dissemination of standards as incorporated by reference into law is fair use**. Two limits matter: the court expressly did **not** hold such standards lose copyright, and the holding turned heavily on Public Resource's non-commercial nonprofit purpose. A free static site is favorable on that axis but it is not the same posture, and the holding is about posting *the law*, not about reposting a privately-sold standard. **Verified.**

**Is IEEE 1547 incorporated by reference into federal law? No — and this is a trap.** eCFR full-text search returns one hit: **7 CFR 1730.63(b)(2)** (USDA Rural Utilities Service), which required borrower IDR policies to incorporate **IEEE 1547 (approved 2003-06-12)** and IEEE 1547.1 (2005-06-09). That provision was **amended out at 87 FR 73443**; current 7 CFR 1730.63 contains no IEEE reference. So the only federal IBR was of **1547-2003**, and it is **gone**. **Do not claim 1547-2018 is federally incorporated by reference.** **Verified against the eCFR API, current and 2023-01-01 snapshots.** State law is the better hook: California writes 1547-2018 into an approved tariff with the numbers; Hawaii adopts it by reference only.

**Public.Resource.Org does not host 1547 (Verified).** Their IBR collection (`law.resource.org/pub/us/cfr/ibr/`) carries IEEE 45, 112, 114, 1202 and C2 (NESC) in sluice 004. **1547 is not there**, consistent with it never having been in a live federal IBR citation. Do not expect a copy to appear.

---

## 3. State screens that differ

### 3.0 Ohio — OAC 4901:1-22-07, Level 2 review (Verified, read today)

Worth leading with because it shows how far a state can drift from FERC while keeping the same screen *names*. Ohio uses **100% of minimum load** where FERC uses 15% of peak, and **90%** interrupting capability where FERC uses 87.5%.

| Rule | Screen | Threshold |
|---|---|---|
| (A)(3) | Export capacity eligibility by line voltage | **≤ 5 kV: 500 kW**; **> 5 to 15 kV: 2 MW**; **> 15 to 69 kV: 3 MW** |
| (B)(1)(d) | Radial circuit aggregate generation | **≤ 100% of the line section's relevant minimum load** (not annual peak) |
| (B)(1)(e) | Fault current contribution | **≤ 10%** of circuit maximum fault current at nearest primary point |
| (B)(1)(f) | Interrupting capability | **≤ 90%**; circuits already above 90% cannot be approved |
| (B)(1)(g) | 240 V center-tap imbalance | **≤ 20%** of service transformer nameplate |
| (B)(1)(j) | Single-phase shared secondary | **≤ 65% of transformer nameplate rating** (vs. FERC's flat 20 kW) |
| (B)(1)(k) | Spot or area network | Aggregate inverter-based **≤ lesser of 5% of network maximum load or 50 kW** |
| (B)(1)(a)–(c), (h), (i), (l) | Non-numeric: not on transmission/non-radial; codes per 4901:1-22-03; transient stability and queued-transmission interdependency; phase-to-phase on 3-wire / line-to-neutral on 4-wire; service type and transformer connection for loss-of-ground overvoltage; no EDU-side construction | — |

(C)(4) gives the fail path (modifications, further study, or Level 3). **Ohio has no separate numeric supplemental-review screens.**

### 3.1 New York SIR — current version effective 2026-10-01 (Verified)

**Source:** NY PSC Case 24-E-0621 et al., *Standardized Interconnection Requirements … for New Distributed Generators and/or Energy Storage Systems 5 MW or Less*, effective 2026-10-01, 120 pp.; screens in Appendix G. I separately read the 2019 Joint Utilities screening template, which the 2026 SIR supersedes — **the Screen E threshold changed, so cite the 2026 SIR, not the template.**

**Two corrections worth flagging: the SIR covers 5 MW or less, not 20 MW** (above 5 MW you are in NYISO SGIP/LFIP), and **there is no 10 kVA shared-secondary screen in New York** — "kVA" never appears in Appendix G; that is a Rule 21 / FERC construct.

| Screen | Threshold |
|---|---|
| Expedited (short-form) | **≤ 50 kW**, extended to **> 50 kW up to 300 kW** for inverter-based equipment certified to **UL 1741 SB** with utility-specified settings |
| Full screening path | **> 50 kW up to 5 MW** → Preliminary Screening A–F |
| A, B | Networked secondary routing; certified equipment (UL 1741, and **UL 1741 SB** for inverter-based, by an NRTL) |
| 1–2 (networks) | Service, transformer and network-protector adequacy and reverse-power capability |
| **3 (network penetration)** | Aggregate DER **< 15% of the minimum load of the network**, **and** aggregate DER in the local network **< 50% of the minimum load on the transformer(s)** |
| C | Aggregate generation/loading must not exceed any EPS rating |
| **D (line and grounding configuration)** | 3φ 3-wire any type → pass; 3φ 4-wire > 5 kV or single-phase line-to-neutral → pass; **all other 3φ 4-wire, including mixed 3-/4-wire sections, fail unless aggregate DER AC nameplate ≤ 10% of line-section peak load** |
| **E (radial penetration)** | Aggregate DER on any MV line section **< daytime minimum load** where 12 months of data are available, calculable, estimable or modelable — **or < 15% of annual peak load where daytime minimum load data is not available**, for all line sections bounded by upstream automatic sectionalizing devices. **This is the cleanest codified statement anywhere of the fallback structure our tool should mirror** |
| **F (short circuit / feeder capacity)** | Available short-circuit capacity at the MV PCC ÷ individual DER rating **> 25**; and substation short-circuit capacity ÷ aggregate feeder DER **> 25** |
| G (supplemental) | Where aggregate DER exceeds minimum load, can the EPS support reverse flow? |
| **H (supplemental, voltage flicker)** | **P_st ≤ 0.35**, via ΔV = (d / d at P_st=1) × F ≤ 0.35; PV plant variability (F / d at P_st=1) = **0.2 / 2.56% = 7.8**; no excursion outside **ANSI C84.1 Range A**; an aggregate generation change of **75% of nameplate** must not move voltage more than **half the bandwidth** of any regulating device on the feeder |
| **I (supplemental, operating limits)** | Identify equipment where fault current exceeds **90% of short-circuit interrupting capability**; Joint Utilities unintentional islanding practice; effective grounding; 3V0 |
| Timelines | Preliminary screening **15 BD**; applicant election after failure **10 BD**; supplemental screening **20 BD**; **CESIR 60 BD** from Step 5 info + fee, +40 BD for a non-material modification; Step 5 info deadline **30 BD** or queue removal; cost-estimate contingency cap **15%** |
| Cost sharing | Qualifying Upgrade = shared upgrade increasing hosting capacity costing **> $250,000**; Participating Project **> 50 kW AC**; Capital Project Queue triggered at **> 24 months** construction, projects released **18 months** before completion; mobilization **25%** non-transformer / **75%** transformer; unrecovered cost cap **2%** of annual distribution capital budget |

**Hosting capacity in New York is informational, not a screen (Verified).** "Hosting Capacity" appears only as a glossary definition, in the Appendix E cost-sharing math, and in exactly one operational sentence — the utility must annotate its hosting capacity map where a feeder is affected by the Capital Project Queue. The word "map" appears nowhere in Appendix G. **New York's formal screening data channel is the Appendix D pre-application report**, not the map.

NY CESIR voltage criteria, from the DPS CESIR evaluation document (**Verified**): feeder high/low voltage tests against **ANSI C84.1 (< 105% / > 95%)**; feeder voltage fluctuation **< 3%** steady state; substation bus fluctuation **< 5%** from aggregate DER; the 75%-of-nameplate regulator-movement test; and a flicker screen. Several reverse-power ratio screens are published with their **limits redacted as "[XX]%"** — **even the industry working group cannot see those thresholds.**

### 3.2 California Rule 21 — Section G screens (Verified from the PG&E tariff, Advice 7692-E, eff. 2025-08-29)

**California has largely replaced the 15%-of-peak screen with ICA-based screens.** This is the single most important state finding: where ICA values exist, Rule 21 compares the project to the **published 576-hour ICA profile**, which PG&E/SCE/SDG&E publish. That makes California the **only state where a public dataset can actually drive a screen.**

| Screen | Question | Threshold |
|---|---|---|
| A | PCC on a networked secondary system? | Yes = fail |
| B | Certified equipment used? | No = fail |
| C | **Starting voltage drop** (applies **only** to facilities that start by motoring the generator) | Utility's choice of two options: (1) starting in-rush current ≤ continuous ampere rating of the customer's service equipment; or (2) calculated voltage drop **< 2.5% for primary interconnections and < 5% for secondary interconnections** |
| D | Transformer / secondary conductor rating | Maximum aggregated gross ratings must not exceed the transformer or secondary conductor rating as modified per utility practice, absent generation |
| E | Single-phase generator on a 240 V center-tap neutral | Must not cause unacceptable imbalance between the two phases |
| F | **Short circuit current contribution ratio** (does **not** apply at ≤ 30 kVA gross) | Measured at the primary (high) side of the dedicated distribution transformer, the **sum of the short circuit contribution ratios of all generating facilities on the circuit must be ≤ 0.1** |
| G | Short circuit interrupting capability | **87.5%** — same as FERC, including the "already exceeds" clause |
| H | Line configuration compatible with interconnection type | Grounding / loss-of-ground overvoltage |
| I | Will power be exported across the PCC? | Routes non-export projects |
| J | **Gross rating ≤ 30 kVA?** | **Yes = pass and skip Screens K, L and M — Initial Review is complete** |
| K | NEM-1, NEM-2 or NBT-1 with nameplate **≤ 500 kW**? | Yes = **skip Screen L**, go to M. Stated purpose is "solely to facilitate interconnection … by allowing such facilities to bypass Screen M" |
| L | Transmission dependency, stability, overvoltage | — |
| M | **ICA screen** (where ICA values are available at the POI) | By gross nameplate: aggregate gross nameplate **≤ 90% of the lowest value in the ICA-SG 576 profile** **and** **≤ 90% of the lowest value in the ICA-OF 576 profile**. By generation profile: the **PVWatts**-based (or equivalent) profile **≤ 90% of the ICA-SG 576 and ICA-OF 576 value in any hour**. Fail → Supplemental Review |
| M (legacy, no-ICA path) | 15%-of-peak | Aggregate capacity on the line section **< 15% of line section peak load** for all line sections bounded by automatic sectionalizing devices; then **Screen M1**: does aggregate DER cause **reverse power flow** at a line section with a voltage regulator, or at a protection device including the circuit breaker / field recloser? Yes = fail Initial Review |
| **N** (Supplemental) | **Penetration Test** | With ICA: aggregate gross nameplate **≤ 100% of the lowest value in the ICA-SG 576 profile** (or the PVWatts profile ≤ 100% of ICA-SG 576 in **any hour**), **and** pass Screen F1. Without ICA values: the **100%-of-minimum-load** test, with the same technology note as FERC — **solar with no storage uses daytime minimum load (10 a.m.–4 p.m. fixed, 8 a.m.–6 p.m. tracking); absolute minimum load for all other technologies** |
| **O** (Supplemental) | Power quality and voltage tests | — |
| **P** (Supplemental) | Safety and reliability tests | — |
| **Q, R** | Electrical independence of the request; independence from earlier-queued requests | — |

Initial Review results are due within **15 days** (§ F.2.a). Note Screen N's explicit remedy path: if voltage is the prevailing constraint, the utility must run power flow **with the full range of smart inverter functions including volt/VAR enabled** before failing the project.

### 3.3 Hawaii Rule 14H (Verified from the HECO tariff, Appendix I; Docket 2019-0323, Order No. 40670, 2024-03-19)

**The current Rule 14H contains no minimum-load screen at all, and the widely cited "120% of DML" screen was never in the tariff.** Screens 1–11 are the Initial Technical Review; 12 and 13 are Supplemental Review. **Verified** — full-text search of the HECO and MECO Rule 14 books returns **zero** occurrences of "daytime minimum," "DML" or "hosting capacity." Screen sheets are effective **2024-04-01** per Order No. 40670 (Docket 2019-0323); Appendix I is harmonized to IEEE 1547-2018 including 1547a-2020.

| Screen | Question | Threshold |
|---|---|---|
| **1** | Meets the technical specifications of **Rule 22 (Customer Self-Supply), Rule 27 (NEM+), or Rule 32 (Smart Renewable Energy Program)** non-export riders? | **Yes = skip Screens 4, 5, 6, 8 and 9.** Non-export and limited-export projects bypass the penetration, flicker and short-circuit screens entirely — the most consequential design lever in the tariff |
| 2 | Single-phase on a center-tap 240 V service | Imbalance |
| 3 | POI on a network system? | Yes = fail |
| 4 | Can power export cause an unacceptable condition? | — |
| **5** | Aggregate capacity on the line section | **≤ 15% of line section peak.** Energy storage counts via "Technical System Size," but **if the storage contribution is limited by programming or an on-site limiting element, the reduced Technical System Size is used** |
| 6 | Voltage flicker / voltage drop | Within **IEEE 519, IEEE 1453, or General Order 7** limits. Maximum **charging** kW of storage is considered |
| 7 | Aggregated gross ratings vs. transformer/secondary | Charging kW considered |
| **8** | Short circuit current contribution ratio | **≤ 0.1 (10%)** |
| **9** | Short circuit interrupting capability | **87.5%** |
| **10** | Line configuration screen | Mixed three-wire/four-wire sections pass only if aggregate DER is **≤ 10% of line section peak load** (the same 10% rule New York uses in its Screen D) |
| **11** | **Gross rating ≤ 100 kVA?** | **Yes = qualifies for Simplified Interconnection, skip all remaining screens** |
| 12 | Power quality and voltage tests (Supplemental) | — |
| 13 | Safety and reliability tests (Supplemental) | — |

**Where the DML numbers actually live.** The 15% screen originates in the **2008 HCEI Energy Agreement** ("generation feeding into the circuit shall be limited to no more than 15% of peak circuit demand for all distribution level circuits of 12 kV or lower"), quoted in **D&O No. 33258 at 55–56**, and became a per-circuit threshold via the PUC's Order Regarding Net Metering Proposals (2011-01-13). By 2015 the administrative *study* trigger was **250% of DML**, not 120%: **D&O No. 33258** (2015-10-12, Docket 2014-0192, at 94–95) records that the companies would "continue to review interconnection applications up to the **250% DML threshold**," found it reasonable to retain that practice "until the commission approves a hosting capacity methodology," noted at fn. 222 that 250% of DML "may be a reasonable, if conservative, proxy," and stated the commission "will defer adopting the hosting capacity screen in Rule 14H." **Verified.** **Unverified:** whether the 250%-of-DML practice is still in use — the last primary confirmation is October 2015, and no later order adopting a DML or hosting-capacity screen was found. The **120%** figure appears in no PUC order or tariff we read; it rests on trade press with conflicting dates. **Do not publish 120% as a Hawaii screen.**

Appendix I (Sheet 34B-9) adds duplicate supplemental triggers (**Verified**): supplemental review "may be required when the aggregate generating capacity per distribution line section exceeds **15% of the annual peak KVA load**"; single-phase **> 10 kW** gets unbalance review; SCCR **> 10%** at the dedicated-transformer primary, or short-circuit contribution **> 2.5%** of service-equipment interrupting rating at a shared transformer secondary. Screen 10 does not apply at gross rating **≤ 10 kW**.

Initial Technical Review completes within **15 business days** of a complete application; Supplemental Review within **20 business days**. The tariff also lists eight example remedies a utility may apply during Initial Technical Review to clear a failed screen **without** triggering Supplemental Review (larger transformer, larger secondary conductor, grounding transformer, LTC upgrade, **modified voltage and frequency ride-through settings**, active/reactive power requirements, phase balancing, overstress check).

### 3.4 Massachusetts, Minnesota and Colorado (Verified from tariff and rule text)

**Massachusetts** — National Grid, *Standards for Interconnection of Distributed Generation*, **M.D.P.U. No. 1632**, effective **2026-05-01**, model tariff approved in D.P.U. 25-48. **There is no "67% of minimum load" screen in Massachusetts** — zero hits in the current tariff; MA uses **100%**. Treat any secondary source saying 67% as wrong.

| Screen | Threshold |
|---|---|
| Pre-application report | Mandatory at **≥ 250 kW** |
| Simplified (radial) | Listed inverter **≤ 25 kW** single- or three-phase, and aggregate capacity **< 15% of feeder/circuit annual peak load** (and line segment if available). **Note an unresolved conflict in the document itself:** § 3.1 says 25 kW for both, but the Figure 1 flowchart still reads "< 15 kW single-phase or < 25 kW three-phase." § 3.1 governs; expect utility-level ambiguity |
| Simplified (networks) | Keyed to interconnecting-customer minimum load, with a **1/15th of minimum load** export limit |
| Expedited eligibility | **No MW cap** — eligibility is by passing Screens 1–10 |
| Screen 2 | **15% of feeder/circuit annual peak load**, measured at the substation circuit breaker (at the loop tap for loop service) |
| **Screen 7, starting voltage drop** | In-rush ≤ continuous ampere rating of service equipment, **or** drop **< 2.5% primary / < 5% secondary**. Motoring starts and synchronous generators only |
| **Screen 8, fault current** | (a) **≤ 10%** of circuit max fault current at the primary point nearest the PCC; (b) must not cause any device to exceed **85%** of interrupting capability, nor be installed on a circuit already above 85% — **Massachusetts is the strictest of the states we verified**; (c) at a **shared** transformer secondary, contribution **≤ 2.5%** of service-equipment interrupting rating |
| Screen 9 | Configuration table as FERC; **shared single-phase transformer secondary: aggregate generation ≤ 20 kVA** (higher only with added voltage control); 240 V center-tap imbalance **≤ 20% of nameplate** |
| Screen 10 | Aggregate on the low-voltage side of the substation transformer **≤ 10 MW** where transient stability limitations are known or posted |
| **Supplemental Screen A** | Aggregate capacity on the line section **< 100% of minimum load** for all upstream-bounded line sections, with the identical FERC technology note (**10 a.m.–4 p.m. fixed, 8 a.m.–6 p.m. tracking; absolute minimum load otherwise**) |
| Supplemental B, C | IEEE 1453 fluctuation and IEEE 519 harmonics at the PCC; qualitative safety/reliability citing proximity "< 2.5 electrical line miles" and "600A class cable" |
| **Group study** | Triggered by more than one expedited/standard application in a **Common Study Area**; group window **≤ 40 days**. Study clocks: **≤ 3 apps / ≤ 10 MW / < $1.5M → 100 days**; **≤ 5 apps / ≤ 25 MW / < $1.5M → 125 days**; **> 5 apps / > 25 MW / ≥ $1.5M → 160 days**. Cost estimate within **± 15%**; cost allocation pro rata on MW AC; **25%** first installment within 60 BD of ISA execution, remainder within 120 BD |
| **Group study exemption** | An expedited application that passes **all** initial review screens and needs **no material system modifications** becomes an "Exempt Project" and progresses independently — a strong argument for designing to pass |
| CIP fee | Assessed on customers with a DG facility **over 25 kW**; CIP fee term **20 years** (M.D.P.U. No. 1619) |
| ISO-NE system impact study | Required at **≥ 5 MW**; may occur above 1 MW |

**Minnesota (MN DIP v2.4, PUC-posted 2025-04-24, docket E-999/CI-16-521) and Colorado (4 CCR 723-3 Rules 3851–3859, eff. 2026-06-14)** are the most FERC-faithful, and they diverge from each other in instructive ways. **Note a correction: Colorado's supplemental review screens are at Rule 3855(d)(VI); Rule 3856 is the Level 3 study process.**

| Item | Minnesota | Colorado |
|---|---|---|
| Fast Track / Level 2 eligibility, ≥ 5 and < 15 kV | **≤ 1 MW** regardless of location, **≤ 2 MW** on a mainline ≤ 2.5 circuit miles | **≤ 2 MW** / **≤ 3 MW** (matches FERC) |
| Other voltage bands | < 5 kV 500/500 kW; 15–30 kV 3/4 MW; 30–69 kV 4/5 MW | identical to FERC |
| Synchronous / induction cap | 2 MW | 2 MW |
| Simplified tier | certified inverter **≤ 20 kW** | Level 1 certified inverter **≤ 25 kW AC** |
| Overall scope | DER **≤ 10 MW** | — |
| **15% screen** | 15% of line-section annual peak, **and expressly: "The Area EPS Operator may consider 100% of applicable loading (i.e. daytime minimum load for solar), if available, instead of 15% of line section peak load"** (§ 3.2.1.2) | 15% of annual peak "as most recently measured at the substation or calculated for the line section(s)," **and "A fuse is not an automatic sectionalizing device"**. No 100%-of-daytime-load substitution at initial review |
| Fault contribution / interrupting | 10% / 87.5% | 10% / 87.5% |
| **Shared secondary** | **≤ 20 kW or 65% of transformer nameplate** | **≤ 25 kW**, no transformer term |
| 240 V imbalance | 20% of nameplate | 20% of nameplate |
| Single-phase on 3φ service | **≤ 10% of service transformer nameplate** | absent |
| Behind a line voltage regulator | **< 250 kW** ("does not include substation voltage regulators") | absent |
| Networks | load side of network protectors: **lesser of 5% of max load or 50 kW** | spot networks serving > 1 customer **lesser of 5% or 300 kW**; **area networks lesser of 10% of area network minimum load or 500 kW AC** |
| Flicker at initial review | absent (sits in supplemental) | **IEEE 1453-2015** + IEEE 1547-2018 rapid voltage change |
| Colorado-only | — | no utility-side construction required; nameplate + prior DER ≤ customer's existing service capacity; **"highly seasonal circuits" are automatically sent to supplemental review** — defined at Rule 3852(f) as a circuit with an annual-peak-to-off-season-peak ratio **greater than six** |
| Supplemental minimum load | **< 100%** of line-section minimum load, same daytime/absolute note as FERC, net injection only, no double counting | **< 100%**, same daytime/absolute note, **plus 3855(d)(VI)(A)(ii): minimum load "shall be specific to time(s) that the interconnection resource exports active power"** |
| Clocks | accept within 15 BD, complete within 30 BD, customer may specify screen order | same |

Colorado's Level 1 reuses the Level 2 screens "except for screens (V), (VI), (X) and (XI)" — no flicker, line-configuration or network screens below 25 kW. One citation hazard: Rules 3855 and 3531 cross-reference "highly seasonal circuits as defined by subparagraph 3667(a)(IV)," but **Rule 3667 is currently `[Reserved]`** — the live definition is 3852(f).

**Important negative finding (Verified by full-text search):** the "30% of peak summer / 40% of peak winter" minimum-load fallback **does not exist in California, Colorado or Minnesota.** All three instead require the utility to **state the reasons** it could not calculate, estimate or determine minimum load. If a secondary source attributes that fallback to any of them, it is wrong.

### 3.5 Texas / ERCOT — no screen ladder exists (Verified from the PUCT rule text)

**Sources:** 16 TAC § 25.211 (PUCT compilation, "effective 1/5/17") and § 25.212 (still the **1999-12-21** text).

| Item | Threshold |
|---|---|
| On-site DG definition | **≤ 10 MW** and connected **below 60 kV** (§ 25.211(c)(10)); utility system is distribution below 60 kV |
| Aggregation | An installation may exceed 10 MW, but **no more than 10 MW may be interconnected at any one time at the PCC** (§ 25.211(c)(5)) |
| Natural-gas DG facility | **≤ 2,000 kW** (§ 25.211(c)(4)) |
| **No-study-fee class (radial)** | **Pre-certified units up to 500 kW** exporting **≤ 15% of total load on a single radial feeder** and contributing **≤ 25% of maximum potential short circuit current** on that feeder (§ 25.211(g)(1)) |
| **Secondary networks** | The utility **"shall approve"** inverter-based applications unless total DG on affected feeders exceeds **25% of total secondary network load**; same 25% for non-inverter DG below host load; above 25% the utility may postpone and study "within six weeks"; rejection only for demonstrated reliability or safety reasons (§ 25.211(h)) |
| Network study-fee exemption | No fee for **inverter systems under 20 kW** (§ 25.211(i)) |
| Clocks | Pre-certified **4 weeks**; others **6 weeks**; post-upgrade **≤ 2 weeks** (§ 25.211(m)) |
| § 25.212 | Communication channel may be required **> 2 MW**; redundant circuit breaker for facilities **larger than 2 MW and exporting** unless a listed suitable device is used; harmonics per **IEEE 519** |

**Three corrections for any Texas page we write.** First, § 25.211 contains **no screen list, no fast-track tier and no supplemental review** — the only numeric provisions govern study fees, network approval and timelines. The actual engineering screens live in utility DG manuals (Oncor, CenterPoint, AEP Texas, TNMP). Second, § 25.211(g)(1) bars the utility from **charging a study fee**; it does **not** confer automatic approval. Third, **§ 25.212 does not adopt IEEE 1547** — the 1999 text contains zero occurrences of "1547" and cites only IEEE 519. IEEE 1547 enters Texas through utility manuals and UL 1741 pre-certification, not the PUCT rule.

ERCOT Planning Guide § 5 (2026-08-01) applies at **≥ 1 MW**, defines a large generator as **≥ 10 MW** and a small generator as **< 10 MW**. Practical boundary: ≤ 10 MW behind the meter → PUCT §§ 25.211/25.212 plus the DSP manual; ≥ 1 MW → Planning Guide § 5 and registration; ≥ 10 MW → full large-generator GINR. **"ERCOT is not FERC-jurisdictional" is Unverified from primary federal text here** — it rests on § 25.211(a)'s preemption savings clause and the PURA authority basis. Cite it as a well-established proposition, not as sourced from this document.

**Pending and material for a 2026 page: PUCT Project No. 54233**, "Technical Requirements and Interconnection Processes for Distributed Energy Resources," would create new **16 TAC § 25.210**, amend § 25.211 and **repeal and replace § 25.212**, with tiering at **250 kW and 10 MW**. Discussion draft and request for comments issued **2025-05-14**; reply comments through 2025-08-08. **No proposal for publication or adoption order was found as of 2026-10-29. Unverified — check before publishing Texas as settled.**

### 3.6 Cross-state comparison of the same screens

| Screen | FERC SGIP | CA Rule 21 | NY SIR (2026) | HI 14H | OH Level 2 | MA (NG 1632) | MN DIP | CO 3855 |
|---|---|---|---|---|---|---|---|---|
| Aggregate generation vs. line section | **15% of annual peak** | **90% of lowest ICA-SG and ICA-OF 576 value**; legacy path 15% of peak + reverse-power check | **< daytime minimum load**, else **< 15% of annual peak** | **15% of peak** | **100% of relevant minimum load** | **15% of annual peak** | 15% of peak, **or 100% of daytime minimum load if available** | 15% of peak |
| Minimum load (supplemental) | **< 100%** | **100% of ICA-SG 576**, else 100% of minimum load | **< 100%** (Screen G) | **none** | none | **< 100%** (Screen A) | **< 100%** | **< 100%**, export-time qualified |
| Short circuit contribution | **≤ 10%** of max fault current | **SCCR sum ≤ 0.1**, exempt ≤ 30 kVA; **Screen F1 ≤ 1.2 per unit** | **stiffness ratio > 25** at PCC and substation | **≤ 0.1 (10%)** | **≤ 10%** | **≤ 10%** | ≤ 10% | ≤ 10% |
| Interrupting capability | **87.5%** | **87.5%** | **90%** (supplemental Screen I) | **87.5%** | **90%** | **85%** | 87.5% | 87.5% |
| Shared secondary | **20 kW** | transformer and conductor rating | EPS ratings | gross vs. transformer | **65% of nameplate** | **20 kVA** | **20 kW or 65% of nameplate** | **25 kW** |
| 240 V imbalance | **20% of nameplate** | "unacceptable" (undefined) | phase balance per utility | Screen 2 | **20%** | **20%** | **20%** | **20%** |
| Mixed 3-/4-wire configuration | pass/fail table only | **≤ 10% of line-section peak** (Table G-1) | **≤ 10% of line-section peak** | **≤ 10% of line-section peak** | (B)(1)(h)–(i) | configuration table | configuration table | configuration table |
| Starting voltage drop | **none** | **< 2.5% primary / < 5% secondary** | none | none | none | **< 2.5% / < 5%** | none | none |
| Small-project bypass | **≤ 10 kW** → separate process | **≤ 30 kVA** skips K/L/M; **≤ 500 kW** NEM/NBT skips L; non-export skips B–D and F–M | **≤ 50 kW** expedited, **≤ 300 kW** if UL 1741 SB | **≤ 100 kVA** → simplified; non-export riders skip 4/5/6/8/9 | — | **≤ 25 kW** simplified | **≤ 20 kW** | **≤ 25 kW AC** |
| Network penetration | lesser of 5% of spot network max load **or 50 kW** | Screen A, with spot-network exception at the same 5%/50 kW | **15% of network minimum load** and **50% of transformer minimum load** | Screen 3 fails networks | lesser of 5% or 50 kW | 1/15th of minimum load | lesser of 5% or 50 kW | spot **5% or 300 kW**; area **10% of minimum load or 500 kW** |
| Hosting capacity used as a screen | no | **yes — the governing path** | no, informational | no, PUC deferred it | no | **absent from the tariff entirely** | no, zero mentions in the DIP | no, DSP only |

**Direct answer on hosting-capacity screens: California is the only one of the eight.** Rule 21 Screen M is literally titled "When ICA Values are available at the requested Point of Interconnection," and § F.2.a obliges the utility to **refresh stale ICA values at the requested POI**, share the updated values, explain what changed, and run no additional ICA for projects < 30 kVA. Everywhere else the data path is the **pre-application report** — which Minnesota (§ 1.4.2.8), Colorado (3853(a)(IV)(viii)) and New York (Appendix D) all require to include daytime minimum load by explicit cross-reference to the supplemental screen.

**Verification caveats.** California: PG&E's tariff only — SCE and SDG&E sheet numbers, advice letters and Screen L handbook references differ. Massachusetts: National Grid's version only, not Eversource or Unitil. Hawaii: HECO and MECO verified identical; HELCO not extracted.

---

## 4. Minimum load and the 15% screen in practice — the crux

### 4.1 Where the 15% number comes from

The chain is: minimum load on a typical radial circuit is roughly **30% of peak**; the islanding concern is generation approaching minimum load; apply a **50% safety factor** to 30% and you get the **15%-of-peak** screen. IREC stated this derivation in New Jersey rulemaking comments and PG&E's own interconnection guidance says the same ("minimum load on radial circuits is typically 30% of the peak load"). **Unverified** (comments and guidance, not a standard) — but it is the standard explanation and worth presenting as "the rationale the utilities and advocates both give."

Sandia has tested the screen against simulation — Reno & Broderick, *Technical Evaluation of the 15% of Peak Load PV Interconnection Screen* (2015), across **40 feeders** with three error metrics, plus the companion *Screening Distribution Feeders: Alternatives to the 15 Percent Rule*. **Existence and scope Verified; numeric conclusions Unverified** — get the OSTI full text before quoting any accuracy figure.

### 4.2 How minimum load is defined (Verified from SGIP § 2.4.4.1.1)

- **Solar PV, no storage → daytime minimum load.** 10 a.m.–4 p.m. fixed tilt; 8 a.m.–6 p.m. tracking.
- **Everything else, including PV + storage → absolute minimum load.** This is a much harder screen to pass and is a real design consideration: adding a battery moves you from a daytime window to the 3 a.m. trough.
- Only **net injection** counts where the facility serves station service load.
- Generation already baked into the measured minimum load is not double-counted.

### 4.3 What the utilities actually do when the data is missing

**Verified** from *CESIR Analysis Evaluation — Minimum Daytime Load Application & Assumptions* (NY DPS / Interconnection Technical Working Group, v1, 2024-02-13), an industry-authored document published on the New York DPS site:

> "The industry has consistently observed that minimum day time load data is not available for feeders. Based on the frequency of this scenario it is estimated that minimum load data is not available for the majority (**70-80%**) of the feeders."

> "In a scenario where minimum day time load (MDL) data is not available the utilities determine it based on the assumption that minimum day time load is **15%-40% of peak load**. The assumption varies across each utility."

Per-utility fallbacks and daytime windows, both quoted from that document (**Verified**):

| NY utility | MDL fallback when transformer loading unavailable | Daytime window used |
|---|---|---|
| Avangrid (NYSEG/RG&E) | **15% of peak load** | 10 a.m. – 6 p.m. (NYSEG) |
| Central Hudson (CHG&E) | **25% of peak load** | 10 a.m. – 3 p.m. |
| Consolidated Edison | **30–40% of peak load** | 11 a.m. – 2 p.m. |
| National Grid | **25% of peak load** | 9 a.m. – 6 p.m. |
| Orange & Rockland | Interval data available for all stations except Summitville, Wurtsboro, Pine Island (< 3% error from toll-grade readings) | **8 a.m. – 8 p.m. for PV, 24 hours for BESS** (document notes O&R stated 8 a.m.–3 p.m. elsewhere) |

Three things follow directly. First, **the same project gets a different answer in different service territories purely from the fallback assumption** — a 15% vs. 40% fallback is a 2.7x difference in the denominator. Second, **the ConEd 11 a.m.–2 p.m. window vs. O&R's 8 a.m.–8 p.m. window** changes which hour you are measured against. Third, O&R explicitly treats **BESS on a 24-hour basis**, matching FERC's absolute-minimum-load rule.

### 4.4 The 30% proxy is codified law in at least two states

| Jurisdiction | Codified fallback | Status |
|---|---|---|
| **Oregon**, OAR 860-082-0063 | "If minimum load data are not available, or cannot be calculated, estimated, or determined, the aggregated export capacity on the line section is less than **30 percent of the peak load**" | Unverified (Justia returned 403; text quoted from search snippet — reverify at oregon.gov before citing) |
| **New Mexico**, NMAC 17.9.568.16 | Pass if aggregate nameplate **≤ 100% of feeder or line section minimum load**, or if minimum load data unavailable, **≤ 30% of feeder/line section peak load** for inverter-based; **≤ 10% of peak** for rotating generation | Unverified (Justia 403; reverify at nmonesource.com) |
| **Massachusetts** utility practice | WMECO **30% of peak**; another EDC **25% of peak** | Unverified (DPU TSRG working-group attachments) |
| **Puerto Rico** (LUMA, pending) | Proposal to raise the supplemental-study trigger from **15% to 30%** of feeder annual peak | Unverified |

The New Mexico pair (30% inverter / 10% rotating) is the most useful single data point we found: it shows a regulator formally encoding **technology-differentiated** proxies.

### 4.5 What a screening tool can honestly do

| Input the user has | What we can honestly output |
|---|---|
| Nothing but a utility + size | Which process they are eligible for (§ 2.1 table), which screens exist, and what to ask for |
| Utility + size + line voltage + phase + service type | Pass/fail on **§ 2.2.1.6 (configuration), 2.2.1.7 (20 kW shared secondary), 2.2.1.8 (20% imbalance)**, and eligibility |
| A hosting capacity map number | A **comparison**, flagged as the utility's own published figure with its stated vintage and caveats — never recomputed by us |
| A line-section **peak** load (from a $300 pre-application report) | 15%-of-peak result, **and** a 100%-of-minimum-load result expressed as a **range over the 15–40% fallback band** |
| A measured line-section **minimum/daytime minimum** load | The 100%-of-minimum-load screen result — a real answer |
| **A Portland General, Xcel MN/CO, Duke Ohio or National Grid RI feeder** | A real 100%-of-minimum-load result from the utility's **own published** daytime-minimum-load figure, cited and dated, with Xcel's metered-vs-estimated flag surfaced. **These are the only territories where we can do the screen that matters** |
| **A California POI with ICA values** | The actual governing screens: **90% of the lowest ICA-SG and ICA-OF 576-hour value** (Screen M) and **100%** (Screen N) — pointing the user at the utility's own published profile rather than computing anything ourselves |

What we **cannot** do, and must say so plainly: fault current contribution (2.2.1.4), interrupting capability (2.2.1.5), transient stability (2.2.1.9), utility-side construction (2.2.1.10), the voltage/power quality screen (2.4.4.2), and the entire safety and reliability screen (2.4.4.3). That is **six of the twelve screens, including every screen that requires a model of the circuit.** Any tool claiming otherwise is guessing.

---

## 5. Hosting capacity maps, 2026 status

### 5.1 State mandates (Verified unless noted)

**A defensible count is 14–15 jurisdictions mandating publication.** NESCAUM's November 2025 brief names 12 (CA, CO, CT, DC, HI, IL, MA, MI, MN, NV, NJ, NY); it omits Maryland and predates Ohio.

| State | Status | Citation | Granularity / cadence |
|---|---|---|---|
| **California** | Mandated | CPUC **D.17-09-026** (R.14-08-013); **D.24-10-030** (R.21-06-017, 2024-10-23) | Line-section/node; **monthly** for changed circuits; CSV + API + bulk download required; portal registration **removed**; portal fixes due Dec 2026 |
| **New York** | Mandated | PSC Order on DSIP Filings, Cases **14-M-0101 / 16-M-0411** (2017-03-09) | All circuits ≥ 12 kV, now nodal (Stage 4.1); HC values ≥ annual, **data tables ≥ monthly**; developers must be able to download the underlying data "in a useable format" |
| **Colorado** | Mandated — strongest 2025–26 action | **Decision C25-0903** (Proc. 24A-0547E and 25A-0061E, 2025-12-15); **SB 24-218 / C.R.S. § 40-2-132.5(5)**; Rule 3527(k) | Unblurred **generation + load** maps, **no NDA**; the 15/15 rule may not be used to redact feeders; 60 days → quarterly → **monthly by end-2026**; **576-hour and 8760-hour results by end-2027** |
| **Ohio** | Mandated (new) | **R.C. 4928.83**, enacted by **HB 15** (136th G.A.), eff. 2025-08-14 | See § 5.2 |
| **New Jersey** | Mandated | **N.J.A.C. 14:8-5.11**, R.2026 d.010, 58 N.J.R. 72(a), eff. **2026-01-05**; BPU order 2025-08-13, Dkt. QO22030153 | Circuit-level (BPU declined finer); maximum additional **export-capable generation** and maximum additional **import/load** capacity; ≥ quarterly, monthly under the community-solar order |
| **Nevada** | Mandated | **NAC 704.9237(3)(b), (5)**; **NRS 704.741(4)** / SB 146 (2017) | Substation, feeder and **primary node**; ≥ annual; portal must provide "accessible electronic data suitable for distribution to the public" |
| **Maryland** | Mandated | **COMAR 20.50.09.06(Q)** and 20.50.09.14; **emergency regs March 2026**; proposed regs **RM 94** (Feb 2026) | Feeder; **quarterly starting 2027-01** with a plan to move monthly. Today PHI is monthly, BGE quarterly. Must include circuit and feeder IDs, substation names, voltage, HC (range acceptable), closed/restricted circuits, reserve HC, HC fees |
| **Hawaii** | Analysis mandated; public map less clear | PUC Dkt. **2014-0192**, Order **33258** (2015-10-12); IGP Dkt. 2018-0165 | Circuit-level HCA filed in docket. **The PUC expressly declined a Rule 14H hosting-capacity screen.** Map mandate itself Unverified |
| **Illinois** | Mandated | **220 ILCS 5/16-105.17(f)(2)(E)(i)** (CEJA, P.A. 102-0662), utilities > 500k customers | Statute requires posting HCA results "with mapping and GIS capability" but sets **no cadence, granularity or download requirement**. Practice: ComEd quarterly, Ameren annual (Unverified) |
| **Michigan** | Mandated | MPSC Case **U-20147** (Aug 2020 zonal order; a reported **July 2025** order set update requirements for DTE and Consumers); related U-21251 | Zonal initially; later scope unclear. **Unverified — MPSC pages return 403** |
| **Massachusetts** | Mandated | A **2020 DPU order** required public HC maps plus a per-location/circuit/substation dataset (per NESCAUM, Nov 2025); open **D.P.U. 25-48** (opened 2025-05-27) covers HC transparency and queue data | **Unverified — do not cite a docket number for the 2020 order**; it could not be retrieved |
| **DC** | Mandated | PSC Formal Case **1130**, Order **20364** (2020-06-05) | Feeder-level, **monthly** (Pepco). Unverified (cited from a Pepco filing) |
| **Connecticut** | Mandated | PURA **17-12-03** (Interim Decision 2019-10-02) and **17-12-03RE06**; new **25-1-27** on flexible interconnection | Maps live for Eversource and UI. Unverified (ordering language not confirmed) |
| **Virginia** | **No mandate found — treat as voluntary** | No SCC order or Va. Code section surfaced; Dominion's tool is a Grid Transformation Plan element | Dominion targets "at least quarterly," feeder-level; the residential tool is gated to "authorized users" |
| RI, OR, WA, NC, ME, VT, NH, PR, GA, SC, DE, ID, UT, AZ | Maps exist, **no mandate found** | DOE Atlas lists 58 utilities/agencies across 26 states + DC + PR (as of May 2024) with no legal basis recorded | — |

**Monthly or better today:** CA, NY, DC (plus NJ for community solar). Colorado joins end-2026; Maryland is on a quarterly-to-monthly path. **Load as well as generation:** CA, CO, NJ, OH, NY (via utility layers). Minnesota is generation-only; NV, MD and IL rules are silent. **Machine-readable download actually mandated:** CA, NY, MN, NV, CO — **not** OH, IL, MD or NJ.

### 5.2 Ohio's 2026 requirement — confirmed (Verified by reading R.C. 4928.83)

| Item | Finding |
|---|---|
| Authority | **R.C. 4928.83**, enacted by **HB 15** (136th General Assembly), effective **2025-08-14** |
| Who complies | **Every electric distribution utility in Ohio** — AEP Ohio, Duke Ohio, AES Ohio, and FirstEnergy's Ohio Edison / Cleveland Electric Illuminating / Toledo Edison |
| Deadline | **Not later than 2026-05-31**, posted on the utility's website |
| Required content | (1) total available hosting capacity **for new loads** in MW; (2) a **separate** DER hosting capacity figure or map; (3) geographic locations and voltage levels of circuits and substations; (4) total existing and **queued loads or generation > 1 MW** per circuit and substation; (5) available substation and circuit capacity in MW |
| Cadence | **At least quarterly** |
| PUCO role | Must set **uniform reporting standards**, may require additional data points, and must hold **≥ 2 stakeholder meetings per year** on map design, accuracy and usability. The section also adds annual per-circuit reliability reporting |
| Download required? | **No** — the statute is silent on machine-readable format |
| PUCO docket | Reported as **25-0765-EL-UNC** with a directive announced 2026-03-04. **Unverified — PUCO's docket system WAF-blocks automated requests. Do not cite without manual confirmation** |
| Compliance | All four Ohio EDU maps are **live and verified**, each with a load/generation toggle — strong evidence the deadline was met |

**Ohio is now the clearest US precedent for compelling publication of load-side capacity, and it visibly produced the richest public feeder-load data in the country** (§ 5.4).

### 5.3 Utility hosting capacity map URLs and data availability

Every row was fetched. "Downloadable" means an unauthenticated ArcGIS REST endpoint or confirmed in-map export. **All Verified** unless noted.

| Utility (state) | URL | Data availability | Terms |
|---|---|---|---|
| **PG&E** (CA) | `grip.pge.com` (GRIP; PG&E is **retiring** the standalone ICA and DIDF maps) | **Yes** — 21 layers + 2 tables, `Query,Extract`; zipped per-feeder **576-hour ICA CSVs** | Quick Start Guide: "There is no log in required." No license text |
| **SCE** (CA) | `drpep.sce.com/drpep/` | Partly — `Query` only, declares csv/geojson/shapefile export | No key, no login, no copyright text |
| **SDG&E** (CA) | `interconnectionmapsdge.extweb.sempra.com` | In-map "Export Data" (xlsx); REST path not recoverable | **Most restrictive in the set:** "Replication of these maps is prohibited… publication or distribution of data downloaded from the maps without SDG&E's express written consent is prohibited" |
| **Con Edison** (NY) | `coned.com/en/business-partners/hosting-capacity` → ArcGIS Experience | **Yes** — `Query,Extract`; csv/shp/geojson/gdb/xlsx/kml; nodal HCV, EV, storage, 33 kV layers | No login, no CEII notice; informational only. DG/queue **monthly** |
| **National Grid** (NY) | `systemdataportal.nationalgrid.com/NY` | Endpoint yes, **no Extract** — needs paginated `/query`. 15 MapServers incl. hosting capacity, EV load-serving, ESS charge | None at the REST tier |
| **NYSEG / RG&E** (NY) | ArcGIS instant portfolio app | **Yes** — `Query,Extract` | No login, empty copyright. **Caution: one layer's metadata permits anonymous update/delete — an apparent Avangrid misconfiguration. Do not touch it** |
| **Central Hudson** (NY) | ArcGIS Experience (PV and storage apps) | **Yes** — `Query,Extract`, Stage 4.1 nodal | None on the services. `cenhud.com` itself is Imperva-blocked |
| **Orange & Rockland** (NY) | `oru.com/en/business-partners/hosting-capacity` | **Yes** — same Esri tenant as Con Edison; nodal HCV, LSRV, EV feeders; monthly | Site ToS. The Joint Utilities page says the map **requires an O&R or ArcGIS sign-in**; our fetch did not demand auth — treat as uncertain |
| **Eversource** (MA) | `navigator.eversource.envelio.com` | **Viewer-only** as far as confirmable — bespoke Envelio SPA with a private JSON API and a `/login` route | `noindex,nofollow`; no CEII. Download capability **Unverified** |
| **National Grid** (MA) | `systemdataportal.nationalgrid.com/MA/` | Endpoint yes, **no Extract** | None at the REST tier |
| **Hawaiian Electric** (HI) | Locational Value Map pages (public page is Oahu-only) | **Yes** — `Query`; csv/shp/geojson/xlsx. **HELCO and MECO layers exist in the services** even though the public page is not. Search returns only the first 100 records | No login, no copyright. Refreshed **nightly on weekdays** |
| **Xcel Energy** (MN) | `mn.my.xcelenergy.com/…/hosting-capacity-map` | **Yes** — `f=geojson`, no token, **226,107 features**, 2,000/page; a new service per month since 2022 | `access: public`, empty `licenseInfo`. **Geometry deliberately blurred** |
| **Xcel Energy** (CO) | ArcGIS Experience | **Yes** — generation **and load** raster/conductor layers | Public, no license text |
| **ComEd** (IL) | `comed.com/…/hosting-capacity-map` | **Viewer-only** — the REST proxy returns **403 GWM_0003** (token-gated) | No NDA; proxy auth only |
| **Ameren Illinois** | ArcGIS Experience, four pages (distribution and subtransmission × gen and load) | **Viewer-only** — no public FeatureServer located | Ameren IL general T&C; not available to Missouri customers |
| **Duke Energy** (NC/SC and OH) | ArcGIS Experience, separate Carolinas and Ohio apps | **Yes** — `Query`. **The Ohio app has a load map; the Carolinas app has generation only** — almost certainly because of HB 15 | Empty copyright, no login |
| **Dominion Energy** (VA/NC) | `dominionenergy.com/…/hosting-capacity-tool` | **Yes** — the page prints the REST URL under the legend. Thin schema (`LIMIT_VAL` only); excludes industrial and network feeders | Disclaimer PDF, no login |
| **AEP Ohio** | `aepohio.com/company/about/hosting-capacity` → ArcGIS dashboard | **Yes** — **118,735 features**; max-load-by-grid and max-gen-by-grid layers (multi-opco despite "MI" in the service name) | `aep.com/terms/`; preliminary review only; no login |
| **AES Ohio** | `aes-ohio.com/hosting-capacity-map` → ArcGIS dashboard | Viewer-only; load/generation toggle; per-circuit refresh dates | Site terms, no login |
| **FirstEnergy Ohio** | `firstenergycorp.com/feconnect/ohio-interconnection/oh-hosting-capacity-map.html` | Viewer-only; load, generation and battery layers plus in-queue load/gen fields | Site terms of use, no login |
| **Pepco / Delmarva / ACE** (MD, DE, NJ) | `pepco.com/…/hosting-capacity-map` | **Yes** — six layers plus a nodal `phi_section_hc` and an EV load-serving layer | `Query` only, no login |
| **BGE** (MD) | `bge.com/…/restricted-circuits-map` | **Yes** — mile, quarter-mile and 1/16-mile grid layers | `Query` only, no login |
| **Portland General** (OR) | ArcGIS Experience from the distribution system planning page | **Yes** — `Query,Extract`. **The richest schema we found** (see § 5.4) | `access: public`; informational-use disclaimer |
| **Georgia Power** (GA) | Survey123 request form | **Gated — no public endpoint.** **The hardest gating found: registration + disclaimer acknowledgment + an executed NDA**, licensed only for the calendar year, data declared confidential and non-disclosable, view-only | Refresh "biannually" |
| **NV Energy** (NV) | `drp.nvenergy.com/drp-external/` | **Login wall**; Chrome-only | Account required |
| **Consumers Energy** (MI) | ArcGIS instant lookup app | Viewer-only ("Protection Zones") | None stated |
| **DTE** (MI) | ArcGIS web app viewer | Viewer-only; a separate **monthly queue spreadsheet** exists | None stated |
| **PSE&G** (NJ) | `nj.pseg.com/…/solarandrenewableenergy`; separate EV map | **Viewer-only, address-search — the weakest in the set** | Not a substitute for a service application |
| **APS** (AZ), **SRP** (AZ), **Austin Energy** (TX), **PacifiCorp / Rocky Mountain Power** | — | **No map exists.** APS issues a pre-application report on request; SRP screens internally; Austin Energy uses the DGPA form; PacifiCorp's DOE Atlas link **404s** | **Verified negative** |

**Licensing bottom line: no utility in this set grants an explicit open license.** Almost all services carry empty `copyrightText` and only accuracy disclaimers — permissive by silence, not by grant. **No CEII restriction appeared anywhere in the set.** The real gates are Georgia Power (NDA plus annual license, redistribution barred), SDG&E (the only explicit no-republication clause), NV Energy (login), ComEd (token-proxied REST), and possibly O&R. **This is exactly why we link rather than host.**

### 5.4 Machine-readable feeder minimum and peak load — this changes what we can build

**Four utilities publish per-feeder load data through unauthenticated endpoints, and three of them publish minimum or daytime-minimum load directly. All Verified by retrieving actual records.**

| Utility | Fields published |
|---|---|
| **Portland General (OR)** | **The best schema found:** `Feeder_Peak_Load_MVA` and `Net_Daytime_Minimum_Load_MW`, keyed to real substation and feeder names. **549 feeders with peak > 0, 559 with a non-null daytime minimum.** Sample: Abernethy–Clackamas Heights, peak 5.1 MVA, net daytime minimum 1.775 MW. `Query,Extract` |
| **Xcel Energy (MN and CO)** | `fdml_kva` = feeder daytime minimum load, `stml_kva` = substation transformer minimum load, **`adml` = whether that figure is metered or estimated**, plus installed and queued DG fields. **225,981 of 226,107 MN features have `fdml_kva > 0`.** Sample: circuit AVR211 — stml 1574, fdml 431, adml "No", limiting factor "Breaker Reach." GeoJSON, no key. Caveats: geometry blurred; 2,000 records per page (~113 calls for MN) |
| **Duke Energy Ohio** | `min_load`, `max_load`, `median_load`, `spot_load`, `circuit_rating_v`, `circuit_load_capacity`, keyed to circuit name. **5,415 of 7,587 hexes have `min_load > 0`.** Duke's **Carolinas** layer has min/median/max **generation** only — the load fields are **Ohio-only**, almost certainly because of HB 15 |
| **National Grid Rhode Island** | The only **forward-looking** per-feeder forecast found anywhere: summer rating, current-year peak and percent of peak, and **peak MVA for years +1 through +9** across 352 feeders. Sample: Valley 49_53_102W41 — 12.31 MVA rating, 8.06 MVA peak, 65.5%. **But `Refresh_Date` is 2024-04-09, roughly 2.5 years stale** |

**The irony worth putting on the page: California, the historical ICA leader, is now the weakest documented.** PG&E's ICA and DIDF maps are retired and everything moved to GRIP, whose public DRP page lists only two PDFs with no documented CSV, shapefile or REST path (data requests go to an email address). CPUC filings say GRIP holds feeder and line-section load and generation capacity refreshed monthly, but the publication format is publicly undocumented — **Unverified**. SCE's DRPEP is a JS SPA, so blocked rather than confirmed absent. **Net: Xcel, Portland General and Duke Ohio now expose richer per-feeder load data through unauthenticated ArcGIS REST than California does through its mandated ICA.**

Negative findings: **Hawaiian Electric publishes DG penetration as a percentage of peak circuit load — a ratio, not the load value.** **AEP Ohio** carries feeder rating, transformer capacity, queued capacity and max HC load — ratings and headroom, not measured load.

### 5.5 Is there a national index yet? No — definitively (Verified)

Earlier research found none, and **that has not changed as of late October 2026.**

| What exists | Nature |
|---|---|
| **DOE (EVGrid Assist) "U.S. Atlas of Electric Distribution System Hosting Capacity Maps"** | A plain HTML table of links. DOE states it "does not maintain the maps." Footer updated **July 2025**; caption still cites May 2024 (58 utilities, 26 states + DC + PR). No download, no API, no harmonization — and **already stale** (the PacifiCorp link 404s) |
| **DOE i2X** | Active in 2026 (pages July–October 2026). Its DER Interconnection Roadmap *recommends* better HCA data access. **No index, no standard, no dataset** |
| **IREC** | A static, undated bullet list of about ten map links; the newest asset on the page is from 2022. **Not a tracker** |
| **Open Energy Transition "Awesome Electrical Grid Mapping"** | Actively curated catalog (533 commits, 2026 entries). Its only US national HC entry is… the DOE Atlas |
| **EPRI eRoadMAP v3.1** (Oct 2026) | **The closest multi-utility viewer**: utility load-capacity layers from roughly ten contributing utilities plus a national service-area layer. **View and share only, no bulk download**, EV-charging framing, and it disclaims cross-utility comparability |
| **Sandia RAIICE / Harvard Dataverse** | **The only genuine harmonized hosting-capacity dataset** — circuit-level polylines scraped from utility maps for **seven Northeast states** (CT, ME, MA, NH, NY, RI, VT), raw plus cleaned/merged network, DOI 10.7910/DVN/HSHLLT, published in *Scientific Data*. **Regional, not national** |
| **Sungarden** (commercial), **capacity-atlas** (MIT-licensed indie scraper, weekly snapshots, 2 utilities, 758,915 line sections) | Scrapers — **all New York only** |
| **OEDI / data.gov / NREL / LBNL / EPRI DRIVE / GridUnity / Enverus / SEIA / Google Tapestry** | OEDI returns **zero** aggregating datasets for "hosting capacity"; data.gov surfaces only New York's IEDR; NREL publishes methodology (HCA data validation with IREC, Advanced HCA) not data; LBNL's queue work excludes distribution; DRIVE is licensed utility software; the rest are utility-side tooling or transmission-side |
| **Standards** | **No hosting-capacity map data standard exists.** IEEE 1547-2018 covers DER interfaces, not HC publication. **No "PV hosting capacity consortium" exists** |
| **Contrast: the EU built one** | **Capacitypedia**, launched around 2026-06-01 — an ENTSO-E and DSO Entity pan-EU hosting-capacity portal aggregating voluntarily provided TSO and DSO data. **Unverified**, but if true it sharpens the gap rather than closing it |

**Useful operational detail for a link directory:** many utilities share Esri tenants, so a handful of tenant IDs covers a lot of ground — Con Edison and O&R share one; BGE and the Pepco companies share another. SCE and National Grid self-host ArcGIS Enterprise. Two residual gaps: ORNL's OpenEnergy Hub catalog renders client-side and could not be fully enumerated, and several search summaries rendered the national lab's name and domain inconsistently — not relied on.

**So a curated, dated, honestly-caveated directory of hosting capacity maps with per-utility data availability and terms is a real gap we can fill cheaply, and nobody maintains one.**

---

## 6. Costs and timelines

### 6.1 The FERC pro forma baseline (Verified, read in the tariff today)

Every fee and deadline below is tariff text, so we can publish it with a section citation and no estimation.

| Item | Amount / deadline | Section |
|---|---|---|
| **Pre-application report** | **$300**, non-refundable; report due in **20 Business Days** | § 1.2.2 |
| **10 kW Inverter Process** application | **$100**, non-refundable | Attachment 5 |
| **Fast Track** processing fee | **$500**, non-refundable | Interconnection Request, "Processing Fee or Deposit" |
| **Study Process** initial deposit | **Not to exceed $1,000** toward the feasibility study | same |
| **Feasibility study** deposit | **Lesser of 50% of the good-faith estimate or $1,000** earnest money | § 3.3.2 |
| **System impact study** deposit | Good-faith estimated cost may be required (no cap) | § 3.4.7 |
| **Facilities study** deposit | Good-faith estimated cost may be required (no cap) | § 3.5.5 |
| **Supplemental review** | Customer pays **actual costs**; deposit = good-faith estimate; agreement + deposit due within **15 Business Days** of the offer | § 2.4.1, 2.4.3 |
| Initial review | **15 Business Days** from a complete request | § 2.2 |
| Supplemental review | **30 Business Days** from deposit | § 2.4.4 |
| Agreement after passing initial review | **5 Business Days** | § 2.2.2 |
| Customer options meeting offer | within **10 Business Days** of determination | § 2.3 |
| Agreement after passing supplemental review | **10 Business Days** (no utility construction) / **15 Business Days** (facilities or minor modifications) | § 2.4.5.1–.2 |
| Completeness determination | **10 Business Days**; customer then has **10 Business Days** to cure | § 1.3 |

The honest expectation-setting message: **the published clocks total well under three months to an executable agreement if you pass, and the pro forma caps the customer's screening exposure at roughly $300 + $500 + a supplemental-review deposit.** The costs that actually sink projects are the *upgrade* costs revealed by the Study Process, which are uncapped and not published anywhere ex ante.

### 6.2 Actual measured timelines and costs

**The anchor source is new and good: LBNL/i2X, *Interconnection Timelines and Costs for Distributed Energy Projects in the United States (2000–2025)*, September 2026** (Chelminski, Wong, Schwartz, Pigman, Carlson) — the first nationwide DER interconnection dataset, **2.7 million+ applications**. **Verified** (PDF text extracted directly). Note that **"Queued Up: 2025 Edition" is transmission-only** and explicitly excludes distribution and small DER — do not cite it for this page.

**Days from application to Interconnection Service Agreement, median** (LBNL, p.35; CA excluded because its pre-construction ISA is waived; NJ is 94% of the sample) — **Verified**:

| Size | 2000–09 | 2010–14 | 2015–19 | 2020 | 2022 | 2024 | 2025 |
|---|---|---|---|---|---|---|---|
| < 50 kW | 266 | 130 | 106 | 110 | 116 | 109 | **97** |
| ≥ 50 kW–5 MW | 442 | 201 | 223 | 366 | 207 | 178 | **97** |
| > 5 MW | — | 379 | 630 | 620 | — | — | — |

**Days to ISA by state, 2000–2025 median** (LBNL p.36 — the best state comparison in existence): RI **5** (< 50 kW) / 140 (≥ 50 kW–5 MW); MN 26 / 157; MA 29 / 62; ME 52 / 194; NJ 115 / 265; VA 123 / **690**; DC 193 / 240; CT — / 181. **Verified.** More than half of **< 30 kW** projects reached PTO within 90 days (2020–25), but only **2.4%** of 1–5 MW projects reached PTO within two years.

**Customer-paid upgrade costs, $/kW, 2015–2025** (LBNL pp.49–52, 60). **Cost data exist for only four states (CO, CT, NY, RI), and NY is > 99% of the sample** — so any "national" $/kW figure is really a New York figure, and New York socializes nearly all small-project upgrade cost. **Verified**: **< 30 kW: $0/kW** (100% of NY projects paid nothing); 30–100 kW **$12/kW**; ≥ 50 kW–5 MW **$136/kW**; > 500 kW–1 MW **$221/kW** (highest size bin); > 5 MW **$145/kW**; solar > 5–10 MW **$383/kW**. Medians by state: CT **$281/kW**, RI **$173/kW**, CO **$87/kW**, NY **$0**. High $/kW in the smallest bin correlates with **withdrawal** — the cost is why the project died.

**The residential reality check** — NREL/TP-6A20-92539, *Residential and Small Commercial Solar PV and Storage Permitting, Inspection, and Interconnection Timelines (2017–2023)* (SolarTRACE; 22% of US residential solar installs, ~4,000 AHJs). **Verified.** 2023 medians | means, business days: utility authorization-to-build **1 | 7**; final interconnection to PTO **9 | 18**; total contract-to-PTO **97 | 116**. PV-plus-storage total **159 | 181** business days, and the storage-vs-solar gap widened from ~4 weeks (2019) to **13 weeks (2023)**. State medians, total sign-to-PTO 2023: TX **55**, AZ 70, CA 113, NJ 117, CO 126 days. **The message for our page: the utility interconnection steps are the small part** — 1 day median to authorize, 9 days median to PTO. The 97-day total is dominated by the installer's design and install phases.

**DOE i2X 2030 targets** (PNNL-35696, *DOE Distributed Energy Resource Interconnection Roadmap*, 2024-09-06). **Verified**: median request → interconnection agreement **< 1 day** (< 50 kW), **< 75 days** (50 kW–5 MW), < 140 days (> 5 MW); completion rates > 99% / > 90% / > 85%. Against LBNL's 2025 actuals, **small systems miss the < 1 day target by two orders of magnitude while medium systems now beat the 75-day target** — the strongest single contrast for an expectation-setting page.

**Fast-track failure rates (Verified).** PG&E's Q3 2021 Rule 21 data report, cumulative 2012–2021 for **exporting non-NEM** projects: **1,872 applications, 4 passed Initial Review**, 1,712 failed; of those, 1,192 requested Supplemental Review, 622 passed and 522 withdrew. Most-failed screens were **Screen J and Screen I**. For **NEM** projects the picture inverts: only **0.15%** (286 of 187,098) needed more than Initial Review at PG&E, vs. **11.3%** of non-NEM at SCE. Mean business days at PG&E for NEM: **14.5** if Initial Review only, **201.8** if Supplemental Review was needed, **249.4** if Supplemental Review plus system impact study. Sources: PG&E quarterly Rule 21 data report; CPUC/Guidehouse *Rule 21 Interconnection Program Evaluation* (Mar 2021), Tables 57 and 107.

**New York study and upgrade costs actually paid, 2020–2024** (NY DPS, *SIR CESIR Cost Analysis 2020–2024*, Feb 2025). **Verified.** Average CESIR study cost: CECONY **$3,930**, RG&E $5,192, NYSEG $6,487, National Grid $9,148, Central Hudson $15,060, O&R $22,095, PSEG-LI **$62,441**. Average **actual upgrade** cost paid: CECONY $53,944, PSEG-LI $102,490, Central Hudson $214,997, National Grid $309,461, NYSEG $420,057, RG&E $423,321, O&R **$614,525**. 78% of CESIRs were completed within 60 business days and 95% within 100 (PSC Order, Cases 24-E-0621 and 24-E-0415, 2026-08-13).

**Distribution upgrade unit costs** (Ameren Illinois DER guide, table updated 2025-11-18). **Verified**: 1 mile reconductoring **$516K–$774K**; pole recloser $100K–$150K; substation recloser $225K–$338K; 14 MVA substation transformer **$1.8M–$2.7M**; 100 kVA padmount transformer $7K–$10.5K; pole-mounted primary metering $11K–$16.5K. Equipment costs escalated **25%–138%** by type between 2019 and 2024 (National Grid filing).

**Published fee schedules beyond the FERC baseline (Verified from tariffs).** **California:** PG&E residential NEM/NBT **$145** (≤ 1 MW), non-NEM or > 1 MW **$800**, supplemental review **$2,500** non-NEM but **$0** for ≤ 1 MW NEM/NBT; SCE **$94**; SDG&E **$132** (2017 sheet — label "as posted"); all three IOUs: system impact / facilities study deposit **$10,000 / $15,000** for ≤ 5 MW, first **$5,000** waived for solar ≤ 1 MW not selling power. **New York** (eff. 2026-10-01): **$0** at ≤ 50 kW, **$750** above (refunded to net-metered customers), supplemental screening **$2,500** nonrefundable billable to a **$5,000** cap, storage protection-and-control review $500 + $4/kW capped at **$3,000**, residential ≤ 25 kW safety equipment capped at **$350**. **Minnesota** (2025-04-24): **$100** / **$100 + $1/kW** / **$1,000 + $2/kW**. **Ameren Illinois** (2026-03-05): Level 1 ≤ 25 kW export **$50** with a **$200 customer cost cap** (remainder to rate base under CEJA), Level 2 **$100 + $1/kVA**, supplemental review **$1,500**. **National Grid MA** (M.D.P.U. 1468, 2021): **$28** simplified, **$4.50/kW** expedited and standard (min $300, max $7,500), supplemental review 30 engineering hours at $150/hr capped at **$4,500** — a superseding M.D.P.U. 1579 (eff. 2025-04-15) and all Eversource MA fees are **Unverified**.

**Massachusetts is the only measured-performance regime.** D.P.U. 11-75-F's Timeline Enforcement Mechanism requires annual per-company filings of average business days to execute an ISA by tier, with penalties when performance deviates more than **5%** from tariff time frames (weights: simplified 20%, expedited 40%, standard 40%). National Grid's 2025 filing reports meeting all time frames with no penalties and maximum offsets of **$1,500,000**. **Verified**; underlying day counts are docket-only.

### 6.3 Where public data does not exist — say this on the page

- **California publishes no current interconnection statistics.** CPUC quarterly IOU data reports **stop at Q3 2021**; the only systematic analysis (Guidehouse, Mar 2021) has a data window ending **June 2019**; LBNL excludes CA entirely. California is roughly 65% of all DER applications nationally and has the worst public data.
- **No recurring median-days-to-PTO series exists for any state.** The LBNL September 2026 report is a one-off, not an annual series.
- **Upgrade cost data exist for four states only**, > 99% New York.
- **No NY CESIR fee schedule by size tier exists**; cost is per-utility, per-project, from annually updated cost matrices. NY utilities only begin filing business-days-to-CESIR data on **2027-03-31**.
- **Hawaii publishes nothing usable** — no fee schedule, no queue dashboard, no approval statistics; Rule 14H simply bills the utility's IRS cost estimate.
- **The widely referenced "Massachusetts Interconnection Dashboard" does not exist.** DPU 25-48 (opened 2025-05-27) proposes periodic public reporting of review times, approval rates and upgrade costs — not yet in effect. The NY joint-utilities dashboard URL returns 404.
- **Illinois and Minnesota publish no interconnection statistics.**
- **LBNL *Tracking the Sun* reports total installed price only** — no interconnection line item. Do not expect a cost breakout from it.

---

## 7. Related free calculations we could offer

| Calculation | What's knowable | Verdict |
|---|---|---|
| **Inverter sizing / DC-AC ratio (ILR)** | Arithmetic is trivial; the value is benchmark context. EIA is cited as putting individual-system ILR at **1.13–1.30**; LBNL *Utility-Scale Solar* showed utility-scale average DC:AC rising from **< 1.2 to > 1.3 (2010→2016)**. Both **Unverified** — I did not open the LBNL or EIA primaries. LBNL *Tracking the Sun* is the right source for distributed-sector medians; get the current edition before publishing a number. | **Ship the calculator, defer the benchmark table** until the LBNL/EIA figures are verified |

**Update 2026-11-01:** the EIA figure is now **Verified** from the primary (*Today in Energy*, May 25, 2018, `eia.gov/todayinenergy/detail.php?id=35372`): "For individual systems, inverter loading ratios are usually between 1.13 and 1.30," with a capacity-weighted average of **1.25** at end-2016. `interconnect.inverter.size` cites it with that date and ships no benchmark table of its own. The LBNL figures remain unverified: `emp.lbl.gov` returns HTTP 403 to scripted requests, so *Tracking the Sun* needs a manual download.
| **Export limiting / power control systems** | **The brief's "UL 1741 SB" is a mislabel worth correcting on the page.** UL 1741 **Supplement SA** is the older grid-support track written for CA Rule 21 / HI Rule 14H. **Supplement SB** is "Grid Support Utility-Interactive Inverters and Converters Based Upon IEEE 1547-2018 and IEEE 1547.1-2020" — it is the **1547-2018 conformance** route, not the export-limiting standard. The **PCS** standard is **UL 3141**, plus the **UL 1741 PCS CRD**. Edition dates conflict across sources (3rd ed. Sept 2021 vs. a 2nd-ed. Sept 2020 revision that first added SB; a CSA letter cites a 3rd ed. revised 2023-05-19). SA/SB: **Verified** via the California Energy Commission notice adding UL 1741 3rd Ed. Supplement SB to the Solar Equipment Lists and an EPRI DER-settings FAQ. Editions and UL 3141: **Unverified** | **Link-only + a short "SA vs SB vs UL 3141" explainer.** Correcting this confusion is genuinely useful and costs us nothing |
| **NEC 705.12 busbar / 120% rule** | roughlogic.com already covers premises wiring, so this is a **boundary, not a feature**. The interconnection-relevant point is one sentence: where a PCS is installed per **705.13**, the **PCS controller setting is treated as the power-source output circuit current** for 705.12 purposes — so a PCS is an alternative to the 120% busbar allowance, and that is what lets a project avoid a service upgrade. Section numbering **moved between editions** (120% rule at 705.12(B)(3)(2) in 2020 → 705.12(B)(2)(b) in 2023; sources claim the 2026 NEC moves PCS to Article 130 Part II and adds a 120.7(B) 80%-of-OCPD limit for load calcs). All **Unverified** — forums and vendor blogs only; nobody should cite these from us | **Link to roughlogic.com.** Do not restate NEC section numbers we have not verified against the adopted edition |
| **Transformer loading from DER backfeed** | Real screens exist and are quotable where codified. **Verified:** Ohio OAC 4901:1-22-07(B)(1)(j) caps aggregate DER on a single-phase shared secondary at **65% of transformer nameplate**; (B)(1)(g) caps 240 V center-tap imbalance at **20% of nameplate**. FERC SGIP 2.2.1.7 uses a flat **20 kW** instead. **Unverified:** Michigan limits single-phase DER on three-phase service to **10% of service transformer nameplate**; Illinois sets a reverse-power protection default of **0.1% export** of transformer nominal nameplate with **2.0 s** max delay; Michigan's import default is **5%** of DER nameplate with **2.0 s** max delay; PSEG-LI studies substation penetration above **80%**; New Mexico/Illinois allow limited-export sizing at **≤ 50% of verified 12-month minimum host load** | **Ship** a shared-secondary / service-transformer checker — it is the one backfeed screen where the user owns every input |

---

## 8. What to ship, and what NOT to

### 8.1 Screening outputs worth shipping

See "Recommended for gridprims" below for the ship/defer/link-only call on each. In priority order the eight outputs are: (1) a **process router** — 10 kW Inverter Process vs. Fast Track vs. Study Process from the § 2.1 eligibility table; (2) a **screen-by-screen checklist** with exact thresholds, each marked *you can answer this* or *only your utility can*; (3) **pass/fail on the locally-evaluable screens** (configuration/grounding, 20 kW or 65%-of-nameplate shared secondary, 20% imbalance); (4) a **minimum-load band calculator** showing the 15%-of-peak result and the 100%-of-minimum-load result across the 15–40% fallback spread, with the user's codified state fallback highlighted; (5) a **feeder minimum-load lookup** for the four territories that publish it and a **California ICA helper** for Screens M and N; (6) the **state threshold comparison** of § 3.6; (7) a **"how to get your feeder data"** walkthrough of SGIP § 1.2 — the $300 fee, the 20-Business-Day deadline, the 13 enumerated items; (8) **"storage changes your screen"** — the § 2.4.4.1.1 shift from a daytime window to absolute minimum load — plus a **timeline and fee expectation-setter** from the published clocks in § 6.1.

### 8.2 What we must not ship

| Don't | Why |
|---|---|
| Any **pass/fail verdict** on 2.2.1.2, 2.2.1.4, 2.2.1.5, 2.2.1.9, 2.2.1.10, 2.4.4.2 or 2.4.4.3 | We lack the data. Asserting a result on these **is** performing an interconnection study, which we are not qualified or authorized to do |
| Our own **hosting capacity or available-capacity numbers**, or any recomputation of a utility's published figure | That is an ICA. Publishing one invites reliance we cannot support |
| **Feeder topology, line-section boundaries, sectionalizing device locations, substation coordinates, protective device ratings, or interrupting capability values** — hosted, mirrored, or derived | Squarely within **18 CFR 388.113(c)(2)**: "specific engineering, vulnerability, or detailed design information" that relates to how energy is distributed, could be useful in planning an attack, is FOIA-exempt, and does **not** "simply give the general location." Interrupting capability and protective device ratings are the clearest cases |
| **Scraped or mirrored hosting capacity datasets** | Even where downloadable, terms of use vary per utility, several states withhold substation locations as CEII (New York's IEDR omits them for exactly this reason, and SPP's tool hides transmission lines), and the data goes stale. **Link out; never host.** Note 388.113 does **not** contain a public-domain exclusion — being published elsewhere is not by itself a safe harbor |
| **IEEE 1547 tables reproduced with IEEE's structure**, or links to unauthorized full-text copies | § 2.3 above |
| Unverified NEC section numbers, IEEE prices, or ILR benchmarks | Everything on the site should be reverifiable by the reader |

The framing that keeps us safe and still useful: **we publish the rules and the arithmetic; the utility publishes the data.** Every output should name the screen, quote the threshold, cite the tariff section, and state plainly which input only the utility can supply.

---

## Recommended for gridprims

| Item | Call | Note |
|---|---|---|
| FERC Fast Track process router + eligibility table | **Ship** | Tariff lookup, deterministic, zero feeder data |
| Screen-by-screen explainer with exact thresholds and "who can answer this" labels | **Ship** | The honest core of the tool |
| Locally-evaluable screens: configuration/grounding, shared secondary, 240 V imbalance, service-transformer backfeed | **Ship** | Every input is user-owned |
| Minimum-load range calculator (15%-of-peak + 100%-of-min-load across the 15–40% band) | **Ship** | Output a band and the codified state fallback; never a single number |
| **Feeder minimum-load lookup for Portland General, Xcel MN/CO, Duke Ohio and National Grid RI** | **Ship — highest new value** | Link to the utility's own published figure, dated, with Xcel's metered-vs-estimated flag surfaced. The only places the real screen is computable |
| **California ICA screen helper** (90% Screen M / 100% Screen N against the published 576-hour profile) | **Ship** | Point at PG&E/SCE/SDG&E's own profile; we compute nothing |
| State threshold comparison (FERC / CA / NY / HI / MA / OH / TX) | **Ship** | Exists nowhere free. Highest differentiation per hour of work |
| "How to get your feeder data" — SGIP § 1.2 pre-application report walkthrough | **Ship** | $300, 20 Business Days, 13 enumerated items. Converts a dead end into an action |
| Storage-changes-your-screen explainer (§ 2.4.4.1.1 absolute vs. daytime minimum load) | **Ship** | Small, specific, citable, widely missed |
| IEEE 1547 default-settings reference, our own structure, Rule 21 § Hh cited first | **Ship** | Reverify the NREL sources first; they would be the cleanest citations |
| Timeline and fee expectation-setter from published tariff deadlines | **Ship** | All deadlines are tariff text |
| UL 1741 SA vs. SB vs. UL 3141 explainer | **Ship (short)** | Corrects a real and common confusion at no data cost |
| Inverter sizing / DC-AC ratio calculator | **Ship**, benchmark table **deferred** | Verify LBNL *Tracking the Sun* and the EIA 1.13–1.30 range first |
| Hosting capacity map directory with per-utility data availability and terms | **Link-only** | Link and describe; host nothing |
| NEC 705.12 / 705.13 busbar detail | **Link-only** | roughlogic.com covers premises wiring; our section numbers are unverified |
| Pass/fail on fault current, interrupting capability, transient stability, voltage/power quality, safety and reliability; our own hosting capacity numbers; feeder topology, device ratings, substation locations or mirrored HCA datasets; IEEE tables in IEEE's structure | **Do not ship** | Needs a circuit model (= the study we cannot do), is an ICA, is CEII-risky under 18 CFR 388.113(c)(2), or is copyrighted |

---

## Sources

**FERC and federal**
- FERC pro forma SGIP, current post-Order-792 text, read in full: PNM Attachment M, *Small Generator Interconnection Procedures (<20 MW)* — `pnm.com` (2023 compilation). Pre-792 text for comparison: Entergy's posted SGIP copy, `rfp.entergy.com/ENTRFP/SEND/Renewable/Docs/SGIP.pdf`.
- Order No. 792 (2013-11-22) and 792-A; Order No. 2006 (2005); Order No. 2023/2023-A (2023-07-27), *Improvements to Generator Interconnection Procedures and Agreements*, Federal Register 2024-04-16; Order No. 2222/2222-A (2020); Order No. 901 (2023-10-19) and the NERC Order 901 project pages.
- CEII: 18 CFR 388.113, read at `law.cornell.edu/cfr/text/18/388.113`. (eCFR redirected and could not be read directly.)
- 7 CFR 1730.63 — the only federal incorporation by reference of IEEE 1547 (the **2003** edition), **removed** at 87 FR 73443.
- *ASTM v. Public.Resource.Org*, 896 F.3d 437 (D.C. Cir. 2018); No. 22-7063 (D.C. Cir. 2023-09-12).

**State rules and tariffs (all read)**
- California: PG&E Electric Rule No. 21, Advice Letter **7692-E**, effective **2025-08-29**, Cal. P.U.C. Sheets 60053-E et seq. — `pge.com/tariffs/assets/pdf/tariffbook/ELEC_RULES_21.pdf`. Screens at §§ G.1 (A–M), G.2 (N–P), F.3 (Q–R); IEEE settings at § Hh, Sheets 60223-E–60229-E.
- Hawaii: Hawaiian Electric Rule 14, Appendices I and III — `hawaiianelectric.com/documents/billing_and_payment/rates/hawaiian_electric_rules/14.pdf` (MECO book verified identical on every screen). Order No. 40670, Docket 2019-0323 (2024-03-19); D&O No. 33258, Docket 2014-0192 (2015-10-12).
- New York: PSC Case 24-E-0621 et al., *Standardized Interconnection Requirements … 5 MW or Less*, effective **2026-10-01**, Appendix G — `dps.ny.gov`. Joint Utilities Standardized Preliminary Screening Template (Jan 2019), superseded. *CESIR Analysis Evaluation — Minimum Daytime Load Application & Assumptions*, ITWG v1 (2024-02-13) — `dps.ny.gov/si-cesir-analysis-minimum-daytime-load-application-assumptions-february-2024`. *SIR CESIR Cost Analysis 2020–2024* (Feb 2025). PSC Order, Cases 24-E-0621 and 24-E-0415 (2026-08-13).
- Massachusetts: National Grid, *Standards for Interconnection of Distributed Generation*, **M.D.P.U. No. 1632**, effective **2026-05-01** — `mass.gov/doc/iirg-materials-19/download`. M.D.P.U. No. 1619, Provisional System Planning Tariff. D.P.U. 11-75-F (Timeline Enforcement Mechanism); D.P.U. 25-48.
- Ohio: OAC **4901:1-22-07** — `codes.ohio.gov/oac/4901:1-22-07`. **R.C. 4928.83** (HB 15, eff. 2025-08-14) — `codes.ohio.gov/ohio-revised-code/section-4928.83`.
- Texas: 16 TAC **§ 25.211** and **§ 25.212** — PUCT compilations at `ftp.puc.texas.gov`. ERCOT Planning Guide § 5 (2026-08-01). PUCT Project No. 54233.
- Minnesota: **MN DIP v2.4** (PUC-posted "MN DIP 2025 Clean April 24 2025"), docket E-999/CI-16-521 — `mn.gov/puc`.
- Colorado: **4 CCR 723-3**, Rules 3851–3859, effective **2026-06-14** — Colorado Secretary of State. Decision **C25-0903** (2025-12-15); C.R.S. § 40-2-132.5(5).
- 30%-of-peak fallbacks (**both Unverified — Justia returned 403; reverify at the state sources**): Oregon **OAR 860-082-0063**; New Mexico **NMAC 17.9.568.16** and 17.9.568.12.

**IEEE 1547 free sources**
- IEEE SA 1547 page (`standards.ieee.org/ieee/1547/10906/`) for edition status. **Prices Unverified** — the Accuris and ANSI stores are Cloudflare-gated.
- NERC, *Reliability Guideline: BPS Reliability Perspectives on the Adoption of IEEE 1547-2018* — Tables 2.2 and 2.3.
- Sandia PVPMC / EPRI, *Smart Inverters and Grid Support Requirements* — `pvpmc.sandia.gov`, Clause 5 reactive capability and default volt-VAR curves.
- Unitil, *Default IEEE 1547-2018 Setting Requirements*; FirstEnergy PA *Specified Inverter Settings*; MISO *Guideline for IEEE Std 1547-2018 Implementation*; NRECA *Guide to IEEE 1547-2018 and Its Impacts on Cooperatives* (Mar 2019); EPRI "Crash Course on IEEE 1547-2018" hosted at `dam.assets.ohio.gov` (PUCO).
- **To verify next:** Mass.gov TSRG *Inverter Source Requirements Document* (403 today) and the two NREL reports (PES-TR67; NREL/TP 81028) — the lab domain was unresolvable today, and if they carry the numbers they are the cleanest citations available.
- UL: California Energy Commission, *Addition of UL 1741 3rd Ed. Supplement SB to the Solar Equipment Lists*; EPRI DER-settings FAQ (`dersettings.epri.com`).

**Minimum load, costs and timelines**
- LBNL/i2X, *Interconnection Timelines and Costs for Distributed Energy Projects in the United States (2000–2025)*, September 2026 — `eta-publications.lbl.gov`. (LBNL *Queued Up: 2025/2026 Edition* is **transmission-only** — do not cite it for DER.)
- NREL/TP-6A20-92539, *Residential and Small Commercial Solar PV and Storage Permitting, Inspection, and Interconnection Timelines (2017–2023)* — OSTI 3011864. Related, unfetched: NREL/TP-6A20-81459 (2022).
- PNNL-35696, *DOE Distributed Energy Resource Interconnection Roadmap* (2024-09-06) — OSTI 2997033.
- PG&E Q3 2021 Rule 21 quarterly data report; CPUC/Guidehouse, *Rule 21 Interconnection Program Evaluation* (Mar 2021), Tables 57 and 107 — both on `cpuc.ca.gov`.
- Ameren Illinois DER public-facing guide (upgrade unit costs, table updated 2025-11-18).
- Sandia: Reno & Broderick, *Technical Evaluation of the 15% of Peak Load PV Interconnection Screen* (2015) and *Screening Distribution Feeders: Alternatives to the 15 Percent Rule* — existence and scope Verified, **numeric conclusions Unverified**; get the OSTI full text before quoting an accuracy figure.
- The 30%-of-peak derivation (30% minimum load × a 50% safety factor): IREC's New Jersey rulemaking comments and PG&E interconnection guidance — **Unverified**, present as "the rationale both utilities and advocates give."

**Hosting capacity**
- Mandates: CPUC D.17-09-026 and **D.24-10-030**; NY PSC DSIP Order (Cases 14-M-0101 / 16-M-0411); CO Decision C25-0903 and SB 24-218; **R.C. 4928.83**; N.J.A.C. 14:8-5.11 (R.2026 d.010); NAC 704.9237 and NRS 704.741(4); COMAR 20.50.09.06(Q) plus the March 2026 emergency regs and RM 94; HI Docket 2014-0192 Order 33258; 220 ILCS 5/16-105.17(f)(2)(E)(i); MPSC U-20147 (**Unverified, 403**); DC Formal Case 1130 Order 20364 (**Unverified**); PURA 17-12-03 (**Unverified**). NESCAUM, *Hosting Capacity Maps* one-pager (Nov 2025).
- No national index: DOE "U.S. Atlas of Electric Distribution System Hosting Capacity Maps" (table footer July 2025, explicitly unmaintained, contains dead links); DOE i2X; IREC HCA page (stale, 2022-era); Open Energy Transition *Awesome Electrical Grid Mapping*; EPRI eRoadMAP v3.1 (viewer-only, ~10 utilities); **Sandia RAIICE / Harvard Dataverse DOI 10.7910/DVN/HSHLLT** (7 Northeast states — the only harmonized dataset, and it is regional); OEDI search (zero aggregating datasets); data.gov (only NY's IEDR).
- Utility map URLs and REST endpoints: see the table in § 5.3. **Fetch failures to note honestly:** `cenhud.com` and `gis.cenhud.com` (Imperva), PUCO's `dis.puc.state.oh.us` (WAF), MPSC and some mass.gov pages (403), and `emp.lbl.gov` (403). GRIP, DRPEP, the National Grid portals, the Xcel landing pages and the Eversource Navigator are JavaScript shells — worked around via REST metadata except Eversource, where no endpoint was found.

**One process note:** the web-search budget for this session was exhausted partway through. The California, Hawaii, New York and FERC tariff work was done by downloading the primary PDFs directly and reading the extracted text, which is stronger evidence than search results anyway. The named gaps above are the honest residue.
