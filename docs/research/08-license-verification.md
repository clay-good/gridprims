# 08 — License verification

Research date: 2026-10-29. Research only; not legal advice. "Verified" means we read the terms on the publisher's own page, or its own API or repository, on 2026-10-29. "Unverified" means the publisher's page was unreachable or silent, so the finding comes from mirrors or general law. This updates [01-data-sources-and-licensing.md](01-data-sources-and-licensing.md). It does not repeat what 01 already settled.

## Bottom line

- **Most of the "later" sources are now cleared to ship.** ATB 2025, End-Use Load Profiles, EAGLE-I (now v4, through 2025), PUDL, Open Grid Emissions, and Queued Up 2026 are all **CC BY 4.0** on the publisher's own page. URDB is **CC0**.
- **Two sources carry share-alike or extra-notice duties.** DSIRE is **CC BY-SA 4.0**, so any table that mixes in DSIRE content must also be CC BY-SA. Cambium 2024 workbooks and Sharing the Sun use the **NLR Data Catalog license**, which requires shipping its full notice with every copy.
- **HIFLD transmission lines are not clean public domain.** HIFLD Next labels the layer `license: other`. In a sample of 11,457 features, **34%** list "OpenStreetMap" in their `SOURCE` field, which raises an ODbL question. The DataLumos page still returns 403, so that license is unverified.
- **SPP is now known and is a no for v1.** Copying is allowed "with appropriate citation" except in commercial publications, which need SPP's written authorization. CAISO is unchanged: use is allowed if you "credit the California ISO." MISO, NYISO, ISO-NE, and PJM show no change since 2026-10-27.
- **Do not ship Green Button Alliance materials, and do not scrape DSIRE's API.** GBA's terms allow only "private, non-commercial" use. DSIRE's API is a subscription product with no published terms. The DOE-417 site does not resolve from our network; the Internet Archive has recorded only 503 errors since February 2025.
- **Recommendation:** license gridprims tables **per table**. Use CC BY 4.0 by default, CC BY-SA 4.0 for anything containing DSIRE, and ODbL 1.0 for anything containing OSM. Use CC BY 4.0 for page text and MIT for code. Every snapshot should carry a machine-readable upstream credit list (see Note 16).

## Master table

| # | Dataset | License | Attribution required | Redistribute cleaned? | Verified |
|---|---|---|---|---|---|
| 1 | NLR End-Use Load Profiles (ComStock, ResStock), OEDI submission 4520 / `s3://oedi-data-lake/nrel-pds-building-stock/` | CC BY 4.0 (OEDI). The AWS registry instead links the BSD-style **software** licenses. | Cite Wilson et al., DOI `10.25984/1876417`. Do not call a modified dataset "ComStock" or "ResStock." | Yes | Verified (OEDI) |
| 2a | ATB 2025 (OEDI 8759, files `2025_v1`, updated 2026-09-02) | CC BY 4.0 | OEDI citation: Mirletz et al. (2026), "2025 Annual Technology Baseline…," OEDI | Yes | Verified |
| 2b | Cambium **2024** (latest; no 2025 edition found) | Workbooks: NLR Data Catalog license (custom). Scenario Viewer full data: not checked. | Ship the **entire notice** with every copy and credit "DOE/NLR/ALLIANCE." No endorsement use. | Yes, with the notice file | Verified (workbooks) |
| 3 | EAGLE-I outages, Figshare 24237376 **v4** (2026-02-25, 2014–2025) | CC BY 4.0 | Brelsford et al., DOI `10.6084/m9.figshare.24237376.v4` | Yes | Verified (Figshare API) |
| 4 | DOE-417 disturbance summaries (oe.netl.doe.gov) | None posted. Presumed public domain as a federal work. | Credit DOE CESER (courtesy) | Probably | **Unverified** (site unreachable) |
| 5a | SPP website | SPP terms: copying allowed with citation, **except** commercial publications | "Appropriate citation." Commercial use needs SPP's written authorization. | Non-commercial only; ask SPP | Verified |
| 5b | CAISO website and OASIS | Terms of Use (updated 2018-10-02) and API Terms (2019-08-22) | "Credit the California ISO"; keep notices intact | Probably yes with credit; API forbids "benchmarking or competitive purposes" | Verified (unchanged) |
| 5c | MISO, NYISO, ISO-NE, PJM | Unchanged since 2026-10-27 | n/a | No (see 01) | Verified (re-read) |
| 6 | DSIRE database | **CC BY-SA 4.0**. The DSIRE® name is a trademark and is not licensed. | Credit DSIRE / NC Clean Energy Technology Center. Do not use the mark. | Yes, but **share-alike** | Verified (About page) |
| 6b | DSIRE API | Subscription; no terms published | n/a | Do not use without a written agreement | Verified (silence) |
| 7 | Census 2020 ZCTA-to-county file | Public domain (17 U.S.C. §105) | Census asks for source credit | Yes | Verified (file); license by statute |
| 8a | HIFLD Next transmission lines (`hifld/transmission-lines-1` v1.0.0) | STAC `license: "other"`; producer ORNL; no terms page | None stated. ORNL/DHS HIFLD, plus OSM if ODbL applies. | Yes in practice; **OSM-sourced rows are a risk** | Verified (metadata) |
| 8b | DataLumos HIFLD archive, DOI `10.3886/E240591V1` | Not readable (403). Mirrors say public domain (data.gov) or CC BY 3.0 (Data Basin). | Cite the DOI | Probably | **Unverified** |
| 9a | Open Grid Emissions v0.8.0 (Zenodo 22052851, "early release," 2005–2025) | Data: CC BY 4.0. Code: MIT. | Zenodo citation, Singularity Energy | Yes | Verified |
| 9b | Unofficial "eGRID2024" (Zenodo 18968658, Cornerstone, 2026-03-17) | CC BY 4.0 | Cornerstone Sustainability Data Initiative; label as **not EPA** | Yes, but unofficial | Verified |
| 10 | LBNL Queued Up 2026 data file (through 2025) | CC BY 4.0; copyright held jointly by Regents of UC/LBNL **and GridTracker** | "Lawrence Berkeley National Laboratory and GridTracker" | Yes (the file only, not GridTracker's site) | Verified (2026-09-26 archive; live page 403) |
| 11 | PUDL v2026.10.0 (2026-10-14) | Data and docs: CC BY 4.0. Code: MIT. | Credit Catalyst Cooperative / PUDL | Yes | Verified |
| 12a | OpenEI URDB (bulk `usurdb.csv.gz`) | CC0 1.0 ("unless otherwise noted") | None required; courtesy credit to NLR/OpenEI | Yes | Verified (site footer) |
| 12b | NLR Sharing the Sun (data.nlr.gov 244; data as of 2026-09) | NLR Data Catalog license (custom), **not** CC BY as data.gov claims | Full notice in all copies; credit DOE/NLR/ALLIANCE | Yes, with the notice file | Verified |
| 13 | EIA (all) | Public domain | "Source: U.S. Energy Information Administration (Oct 2008)" style: agency name plus publication month and year. No EIA logo. | Yes | Verified |
| 14 | Green Button Alliance site and sample files | GBA legal terms: "private, non-commercial purposes" only. Code repos are Apache-2.0. | n/a | **No** for site files. Write our own synthetic ESPI XML. | Verified |
| 15 | Fonts | See Note 15 | Keep the license file | Yes | Verified |

## Notes

**1. End-Use Load Profiles.** OEDI 4520 shows a CC BY 4.0 license. The organization field still says "NREL," while the data-provider field says "National Laboratory of the Rockies." The AWS Open Data Registry's `License:` field points to the ComStock and ResStock **software** licenses. Those are BSD-style, add naming rules (a modified version may not be called "ResStock"), and require research entities to publish redistributed source code. The OEDI data license governs the data. Name our tables after what they are ("ComStock 2025 R3, aggregated by gridprims"), not as "ComStock." Release folders on S3: `2025/` holds `comstock_amy2018_release_3` and `resstock_amy2018_release_1`; a `2026/` prefix exists but has no releases yet.

**2. ATB and Cambium.** ATB 2025 is now CC BY 4.0 on OEDI; on 2026-10-27 this field said "In progress." Cambium: the NLR page (updated 2026-05-20) still calls the 2024 edition the latest ("fifth annual edition"), and we found no 2025 edition. The Cambium 2024 workbook on the NLR Data Catalog (submission 289) uses the catalog's "Dataset License." That license is free to use and copy "provided that this entire notice appears in all copies," requires credit to DOE/NLR/ALLIANCE in publications, and bars using their names for endorsement. The page for 289 still shows the pre-rename "NREL / Alliance for Sustainable Energy" wording. Ship a `NOTICE-NLR.txt` with any Cambium snapshot.

**3. EAGLE-I.** The current version is **v4**, not v3. It was published 2026-02-25, adds `eaglei_outages_2025.csv`, and the title now reads "2014-2025." CC BY 4.0. The citation lists Brelsford, Tennille, Myers, Chinthavali, Tansakul, Denman, et al. Pin the snapshot to the v4 DOI.

**4. DOE-417.** `www.oe.netl.doe.gov` publishes only an IPv6 address. It refused our connections and those of the fetch tool. The Internet Archive's last captures (2025-02/03) are all HTTP 503. The last annual table indexed by search engines is **2023**. No license statement was found. As a federal work it is presumably public domain, but it is unverified and possibly stale. Fallbacks: EIA *Electric Power Monthly* Appendix B (public domain EIA), or ORNL's OpenEnergyHub mirror (2023 only). Ask `OE417@hq.doe.gov`.

**5. ISO/RTOs.**
- **SPP** (`spp.org/terms-conditions/`): "Permission is implicitly granted to copy and distribute … in whole or in part (with appropriate citation) EXCEPT when such materials will be used … within a commercial publication … Any commercial use … requires prior, express written authorization." The terms also say access "does not confer any license" and require users to indemnify SPP. If gridprims is free and non-commercial this arguably fits, but "commercial publication" is undefined. **Ask SPP Communications before shipping.**
- **CAISO**: the Terms of Use (last updated 2018-10-02) are unchanged. Most material is public-record-derived and "may be used by you provided that you keep intact all copyright … notices and that you credit the California ISO." The API Terms (2019-08-22) say CAISO "owns all right, title and interest in … CAISO Data," forbid "benchmarking or competitive purposes," and bar non-production use of production systems. These terms do not expressly forbid redistribution. Ship with credit, but a written OK from CAISO would remove the ambiguity.
- **MISO, NYISO, ISO-NE, PJM**: we re-read each page on 2026-10-29. The clauses quoted in 01 are present word for word. None of the pages carries a revision date. PJM Data Miner still says "internal use only"; non-members are limited to 6 connections per minute. **No change.**

**6. DSIRE.** The About page says: "The DSIRE® database is licensed publicly under Creative Commons Attribution-ShareAlike 4.0 (CC-BY-SA)." It adds that the mark "is not being licensed" and that "no rights to use the DSIRE® mark are being granted." The footer reads "Copyright © 1995-2021. North Carolina State University." The API page offers access to "subscribers" and publishes no terms or pricing. Implications: (a) a derived DSIRE table must be CC BY-SA 4.0; (b) CC BY-SA content cannot go into an ODbL table, and ODbL content cannot go into a CC BY-SA table, so keep DSIRE and OSM in separate files; (c) say "data from DSIRE," never brand a product "DSIRE."

**7. Census ZCTA-to-county.**
- URL: `https://www2.census.gov/geo/docs/maps-data/data/rel2020/zcta520/tab20_zcta520_county20_natl.txt` (6.8 MB; last modified 2021-12-09; current).
- Layout PDF: `https://www2.census.gov/geo/pdfs/maps-data/data/rel2020/zcta520/explanation_tab20_zcta520_county20_natl.pdf`.
- Format: pipe-delimited `.txt` with a UTF-8 BOM and 18 columns (`GEOID_ZCTA5_20`, `GEOID_COUNTY_20`, `AREALAND_PART`, …).
- Gotchas: rows with a blank ZCTA are county areas that belong to no ZCTA, so drop them. Weights are **land area only**; the file has no population or housing counts.
- License: federal work, public domain under 17 U.S.C. §105. census.gov says its products are "freely available for public use" and asks users to cite the source.

**8. HIFLD.**
- **HIFLD Next metadata.** The site's API (`/api/datasets?search=transmission`) returns `hifld/transmission-lines-1` v1.0.0: 94,619 features, producer "Oak Ridge National Laboratory," source dates 2025-02-19, `derived_from` the DataLumos record. Its license field is `"other"`, and the site has no license or terms page. Downloads are available as GeoParquet, GeoPackage, GeoJSON, PMTiles, and shapefile.
- **OSM risk.** We sampled the first 20 MB of the GeoJSON (11,457 features). Of these, 3,898 (34%) have a `SOURCE` that includes "OpenStreetMap," for example "IMAGERY, OpenStreetMap, EIA 860." If those geometries were derived from OSM, ODbL share-alike may attach to a derivative database. This is a new **open legal question**. Until it is answered: (a) ship lines only as coarse, attributed map tiles (a "Produced Work" under ODbL needs attribution only), or (b) ship them as a separate ODbL-licensed layer with OSM credit. Never merge them into a CC BY table.
- **DataLumos.** The page still returns 403 to scripted fetches. ICPSR's DataLumos FAQ is also 403. No license found. Mirrors still disagree (data.gov: U.S. government works; Data Basin: CC BY 3.0). The Data Rescue Project portal lists no rights statement.

**9. Emissions.**
- **Open Grid Emissions.** v0.8.0 was released on GitHub 2026-08-14. The data on Zenodo, "Open Grid Emissions Dataset 2005-2025 (early release)" (record 22052851, 2026-08-22), is CC BY 4.0, and the code is MIT. The repository is active (last push 2026-10-29).
- **eGRID2024 on Zenodo.** Record 18968658 is CC BY 4.0, published 2026-03-17 by the "Cornerstone Sustainability Data Initiative." It was produced by running EPA's MIT-licensed eGRID code from the development branch. Cornerstone says it "did not perform original quality assurance." It is validated only by reproducing eGRID2023 rev 2. If shipped, label it "unofficial, third-party build; not an EPA release" and keep it out of any table presented as EPA data.

**10. Queued Up 2026.** The live `emp.lbl.gov/queues` page now returns 403 to scripted fetches, so we verified it from the Internet Archive capture of 2026-09-26. The notice reads: "The Queued Up data file is licensed CC BY 4.0. You may use, share, or adapt the dataset as long as you attribute it to Lawrence Berkeley National Laboratory and GridTracker. Queued Up Data File. Copyright (c) 2026, The Regents of the University of California, through Lawrence Berkeley National Laboratory … & GridTracker. CC BY 4.0." The report PDF (June 2026) credits co-authors from Interconnection.fyi and says "Data collection led by Interconnection.fyi."
- **GridTracker fields.** No statement addresses individual fields. Because GridTracker is named as a **copyright co-holder of the file** that is licensed CC BY 4.0, our reading is that the grant covers every field in the file, including GridTracker-collected ones. It does not cover GridTracker's live site or any later data. Verified wording; the interpretation is ours.

**11. PUDL.** The README says: "The PUDL data and documentation are published under the Creative Commons Attribution License v4.0 (CC-BY-4.0)"; the software is MIT. The latest release is **v2026.10.0** (2026-10-14). The docs list FERC Form 714 coverage as **2006–2025** and FERC Form 1 as **1994–2025**: DBF for 1994–2020, XBRL for 2021 onward. The underlying FERC filings are public domain. CC BY covers PUDL's cleaning and linkage work.

**12. URDB and Sharing the Sun.**
- **URDB.** The footer reads: "Content is available under Creative Commons Zero unless otherwise noted." No rate-level exception was found. Bulk files: `https://openei.org/apps/USURDB/download/usurdb.csv.gz` and `.json.gz`.
- **Sharing the Sun.** It moved to `data.nlr.gov/submissions/244`; `data.nrel.gov` no longer resolves. The latest file is September 2026 (uploaded 2026-10-26). The license is the **NLR Data Catalog license** described in Note 2, not CC BY. The data.gov record that says "Creative Commons Attribution" is wrong or out of date.

**13. EIA.** The copyright page says: "U.S. government publications are in the public domain." It asks for "an acknowledgment, which includes the publication date," and gives the example **"Source: U.S. Energy Information Administration (Oct 2008)."** When quoting EIA text, mark which text is EIA's. When translating, link the original page. The EIA logo and the "Energy Ant" mark need consent. Third-party content and photos are excluded.

**14. Green Button.** The GBA legal page says no one may use GBA websites "(for example … GreenButtonData.org), nor the data contained on these websites … other than for … private, non-commercial purposes." Commercial automated extraction requires a written license. The GBA GitHub repositories (OpenESPI and others) are Apache-2.0 code, and none is a sample-data repository with a data license. **Write our own synthetic ESPI XML fixtures** and validate them against the published schema.

**15. Fonts.** All of these are fine for self-hosting.

| Font | License | Note |
|---|---|---|
| Bricolage Grotesque | OFL 1.1 | — |
| Barlow | OFL 1.1 | — |
| JetBrains Mono | OFL 1.1 | — |
| Public Sans (USWDS) | OFL 1.1 in practice | Fork of Libre Franklin (OFL); GSA's changes are CC0. USWDS says to follow OFL. |
| Atkinson Hyperlegible Next | OFL 1.1 | Unlike the original Atkinson Hyperlegible, which used a custom Braille Institute license |
| IBM Plex Sans | OFL 1.1 | Reserved Font Name "Plex" |
| Source Sans 3 | OFL 1.1 | Reserved Font Name "Source" |
| Inter | OFL 1.1 | — |
| Geist | OFL 1.1 | — |
| Commit Mono | OFL 1.1 for the fonts (`LICENSE-FONT`) | The repository's `LICENSE` file (MIT) covers the website code, not the fonts |
| Martian Mono | OFL 1.1 | — |

All of these fonts except Commit Mono are also in `google/fonts/ofl/`. If we subset or modify Plex or Source Sans 3, the result counts as a modified version, so the safest course is to keep the upstream name only when using the unmodified files.

**16. Recommendation for gridprims' own license.**
- **Per-table license, recorded in each snapshot manifest.** The license that applies is set by the most restrictive input:

| Inputs in the table | gridprims license |
|---|---|
| Public domain / CC0 only (EIA, EPA, Census, FERC raw, URDB) | **CC BY 4.0** (asks for credit for our work; CC0 is also defensible) |
| Any CC BY 4.0 input (PUDL, OGE, Queued Up, EAGLE-I, ATB, EULP) | **CC BY 4.0** |
| NLR Data Catalog license input (Cambium workbooks, Sharing the Sun) | CC BY 4.0 for our work, **plus** the NLR notice shipped alongside; mark the table "includes NLR-licensed data" |
| Any DSIRE input | **CC BY-SA 4.0** |
| Any OSM input, or OSM-sourced HIFLD rows if ODbL applies | **ODbL 1.0**, as a separate file; never mixed with CC BY-SA |

- **Page text and charts:** CC BY 4.0. **Code:** MIT. ISO-derived content (CAISO, ERCOT) stays under the ISO's terms and is not relicensed.
- **Attribution chain to carry in every snapshot.** Each `manifest.json` gets a `sources[]` array. Each entry holds: publisher, dataset title, version or DOI, URL, retrieval date, upstream license, required credit string, and a "modified by gridprims" flag. The site footer and a `/credits` page render this list. Required credit strings:
  - **Queued Up:** "Lawrence Berkeley National Laboratory and GridTracker"
  - **EIA:** "Source: U.S. Energy Information Administration (Mon YYYY)"
  - **CAISO:** "Credit: California ISO"
  - **NLR datasets:** the DOI plus the full NLR notice
  - **DSIRE:** "DSIRE, NC Clean Energy Technology Center, CC BY-SA 4.0"
  - **OSM:** "© OpenStreetMap contributors, ODbL"
- **CC BY 4.0 requires indicating changes.** Every cleaned table should state "modified by gridprims: [summary of the changes]."

## Sources

- OEDI End-Use Load Profiles: https://data.openei.org/submissions/4520
- AWS registry entry: https://github.com/awslabs/open-data-registry/blob/main/datasets/nrel-pds-building-stock.yaml ; ComStock license: https://github.com/NREL/ComStock/blob/main/LICENSE.txt ; ResStock license: https://github.com/NREL/resstock/blob/main/LICENSE.md
- ATB 2025 on OEDI: https://data.openei.org/submissions/8759
- Cambium: https://www.nlr.gov/analysis/cambium ; workbooks: https://data.nlr.gov/submissions/289 ; license: https://data.nlr.gov/node/289/license
- EAGLE-I v4: https://api.figshare.com/v2/articles/24237376 ; https://doi.org/10.6084/m9.figshare.24237376.v4
- DOE-417 (unreachable): https://www.oe.netl.doe.gov/OE417_annual_summary.aspx ; OpenEnergyHub mirror: https://openenergyhub.ornl.gov/explore/dataset/oe-417-annual-summaries/
- SPP terms: https://www.spp.org/terms-conditions/
- CAISO terms and API terms: https://www.caiso.com/privacy-terms-of-use
- MISO: https://www.misoenergy.org/meet-miso/legal-and-privacy/ ; NYISO: https://www.nyiso.com/legal-notice ; ISO-NE: https://www.iso-ne.com/legal-privacy ; PJM Data Miner: https://www.pjm.com/markets-and-operations/etools/data-miner-2.aspx
- DSIRE About: https://www.dsireusa.org/about/ ; DSIRE API: https://dsireusa.org/dsire-api/
- Census relationship files: https://www.census.gov/geographies/reference-files/time-series/geo/relationship-files.2020.html ; ACS citation FAQ: https://www.census.gov/help/topics/faq.how-do-i-cite-or-source-acs-data.html
- HIFLD Next: https://hifld.publicenvirodata.org/llms.txt ; API: https://hifld.publicenvirodata.org/api/datasets?search=transmission ; collection: https://storage.googleapis.com/hifld-next-datasets-prod/releases/1704edb3-322d-469c-91da-92902fe76a2d/hifld/transmission-lines-1/transmission-lines-1/v1.0.0/collection.json
- DataLumos (403): https://www.datalumos.org/datalumos/project/240591/version/V1/view ; DRP portal: https://portal.datarescueproject.org/datasets/hifld-open-transmission-lines/ ; data.gov: https://catalog.data.gov/dataset/electric-power-transmission-lines
- Open Grid Emissions: https://github.com/singularity-energy/open-grid-emissions ; https://zenodo.org/records/22052851
- Unofficial eGRID2024: https://zenodo.org/records/18968658
- Queued Up (archived 2026-09-26): https://web.archive.org/web/20260926081320/https://emp.lbl.gov/queues ; report: https://eta-publications.lbl.gov/sites/default/files/2026-06/queued_up_2026_edition.pdf
- PUDL: https://github.com/catalyst-cooperative/pudl ; https://docs.catalyst.coop/pudl/en/latest/data_sources/ferc714.html ; https://docs.catalyst.coop/pudl/en/latest/data_sources/ferc1.html
- URDB: https://openei.org/wiki/Utility_Rate_Database
- Sharing the Sun: https://data.nlr.gov/submissions/244 ; license: https://data.nlr.gov/node/244/license
- EIA copyright and reuse: https://www.eia.gov/about/copyrights_reuse.php
- Green Button Alliance legal: https://www.greenbuttonalliance.org/legal ; GitHub org: https://github.com/GreenButtonAlliance
- Fonts: https://github.com/ateliertriay/bricolage ; https://github.com/jpt/barlow ; https://github.com/JetBrains/JetBrainsMono ; https://github.com/uswds/public-sans/blob/develop/LICENSE.md ; https://github.com/googlefonts/atkinson-hyperlegible-next ; https://github.com/IBM/plex ; https://github.com/adobe-fonts/source-sans ; https://github.com/rsms/inter ; https://github.com/vercel/geist-font ; https://github.com/eigilnikolajsen/commit-mono ; https://github.com/evilmartians/mono
