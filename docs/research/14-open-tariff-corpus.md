# 14 — Is there a canonical open tested US tariff corpus?

Research date: 2026-10-29. Planning only; not legal advice. **Verified** = read on the publisher's own page, or computed by us from the primary file, on 2026-10-29. **Unverified** = secondary source only, or not found.

Primary artifact for this brief: we downloaded `usurdb.csv.gz` (12.2 MB, gzip header timestamp **2026-10-29 08:43:30**) and analyzed all 58,920 records ourselves. Every URDB number below marked Verified is ours, not quoted.

## Bottom line

- **No canonical open, machine-readable, *tested* US tariff corpus exists.** URDB is open but untested and mostly stale; URPX is a tested *format* with no corpus; everything with fresh data is proprietary. The gap is real.
- **We reproduced the staleness independently.** Of 6,357 active residential URDB rates, **78.0% have a start date before 2020**. Only **164 of 2,686** utilities with an active residential rate have one dated 2024 or later. This matches the third-party NerdyWatts figure almost exactly, so that claim is now Verified by our own count.
- **URDB's `approved` column is empty for all 58,920 records** in the bulk CSV, `servicetype` is missing on 85.1% of active records, and there are **zero holiday columns and zero ratchet columns**. The schema cannot express what tariffs actually do.
- **The schema gap is already being closed by someone else: URPX**, an LF Energy standard (RDF/OWL/SHACL + JSON-LD, v0.5.1, Oct 2026), initiated by Flux Tailor **with NLR**. Competing with it would be a mistake; conforming to it is the opening.
- **Two credible competitors are already in the open-corpus lane**, both announced in 2026: `cbetz/ratebook` (Apache-2.0 engine + CC0 data + shared Python/TS test vectors + browser demo — almost exactly our proposed design, at 65 tariffs) and **Nectar**, which has publicly committed to a CC0 tariff+rider database with page-level citations by end of 2027. We are late, not early.
- **Verdict: the gap is large and the demand is documented, but the "canonical corpus" ambition is the wrong shape for gridprims.** The defensible, static-site-compatible wedge is the thing nobody has built: a **public conformance test-vector suite and accuracy scorecard** over URDB, keyed to URPX.

## 1. URDB's actual current state

| Item | Finding | Tag |
|---|---|---|
| Bulk file freshness | `usurdb.csv.gz` regenerated **2026-10-29** (same day we pulled it). The file is live, not abandoned. | Verified (our download) |
| Total records | **58,920** rows, **737** columns | Verified (our count) |
| Active records (blank `enddate`) | **30,852** | Verified |
| Utilities | **2,938** distinct utility names, **2,843** distinct EIA IDs — not the "over 3,700 utilities" the wiki claims | Verified |
| Active by sector | Commercial 13,428 · Residential 6,357 · Lighting 6,095 · Industrial 4,968 | Verified |
| `approved` flag | **Empty string on all 58,920 records.** The documented quality flag is unusable in bulk. | Verified |
| `servicetype` missing | **85.1%** of active records (78.8% of active residential) | Verified |
| Holiday calendars | **No holiday column exists.** Only 5 schedule columns: energy/demand weekday + weekend 12x24. | Verified |
| Demand ratchets | **No `ratchet` column in the bulk CSV.** (Brief 01 claimed `demandratchetpercentage`; that is wrong for the bulk file. May exist in API JSON only.) | Verified — corrects brief 01 |
| Source URLs | Only **1.1%** of active records lack a `source` URL. Document-level sourcing is good; **page/line-level sourcing does not exist**. | Verified |
| Riders | 979 active residential rates mention a rider, surcharge, or fuel adjustment in free text; **34.3% of those carry no non-zero `adj` value anywhere**. | Verified |
| Update cadence | Rates re-checked annually for utilities covering ~70% of US load — about **150 utilities, under 10% of providers**. Everything else stays as last entered. | Verified (OpenEI wiki; pv-magazine 2020) |
| License | CC0 1.0, "unless otherwise noted" | Verified |
| API version | `version` parameter accepts `latest` or **3–8**. v8 is real: NREL/PySAM shipped a `URDBv8_to_ElectricityRates` converter (PR #126, merged 2022-12-10). The REST doc page itself was **last modified 2017-05-22** and its examples still use v5. | Verified |
| Error reporting | A wiki-style "edit this rate" path on OpenEI plus a generic feedback form ("Out of date content", "Broken link"). NREL staff in the SAM forum tell users to fix errors themselves by editing OpenEI. **No issue tracker, no diff review, no versioned provenance.** | Verified |
| Maintainer | NLR (formerly NREL), DOE-funded. Active, but the wiki also says NLR "is working with utilities and industry on a standard machine-readable tariff format that could replace manual data collection" — contact `solar.tools@nlr.gov`. | Verified |
| Deprecation / successor | **None announced.** The machine-readable-format effort above is the nearest thing to a successor path, and it points at URPX. | Verified |
| Published error-rate study | **None found.** No peer-reviewed or lab study measures URDB accuracy. The only quantified audits are vendor/maintainer self-reports (see below). | Unverified (absence) |

### Staleness, computed by us

| Measure, active residential rates | Count | Share |
|---|---|---|
| Start date before 2020 | 4,961 of 6,357 | **78.0%** |
| Start date blank or unparseable | 485 | 7.6% |
| Start date 2024 | 80 | 1.3% |
| Start date 2025 | 350 | 5.5% |
| Start date 2026 | 382 | 6.0% |
| Utilities with an active residential rate | 2,686 | — |
| …of which any residential rate dated 2024+ | **164** | **6.1%** |

Nectar's cited NerdyWatts analysis (Sept 2026) reported 4,961 of 6,357 and 154 of 2,589. Our 2026-10-29 snapshot gives **4,961 of 6,357** (identical) and 164 of 2,686 (snapshot drift). **The staleness claim is Verified.**

The ~12% of rates dated 2025–2026 are the ~150 actively maintained utilities. The long tail is a decade old and visually indistinguishable from fresh data.

## 2. Competing and adjacent datasets

| Source | What it is | Coverage | License / price | Tested? | Tag |
|---|---|---|---|---|---|
| **OpenEI URDB** | The de facto standard | 58,920 records, 2,843 EIA IDs | CC0 | No test suite | Verified |
| **`cbetz/ratebook`** | Open tariff DB + deterministic engine (Python **and TypeScript**) + MCP server + Home Assistant integration. Shared JSON test vectors (`tests/vectors/v0_bills.json`) both engines must reproduce byte-for-byte; cross-validated against PySAM `utilityrate5`; "unknown" is a typed refusal. Browser demo = real engine client-side. | v0.1.0: **65 engine-validated tariffs, 37 utilities, 26 states + DC**. Pre-release. 333→36 commits, 1 star. | Code Apache-2.0, **data CC0-1.0** | **Yes — the only one** | Verified |
| **Nectar** (nectarclimate.com) | Announced 2026-10-22: free public DB of US tariffs **and riders**, every value citing source document **and page**, revision history, "verified" only when computed charges match real bills. Schema + validators + bill calculator open source. Bulk JSON/CSV/Parquet + free REST API + open MCP server. | Rate guides for **400+ utilities** live today; database targeted **end of 2027**, starting with C&I | **CC0**, commercial use OK | Promised | Verified (their claims; delivery Unverified) |
| **URPX** | See §3 — format, not corpus | n/a | W3C / CDLA-Permissive-2.0 / Apache-2.0 | Test-case datasets exist | Verified |
| **NYSERDA IEDR Rate Plan Browser** | State-run structured rate-plan repository, 8 NY IOUs, normalized to one format, spreadsheet download, updated within **2 business days** of DPS publication | New York only | Free to all users; redistribution terms not stated | No | Verified (cadence/download); license Unverified |
| **LBNL Tariff Analysis Project (TAP)** | "Universal tariff template" DB behind DOE appliance-standards rulemakings | Not stated | **Not stated** | No | Verified (page); coverage Unverified |
| **NREL demand-charge dataset** | Max demand charge rates by tariff, derived from URDB | Derived | CC BY | No | Verified |
| **Arcadia Signal** (ex-Genability) | Commercial tariff DB + calculator | "25K+ North American tariffs" | Metered API, **price not published** | Vendor-validated | Unverified (third-party figure) |
| **RateAcuity** | Commercial electric + gas tariff DB, API | 40+ yrs tariff monitoring | 14-day trial, **price not published** | Vendor QA | Unverified |
| **Energy Toolbase** | Commercial rate DB; self-describes two-person check and validation against customer bills | Not stated | Bundled with software | Vendor self-report | Verified (their blog) |
| **UtilityAPI / Bayou** | **Not tariff corpora** — consented customer bill/interval data. Bayou: first 10 meters free, then ~$2/meter/bill. | n/a | Metered | n/a | Unverified (aggregator pricing) |
| **Hitachi Velocity Suite / "Tariff Atlas"** | Nothing found | — | — | — | Not found |

**Answer to "is there ANY open, machine-readable, tested corpus?"** One, and it is six months old and tiny: `ratebook`, at 65 tariffs. Nothing at national scale.

### The only quantified accuracy audits in existence

| Claim | Source | Tag |
|---|---|---|
| "Only **3 of 28** audited tariffs were fully accurate" — others had drifted rates, stale adjustors, missing riders, structural gaps | ratebook v0.2.0 release notes | Verified (quote); maintainer self-report, n=28 |
| Tariffs filed before 2015 compute bills **~17% below** what utilities collected | Nectar, citing NerdyWatts | Unverified |
| ~27% of active residential rates mentioning a rider have no structured value for it | Nectar, citing C. Betz on the June 2026 snapshot | Our count: **34.3%** of the 979 that mention one, = 5.3% of all active residential. Directionally confirmed, definition-sensitive |
| `servicetype` missing on 71.6% | Same | Our count: **78.8%** of active residential, 85.1% of all active. Confirmed, higher |

## 3. Is there a standard machine-readable tariff schema?

**Yes, as of 2026, and it is URPX.** This is the single most important finding in this brief.

| Attribute | URPX (Utility Rate Plan Exchange) | Tag |
|---|---|---|
| Governance | **LF Energy** Standards and Specifications (LFESS), Data Standards & Tooling SIG. Open working group; stage/release votes held by a smaller committee. | Verified |
| Origin | Initiated by **Flux Tailor**, collaborating with **NLR**. Green Button Alliance lists it as complementary to Green Button. | Verified |
| Status | **Sandbox** stage. Accepted as Working Group Draft 2026-07-17. Launch announcement 2026-06-09; "URPX Goes Public" 2026-10-14. Latest release **v0.5.1, 2026-10-06**. Pre-1.0, breaking changes expected (v0.5.0 moved namespaces). | Verified |
| Tech | RDF + OWL ontology, **SHACL** validation shapes, JSON-LD context. Covers flat → TOU → **ratchet** → dynamic pricing, eligibility rules, geographic applicability, **temporal versioning and regulatory tracking**, plus a Common Service API (GraphQL/REST planned). | Verified |
| Mappings | Green Button, LF Energy CDS, CIM, OpenADR (profiles still draft) | Verified |
| Licenses | Spec: W3C-20150513 · **Test-case datasets: CDLA-Permissive-2.0** · Code: Apache-2.0 | Verified |
| Repo activity | `urpx-org/urpx`: 333 commits, 3 stars, 1 fork, 10 issues, 7 PRs. Plus `urpx-org/urpx-dev`. | Verified |
| **Corpus?** | **No. Format and API spec only.** `test-cases/` holds "real-world example datasets"; count not stated and **no bill calculator or expected-bill vectors are mentioned**. | Verified |
| Implementations | `clj-urpx` (Clojure: parse, validate, resolve prices, generate OpenADR 3 price intervals) | Verified |

Other schemas and engines, for completeness:

| Project | Status | License | Tag |
|---|---|---|---|
| URDB's own 737-column flat schema | De facto standard by inertia; no holidays, no ratchets, no page citations, dead `approved` flag | CC0 | Verified |
| **PySAM `UtilityRateTools`** (`URDBv8_to_ElectricityRates`) + `Utilityrate5` | NREL's real rate engine. Not standalone — bundled in PySAM/SAM. Known zero- vs one-based schedule indexing trap; known `flatdemandmonths` period/tier confusion (fixed 2022). | BSD-3 (SAM) | Verified |
| **EPRI DER-VET** tariff file input | Documentation states the URDB "lacks tariffs with overlapping demand charges and can contain inconsistencies" — the clearest published statement of the overlap limitation | Varies | Verified |
| EnergyPlus `UtilityCost:Tariff` | Long-standing building-sim tariff object; per-model, not a corpus | Permissive | Verified |
| `tariffkit` (PyPI) | Offline engine; **deliberately avoids URDB**; first provider = PG&E residential only; CLI with JSON output | Not confirmed | Unverified |
| `tariff-core` (PyPI) | Generic electricity/gas/water tariff modeling, parse + validate + bill | Not confirmed | Unverified |
| FERC Order No. 714 eTariff | Federal mandate for electronic tariff filing; XML-schema-based. **Transmission/wholesale only — not retail rate schedules.** | Public | Verified |
| IEC / NAESB / IEEE retail tariff standard | **None found.** NAESB appears only as the host of FERC eTariff drafts. | — | Not found |
| Koomey, 2008 JEC testimony | Proposed exactly this standardized electronic rate format 18 years ago. Nothing shipped. | — | Verified |

## 4. Demand for a better corpus

| Evidence | Detail | Tag |
|---|---|---|
| **NREL's own caveat** | The data.gov/URDB notice: data were "interpreted and transcribed manually from utility tariff sheets, which are often complex… It is possible that URDB entries have errors," and should be "consulted against the actual tariff sheets" when accuracy matters. | Verified |
| **EPRI DER-VET caveat** | URDB "lacks tariffs with overlapping demand charges and can contain inconsistencies." | Verified |
| **SAM / REopt friction** | NREL staff: SAM and REopt "appear to be working with different versions of the URDB." PySAM issue #128 (URDB v8 converter, `flatdemandmonths` misread as tiers). SAM issue #1834 (unspecified max tier silently accepted). Ladybug/Dragonfly users asking how to replace the URDB label with a custom rate. | Verified |
| **Alliance to Save Energy** | URDB "does not include the level of participation of … weekday peak hours and … weekend or off-peak hours"; seasonal components missing. | Verified |
| **Startups saying tariff data is the hard part** | Nectar's entire Oct 2026 post. Energy Toolbase's blog on manual transcription risk. WattBuy took **$500,000 from Schmidt Futures in 2020** specifically to automate and expand URDB — and the 2026 data shows it did not happen. | Verified |
| **State mandates for machine-readable retail tariffs** | **None found in any state.** Illinois makes electronic filing optional and specifies **PDF**. New York "strongly encourages" its e-tariff system. Utah and Kentucky require a *searchable/downloadable copy*, i.e. a document. The only structured-rate mandate-adjacent thing is NY's IEDR, where utilities feed the Rate Plan Browser within 2 business days of DPS publication. | Verified |
| **NARUC interest** | NARUC ran an innovation webinar on "free datasets and tools to benchmark rates and analyze affordability." Regulator-side appetite exists. | Verified |

**Who would use it:** DER/solar/storage modelers (SAM, REopt, DER-VET, Ladybug), building-energy modelers, EV smart-charging and home-automation (ratebook already ships a Home Assistant integration), affordability researchers and state commissions, rate-comparison consumer tools, and LLM agents needing a grounded bill calculator. Demand is documented and multi-sector.

## 5. Legal

| Question | Finding | Tag |
|---|---|---|
| Are filed tariff sheets public records? | **Yes, effectively everywhere.** CPUC G.O. 96-A: tariffs open to public inspection, and a utility "may not require anyone wanting to inspect or copy a tariff to disclose the nature of that person's interest." Utah: utilities with websites must provide a **searchable** copy of the effective tariff. Kentucky: must make the current tariff available on the website "for public viewing and downloading." Ohio: commissions may charge copy fees not exceeding cost. | Verified |
| Any state where tariff sheets carry copyright or redistribution terms? | **None found.** We found no utility or commission asserting copyright over a filed tariff, and no state restricting redistribution. Caveat: we did not survey individual utility website ToS at scale, and some utility sites carry generic blanket copyright notices. | Verified (absence); utility ToS Unverified |
| Is a filed tariff itself copyrightable? | **Unresolved, and nobody has litigated it.** The government-edicts doctrine (*Georgia v. Public.Resource.Org*, 2020) bars copyright in works that carry the force of law, authored by officials who speak with that force. A filed tariff *has* the force of law (the filed-rate doctrine) but is drafted by a private utility and approved by the commission — squarely in the gap the *PRO* majority did not address, and commentators disagree on the doctrine's reach. | Verified (law); application Unverified |
| Is **our** structured encoding copyrightable? | Under *Feist*, the **rate values are facts and are not protectable**. Only our original selection and arrangement could be, and that protection "doesn't extend to the facts themselves." Practical read: thin to nonexistent protection in the numbers, which cuts **both ways** — we can encode freely, and anyone can take our encoding. | Verified (law) |
| Operational conclusion | Encode and redistribute the facts; link to rather than mirror the utility's PDF; cite document + page; ship CC0 or CC BY 4.0, matching URDB's CC0 and URPX's CDLA-Permissive-2.0 for data. | — |

## 6. Feasibility of a conformance suite

| Candidate vector source | Assessment | Tag |
|---|---|---|
| **`ratebook` `tests/vectors/v0_bills.json`** | The **only existing published (tariff, load, expected bill) vector set** we found. Generated by `generate_vectors.py`; Python and TS engines must reproduce byte-for-byte; CC0 data, Apache-2.0 code. Count not published. | Verified |
| **PySAM `Utilityrate5` as an oracle** | No published fixture file found, but ratebook already uses PySAM as a test-only oracle on representative tariffs. This is a workable *generator* of vectors, not a corpus of them. Caveat: PySAM's own docs warn inputs are interdependent and user-maintained, and it inherits URDB's gaps — it cannot validate ratchets or holidays it does not model. | Verified |
| **URPX `test-cases/`** | Real-world example datasets under CDLA-Permissive-2.0, but no bill calculator or expected-bill assertions mentioned. SHACL gives *structural* conformance only. | Verified |
| **State commission "typical bill" tables** | **The best untapped vector source.** Florida PSC comparative rate reports (100–1,500 kWh per utility, built from filed tariffs). Indiana IURC 2026 residential survey (500/1,000/1,500/2,000 kWh, dated July 1, 2026). Texas PUC monthly reports, explicitly "verified using a computer spreadsheet that reflects each utility's current tariff manual." Illinois admin code **mandates** comparisons at 100–3,000 kWh. These are regulator-published, independently computed expected bills. | Verified |
| Catch | **All of them are PDFs.** No commission was found publishing CSV/XLSX. Extraction is required, and the tables cover flat-rate residential consumption only — they prove nothing about TOU, demand, ratchets, or holidays. | Verified |
| Verdict | A conformance suite is **feasible and cheap for residential energy-only tariffs** (regulator tables give free ground truth at national scale) and **expensive for everything else** (needs real bills, which is exactly why Nectar's "verified" gate and Arcadia's moat exist). | — |

## Is this a real gap worth filling, and how big?

**The gap is real and we measured it.** 78% of active residential tariffs in the only open corpus are pre-2020; the quality flag is empty on every record; the schema cannot express a holiday, a ratchet, or a rider; and no published study, test suite, or accuracy scorecard exists for any of it. The only quantified audit in existence is one developer's n=28 finding that 3 were right.

**But "become the canonical open tariff corpus" is already contested, and by better-positioned parties.** Three things changed in 2026, all after brief 02 was written:

1. **URPX exists** and is the schema question answered — by LF Energy, with NLR, with SHACL validation and temporal/regulatory versioning that beats anything we would design. Inventing a gridprims schema is now strictly worse than emitting URPX JSON-LD.
2. **`ratebook` exists** and is our proposed architecture already shipping: open engine, CC0 data, cross-language shared test vectors, PySAM oracle, runs in a browser. It is tiny (65 tariffs, 1 star) and pre-release, but it is six months ahead of us on the hard part.
3. **Nectar has publicly committed** to the full corpus — CC0, riders, page-level citations, revision history, bill-matched verification, free API and MCP — by end of 2027, with a commercial business funding it and 400+ utility rate guides already live.

**The corpus itself is also the worst possible fit for a free static client-side site.** Maintaining fresh structured tariffs is a continuous human-labor problem: ~150 utilities per year consumed NREL's entire budgeted effort, WattBuy's $500,000 and five years did not dent it, and Nectar is solving it with AI agents plus paid human reviewers plus real customer bills. Pull requests will not substitute for that, and "verified against a real bill" requires bill data a static site can never hold.

**What is genuinely unfilled, and sized for us:** nobody has published an **independent, reproducible accuracy scorecard and conformance test-vector suite** for US tariffs. ratebook lists "a reproducible public accuracy scorecard" as *in progress*. URPX ships structural validation but no bill assertions. Regulator typical-bill tables are free, national, dated ground truth sitting in PDFs that nobody has extracted. That work is static-site-native: it is computation over published files, the output is small JSON, and the engine runs client-side. It makes gridprims the **referee** rather than the fourth entrant in the corpus race, and it is the asset every corpus builder — NLR, URPX, ratebook, Nectar — would consume rather than compete with.

**Size:** the measurement gap is a 2–6 week, high-leverage, defensible project. The corpus gap is a multi-year, multi-person, continuously-funded operation that two parties with more money and more data are already running at.

## Sources

- OpenEI URDB wiki — https://openei.org/wiki/Utility_Rate_Database
- URDB bulk CSV (analyzed directly) — https://openei.org/apps/USURDB/download/usurdb.csv.gz
- URDB REST API doc (version 3–8; page last modified 2017-05-22) — https://openei.org/services/doc/rest/util_rates/?version=8
- data.gov URDB-derived dataset notice (manual transcription caveat) — https://catalog.data.gov/dataset/u-s-electric-utility-companies-and-rates-look-up-by-zipcode-2019
- NREL demand charge dataset — https://data.nrel.gov/submissions/74
- URPX repo — https://github.com/urpx-org/urpx · release v0.5.1 — https://github.com/urpx-org/urpx/releases/tag/v0.5.1
- LF Energy URPX project page — https://lfenergy.org/projects/utility-rate-plan-exchange-urpx/
- Green Button Alliance on URPX — https://www.greenbuttonalliance.org/urpx
- clj-urpx — https://cljdoc.org/d/energy.grid-coordination/clj-urpx/0.52.0
- ratebook repo — https://github.com/cbetz/ratebook · releases (3-of-28 audit) — https://github.com/cbetz/ratebook/releases · PyPI — https://pypi.org/project/ratebook
- Nectar, "An Open, Public Tariff Database for US Utilities by 2027" (2026-10-22) — https://nectarclimate.com/blog/post/open-tariff-database
- NYSERDA IEDR Rate Plan Browser — https://iedr.nyserda.ny.gov/rate-plans-about · IEDR 2026 Q2 report — https://www.nyserda.ny.gov/-/media/Project/Nyserda/Files/Programs/IEDR/IEDR-2026-Q2.pdf
- LBNL Tariff Analysis Project — https://hes-documentation.lbl.gov/page-archive/tariff-method/tariff-analysis-project-database
- EPRI DER-VET tariff file inputs — https://storagewiki.epri.com/index.php/DER_VET_User_Guide/Inputs/Tariff_File_Inputs
- PySAM Utilityrate5 — https://nrel-pysam.readthedocs.io/en/latest/modules/Utilityrate5.html · issue #128 (URDB v8 converter) — https://github.com/NREL/pysam/issues/128 · SAM issue #1834 — https://github.com/NREL/SAM/issues/1834
- NREL REopt, interpreting utility bills and rate data — https://www.nrel.gov/reopt/curriculum/interpreting-utility-bills-rate-data
- WattBuy / Schmidt Futures $500k to automate URDB (2020-03-11) — https://pv-magazine-usa.com/?p=5885
- Energy Toolbase on manual transcription risk — https://energytoolbase.com/blog/utility-rates/our-utility-rates-database
- Arcadia FAQ (Genability, Signal) — https://arcadia.com/about-us/faqs
- Alliance to Save Energy rate analysis narrative — https://www.ase.org/sites/ase.org/files/rdi_analysis_narrative.pdf
- Koomey, standardized utility rate data — https://koomey.com/koomey_blog/the-importance-of-standardized-utility-rate-data-for-energy-innovation
- FERC Order No. 714 (electronic tariff filings) — https://www.ferc.gov/sites/default/files/2020-06/OrderNo714.pdf · Federal Register notice — https://www.federalregister.gov/documents/2008/10/03/E8-22500/electronic-tariff-filings
- Illinois 83 Ill. Adm. Code (electronic tariff filing, PDF) — https://ilga.gov/ftp/JCAR/AdminCode/083/083002900000400R.html
- NY DPS utility tariff preparers guide — https://dps.ny.gov/system/files/documents/2025/02/utility-tariff-preparers-guide.pdf
- CPUC G.O. 96-A publishing tariffs — https://docs.cpuc.ca.gov/published/Graphics/Final_decision/8607-06.htm
- Utah Admin. Code R746-405-2 — https://www.law.cornell.edu/regulations/utah/Utah-Admin-Code-R746-405-2
- Kentucky 807 KAR 5:011 — https://apps.legislature.ky.gov/law/kar/titles/807/005/011/
- Ohio Rev. Code 4903.23 — https://codes.ohio.gov/ohio-revised-code/section-4903.23
- Georgia v. Public.Resource.Org (2020) — https://www.supremecourt.gov/opinions/19pdf/18-1150_7m58.pdf · Feist v. Rural Telephone (1991) — https://cyber.harvard.edu/property00/alternatives/feist.html
- Florida PSC comparative rate reports — https://floridapsc.com/pscfiles/website-files/PDF/Publications/General/comprate/rate-electric.pdf
- Indiana IURC 2026 electric residential bill survey — https://www.in.gov/iurc/files/2026-Electric-Residential-Bill-Survey_Update_7.28.26.pdf
- Texas PUC residential rate comparisons — https://ftp.puc.texas.gov/public/puct-info/industry/electric/rates/RESrate/rate22/Jun22Rates.pdf
- NARUC webinar, free datasets to benchmark rates — https://www.naruc.org/events/all-events/innovation-webinar-free-datasets-and-tools-to-benchmark-rates-and-analyze-affordability/
- tariffkit — https://pypi.org/project/tariffkit/ · tariff-core — https://pypi.org/project/tariff-core/
