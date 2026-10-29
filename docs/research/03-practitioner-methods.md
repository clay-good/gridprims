# 03 · Practitioner Methods Memo

> **Superseded in part (2026-10-29):** see `07` for verified formats and methods: URDB API v8, Green Button units and time rules, EIA-930 hour-ending and where consumption-based intensity is published, REopt load-file rules (December 31 dropped in leap years), and the 2026 NEC renumbering of 220.87 to 120.87; see `06` for the Texas 12CP proposal and Order 881 dates. Where they differ, the newer brief wins.

**For:** gridprims.com spec writers. **As of:** October 27, 2026. **Status:** research only, no code.

**What this gives you:** the definitions, formulas, and standards each hero tool must cite, plus where to get independent test vectors. Items marked **[UNVERIFIED]** came from secondary sources or memory and need a primary-source check before they ship. Items marked **[PAYWALLED]** cannot be quoted or reproduced on the site; cite them by number and section only.

Note: NREL was renamed the National Laboratory of the Rockies (NLR) in late 2025. Some GitHub orgs now redirect (for example, BLAST-Lite to `NatLabRockies`). Pin URLs and versions in specs.

---

## 1. Interval data

### Formats

| Format | Shape | Key fields | Notes |
|---|---|---|---|
| Green Button XML (ESPI, NAESB REQ.21) | Atom feed: UsagePoint > MeterReading > ReadingType + IntervalBlock > IntervalReading | `timePeriod/start` (Unix seconds, UTC), `duration` (seconds), `value` (integer), ReadingType `uom`, `powerOfTenMultiplier`, `intervalLength`, `flowDirection`; LocalTimeParameters (`tzOffset`, `dstOffset`, DST rules) | Values are integers; scale by 10^`powerOfTenMultiplier`. `uom` 72 = Wh (confirmed in PG&E's element list). Other enum codes **[UNVERIFIED]**; REQ.21 v3.3 (Jan 2020) is sold by NAESB **[PAYWALLED]**. |
| Green Button Connect My Data (CMD) | Same ESPI payload delivered over OAuth 2.0 API to a third party | Same as above | Needs a registered third party per utility. Not usable by a static, no-account site; support upload of Download My Data (DMD) files only. |
| Utility CSV exports | Wide (one row per day, 24/48/96 columns) or long (one row per interval) | Account/meter ID, start or end timestamp, kWh or kW, sometimes quality flag (estimated/actual), sometimes reverse (export) channel | No standard. Oracle Opower DMD supports hour, half-hour, quarter-hour only. Consumers Energy files flag gaps and estimated intervals. |

**Typical sizes [UNVERIFIED estimates]:** one year hourly = 8,760 rows (about 0.3 to 0.6 MB CSV); one year 15-minute = 35,040 rows (about 1.5 to 3 MB CSV); ESPI XML runs roughly 5 to 10 times larger. All fit comfortably in browser memory.

### Rules the parser must state

| Problem | Recommended rule |
|---|---|
| Detect resolution | Sort timestamps, take the **mode** of consecutive differences (not the mean), accept 5, 15, 30, or 60 minutes. Reject or warn if the mode covers under 95% of gaps. |
| kW vs kWh | If header or `uom` says energy: kW_avg = kWh × (60 / interval minutes). If it says demand (kW), energy = kW × (minutes / 60). If unlabeled, ask the user; never guess silently. |
| Interval-start vs interval-ending | ESPI uses start. Many CSVs label hour-ending (1 to 24). Detect a "24:00" or hour-24 column and shift. |
| DST spring forward | Local-time files show 23 hours that day. Do not fill the missing hour. |
| DST fall back | Local-time files show a repeated 1:00 am hour, or a 25th column, or silently sum or drop it. Convert to UTC using the file's zone; if two rows share a local stamp, keep both in order. Flag files with 24 hours on fall-back day (likely data loss). |
| Missing intervals | Report count and longest gap. For stats, leave gaps as gaps; for bill math, linear fill gaps of 1 to 2 intervals only and disclose. |
| Duplicates | Exact duplicates: drop. Conflicting values for one stamp (outside fall-back): flag, keep the larger for demand, and disclose. |
| Net metering | Separate delivered and received channels (`flowDirection`). Never net them before computing demand. |

**Core load metrics:** peak kW (max interval average kW), load factor = average kW / peak kW over the same period, load duration curve = sorted kW descending against percent of hours.

---

## 2. Demand charges

| Concept | Definition | Example |
|---|---|---|
| Non-coincident (facility) demand | Highest average kW in any demand window in the billing month, any hour | Most general-service tariffs |
| On-peak (TOU) demand | Highest average kW within the on-peak period only | URDB `demandratestructure` + schedules |
| Demand window | Averaging interval for demand: 15 minutes is most common; 30 minutes (Georgia Power PLL); 60 minutes exists | URDB `demandwindow` (minutes) |
| Ratchet | Billing demand = max(current measured demand, X% of highest demand in prior N months), sometimes seasonal | Wake Forest, NC Large General Service: greatest of the month's max 15-minute kW, 80% of the prior 11 months' max (July to October), 60% (November to June), or 1,000 kW. Georgia Power PLL-17/18: 95% summer, 60% winter, 30-minute demand. |
| Contract or minimum demand | A floor in kW regardless of metering | Same Wake Forest example (1,000 kW) |
| Power factor adjustment (kW basis) | If PF < threshold: billed kW = metered kW × threshold / PF | Austin Energy (90%): 13.5 kW at 0.87 PF bills as 13.5 × 0.90 / 0.87 = 14.0 kW. Kentucky co-op tariffs use the same 0.90 rule. |
| PF adjustment (percent of bill) | Bill adjusted by a set percent per point of PF away from a reference | PG&E: 85% reference, 0.06% per point, penalty below and credit above, for customers over 400 kW (2018 explainer; check current Rule/schedule). |
| kVAR or kVA billing | Charge per kVAR above a share of kW, or bill demand in kVA (kVA = kW / PF) | Azusa, CA: $0.50 per kVAR above 48.4% of billing demand. URDB has `demandreactivepowercharge` ($/kVAR). |

Common PF thresholds are 0.85, 0.90, and 0.95. The bill checker needs reactive data to apply any of these; most residential and small-commercial exports lack it, so the tool should take PF as a user input and say so.

---

## 3. URDB schema and bill calculation

Source: OpenEI `utility_rates` API docs (versions 3 to 7 listed; no v8 found).

| Element | Encoding |
|---|---|
| Energy TOU | `energyratestructure`: array of periods, each an array of tiers `{max, unit, rate, adj, sell}`. `energyweekdayschedule` / `energyweekendschedule`: 12 × 24 integer matrix (month × hour, 12 am first) of period indices. Zero-based. |
| Tiers | `max` is the upper bound of the tier in `unit` (`kWh`, or per-kW and daily variants). REopt rejects anything but `kWh`. |
| TOU demand | `demandratestructure` + `demandweekdayschedule` / `demandweekendschedule`. |
| Flat (monthly/seasonal) demand | `flatdemandstructure` + `flatdemandmonths` (12 period indices). |
| Coincident demand | `coincidentratestructure` + `coincidentrateschedule`. |
| Fixed and minimum | `fixedchargefirstmeter` with `fixedchargeunits` ($/day, $/month, $/year); `mincharge` with `minchargeunits`. |
| Ratchets | `demandratchetpercentage` (12 monthly values); `lookbackpercent`, `lookbackmonths`, `lookbackrange`. |
| Eligibility | `peakkwcapacitymin/max`, `sector`, `servicetype` (Bundled, Energy, Delivery...), `voltagecategory`, `startdate`/`enddate`, `approved`. |

**Known gaps for bill math:** riders and adjustment clauses often missing or stale (fuel, transmission, taxes, franchise fees); holiday calendars not encoded (weekday schedule applies); PF and kVA rules mostly in free text; billing-cycle dates not modeled (calendar months assumed); tiers keyed to demand (kWh per kW) are hard to parse; entries are hand-transcribed and can be wrong (NLR's own caveat); REopt's parser ignores `demandwindow` and `coincident*` and pads uneven tier counts. **Spec implication:** show the URDB label, last-updated date, and "not included" list on every re-priced bill.

**Validators:** PySAM `Utilityrate5` (SAM's bill calculator; ratchets via the related `Utilityrateforecast` flag; inputs are not auto-consistent in PySAM), REopt.jl `src/core/urdb.jl` (open source, reads the fields above), and the URDB rate page itself. Use all three on the same 8760 and diff by line item.

---

## 4. Coincident peak

| Market | Measured as | Window | Takes effect | Charge |
|---|---|---|---|---|
| ERCOT 4CP | Customer's average kW during ERCOT's single highest 15-minute interval in each of June, July, August, September | 4 intervals per year | Following calendar year (TDSP tariffs) | Transmission: 4CP kW × TDSP $/kW rate. ERCOT-wide TCOS about $5.4B for 2025. |
| PJM PLC (5CP) | Customer's load at PJM's 5 highest daily peak hours, June to September, scaled by the EDC | 5 hours | June 1 to May 31 | Capacity: PLC × scaling factors × RPM price ($/MW-day) × days. RPM went $49.49 (2024/25) to $269.92 (2025/26) to $329.17 (2026/27). |
| PJM NSPL (1CP) | Customer load at the zone's single annual peak hour (period Nov 1 to Oct 31) | 1 hour | January 1 calendar year | Transmission (NITS): NSPL × zonal rate |
| NYISO ICAP tag | Customer load at the NYCA single peak hour, with utility loss and scaling factors | 1 hour, any day or hour | May 1 to April 30 | Capacity |
| ISO-NE ICL tag | Customer load at the ISO-NE annual system peak hour, with losses and adjustments | 1 hour | June 1, 12 months | Capacity. 2025 peak: June 24, 6 to 7 pm, 26,086 MW (preliminary). |

**Changes to track:**
- **Texas SB 6 (2025):** PUCT Project 58484 draft report (March 16, 2026) recommends replacing 4CP with more coincident peaks and a longer measurement interval; rule changes due by **December 31, 2026**. Final status not found. The ERCOT tool must be versioned by rule year.
- **PJM:** FERC approved ER25-1525 on May 5, 2025, effective 2027/28 Delivery Year: Winter Peak Load uses a consistent hour across 5 winter CP days, and demand response becomes year-round. An October 2026 MIC item flags that WPL does not add back DR. Summer 5CP still sets the capacity obligation. No move to 1CP for capacity was found.
- **ISO-NE** capacity auction reforms (prompt and seasonal) may change tags later in the decade **[UNVERIFIED]**.

**How sites forecast peak days:** ISO day-ahead and 7-day load forecasts (ERCOT, PJM, NYISO, ISO-NE all publish them), temperature forecasts, recent monthly highs (a day can only be a CP if it beats the month or season so far), and paid alert services. The tool should show historical CP dates and hours and the "exposure" = customer kW in those intervals, not predict.

---

## 5. Battery peak-shaving screen

**Standard screening method:** for each month, binary-search the lowest demand threshold T that the battery can hold under perfect foresight. Discharge when load > T (up to power limit), recharge when load < T (never pushing load above T), respecting energy and SOC limits. This is the threshold method SAM's manual peak-shaving and REopt's optimum bound from above and below.

| Assumption | Default to disclose | Source |
|---|---|---|
| Round-trip efficiency | 85% AC-to-AC | NREL/NLR ATB storage **[UNVERIFIED for current ATB year]** |
| Usable SOC window | 10% to 90% or as entered | Disclose |
| Duration | E (kWh) / P (kW); C-rate = P / E | Definition |
| Foresight | Perfect (upper bound on savings) | Disclose prominently |
| Degradation | Equivalent full cycles = total discharged kWh / usable kWh; capacity fade via BLAST-Lite (calendar + cycle, temperature dependent) | NLR BLAST-Lite (BSD-3, Python/MATLAB; used in SAM and REopt) |
| Excluded | Aux/HVAC load, forecast error, tariff export rules, interconnection limits, ITC | Disclose |

---

## 6. Grid calculators

| Calculator | Method and citation | Status / data |
|---|---|---|
| Conductor ampacity | **IEEE 738-2023**, heat balance: I²R(Tc) + solar gain = convective + radiative loss; steady state and transient. Inputs: ambient temp, wind speed and angle, elevation, latitude, date and hour, line azimuth, emissivity, absorptivity, conductor diameter, R at two temperatures, max conductor temp. | Active; replaces 738-2012; published December 2023 **[PAYWALLED]**. Standard does not recommend weather inputs; the tool must state its defaults. Open implementations: `linerate` (Statnett; CIGRE TB 601, TB 207, IEEE 738), `pypacity`, ThermOHL. |
| ACSR data | Diameter, stranding, AC resistance at 25°C and 75°C | Manufacturer catalogs (Southwire, General Cable/Prysmian) and Aluminum Association tables **[UNVERIFIED free availability; confirm licensing before embedding]** |
| Voltage drop | Three-phase line-to-line: VD = √3 · I · (R cos θ + X sin θ) · L; single-phase: 2 · I · (R cos θ + X sin θ) · L. R, X per length. | NEC (NFPA 70) Chapter 9 Table 9, Note 2 defines effective Z = R cos θ + X sin θ (an approximation; differs from the full phasor). NFPA 70 is free to read online, not to reproduce **[PAYWALLED for reuse]**. |
| Transformer sizing | kVA = √3 · V_LL · I / 1000 (three-phase); pick next standard size; loading above nameplate per C57.91 | IEEE C57.12.00 (ratings and standard sizes), C57.91 (loading guide) **[PAYWALLED]**. Common three-phase sizes 75 to 2,500 kVA **[UNVERIFIED list]**. |
| LCOE | LCOE = (FCR × CAPEX + FOM) / (CF × 8,760) + VOM + Fuel − PTC; FCR = CRF × ProFinFactor; CRF = WACC / (1 − (1 + WACC)^−t) | NREL/NLR ATB "Equations and Variables" (pretax LCOE). Pin the ATB year. |
| CO2 from kWh | kWh × eGRID **subregion total output rate** for location-based Scope 2; **non-baseload** rate only for "avoided emissions" what-ifs. Apply grid gross loss if estimating at the customer meter. | EPA eGRID2023 rev2 (released June 12, 2025). eGRID2024 was planned for January 2026; release not confirmed. |
| Unit conversion | 3,412 Btu/kWh; 1 therm = 100,000 Btu; natural gas 1,036 Btu/cf (2026 est.); gasoline 120,166 Btu/gal; diesel 137,381 Btu/gal | EIA Energy Conversion Calculators. Fuel values change yearly; cite the year. |

---

## 7. Citation and test-vector plan

| Tool | Citation shown to user | Independent test vectors |
|---|---|---|
| Interval analyzer | NAESB REQ.21 (ESPI); EIA load factor definition | Green Button Alliance archived sample files (hourly and 5-minute); NLR End-Use Load Profiles (ComStock/ResStock) 15-minute data; hand-built DST, gap, and duplicate fixtures |
| Bill checker | URDB label + tariff sheet URL + effective date | PySAM `Utilityrate5` and REopt.jl on the same load; utility worked examples (Austin Energy PF example); published tariff bill examples |
| Coincident peak | ERCOT/PUCT rule, PJM Manuals 18/19 and EDC PLC docs, NYISO ICAP Manual, ISO-NE peak report | Published ERCOT 4CP intervals, PJM 5CP hours, NYISO and ISO-NE peak hours; utility PLC/ICAP method docs (Dominion, National Grid) with their examples |
| Battery screen | SAM/REopt methods; BLAST-Lite | REopt API runs on the same load (optimal bound); SAM battery with manual dispatch; BLAST-Lite example scripts |
| Ampacity | IEEE 738-2023 (by section only) | IEEE 738 annex example (Drake 795 kcmil ACSR) **[PAYWALLED]**; cross-check against `linerate`/`pypacity`; CIGRE TB 601 examples |
| Voltage drop | NEC Ch. 9 Table 9 | Table 9 values (12 AWG Cu: about 2.0 Ω/1,000 ft R, about 1.7 Ω effective Z at 0.85 PF, per forum checks **[UNVERIFIED]**) |
| LCOE | ATB year and equations page | ATB published LCOE workbook rows (recompute from its CAPEX, FCR, CF) |
| CO2 | eGRID edition and subregion | eGRID summary tables |

---

## 8. Audience sizes

| Measure | Value | Source |
|---|---|---|
| Electric distribution utilities | About 3,000 (2017) | EIA Today in Energy |
| By type (share of utilities) | Public power 59% (about 2,000), co-ops 26%, IOUs 5%; IOUs serve 66% of customers | APPA Stats and Facts |
| Ultimate customers (2024) | 143.1M residential, 19.5M commercial, 1.1M industrial; 163.7M total | EIA Electric Power Annual Table 2.1 (EIA-861) |
| AMI meters (2024) | 168.1M AMI (146.6M residential) vs 19.3M AMR; AMI is about 90% of AMI+AMR (our calculation, excludes standard meters) | EIA EPA Table 10.5 |
| Commercial buildings | 5.9M buildings, 96B sq ft (2018) | EIA CBECS 2018 |
| Commercial interval-metered buildings | Not found in CBECS **[UNVERIFIED gap]** | Proxy with AMI counts by sector from EIA-861 |
| C&I on demand tariffs | About 5M of 18M commercial customers face demand charges at or above $15/kW (2017) | NREL / Clean Energy Group, McLaren et al. 2017 |

---

## Sources

- OpenEI URDB API docs: https://openei.org/services/doc/rest/util_rates/?version=7
- REopt.jl URDB parser: https://github.com/NREL/REopt.jl/blob/master/src/core/urdb.jl
- PySAM Utilityrate5: https://nrel-pysam.readthedocs.io/en/dev/modules/Utilityrate5.html
- PySAM Utilityrateforecast: https://nrel-pysam.readthedocs.io/en/v4.2.0/modules/Utilityrateforecast.html
- REopt rate inputs: https://www.nrel.gov/reopt/curriculum/videos/reopt-rate-inputs-text
- Green Button powerOfTenMultiplier: https://greenbuttonalliance.org/poweroftenmultiplier
- PG&E ESPI supported elements: https://PGE.com/assets/pge/docs/save-energy-and-money/energy-savings-programs/Supported-Data-Elements-Click-Thru-2.0.pdf
- Green Button sample files: https://archive.greenbuttondata.org/samples
- Oracle Opower Green Button DMD: https://docs.oracle.com/en/industries/energy-water/business-customer-engagement/business-energy-management-configuration/green-button---download-my-data.html
- Ontario Reg. 633/21 (cites REQ.21 v3.3): https://www.ontario.ca/laws/regulation/210633/v1
- Austin Energy PF adjustment: https://austinenergy.com/rates/commercial-rates/power-factor-adjustment
- PG&E power factor explainer: https://PGE.com/assets/pge/docs/contact-us/report-an-issue/Power_Factor.pdf
- Azusa Schedule TOU: https://azusaca.gov/575/Schedule-TOU
- Wake Forest Large General Service: https://www.wakeforestnc.gov/node/5983
- Georgia Power PLL-18: https://www.georgiapower.com/content/dam/georgia-power/pdfs/business-pdfs/tariffs/2025/pll-18.pdf
- NRG comments on ERCOT transmission cost recovery: https://www.nrg.com/assets/documents/energy-policy/nrg-comments-on-transmission-cost-recovery-puct-staff-rfc-1-090925.pdf
- K&L Gates on PUCT draft report (Project 58484): https://www.klgates.com/Request-for-Comments-on-Texas-PUCT-Draft-Report-Regarding-Transmission-Cost-Recovery-in-the-ERCOT-Region-3-30-2026
- Pedernales Electric 4CP: https://mypec.com/large-power-rates/
- PJM NSPL 2025: https://sdc.pjm.com/-/media/markets-ops/settlements/network-service-peak-loads-2025.ashx
- Dominion PLC/NSPL method: https://www.dominionenergy.com/-/media/content/suppliers/pdfs/peak-load-contribution-network-service-peak-load.pdf
- PJM ER25-1525 filing: https://www.pjm.com/pjmfiles/directory/etariff/FercDockets/8762/20250306-er25-1525-000.pdf
- PJM MIC winter peak load problem statement (Oct 2026): https://www.pjm.com/-/media/DotCom/committees-groups/committees/mic/2026/20261007/20261007-item-05-1---winter-peak-load-calculation---problem-statement.pdf
- NIH ORF bulletin on PJM 5CP (RPM prices): https://orf.od.nih.gov/TechnicalResources/Documents/Technical%20Bulletins/26TB/PJM%20Five%20Coincident%20Peaks%20%285CP%29%20and%20Capacity%20Charges%20-%20A%20Data%20Science%20Approach%20-%20May%202026%20TB_508.pdf
- National Grid NYISO ICAP method: https://nationalgridus.com/media/pdfs/microsites/energy-service-companies/upstate-ny/step-18a_details-of-national-grid-icap-estimation-for-nyiso.pdf
- NYISO ICAP Manual §3.4 (archived): https://nysrc.org/wp-content/uploads/2023/04/NYISO-2020-Installed-Capacity-Manual-Section-3.4.pdf
- National Grid ISO-NE tags: https://forms.nationalgrid.com/non_html/shared_installed_tags.pdf
- 2025 ISO-NE peak recap: https://www.competitive-energy.com/blog/2025-iso-ne-peak-load-hour-and-ces-self-help-program-recap
- BLAST-Lite: https://www.nrel.gov/research/software/blast-lite--battery-lifetime-analysis-and-simulation-tool---lite and https://pypi.org/project/blast-lite/
- IEEE 738-2023 listing: https://www.sis.se/en/produkter/electrical-engineering/power-transmission-and-distribution-networks/power-transmission-and-distribution-lines/ieee-738-2023/
- linerate: https://pypi.org/project/linerate ; pypacity: https://pypi.org/project/pypacity/
- NREL ATB equations: https://atb.nrel.gov/electricity/2024/equations_&_variables
- EPA using eGRID for emissions: https://www.epa.gov/system/files/documents/2025-01/using-egrid-to-determine-emissions.pdf
- eGRID data: https://www.epa.gov/egrid/detailed-data ; summary tables rev2: https://www.epa.gov/system/files/documents/2025-06/summary_tables_rev2.pdf
- EIA energy conversion calculators: https://www.eia.gov/energyexplained/units-and-calculators/energy-conversion-calculators.php
- EIA EPA Table 10.5 (AMI): https://www.eia.gov/electricity/annual/html/epa_10_05.html
- EIA EPA Table 2.1 (customers): https://www.eia.gov/electricity/annual/html/epa_02_01.html
- EIA utilities by type: https://www.eia.gov/todayinenergy/detail.php?id=40913
- APPA Stats and Facts: https://www.publicpower.org/public-power/stats-and-facts
- EIA CBECS 2018: https://www.eia.gov/todayinenergy/detail.php?id=46118
- NREL/CEG demand charge survey: https://www.cleanegroup.org/millions-commercial-customers-cut-costs-battery-storage/
