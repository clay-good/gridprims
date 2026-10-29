# 07: Methods and file formats, checked against primary sources

Checked 2026-10-29. **Verified** means I read it today in the agency, standards body, or maintainer source: the code repo, the XSD, the live file, or the live API. **Unverified** means it came from trade press, a forum, a vendor, or a third-party guide, or I could not open the primary page. NEC text is paraphrased, not quoted. NFPA text is copyrighted and I did not open the NFPA reader.

## Bottom line

- **NEC 2026 renumbered 220.87 to 120.87.** Load calculations moved from Article 220 to Article 120, and the October 2026 errata cite "Table 120.4". The method is unchanged in outline: one year of 15-minute maximum demand, a 30-day recorded alternative, and 125% of the peak plus the new load. The 30-day alternative is barred when the site has solar or wind or uses peak shaving. The tool must cite both numbers and refuse the 30-day path for sites with PV.
- **REopt accepts only 8,760, 17,520, or 35,040 values in kW, with no header.** `time_steps_per_hour` must be 1, 2, or 4. There is no leap-year length: in a leap year REopt drops **Dec 31**, not Feb 29. `ElectricLoad.year` is required with custom loads. REopt.jl reached **v1.0.1 (2026-10-28)**, and the repos moved from `NREL/` to `NatLabRockies/`.
- **Green Button ESPI is now 4.0 (NAESB, 2023-12-13).** The Green Button Alliance (GBA) lists a 4.1 "minor update". The schemas are Apache-2.0, while the business-practice text costs $250 per standard or $2,000 for the full RMQ set. The unit codes were confirmed in the 4.0 XSD: 72 = Wh, 38 = W, 63 = VAr, 61 = VA, 73 = VArh, 119 = ft³, 169 = therm. `intervalLength` is in seconds. DST rules are 32-bit bitfields; in US samples they are `360E2000` and `B40E2000`.
- **EIA-930 timestamps are hour-ending, and files carry both local and UTC time.** The API `hourly` frequency is UTC with format `YYYY-MM-DDTHH`, and the API starts in 2019. **Consumption-based CO2 intensity (lbs/kWh) is only in the per-BA `.xlsx` files** (60–115 MB each), from 2018-07-01. It is not in the six-month CSVs or the API. Every file, back to 2015, is regenerated daily.
- **URDB bulk files are `usurdb.csv.gz` (12.2 MB) and `usurdb.json.gz` (15.3 MB), refreshed daily.** API version 8 needs a free key. The ratchet is stored as `lookbackpercent`, `lookbackmonths`, and `lookbackrange`. REopt.jl reads the ratchet but ignores URDB `demandwindow` and the URDB coincident fields. SAM `Utilityrate5` models ratchets and TOU demand. Neither tool models power factor or kVAR.
- **Conductors:** pypacity 0.1.3 (GPL-3.0) and linerate 5.0.0 (MIT) both implement IEEE 738. linerate also implements CIGRE 601 and 207. Neither names the 738 edition. USDA RUS Bulletin 1724E-200 (public domain) gives ACSR diameters and ampacities but **no resistances**. **EIA constants:** 3,412 Btu/kWh (3,412.14 exact) and 1,036 Btu/cf natural gas for 2025.

---

## 1. NEC 220.87 (2023) / 120.87 (2026): existing load from recorded demand

| Item | What the method allows (paraphrase) | Status |
|---|---|---|
| Primary data | Maximum demand data for a **1-year period**. Demand means the highest average kW over a **15-minute interval** | Unverified (secondary sources quoting the code; consistent across Mike Holt/EC&M, Dranetz, forums) |
| Alternative | If 1 year is not available: maximum demand recorded continuously for **at least 30 days** with a recording ammeter or power meter on the highest-loaded phase. The building must be occupied, and the recording must include the larger of the heating or cooling load plus seasonal loads | Unverified (secondary) |
| Solar / peak-shaving bar | The **30-day alternative is not permitted** if the feeder or service has a renewable system (PV, wind) or uses any form of peak-load shaving. The 1-year path is not barred by this sentence | Unverified (quoted in Mike Holt forum posts and a public-input thread; check against NFPA reader) |
| Test | Maximum demand × **125%** + new load ≤ feeder ampacity or service rating | Verified in a published worked example (Mike Holt in EC&M) |
| Other conditions | The feeder has overcurrent protection under 240.4(A), and the service has overload protection under 230.90 | Unverified (secondary) |
| 15-min rule | Practitioners read the "15-minute" wording as excluding 5-minute logger peaks used directly | Unverified (forum) |
| 2026 number | **120.87** ("Determining existing loads from recorded maximum demand"). Article 220 load calculations moved to Article 120 | Verified in part (2026 errata cite Table 120.4, ECMWeb 2026-10-26); section title from Keentel (Unverified) |
| 2026 content changes | One engineering firm says 2026 adds credit for loads removed (e.g., a gas furnace replaced by a heat pump). It also says the 30-day recording must cover the peak season or be adjusted. I could not confirm either point | Unverified |
| 2026 publication | NAHB says it was **published September 2025**; Keentel says "second half of 2025". Errata were issued 2026-10-23. State adoptions vary (Texas 2026-09-01, Washington 2026-12-31) | Unverified (no NFPA page read) |

**Worked examples (independent, with numbers):**

| Source | Inputs | Steps | Result |
|---|---|---|---|
| Mike Holt, "Code Q&A: Calculating Feeder or Service Loads," EC&M, 2014-08-08 (2011 NEC) | 23.66 kW peak (15-min), 120/240 V 1φ, 200 A service, +50 A load | 23,660 W ÷ 240 V = 98.6 A → ×1.25 = 123 A → +50 A | 173 A ≤ 200 A, so OK. Note that the article converts kW to A with no power factor (PF = 1) |
| Keentel Engineering, "NEC 2026 load calculations" | 62 A 12-month peak, 150 A service, 48 A EVSE | 62 × 1.25 = 77.5 A + 48 A | 125.5 A, so OK. At a 90 A peak: 112.5 + 48 = 160.5 A fails. A managed 24 A setpoint gives 136.5 A, which passes |
| Mike Holt forum (practitioner) | 137 kW demand | ÷ 0.8 PF = 171.25 kVA, then to amps | Practitioners split on PF: utility demand is kW, and some assume 0.8 to be conservative |

Spec impact: interval data at 5 min must be re-averaged to fixed 15-min blocks before taking the peak. The tool should take PF as a user input, defaulting to 1.0 as in the Holt example, and show what changes at 0.9 or 0.8. The tool also needs a "site has PV / storage peak-shaving" flag that blocks the 30-day path.

---

## 2. REopt custom load profile

| Rule | Value | Source | Status |
|---|---|---|---|
| Allowed lengths | 8,760 (hourly), 17,520 (30-min), 35,040 (15-min) | REopt_API `reoptjl/models.py` `loads_kw` help text; `validators.py` `length_list = [8760, 17520, 35040]` | Verified |
| `time_steps_per_hour` | Choices 1, 2, 4 (default 1). The API resamples a series whose length differs from the setting | REopt_API `Settings.time_steps_per_hour`, `validate_time_series` | Verified |
| REopt.jl strictness | Length must equal 8,760 × `time_steps_per_hour`. A lower-resolution series is repeated to fit; a higher-resolution one is an error | REopt.jl `check_and_adjust_load_length` | Verified |
| Leap years | No 8,784 or 35,136 input. REopt **truncates the last day of the year (Dec 31)**, not Feb 29. The profile starts Jan 1 00:00 of `year` | REopt_API CHANGELOG ("Truncate the last day of the year instead of the leap day"); REopt.jl `get_monthly_time_steps` | Verified |
| `year` | Required with `loads_kw` because it aligns weekdays and weekends with the tariff | REopt.jl `ElectricLoad` docstring; API CHANGELOG | Verified |
| Units / sign | kW average per step. Non-net values must be ≥ 0. `loads_kw_is_net` defaults to true | `loads_kw` help text | Verified |
| CSV header | REopt.jl `path_to_csv`: "csv with no header", one column | REopt.jl `electric_load.jl` error text | Verified (Julia); web tool upload rules: Unverified (help page unreachable; the NREL tutorial says to use the "Sample custom load profile" and start at Jan 1, 1st hour) |
| Versions | REopt.jl v1.0.1 (2026-10-28), REopt_API v3.23.0 (2026-08-26). The org is now `NatLabRockies`. REopt.jl is Apache-2.0 | GitHub releases | Verified |
| Host | `reopt.nrel.gov` did not resolve today. The curriculum lives at `nlr.gov/reopt/...` | DNS check; search | Verified (DNS failure) / Unverified (new web-tool URL) |

Spec impact: the export builds the series from Jan 1 of the data year. For a leap year, drop **Dec 31**, not Feb 29. The export writes one numeric column with no header and no timestamps, and names the year in the file name or sidecar.

---

## 3. Green Button (NAESB REQ.21 ESPI)

**Standard and licensing**

| Item | Value | Status |
|---|---|---|
| Current version | NAESB REQ.21 ESPI **v4.0**, published **2023-12-13**. The GBA page lists a **v4.1** "minor updates" release. GBA hosts 4.1 schemas at `greenbuttondata.org/xsd/4_1/` (`usage.xsd` there still declares `version="3.3.20190408"`) | Verified (XSD header; NAESB and GBA pages) |
| Price | $250 per standard (final action), $2,000 per full quadrant set, or NAESB membership at $8,000/yr. A free evaluation copy is available on request | Verified (naesb.org/ESPI_Standards.asp) |
| Schema license | **Apache-2.0**, a one-time NAESB exception for the schemas only. The business-practice text remains copyrighted | Verified (XSD header; NAESB page) |
| Schema in code | `GreenButtonAlliance/OpenESPI-GreenButton-Java` → `openespi-common/src/main/resources/schema/ESPI_4.0/espi.xsd` (235 KB) | Verified |
| Sample files | `s3-us-west-2.amazonaws.com/technical.greenbuttonalliance.org/library/sample-data/*.xml` (linked from `archive.greenbuttondata.org/samples`). Files are Apache-2.0 (EnergyOS header). Example: Coastal Multi-Family, 1 year hourly = **1.75 MB**, 8,760 readings | Verified |
| Test fixtures | `OpenESPI-GreenButton-Java/openespi-common/src/test/resources/fixtures/test_usage_data*.xml` (15-min, `intervalLength` 900) | Verified |

**ReadingType codes (from espi.xsd 4.0)**

| Field | Codes that matter | Status |
|---|---|---|
| `uom` (UnitSymbolKind) | 72 Wh · 38 W · 61 VA · 63 VAr · 71 VAh · 73 VArh · 5 A · 29 V · 65 / 153 power factor · 119 ft³ · 120 ft³ compensated · 169 therm · 132 BTU · 80 money · 0 none (125 codes in total) | Verified |
| `powerOfTenMultiplier` | −12, −9, −6, −3 (milli), −2, −1, 0, 1, 2, 3 (kilo), 6 (mega), 9, 12. The value = raw × 10^multiplier in `uom` units | Verified |
| `flowDirection` | 1 forward/delivered (import) · 19 reverse/received (export) · 4 net (|fwd| − |rev|) · 20 total (|fwd| + |rev|) · 0 N/A. Codes 2–3 and 5–18 are reactive and quadrant codes | Verified |
| `accumulationBehaviour` | 4 deltaData (interval) is the norm. 1 bulkQuantity, 3 cumulative, 6 indicating, 9 summation, 12 instantaneous | Verified |
| `intervalLength` | UInt32 **seconds** (900 = 15 min, 3600 = hourly). `IntervalReading/timePeriod` `start` is Unix epoch seconds (UTC) and `duration` is in seconds | Verified |
| `timeAttribute` | Demand-window codes such as 2 = 15-min, 53 = 15-min fixed block, 59 = 60-min rolling with 15-min sub-intervals | Verified |
| `LocalTimeParameters` (XSD type `TimeConfiguration`) | `tzOffset` and `dstOffset` in seconds (e.g., −28,800 / 3,600). `dstStartRule` / `dstEndRule` are a hex 32-bit bitfield: bits 28–31 month, 25–27 operator, 20–24 day of month, 17–19 day of week (Mon = 1 … Sun = 7), 12–16 hour, 0–11 seconds. `FFFFFFFF` means DST is off | Verified |
| US rule values | `360E2000` = 2nd Sunday of March, 02:00. `B40E2000` = 1st Sunday of November, 02:00. Decoded and found in GBA samples | Verified |

**Green Button CSV ("DMD CSV")**: there is no standard. The ESPI standard is XML-only, and CSV layouts vary by utility.

| Utility | Layout | Status |
|---|---|---|
| PG&E | ~5 metadata rows (name, address, account, service), then `TYPE,DATE,START TIME,END TIME,USAGE (kWh)` or `IMPORT/EXPORT`, `COST,NOTES` | Unverified (third-party guides) |
| SCE (older) | Date plus hour-range columns ("0-0:59"); hour-ending vs. start ambiguity noted by vendors | Unverified |
| Generic portals (Oracle Opower-based) | One CSV per fuel; missing reads flagged | Unverified (Oracle docs) |

Spec impact: parse `uom` × 10^`powerOfTenMultiplier` and never assume Wh. Treat `flowDirection` 19 as export and keep it separate. Derive local time from `tzOffset` plus the DST rules rather than the browser's time zone. For CSV, detect the header row by its content, not by its line number.

---

## 4. EIA-930 (Hourly Electric Grid Monitor)

| Item | Finding | Status |
|---|---|---|
| Hour label | **Hour ending**. Six-month CSV columns: `Data Date`, `Hour Number`, `Local Time at End of Hour`, `UTC Time at End of Hour` (e.g., AECI 2026-01-01 hour 1 = 01:00 local = 07:00 UTC) | Verified (file header; about page) |
| API | `api.eia.gov/v2/electricity/rto/{region-data, fuel-type-data, region-sub-ba-data, interchange-data, daily-*}`. Frequency `hourly` = UTC (`YYYY-MM-DDTHH`), `local-hourly` = local with offset. **startPeriod 2019-01-01T00**. API v2.1.14; `DEMO_KEY` works for light use | Verified (live metadata) |
| Six-month files | `eia.gov/electricity/gridmonitor/sixMonthFiles/EIA930_{BALANCE,INTERCHANGE,SUBREGION}_{YYYY}_{Jan_Jun,Jul_Dec}.csv`. Sizes: BALANCE 2026 Jan–Jun 47.1 MB, 2015 Jul–Dec 31.0 MB; INTERCHANGE 102 MB; SUBREGION 26.9 MB | Verified (HEAD requests) |
| Coverage | Flat files from **2015-07-01**. Fuel mix from 2018-07-01. **Battery storage added 2025-01-01**, and fuel columns are now split (solar with/without integrated battery, wind with/without, other and unknown storage) | Verified |
| CO2 (consumption-based) | **Per-BA / region `.xlsx` only**: `eia.gov/electricity/gridmonitor/knownissues/xls/{BA}.xlsx` and `Region_{US48,CAL,…}.xlsx`, sheet "Published Hourly Data". Columns: `CO2 Emissions Intensity for Consumed Electricity` (lbs/kWh), `… for Generated Electricity`, `CO2 Emissions Consumed/Generated/Imported/Exported`, `CO2 Factor: COL/NG/OIL`. Sizes: AVA 67 MB, CISO 98 MB, PJM 114 MB, US48 38 MB | Verified (downloaded AVA) |
| CO2 method | Annual BA fuel factors (from EIA-923 and EPA). Consumption intensity uses an MRIO model (de Chalendar et al., PNAS 2019). Canada and Mexico imports use the US average. CHP excluded. From **2018-07-01**. Not in the API or the six-month CSVs | Verified (about page) |
| Revisions | Demand is re-collected at 07:00 the next day. CO2 is recalculated when transfers are corrected. BAs resubmit after DST errors. **All files, including 2015, had today's Last-Modified**, so they are regenerated daily | Verified |
| CO2 latency | Yesterday's emissions by fuel, and the day before yesterday's import and export totals, are available by about 4 pm ET | Verified (about page) |

Spec impact: precompute hourly consumption intensity offline from the per-BA xlsx, since the browser cannot fetch 100 MB files. Key rows on UTC hour-ending and shift by one hour to match meter interval-start timestamps. Pin a snapshot date, because history changes.

---

## 5. OpenEI URDB

| Item | Finding | Status |
|---|---|---|
| Bulk US | `https://openei.org/apps/USURDB/download/usurdb.csv.gz` (301 → `apps.openei.org`, 12.2 MB) and `usurdb.json.gz` (15.3 MB). Both had Last-Modified 2026-10-29, so they are refreshed daily | Verified |
| Bulk international | `…/apps/IURDB/download/iurdb.csv.gz` (12.5 MB) | Verified |
| CSV shape | 737 columns, flattened as `energyratestructure/period{n}/tier{n}{max,rate,adj,unit,sell}` | Verified |
| API | `api.openei.org/utility_rates?version=latest` (versions 3–8; 8 is the latest). An **API key is required** (free signup; `DEMO_KEY` works). Item `uri` values now point to `apps.openei.org/IURDB/rate/view/…` even for US rates | Verified |
| Demand window | `demandwindow`, decimal **minutes** | Verified (API docs) |
| Ratchet | `lookbackpercent` (decimal), `lookbackmonths` (12 booleans), `lookbackrange` (integer months). Use either months or range, not both | Verified |
| Coincident | `coincidentrateunit`, `coincidentratestructure`, `coincidentschedule` (the docs say `coincidentrateschedule`, but the CSV uses `coincidentschedule`) | Verified |
| Units | `fixedchargeunits` and `minchargeunits` ∈ {`$/day`, `$/month`, `$/year`}. `demandrateunit` / `flatdemandunit` / `coincidentrateunit` ∈ {kW, hp, kVA, kW daily, hp daily, kVA daily}. Reactive charge: `demandreactivepowercharge` ($/kVAR) | Verified |
| Other fields | `is_default`, `latest_update`, `supersedes`, `peakkwcapacitymin/max`, `voltagecategory`, `phasewiring`, `dgrules` | Verified (CSV header) |
| 2025–26 schema changes | None documented. The API doc page was last edited 2017. Nectar plans a separate open tariff database by the end of 2027 | Unverified (absence) |

Spec impact: the bill engine must convert `$/day` and `$/year` fixed charges, honor the `kVA` and `daily` demand units, and implement lookback ratchets. It should flag rates with `demandwindow` ≠ 15 or a nonzero `demandreactivepowercharge`, because neither REopt nor SAM bills those.

---

## 6. PySAM Utilityrate5 and REopt.jl

| Feature | PySAM `Utilityrate5` | REopt.jl | Status |
|---|---|---|---|
| Version | NREL-PySAM **7.1.1.post1** (PyPI; 7.1.1 on 2026-04-28), BSD-3. SAM desktop 2026.7.3 (2026-07-07) | **v1.0.1** (2026-10-28), Apache-2.0 | Verified |
| Sub-hourly | Yes. The series must be 8,760 × n with n ≤ 60 | 1, 2, or 4 steps per hour | Verified |
| TOU demand | `ur_dc_tou_mat`, `ur_dc_sched_weekday/weekend` | `tou_demand_rates`, tiers | Verified |
| Flat monthly demand | `ur_dc_flat_mat` | `monthly_demand_rates` | Verified |
| Ratchet | `ur_enable_billing_demand`, `ur_billing_demand_lookback_percentages` (12×2), `ur_billing_demand_lookback_period` (0–12), `ur_billing_demand_minimum`, `ur_dc_billing_demand_periods` | `demand_lookback_months/percent/range` (parsed from URDB), `tou_demand_ratchet_time_steps` | Verified |
| Coincident peak | Not modeled (0 matches in `cmod_utilityrate5.cpp`) | `coincident_peak_load_charge_per_kw` plus active time steps (user-supplied; **not** read from URDB) | Verified |
| Power factor / kVAR | Not modeled | Not modeled | Verified (absent in source) |
| Demand window ≠ 1 step | Ignored; uses the series resolution | Ignored | Verified (no `demandwindow` read) |
| Fixed / min charge | $/month plus annual min | `fixed_monthly_charge`, `min_monthly_charge`, `annual_min_charge`. `$/day` and `$/year` are converted | Verified |
| Leap years | 8,760-based | Truncates Dec 31 | Verified |
| Documented SAM vs REopt differences | None published that I found | | Unverified |

---

## 7. Line rating (IEEE 738) and conductor data

| Item | Finding | Status |
|---|---|---|
| pypacity | **0.1.3** (2026-08-13), **GPL-3.0** (GitHub). "Implements IEEE 738 and CIGRE TB 601," steady state and transient. The 738 edition is not stated | Verified |
| linerate | **5.0.0** (2026-08-19), **MIT**, Statnett. Has `models/ieee738.py` (`class IEEE738`), `cigre601.py`, `cigre207.py`. **So yes, it implements IEEE 738**, not only CIGRE. The 738 edition is not stated | Verified |
| License note | GPL-3.0 pypacity cannot be bundled into a non-GPL front end. Prefer linerate (MIT) or a clean-room port | Verified |
| RUS 1724E-200 | "Design Manual for High Voltage Transmission Lines," USDA RUS, rev. May 2009, on govinfo.gov (US government work). Appendix B has ACSR diameter, weight, and strength (e.g., Drake 795 26/7 = 1.108 in; Dove 556.5 = 0.927 in; Linnet 336.4 = 0.721 in; Hawk 477 = 0.858 in). Appendix D has ampacity (e.g., Drake 886 A at 167 °F with 104 °F ambient and 2 ft/s wind). **No AC/DC resistance table** | Verified |
| Public-domain resistance | Not found. Resistances are in vendor catalogs (Southwire, ohms/1000 ft) | Unverified |

---

## 8. EIA energy conversion constants

| Constant | Value | Source | Status |
|---|---|---|---|
| Electricity | **3,412 Btu/kWh** (EIA's constant). The exact value is 3,412.14 = 3.6 MJ ÷ 1,055.05585262 J/Btu(IT) | MER Appendix A ("Heat Content of Electricity … is a constant"); NIST Btu(IT) definition | Verified (3,412); 3,412.14 is derived |
| Natural gas, US delivered to consumers | 2020: 1,037 · 2021: 1,037 · 2022: 1,036 · 2023: 1,036 · 2024: 1,037 · **2025: 1,036 Btu/cf** | EIA NG "Heat Content of Natural Gas Consumed" (`ng_cons_heat_a_EPG0_VGTH_btucf_a.htm`) | Verified |
| Natural gas 2026 (calculator) | 1,036 Btu/cf (estimate; repeats the previous year) | EIA energy conversion calculators | Verified |
| Coal | **18,792,000 Btu per short ton** (electric power sector, 2026 estimate) | EIA conversion calculators | Verified |
| Heating oil / distillate (≤ 15 ppm S) | 137,381 Btu/gal (5.770 MMBtu/bbl) | Calculator; MER Table A1 | Verified |
| Residual fuel oil | 6.287 MMBtu/bbl = 149,690 Btu/gal | MER Table A1 | Verified |
| Propane | 3.841 MMBtu/bbl = 91,452 Btu/gal | MER Table A1; EIA Btu page | Verified |
| Therm | 100,000 Btu | EIA Btu page | Verified |

MER Tables A2–A6 do not export through EIA's CSV browser or API (the export comes back empty). The PDF is `eia.gov/totalenergy/data/monthly/pdf/mer_A_FULL.pdf`.

---

## 9. AMI interval lengths and file sizes

| Utility / system | Electric interval offered to customers | Export | Status |
|---|---|---|---|
| PG&E | 15-min electric; hourly or daily views | Green Button CSV/XML; history back to 2011 | Verified for 15-min (pge.com); Unverified for range |
| ComEd | 15-min (some sources say 30-min) | Green Button DMD/CMD (ESPI XML) | Unverified (Nectar) |
| Con Edison | Hourly, some accounts 30-min; 15-min not confirmed | CSV/XML, ≤ 12 months | Unverified |
| Texas TDUs via Smart Meter Texas | 15-min; 13 months for the customer, 12 for third parties | CSV/JSON. A 15-min request is about **2.7 MB CSV** (PUCT filing) | Unverified (PUCT filing via search) |
| Duke (Carolinas, Progress, IN, KY, OH) | 15-min for business portals; residential often hourly or daily; Florida PDF only | CSV/Excel | Unverified |
| 5-min | Not found for residential exports. Appears in C&I and MV-90 metering and loggers | | Unverified |

**File-size rule of thumb** (from the files measured today): a 1-year hourly ESPI XML is about 1.75 MB, or about 200 bytes per reading. That puts 1-year 15-min ESPI at about 7 MB and 1-year 5-min at about 21 MB. CSV runs about 30–80 bytes per row, so 35,040 rows come to 1–3 MB. All of these fit comfortably in browser memory.

---

## Sources

- NEC: [Mike Holt, EC&M Code Q&A (2014)](https://www.ecmweb.com/national-electrical-code/qa/article/20899437/code-qa-calculating-feeder-or-service-loads); [Keentel, NEC 2026 load calculations](https://keentelengineering.com/nec-2026-load-calculations); [ECMWeb, 2026 NEC errata (2026-10-26)](https://www.ecmweb.com/national-electrical-code/article/55414497/nfpa-issues-two-corrections-to-the-2026-nec); [NAHB 2026 NEC](https://www.nahb.org/advocacy/top-priorities/building-codes/electrical-code/2026-national-electrical-code); [Mike Holt forum, 220.87 renewable exclusion quote](https://forums.mikeholt.com/goto/post?id=1908309); [Dranetz 220.87 app note](https://www.dranetz.com/wp-content/uploads/2021/06/DranXperT-NEC-220.87-Application-Note-R06-1.pdf); [WA L&I 2026 NEC adoption](https://lawfilesext.leg.wa.gov/law/wsr/2025/23/25-23-069.htm)
- REopt: [REopt.jl electric_load.jl](https://github.com/NatLabRockies/REopt.jl/blob/master/src/core/electric_load.jl); [REopt.jl utils.jl](https://github.com/NatLabRockies/REopt.jl/blob/master/src/core/utils.jl); [REopt_API models.py](https://github.com/NatLabRockies/REopt_API/blob/master/reoptjl/models.py); [REopt_API validators.py](https://github.com/NatLabRockies/REopt_API/blob/master/reoptjl/validators.py); [REopt_API CHANGELOG](https://github.com/NatLabRockies/REopt_API/blob/master/CHANGELOG.md); [REopt Lite tutorial module 2](https://www.nlr.gov/reopt/curriculum/videos/reopt-lite-tutorial-module-2-text)
- Green Button: [espi.xsd 4.0](https://github.com/GreenButtonAlliance/OpenESPI-GreenButton-Java/blob/main/openespi-common/src/main/resources/schema/ESPI_4.0/espi.xsd); [NAESB ESPI Standards](https://www.naesb.org/ESPI_Standards.asp); [GBA purchase the standard](https://www.greenbuttonalliance.org/purchase-the-standard); [GBA sample data archive](https://archive.greenbuttondata.org/samples); [greenbuttondata.org 4.1 usage.xsd](https://greenbuttondata.org/xsd/4_1/usage.xsd); [PG&E CSV layout (dlma wiki)](https://wiki.dlma.com/vd-pge)
- EIA-930: [About the EIA-930 data](https://www.eia.gov/electricity/930-content/about.html); [six-month files](https://www.eia.gov/electricity/gridmonitor/sixMonthFiles/EIA930_BALANCE_2026_Jan_Jun.csv); [per-BA xlsx (AVA)](https://www.eia.gov/electricity/gridmonitor/knownissues/xls/AVA.xlsx); [API v2 rto](https://api.eia.gov/v2/electricity/rto/)
- URDB: [usurdb.csv.gz](https://openei.org/apps/USURDB/download/usurdb.csv.gz); [usurdb.json.gz](https://openei.org/apps/USURDB/download/usurdb.json.gz); [URDB API v8 docs](https://openei.org/services/doc/rest/util_rates/?version=8); [Nectar open tariff database](https://nectarclimate.com/blog/post/open-tariff-database)
- SAM / REopt: [ssc cmod_utilityrate5.cpp](https://github.com/NatLabRockies/ssc/blob/develop/ssc/cmod_utilityrate5.cpp); [NREL-PySAM on PyPI](https://pypi.org/project/NREL-PySAM/); [REopt.jl electric_tariff.jl and urdb.jl](https://github.com/NatLabRockies/REopt.jl/tree/master/src/core); [PySAM Utilityrate5 docs](https://nrel-pysam.readthedocs.io/en/latest/modules/Utilityrate5.html)
- Conductors: [pypacity](https://github.com/gteasoft/pypacity); [linerate](https://github.com/statnett/linerate); [RUS Bulletin 1724E-200 (govinfo)](https://www.govinfo.gov/content/pkg/GOVPUB-A68-PURL-LPS124223/pdf/GOVPUB-A68-PURL-LPS124223.pdf); [Southwire ACSR/AW spec 80102](https://cabletechsupport.southwire.com/tile/23/spec/80102/?country=US)
- EIA constants: [MER Appendix A](https://www.eia.gov/totalenergy/data/monthly/pdf/mer_A_FULL.pdf); [Heat content of natural gas consumed](https://www.eia.gov/dnav/ng/ng_cons_heat_a_EPG0_VGTH_btucf_a.htm); [EIA energy conversion calculators](https://www.eia.gov/energyexplained/units-and-calculators/energy-conversion-calculators.php); [EIA British thermal units](https://www.eia.gov/energyexplained/units-and-calculators/british-thermal-units.php)
- AMI: [Nectar ComEd guide](https://nectarclimate.com/utilities/commonwealth-edison-co); [Nectar Con Edison guide](https://nectarclimate.com/utilities/consolidated-edison-coned); [Nectar CenterPoint guide](https://nectarclimate.com/utilities/centerpoint-energy); [Nectar Duke Carolinas guide](https://nectarclimate.com/utilities/duke-energy-carolinas); [PG&E data access tools](https://PGE.com/assets/pge/docs/save-energy-and-money/energy-usage-tips/PGE-Data-Access-Tools.pdf); [PUCT SMT filing](https://interchange.puc.texas.gov/Documents/47472_63_958800.PDF)
