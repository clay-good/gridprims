# 01 — Data sources and licensing

> **Superseded in part (2026-10-29):** license and status findings are updated in `06` (rule status), `07` (formats: URDB API v8 exists; REopt rules), and `08` (licenses: ATB 2025, End-Use Load Profiles, EAGLE-I v4, PUDL, OGE, and Queued Up confirmed CC BY 4.0; URDB CC0; SPP needs permission; DSIRE is CC BY-SA 4.0; HIFLD Next may carry OpenStreetMap obligations). Where they differ, the newer brief wins.

Research date: 2026-10-27. Planning only; not legal advice. "Verified" means read on the publisher's own page on 2026-10-27. "Unverified" means from secondary sources or not found.

## Bottom line

- **Federal data (EIA, EPA, most NLR/LBNL) is safe to redistribute** with attribution. This is the v1 backbone.
- **ISO/RTO price and queue data is the legal minefield.** Only ERCOT clearly allows redistribution. PJM, MISO, NYISO, and ISO-NE reserve rights or forbid it; CAISO allows limited use with credit.
- **Use LBNL "Queued Up" (CC BY 4.0) for queues instead of scraping seven ISOs.** Do not touch Interconnection.fyi's site data.
- **EIA electricity releases are on schedule in 2026** despite staff cuts. The delays hit petroleum and other products.
- **NREL is now the National Laboratory of the Rockies (NLR)** as of 2025-12-01. Domains are moving to `nlr.gov`; `atb.nrel.gov` no longer resolves.
- **Never publish substation locations or engineering detail.** General transmission-line routes are public and outside the CEII definition, but keep them coarse.

## Federal statistical data

### EIA (860, 860M, 861, 923, 930, API v2)

| Item | Finding |
|---|---|
| Publisher | U.S. Energy Information Administration |
| License | Public domain. EIA asks for a dated credit, e.g. "Source: U.S. Energy Information Administration (Oct 2026)." No EIA logo. Third-party photos and contributed material excluded. **Verified.** |
| Redistribute cleaned copy? | Yes |
| EIA-860 (annual plants/generators) | 2025 final released 2026-09-10. Next: 2026 early release, June 2027. ZIP of XLSX (utility, plant, generator, owner, environmental). **Verified.** |
| EIA-860M (monthly generator inventory) | Monthly. Not separately checked this pass. |
| EIA-861 (utility sales, customers, revenue) | 2025 final released 2026-10-07; next early release August 2027. Includes **Reliability** file (SAIDI/SAIFI, 2013–present, "if collected") and **Service Territory** file (counties per utility, 2001–present). **Verified.** |
| EIA-923 (generation, fuel) | Monthly; August 2026 data out 2026-10-23, next end of November 2026. Annual 2025 final 2026-09. ZIP of XLS. **Verified.** |
| EIA-930 (hourly BA demand, generation by fuel, interchange) | Hourly, via Grid Monitor and API. Download page details not confirmed this pass. |
| API v2 | Free key, passed in URL only. 5,000 rows per JSON call (300 XML), page with `offset`/`length`. Throttle is unpublished; overuse suspends the key temporarily. Latest patch v2.1.12 (March 2026). Bulk files refresh twice daily. **Verified.** |

**Staffing and delays.** EIA's FY26 request cut staff about 30% (353 to 246). 2025–2026 delays hit the Petroleum Supply Monthly (including a June 2026 slip blamed on a "technical issue"), solar module shipments (dropped), and the International Energy Outlook (dropped). **No delays found for 860, 861, 923, 930, or the Electric Power Monthly.** The electricity calendar looks intact as of today.

**Gotchas.** 861 short-form utilities report less detail. SAIDI/SAIFI coverage is incomplete, and IEEE 1366 with/without major events are separate columns. 930 has known BA-level quality issues (gaps, spikes, imputation). Early-release data is unvalidated. API JSON values are strings since v2.1.6. Ship from bulk files, not live API calls, since our site is static and keys can't go in the client.

### EPA eGRID

- Public domain (U.S. government work). Redistribute with credit.
- Latest: **eGRID2023**, released 2025-01-15, revised 2025-06-12. XLSX plus Technical Guide PDF. EPA had planned eGRID2024 for January 2026. As of 2026-10-27 the download page still lists only eGRID2023. **eGRID2024 appears about 9 months late; reason unverified.**
- Gotchas: two-year data lag; subregion factors are annual averages, not marginal.

### EPA CAMPD (Clean Air Markets hourly emissions)

- Public domain. Free api.data.gov key. Bulk files at `api.epa.gov/easey/bulk-files/` (hourly emissions by state/quarter) are the right path for large pulls.
- Gotchas: covers only units in Acid Rain/CSAPR programs (mostly fossil units of 25 MW or more). Values for complex stack configurations are apportioned and differ from raw ECMPS data. Files are large; aggregate before shipping.

## NLR (formerly NREL) data

**Rename confirmed.** DOE renamed NREL the **National Laboratory of the Rockies (NLR)** on 2025-12-01. Docs now sit at `developer.nlr.gov`; `atb.nrel.gov` fails DNS. Expect broken links in old citations. Cite as "National Laboratory of the Rockies (formerly NREL)."

| Dataset | Finding |
|---|---|
| **OpenEI URDB** | Content on OpenEI is **CC0** "unless otherwise noted." **Verified** on the API doc and wiki. API v7 needs a free OpenEI key (not the NLR developer key); up to 500 rates per call. **Bulk gzip CSV and JSON exist**, so no live API is needed. Covers more than 3,700 utilities. Schema covers tiers (`energyratestructure`), 12x24 TOU schedules weekday/weekend, flat and TOU demand charges, **ratchets (`demandratchetpercentage`)**, coincident demand, fixed and minimum charges, `startdate`/`enddate`, and an `approved` flag. **Staleness:** only about 150 utilities (about 70% of load) are re-checked yearly; the long tail can be years old. Show each rate's last-update date. Riders and fuel adjustments are often missing. |
| **ATB** | 2025 edition on OEDI (`data.openei.org/submissions/8759`) as CSV/XLSX/Parquet. **License field shows "In progress." Unverified.** US-government-funded, so it is probably reusable, but confirm. |
| **Cambium** | Latest confirmed is the **2024 edition** (fifth annual). Hourly marginal and average emission and cost projections, plus LRMER workbooks. No 2025 edition found. License not confirmed this pass. |
| **PVWatts v8 API** | Free NLR key; 1,000 requests/hour per key; DEMO_KEY 30/hour, 50/day. **Verified.** The key can't ship in client code, so we must precompute or ask users to bring their own key. |
| **NSRDB** | 1998–2023, annual updates. Open S3 bucket on AWS (no account needed) and OEDI. Huge (multi-TB); ship only tiny derived summaries. |

## Interconnection queues

### LBNL "Queued Up" 2026 edition

- **License: CC BY 4.0. Verified.** Required attribution: **"Lawrence Berkeley National Laboratory and GridTracker."** File: `lbnl_ix_queue_data_file_thru2025.xlsx` (project-level data, codebook, 36 summary tabs).
- Covers more than 50 operators (7 ISO/RTOs plus about 50 non-ISO BAs), about 98% of U.S. capacity, data through end of 2025. About 8,200 active projects, 1,312 GW generation, about 749 GW storage.
- Cadence: annual (spring/summer). Gotchas: the snapshot is up to 18 months old by the next release; no load requests or distribution-level projects.

### GridTracker / Interconnection.fyi

- **Avoid.** Terms allow only "personal, non-commercial research" and prohibit "bulk downloading, scraping, or redistribution" without written consent. **Verified.** GridTracker is the commercial firm behind both the site and the data in LBNL's file. The CC BY license on LBNL's file covers that annual snapshot, not the live site.

### ISO/RTO queue files and price archives

| ISO | Terms (as read 2026-10-27) | Redistribute? |
|---|---|---|
| **ERCOT** | Public content "may be used, reproduced, and redistributed" unmodified with notices kept; raw data may be redistributed in compilations and analyses without the notices. **Verified.** | **Yes** |
| **CAISO** | No copying "except as expressly authorized in writing," but public-information materials may be used if notices are kept and you "credit the California ISO." API terms bar benchmarking or competitive use. **Verified, ambiguous.** | Probably, with credit; confirm |
| **PJM** | Data Miner: "internal use only"; redistribution "strictly prohibited" without active PJM membership (Associate minimum). Non-members limited to 6 connections/min. An older license PDF also says non-members may not republish. **Verified.** | **No** (without membership) |
| **MISO** | Site terms prohibit modifying, publishing, transmitting, or reproducing materials and ban scraping. No market-data carve-out found. **Verified.** | **No** (ask MISO) |
| **NYISO** | Access "does not confer any license"; all rights reserved. **Verified.** | **No** (ask) |
| **ISO-NE** | Content, including data, is copyrighted; "non-personal use may violate copyright." Permission via info@iso-ne.com. **Verified.** | **No** (ask) |
| **SPP** | Terms page not found. **Unverified.** | Unknown |

Queue file locations: CAISO (`PublicQueueReport.xlsx`) and NYISO (`NYISO-Interconnection-Queue.xlsx`) post public workbooks. Others vary. Some reportedly use bot protection. Schemas differ widely; the open-source `gridstatus` library normalizes them.

Note: facts (numbers) are generally not copyrightable in the U.S. (*Feist*), but website terms can still be enforced as contracts. That is open legal question 1.

### ERCOT 4CP and PJM 5CP

- **ERCOT 4CP:** ERCOT files the four 15-minute June–September peak intervals each year with the Texas PUC (examples: 2023 = Jun 27, Jul 31, Aug 10, Sep 8; 2024 = Jun 30, Jul 1, Aug 20, Sep 20). No single historical table was found; we would compile one from the annual filings. ERCOT terms allow this.
- **PJM 5CP:** PJM posts "Summer [year] Peaks and 5CPs" PDFs (2022–2024 found; 2025 not found this pass). Individual customer peak load contributions are set by each utility and are not public. Showing a handful of dates and MW values from a PJM PDF is a small factual excerpt, but PJM's terms make redistribution risky. Cite and link rather than ship a dataset. This is open legal question 2.

## Grid geography

### HIFLD Open, the DataLumos archive, and HIFLD Next

- HIFLD Open was discontinued 2025-08-26, and its portal went offline after 2025-09-16. Some layers moved to HIFLD Secure, which requires a PIV card or Login.gov access.
- The Data Rescue Project archived more than 400 layers on DataLumos (ICPSR). Transmission Lines: DOI `10.3886/E240591V1`, GeoJSON/shapefile, snapshot taken about 2025-08-26. **The DataLumos page returned 403 to our fetch, so the license is unverified.** The original was a federal (ORNL/DHS) layer. Mirrors disagree: data.gov lists a U.S. government-works license, while Data Basin lists CC BY 3.0.
- **HIFLD Next** (`hifld.publicenvirodata.org`) is a community relaunch by Public Environmental Data Partners and Fulton Ring of the DataLumos layers, with GeoPackage, GeoParquet, and PMTiles. It is real (announced March 2026; NGAC talk August 2026). License, update plan, and whether the power layers are included are **unverified**. The data is frozen at 2025; expect it to go stale.
- EIA's Energy Atlas shows transmission lines at 69–765 kV sourced from HIFLD. EIA says it does **not** publish substation locations.

### OpenStreetMap power features (ODbL)

- Rendered maps and tiles are "Produced Works": they need attribution ("© OpenStreetMap contributors") but no share-alike.
- **A static GeoJSON/PMTiles extract we ship is a database.** Any derivative database we distribute publicly must itself be offered under ODbL, and if we merge OSM with other data, the merged database may be a Derivative Database (not a separable "Collective"). Keep OSM layers in separate files under ODbL. Never blend them into our CC0/CC BY tables. Offer the derived file for download.

## FERC data via Catalyst PUDL

- **PUDL data and docs: CC BY 4.0; code: MIT. Verified** in the GitHub README. Credit Catalyst Cooperative.
- Underlying FERC filings are public. Form 1 comes from DBF before 2021 and XBRL from 2021 on. Form 714 (hourly planning-area demand) is XBRL. Distributed as Parquet, `pudl.sqlite`, and `pudl.duckdb` on S3, with nightly and versioned releases archived on Zenodo.
- Gotchas: Form 1 is messy even after cleaning; keep XBRL/DBF seams in mind. PUDL also repackages EIA data, which is a convenient single source with a CC BY obligation.

## Utility hosting capacity maps

- States with mandates: secondary sources counted 7 in 2020 (CA, NV, MN, NY, MD, NJ, CT) and 9 by 2021. **No current authoritative list was found; unverified.** IREC publishes guidance but **no national index was found**.
- Data availability varies by utility. Many maps are ArcGIS viewers with click-through terms; some offer downloads (a Northeast seven-state compiled feeder dataset exists). Feeder-level geometry may be treated as sensitive by utilities.
- v1 recommendation: link out from a curated, dated index of maps (our own facts, no data copied).

## Green Button (ESPI / CMD)

- The formal standard is NAESB REQ.21 (ESPI), **sold by NAESB for $250**. The Green Button Alliance publishes Connect My Data implementation agreements and test materials. The ESPI XML schema is widely mirrored on GitHub; **not verified this pass.**
- For a client-side tool, parsing a user's "Download My Data" XML or CSV entirely in the browser is a good fit: no data leaves the device.

## CEII (18 CFR 388.113)

- CEII means "specific engineering, vulnerability, or detailed design information" about energy infrastructure that could be useful in an attack and is FOIA-exempt. It explicitly **"does not simply give the general location of the critical infrastructure."** (§388.113(c)(2)(iv), **verified**)
- CEII rules bind the government and those who receive CEII under nondisclosure agreements. We never request CEII, so we never hold it. Risk comes from **republishing leaked or misfiled CEII** or **synthesizing** sensitive detail.
- **Never publish:** one-line diagrams, Form 715 planning models and power-flow cases, bus/breaker configurations, transformer specifications, protection settings, contingency or N-1 vulnerability lists, anything labeled CEII, or utility "secure" portal data.
- **Transmission-line routes** from public sources at generalized resolution: low risk, outside the definition. **Substation point locations:** not illegal from OSM, but EIA and HIFLD deliberately withhold them. Avoid in v1 and never rank "critical" nodes.

## (1) Ship in v1 / later / avoid

| Dataset | Verdict | Reason |
|---|---|---|
| EIA-860/860M/861/923 | **v1** | Public domain, on schedule, core facts |
| EIA-861 reliability and territories | **v1** | Public domain; flag missing SAIDI/SAIFI |
| EIA-930 hourly | **v1** (aggregated) | Public domain; ship daily/monthly rollups, not raw hourly |
| EPA eGRID2023 | **v1** | Public domain; note eGRID2024 lateness |
| OpenEI URDB (bulk) | **v1** | CC0, rich schema; show last-update date per rate |
| LBNL Queued Up 2026 | **v1** | CC BY 4.0; replaces seven-ISO scraping |
| PUDL (FERC 1/714) | **v1** | CC BY 4.0; clean FERC data |
| ERCOT prices, queue, 4CP | **v1** | Terms explicitly allow redistribution |
| PVWatts / NSRDB derived | Later | Key can't ship client-side; precompute small tables |
| ATB, Cambium | Later | License field unconfirmed; Cambium 2024 is latest found |
| EPA CAMPD hourly | Later | Large; aggregate first |
| HIFLD transmission lines | Later | License unconfirmed; frozen 2025 data |
| OSM power lines | Later | ODbL share-alike needs separate files |
| Hosting-capacity index (links only) | Later | No national index; link-only is safe |
| Green Button parser | Later | Client-side; spec is paywalled |
| CAISO prices and queue | Later | Needs credit and maybe written OK |
| PJM, MISO, NYISO, ISO-NE, SPP data | **Avoid** (link only) | Terms reserve rights or ban redistribution |
| Interconnection.fyi | **Avoid** | Terms ban scraping and redistribution |
| Substation locations, any CEII-like detail | **Avoid** | Security risk; EIA and HIFLD withhold |

## (2) Open legal questions

1. Can browsewrap website terms (PJM, MISO, NYISO, ISO-NE) bar republishing uncopyrightable facts such as LMPs, when we never sign up? Does the answer change if the data is fetched by script?
2. Is a short table of PJM 5CP dates and MW, cited to PJM, a permissible factual excerpt?
3. Does CAISO's "credit the California ISO" clause cover a cleaned, redistributed price archive, or only "materials"?
4. What license does the DataLumos HIFLD archive (and HIFLD Next) carry? Is the original federal layer fully public domain, or does it include third-party-licensed segments?
5. Is mixing OSM-derived geometry with EIA attributes in one tile a Derivative Database (share-alike) or a Collective Database?
6. Final license on ATB 2025 and Cambium 2024 (expected CC BY 4.0 or public domain).
7. Does LBNL's CC BY 4.0 grant fully clear GridTracker's underlying rights for redistribution of the full file?
8. SPP website terms: not located.

## (3) Sources

- EIA copyright and reuse: https://www.eia.gov/about/copyrights_reuse.php
- EIA Open Data and API docs: https://www.eia.gov/opendata/ ; https://www.eia.gov/opendata/documentation.php
- EIA-860: https://www.eia.gov/electricity/data/eia860/
- EIA-861: https://www.eia.gov/electricity/data/eia861/
- EIA-923: https://www.eia.gov/electricity/data/eia923/
- EIA-930 Grid Monitor: https://www.eia.gov/electricity/gridmonitor/
- EIA transmission/substation FAQ: https://www.eia.gov/tools/faqs/faq.php?id=567&t=3
- EIA staffing (S&P Global, 2025-08): https://www.spglobal.com/commodity-insights/en/news-research/latest-news/natural-gas/080725-us-eia-other-statistical-agencies-face-squeeze-as-staffing-reductions-mount
- EIA delays (Argus): https://www.argusmedia.com/news-and-insights/latest-market-news/2726093-eia-delays-some-reports-after-staffing-cuts-correction
- EIA PSM delay notice: https://www.eia.gov/petroleum/supply/monthly/notice.php
- ASA "Nation's Data at Risk" EIA chapter: https://www.amstat.org/docs/default-source/amstat-documents/the-nations-data-at-risk-2025/energy-information-administration.pdf
- eGRID: https://www.epa.gov/egrid ; https://www.epa.gov/egrid/download-data
- CAMPD API examples: https://github.com/USEPA/cam-api-examples
- NREL to NLR rename: https://www.energy.gov/eere/articles/energy-department-renames-nrel-national-lab-rockies
- URDB API v7: https://openei.org/services/doc/rest/util_rates/?version=7
- URDB wiki: https://openei.org/wiki/Utility_Rate_Database
- NLR rate limits: https://developer.nlr.gov/docs/rate-limits/
- PVWatts v8: https://developer.nlr.gov/docs/solar/pvwatts/v8/
- ATB 2025 on OEDI: https://data.openei.org/submissions/8759
- Cambium: https://www.nrel.gov/analysis/cambium ; https://cmix.openei.org/submissions/270
- NSRDB on AWS: https://registry.opendata.aws/nrel-pds-nsrdb
- LBNL Queued Up: https://emp.lbl.gov/queues ; https://eta-publications.lbl.gov/publications/us-interconnection-queue-data-0
- Interconnection.fyi terms: https://www.interconnection.fyi/terms ; https://www.interconnection.fyi/about-gridtracker
- ERCOT terms: https://www.ercot.com/help/terms
- CAISO terms: https://www.caiso.com/privacy-terms-of-use
- PJM Data Miner 2: https://www.pjm.com/markets-and-operations/etools/data-miner-2.aspx
- PJM data license PDF: https://pjm.com/-/media/etools/edatafeed/data-license-agreement-edata-feed-data-miner-2.ashx
- PJM 5CP (2024): https://pjm.com/-/media/planning/res-adeq/load-forecast/summer-2024-peaks-and-5cps.ashx
- MISO legal: https://www.misoenergy.org/meet-miso/legal-and-privacy/
- NYISO legal notice: https://www.nyiso.com/legal-notice
- ISO-NE legal: https://www.iso-ne.com/legal-privacy
- ERCOT 4CP filings: https://interchange.puc.texas.gov/Documents/54444_66_1349096.PDF ; https://interchange.puc.texas.gov/Documents/55999_84_1445376.PDF
- gridstatus queues: https://opensource.gridstatus.io/en/latest/interconnection_queues.html
- HIFLD Open archive (DataLumos): https://www.datalumos.org/datalumos/project/240591/version/V1/view
- HIFLD Next: https://www.datarescueproject.org/hifld-next/ ; https://hifld.publicenvirodata.org/
- HIFLD Next NGAC talk: https://www.fgdc.gov/ngac/meetings/August_2026_Public_Meeting/HIFLDNext_LightningTalk_Aug2026
- OSM attribution and legal FAQ: https://osmfoundation.org/wiki/Attribution ; https://osmfoundation.org/wiki/Licence_and_Legal_FAQ
- PUDL: https://github.com/catalyst-cooperative/pudl ; https://docs.catalyst.coop/pudl/en/latest/
- Hosting capacity (pv magazine, 2020/2021): https://pv-magazine-usa.com/2020/06/16/solar-hosting-capacity-maps-must-be-accurate-to-be-useful/ ; https://pv-magazine-usa.com/2021/09/20/irec-guide-aims-to-help-states-deploy-solar-hosting-capacity-maps/
- Green Button / NAESB: https://www.greenbuttonalliance.org/news/naesb-publishes-enhanced-standard-for-green-button ; https://archive.greenbuttondata.org/library
- 18 CFR 388.113: https://www.law.cornell.edu/cfr/text/18/388.113
