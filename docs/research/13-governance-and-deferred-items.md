# 13 — Governance, trust practices, and the deferred-item decisions

Research date: 2026-10-29. Planning only; not legal advice. **Verified** = read on the publisher's own page today. **Unverified** = secondary source, or the primary page could not be confirmed today.

## Bottom line

- **Six governance artifacts are enough**, and all are static files: `/.well-known/security.txt` (RFC 9116, `Contact` + `Expires` only required), a one-page disclosure policy, a dated corrections log, a provenance-and-review rule for curated facts, a published succession plan with a Zenodo deposit, and an accessibility statement. No committee, no process theater.
- **Never silently change a published number.** Data journalism and COPE practice converge on the same rule: label the change, date it, keep the old value readable, and say what it changed. Corrections build trust; silent edits destroy it.
- **Succession is the real risk, not security.** HIFLD Open was discontinued by DHS in late 2025 and public users lost access overnight; the replacement is community-run. One maintainer with no deposit plan is the same failure mode. Mirror every snapshot to Zenodo (concept DOI + per-version DOI) and deposit to DataLumos.
- **Costs are trivial and should be published.** A static site with one Worker runs on Cloudflare's free tier; the realistic paid floor is $5/month for Workers Paid plus the domain, i.e. roughly $80–$140/year. Publishing that number is itself a trust signal.
- **Ship four deferred items, defer two.** Ship: net metering from EIA-861 (public domain, state+utility+sector+technology), community solar from NLR Sharing the Sun (CC BY 4.0, not the restrictive license feared earlier), a Form 556 plain-language checklist (no filing fee for self-certification), and a hosting-capacity link index that points at the DOE Atlas. Defer: transmission geometry (license fog after the HIFLD transition) and per-utility fuel-mix pages (no reusable national file).
- **Biggest missed free dataset: EPA CAMPD hourly emissions** (Part 75 CEMS, bulk files + API, federal work). Second: EIA RECS/CBECS for load-shape benchmarking. NERC GADS stays out — unit-level data is confidential.

---

# Part A — Governance and trust practices

## A1. Security disclosure

**RFC 9116 (Verified, read in full today).** Exactly two fields are required: `Contact` and `Expires`. Everything else is optional: `Acknowledgments`, `Canonical`, `Encryption`, `Hiring`, `Policy`, `Preferred-Languages`.

Format rules that bite:

| Rule | Requirement |
|---|---|
| Location | `/.well-known/security.txt`. A top-level `/security.txt` or a redirect to the well-known path is allowed for legacy clients; if both exist, the well-known copy wins. |
| Transport | HTTPS only, `Content-Type: text/plain; charset=utf-8`. |
| `Expires` | Mandatory, exactly once, RFC 3339 date-time (`2027-10-29T00:00:00z`). Recommended to be **less than one year** in the future. A stale file is treated as invalid. |
| `Preferred-Languages` | Optional, at most once, comma-separated RFC 5646 tags, no priority ordering. |
| Multiple `Contact` | Allowed; listed in order of preference, first = most preferred. Other field order is irrelevant. |
| Signing | OpenPGP cleartext signature RECOMMENDED, paired with `Canonical` so the signature covers the location. |
| Scope | Applies only to the exact domain in the URI — not subdomains, not the parent domain. |
| Parser limits | Be robust to 32 KB / 2,048-char fields / 1,000 lines (§5.4). |

**Real examples (Unverified — seen via secondary summaries, not fetched today):** Google's file is a bare `Contact:` line; GitHub's adds `Acknowledgments`, `Policy`, `Canonical`; USAA publishes a PGP-signed file. CISA's BOD 20-01 requires federal civilian agencies to publish a vulnerability disclosure policy (the directive mandates the VDP, not the file; a later CISA directive pushed `security.txt` itself).

**What a static site plus one Worker actually needs.** The attack surface is: the Worker, the DNS/registrar account, the Cloudflare account, and the build pipeline. So:

1. `security.txt` with `Contact: mailto:security@gridprims.com`, `Expires` 11 months out, `Policy:` pointing to `/security/`, `Preferred-Languages: en`. Skip PGP — a lone maintainer who cannot reliably decrypt is worse than plaintext. Add a calendar reminder to bump `Expires`; an expired file is the most common `security.txt` failure.
2. A one-page CVD policy: scope (the site and the Worker), out of scope (volumetric DoS, Cloudflare's own infrastructure, missing headers with no exploit path), safe-harbor statement, no bug bounty, target of 5 business days to acknowledge and 90 days to fix or explain, and credit in an acknowledgments list if the reporter wants it.
3. State plainly that there are no accounts and no personal data, so there is nothing to breach beyond site integrity — that sets realistic reporter expectations.

## A2. Corrections and retractions

**COPE (Unverified for the 2025 text; 2019 guidance confirmed via secondary sources).** The three-tier model transfers cleanly to published data:

- **Correction** — minor error that does not change results, interpretation, or conclusions.
- **Expression of concern** — credible doubt, but the investigation will take time or the evidence is inconclusive. COPE now publishes separate expression-of-concern guidance.
- **Retraction** — the finding is unreliable. Notices must be clearly labeled as retractions and published promptly; COPE's 2025 revision explicitly says uncooperative third parties must not delay a retraction.

**Newsroom practice (Unverified — ProPublica's own corrections page was not retrieved today).** The common denominator across corrections policies: every correction is dated, describes the prior error in plain words, and stays attached to the corrected item. Typos, broken links, and stylistic edits are not logged. The corrected article is not deleted and the URL does not change.

**Dataset versioning (Verified via Zenodo help).** Zenodo mints two DOIs on first publication: a **version DOI** and a **concept DOI** covering all versions. Cite the version DOI normally; the concept DOI resolves to the latest version and suits "an evolving artifact." Create a new version only when files change, not for metadata fixes. Do not put `.v1` in a DOI — version semantics inside an identifier go stale.

**Recommended corrections-log entry** (one Markdown file, newest first, each entry anchored and linkable):

| Field | Content |
|---|---|
| ID + date | `2026-11-03` + stable anchor |
| Severity | `typo` (not logged) / `correction` / `significant correction` / `retraction` |
| What was wrong | The old number or statement, **quoted verbatim** |
| What it is now | The new value |
| Cause | Upstream revision, our parsing error, wrong vintage, unit error |
| Scope | Which pages, tools, and snapshot versions were affected, and the dates it was live |
| Fix | Commit hash and new snapshot version/DOI |

**Should the old value stay visible? Yes.** Anyone who cited or screenshotted the old number needs to recognize it. Keep the old value in the log entry and leave a dated inline note on the affected page (`Corrected 2026-11-03: previously 1,240 MW`). Never edit a published snapshot in place — supersede it with a new version and mark the old one superseded but downloadable. That is the Zenodo model and it is the right one.

## A3. Contributor governance for curated data

**PUDL / Catalyst Cooperative (Verified).** Keep PRs under ~500 lines, because "the codebase should not grow faster than we can understand it." Contributors must comment on the issue first and state their planned steps and **how they will verify each step works**. Work starts as a draft PR with tests and docs. External PRs need manual approval before CI runs. Reviewers must set a timeline; if a review stalls past 2 weeks, reassign. Maintainers may take the PR over after 3–4 rounds.

**OpenStreetMap (Verified via OSMF wiki).** A Data Working Group handles copyright complaints, imports, disputes, and vandalism. All changeset discussions and user blocks are **public**. Bulk imports must follow the Import Guidelines and the Automated Edits code of conduct; the DWG reverts non-compliant imports and blocks accounts. Large imports use a dedicated import account so they can be reverted cleanly.

**Wikipedia/Wikidata (Unverified — from knowledge, not fetched).** Verifiability, not truth: every contested claim needs an inline citation to a published reliable source; no original research; paid or conflicted contributors must disclose and should propose edits rather than make them.

**OpenElections (Partly verified).** Repos are scoped per state and state their provenance in the repo description — "converted official precinct results," "certified election results," or "pre-processed." The provenance label travels with the data.

**Rules for a cited-facts dataset with one maintainer:**

1. **No fact without a source URL, a publisher, a retrieval date, and an archive link.** Unsourced contributions are rejected on sight, no debate.
2. **Primary sources only** for rules and numbers: the tariff sheet, the commission order, the federal file. Trade press is a pointer, never a citation.
3. **Two-person review, satisfied cheaply.** A maintainer cannot self-review, so require two *independent sources* per contributed fact instead, plus an automated check (schema, range, cross-year delta flag). For anything that changes a published number or a legal claim, hold the PR 7 days in public for comment before merge — a time-boxed substitute for a second reviewer.
4. **All review in public.** Issues, PRs, and the reasons for rejection stay visible, OSM-style.
5. **COI disclosure in the PR template**: "Do you work for, consult for, or hold a position in an entity affected by this change?" Disclosed conflicts do not bar a contribution; they bar silent merging — a disclosed-COI PR always takes the 7-day window.
6. **Bulk contributions are quarantined**: separate branch, separate file, provenance header, revertible in one commit.
7. **Set a limit**: do not accept contributions for anything you cannot verify in 10 minutes from a primary source. Scope discipline is the only sustainable review policy for one person.

## A4. Sustainability and succession

**What failure looks like (Verified).** HIFLD Open was discontinued by DHS in late 2025; NGA had transferred the program to DHS in June 2022 (455+ layers). Layers moved to **HIFLD Secure**, requiring a PIV card or Login.gov, an approved data use agreement, and a federal sponsor — so public users simply lost access. The public replacement, **HIFLD Next**, is community-maintained, rebuilt from 400+ rescued layers with help from Public Environmental Data Partners and the Data Rescue Project. Lesson: the archived copy is what survives, and the archiving is done by volunteers who did it *before* the takedown.

**What good looks like (Verified for DataLumos).** DataLumos is ICPSR's crowd-sourced archive for government data; deposit is three steps (check it is not already preserved, describe it, upload). It saw a sharp usage jump in 2025, with 1,500+ projects published that year and 2,700+ deposits reported. It sits inside the University of Michigan and is governed by an elected 12-person council — i.e. institutional continuity that a single maintainer cannot provide alone.

**Adopt:**

- **Mirror every data snapshot to Zenodo** on release: concept DOI in the citation guidance, version DOI per snapshot. CERN-backed, free, no maintainer required.
- **Deposit the curated US-grid snapshots to DataLumos** annually — it is the right venue, and the 2025 surge shows the audience is there.
- **Archive the source** to Software Heritage (Unverified — not confirmed today; it archives public git repos on request) and request Internet Archive captures of each release page.
- **Publish a succession plan** (`/continuity/`): license is already open; the repo and snapshot DOIs are permanent; name 1–2 named successors who have repo admin and registrar access; state a dead-man rule ("no commit and no reply for 180 days ⇒ successors may take over the domain and repo"); commit to a farewell notice and a final snapshot rather than a silent 404.
- **Domain continuity**: register for the maximum term, auto-renew on a card that is not the maintainer's alone, enable registrar lock, and name the domain in the plan. True escrow is overkill; a prepaid 10-year registration plus a named successor achieves the same at lower cost.

**Realistic annual cost (Unverified — third-party pricing summaries; confirm on Cloudflare's own pages).**

| Item | Cost |
|---|---|
| Cloudflare Pages static hosting (~20k pages) | $0 — static asset requests are unmetered; builds are the constrained resource (free: ~500 builds/month, 1 concurrent, 20-minute timeout) |
| Workers (one Worker) | $0 on free tier (~100k requests/day); **$5/month minimum** on Workers Paid. Pages Functions bill as Workers requests. |
| Domain | ~$10–$20/year |
| Zenodo / DataLumos / Software Heritage | $0 |
| Email for `security@` | $0–$6/month |
| **Total** | **~$10–$20/year on free tiers; ~$80–$140/year realistically** |

Build minutes, not bandwidth, are the thing that breaks a 20k-page site: keep builds incremental and batch data refreshes.

## A5. Accessibility conformance

An **ACR** (Accessibility Conformance Report) is the filled-in document; **VPAT** is the ITI template used to produce it. **VPAT 2.5 (Unverified — vendor summaries, not ITI's own page)** comes in editions: **508** (Revised Section 508), **WCAG** (covers WCAG 2.0/2.1/2.2), **EU**, and **INT** (Section 508 + EN 301 549 + WCAG 2.x). Each criterion gets `Supports` / `Partially Supports` / `Does Not Support` / `Not Applicable` with remarks. It is explicitly a **vendor self-declaration**.

**Should a volunteer project publish one? No — publish an accessibility statement instead.** A VPAT is a procurement artifact: its audience is a federal or enterprise buyer, and its value comes from the vendor's liability for the claim. An unaudited VPAT from a one-person project is cost without credibility, and it over-promises on criteria no one has tested with a screen reader. Publish instead:

- A plain-language statement: target (WCAG 2.2 AA), what was tested, with what, when, by whom (the maintainer).
- A **known issues** list with honest gaps — more credible than a page of green "Supports."
- A contact for accessibility problems and a commitment to respond.
- Offer to produce a VPAT on request if a public agency ever needs one.

**Free self-assessment toolkit:** WCAG 2.2 itself plus *Understanding WCAG 2.2*; **WCAG-EM** (W3C's Website Accessibility Conformance Evaluation Methodology — defines the sample of pages to evaluate, which is the hard part for 20k generated pages: sample by template, not by page); the W3C Easy Checks list; axe-core / Lighthouse / IBM Equal Access for automated passes; plus manual keyboard-only traversal and one VoiceOver and one NVDA run per template. Section508.gov's ICT Testing Baseline (the federal manual-test baseline) is free and is what federal testers actually use. All **Unverified** today — not fetched.

Automated tools catch roughly a third of issues; say so in the statement rather than implying a clean scan means conformance.

## A6. Trust signals that need no tracking

**Adopt (cheap, static, high-credibility):**

1. **A named, reachable maintainer** with a real bio. Anonymous data sites are discounted by default.
2. **A methods page per tool** — the formula, the standard (e.g. IEEE 738), the assumptions, the known failure modes.
3. **Open source under a clear license**, with the data snapshots separately licensed and attributed.
4. **Dated, immutable snapshots** with vintage stamped on every page ("EIA-861, 2025 final, released 2026-10-07; retrieved 2026-10-20").
5. **Citation guidance** — a copy-paste citation with the version DOI on every data page.
6. **Reproducible builds**: publish the input manifest with checksums and the commit that built each release, so a third party can rebuild and diff. This is the strongest possible signal for a numbers site and it costs one text file.
7. **Funding disclosure**, even when the answer is "unfunded, costs about $120/year, paid by the maintainer, no sponsors, no ads, no affiliate links."
8. **A public corrections log and changelog** (A2).
9. **An explicit limitations page** — what the tools are not for, where to go instead (REopt, PUDL, the utility's own tariff).

**Counterproductive:**

- **Trust badges, seals, and "SSL secured" graphics** — associated with low-quality sites; they signal nothing verifiable.
- **Precision theater**: six significant figures on an estimate derived from annual averages.
- **An unaudited VPAT or a "certified accurate" claim** — invites exactly the scrutiny it cannot survive.
- **Visitor counters and testimonials** — popularity is not accuracy, and counters imply tracking the site claims not to do.
- **"Last updated: today"** auto-stamps on pages whose data is two years old. Date the *data*, not the HTML.
- **A code of conduct or governance charter heavier than the project** reads as cargo cult. One page beats ten.

---

# Part B — Deferred items decided

| Item | 2026 status | License | Recommendation | Why |
|---|---|---|---|---|
| 7. Net metering / DER by state | EIA-861 **2025 final released 2026-10-07**; `f8612025.zip` includes **Net Metering** and **Non-Net Metering Distributed** files (plus Advanced Metering, Demand Response, Service Territory). Post-2009 data is broken out by sector **and** technology (`pv`, `storage_pv`, `wind`, …). **Verified** | Public domain (US government work); credit EIA with vintage | **Ship — Phase 2** | Gives capacity (MW), customer counts, and energy by state × utility × sector × technology with zero license risk. DSIRE's CC BY-SA policy text is not needed for the *quantities*; link to DSIRE for rules. |
| 8. Community solar | NLR **Sharing the Sun**, `data.nrel.gov/submissions/244` (now also `data.nlr.gov`), DOI 10.7799/2438583, snapshot as of **January 2026**, record updated 2026-04-01, refreshed several times a year. A Zenodo record claims v3.0.0 published 2026-06-07 (**Unverified**) | **CC BY 4.0** per the data.gov and OpenEI records — **contradicts the earlier "NLR data license" finding. Verified on catalog records; re-confirm on the NLR landing page before shipping.** | **Ship — Phase 2** | Project-level list (complete and pending) supports state fact pages: project count, capacity, status, program type. CC BY 4.0 needs only attribution. Pending-project counts are a market estimate, not a registry — label them as such. |
| 9. PURPA Form 556 / QF helper | Form 556 current and eFiled at `ferc.gov/QF`. **No filing fee** for self-certification or self-recertification under 18 C.F.R. § 292.207(a); fees apply to Commission certification applications and to corrections of erroneous filings. FERC-556 (OMB 1902-0075) extension pending in Docket IC26-39-000. **Verified via form instructions; § 292.207 text not read today** | Federal form, public domain | **Ship — Phase 3, as a checklist only** | High search value, near-zero data cost: who needs a QF certification, the size thresholds, the no-fee path, what the form asks, and where to file. Keep it strictly descriptive — no eligibility determinations, no fuel-use or efficiency-test calculators — and link to the form and the CFR. Risk is low precisely because it decides nothing. |
| 10. Hosting-capacity map index | **Yes, a national index exists**: DOE's *U.S. Atlas of Electric Distribution System Hosting Capacity Maps* lists publicly available maps by state and type (DG/DER/EV/load); DOE aggregates but does not maintain them, and warns coverage is incomplete. Utilities in ~26 states publish some map, against ~3,000 distribution utilities. Ohio now requires every EDU to publish one by 2026-05-31. **Verified** | DOE page = federal work; the maps themselves are each utility's | **Link-only** | A national index already exists and is better maintained than ours would be; duplicating it creates a staleness liability. Link the DOE Atlas, add the Ohio mandate note. |
| 11. Transmission line geometry | HIFLD Open discontinued by DHS in late 2025; the DHS **Electric Power Transmission Lines** layer on data.gov (69–765 kV, incl. some underground) still carries `usa.gov/government-works`, metadata last modified 2022-10-24. Data Rescue Project hosts an archived copy (updated 2026-01-21). HIFLD Next is community-maintained and its license is **not** stated per-layer. DOE published *A Harmonized Geospatial Dataset of U.S. Transmission Lines: Linking FERC Form 1 and HIFLD, 1994–2024* on data.gov. **Partly verified** | Original federal layer: public domain. HIFLD Next: **unclear, possibly OSM/ODbL-derived.** Third-party re-uploads relabel it freely (one Kaggle copy says CC0) | **Defer past v1; then ship the DOE harmonized layer, not HIFLD Next** | We cannot restate HIFLD Next's license, and an OSM-derived national layer would put ODbL share-alike on any derived database we publish. The DOE harmonized dataset is a federal work and resolves this cleanly — verify it directly before building. Keep routes coarse regardless (CEII posture from brief 01). |
| 12. Power content labels / fuel mix | **CA**: CEC Power Source Disclosure requires an annual Power Content Label per portfolio with power mix and GHG intensity; annual reports are Excel workbooks plus attestation; 2024 and 2023 annual reports posted, **no 2026 file found**; statewide-average mix and loss-adjusted "total" categories coming, hourly reporting from 2028 for suppliers >60,000 customers and >1,000 GWh. **MA**: 220 CMR 11.06 label covering fuel mix, emissions, and labor characteristics. **IL**: quarterly bill disclosure, posted on the ICC site. **PA**: response-on-request plus an audited annual PUC report, no standard label. **WA**: tabular uniform label (RCW 19.29A). **DE**: annual, no standard label. **CA/MA verified-ish; others Unverified (secondary summaries)** | Each state's filings are public records; no state publishes a reusable machine-readable national file | **Defer; publish an explainer page only** | Per-utility fuel-mix pages would mean scraping 6+ heterogeneous state programs plus hundreds of supplier PDFs, with no reusable source and label-year lags of 1–2 years. Ship a short page explaining what a power content label is, which states require one, and where to find your own — then reconsider if CEC's hourly 2028 reporting produces a real dataset. For actual fuel mix use EIA-923/eGRID, which we already have. |
| 13a. EPA **CAMPD** (Part 75 hourly CEMS) | Downloads moved to CAMPD bulk data in Feb 2023; Custom Data Download, prepackaged bulk files, and a CAM API (hourly→annual, ozone season). Large pulls should use the bulk API; `api.epa.gov` needs a free key. **Verified** | Federal work; EPA publishes a suggested citation (**public-domain status not stated on the page — Unverified**) | **Ship — Phase 2, highest-value addition** | Hourly unit-level emissions and heat input is the single biggest free dataset missing from our list, and it pairs directly with EIA-923 and eGRID, which we already ship. Pull from bulk files at build time; the key cannot live in the client. |
| 13b. EIA **RECS / CBECS** | Public microdata and tables; RECS 2020 is the current published cycle, newer cycle in progress. **Unverified** | Public domain | **Ship — Phase 3** | Lets us benchmark an uploaded interval file against building-type and climate-region norms — directly serves the "is my number right?" lane. Small, stable files. |
| 13c. **EIA-176** (natural gas) | Annual company-level gas data. **Unverified** | Public domain | **Defer** | Gas is adjacent, not core; no grid tool currently needs it. |
| 13d. **FERC EQR** (Form 920) | Full database as ZIPs; FERC warns only parties with IT support should attempt the bulk download. **Order No. 917** moves EQR to xBRL-CSV, published in the Federal Register 2026-03-24. PUDL covers 2013 Q3 – 2026 Q1 and publishes Parquet quarterly; it reports some corrupted per-filing archives and ~0.6% of rows with CSV quoting errors that it drops. **Verified** | Public records; PUDL outputs CC BY 4.0 | **Defer past v1; then via PUDL only** | Wholesale contract and transaction data is enormous and mid-format-migration. If we want it, consume PUDL's Parquet rather than FERC's ZIPs — but it serves traders, not our audience. |
| 13e. **LBNL Tracking the Sun** | Current edition found is **2024** (~3.2M systems through YE2023); report, public dataset, and summary tables at `trackingthesun.lbl.gov`. **Unverified for a 2025/2026 edition** | An older catalog entry says Creative Commons Attribution; no explicit public-domain statement found. **Unverified — confirm before shipping** | **Ship — Phase 3, if license confirms** | Installed-cost percentiles by state, system size, and year are exactly the context a solar-curious user needs. One file, annual cadence. Confirm the license on the LBNL page first. |
| 13f. **NERC GADS** | Unit-level generator outage data; submission is mandatory for larger units but unit-level records are confidential, with only aggregate availability statistics published. **Unverified** | Not redistributable at unit level | **Drop** | We cannot get or republish the useful granularity. Use EIA-923 capacity factors instead. |
| 13g. **AFDC fuel prices** (DOE Clean Cities *Alternative Fuel Price Report*) | Quarterly report and series. **Unverified** | Federal work, public domain | **Link-only** | Useful for EV/fleet cost comparisons but it is a published report, not a grid primitive. Link it from any EV-charging page. |
| 13h. **ISO settlement / market data** | Covered in brief 01: only ERCOT clearly permits redistribution; PJM, MISO, NYISO, ISO-NE restrict or forbid it; CAISO allows limited use with credit. **Verified previously** | Restricted | **Link-only** | Redistribution rights, not value, are the blocker. Unchanged. |
| 13i. **DOE Grid Deployment Office** (GRIP and related award data) | Award and project listings published on energy.gov. **Unverified** | Federal work | **Defer** | Announcement-grade data with unstable structure and shifting program status; low durability for a snapshot site. |
| 13j. **State PUC open-data portals** | Highly heterogeneous; a few (CA, NY, TX) have real APIs, most offer docket search only. **Unverified** | Varies by state | **Link-only** | A curated per-state "where to find your tariff and your docket" link list is high value and near-zero maintenance. Do not attempt ingestion. |

### Phasing summary

- **Phase 2 (next):** EIA-861 net metering + non-net-metering DG state pages; NLR Sharing the Sun community solar state pages; EPA CAMPD hourly emissions.
- **Phase 3:** Form 556 checklist; RECS/CBECS benchmarks; Tracking the Sun cost percentiles (license permitting).
- **Link-only now:** DOE hosting-capacity Atlas; AFDC fuel prices; state PUC portals; ISO market data.
- **Deferred:** transmission geometry (revisit via the DOE harmonized FERC-1/HIFLD dataset); fuel-mix disclosure pages (explainer only); FERC EQR; EIA-176; DOE GDO.
- **Dropped:** NERC GADS.

---

## Sources

RFC 9116 / disclosure
- https://www.rfc-editor.org/rfc/rfc9116.txt (Verified, read in full)
- https://en.wikipedia.org/wiki/Security.txt (Unverified secondary)

Corrections and versioning
- https://publicationethics.org/node/19896/revisions/62416/view (COPE 2019 retraction guidelines)
- https://retractionwatch.com/2025/09/04/new-cope-retraction-guidelines-address-paper-mills-third-parties-and-more/
- https://zenodo.org/help/versioning and https://support.zenodo.org/help/en-gb/1-upload-deposit/97-what-is-doi-versioning
- https://book.the-turing-way.org/communication/citable/citable-versioning

Contributor governance
- https://docs.catalyst.coop/pudl/en/latest/CONTRIBUTING.html
- https://docs.catalyst.coop/pudl/en/latest/dev/managing_external_contributions.html
- https://osmfoundation.org/wiki/Data_Working_Group ; https://wiki.openstreetmap.org/wiki/Import/Guidelines ; https://wiki.openstreetmap.org/wiki/Disputes
- https://github.com/OpenElections

Sustainability and succession
- https://www.icpsr.umich.edu/sites/datalumos/home
- https://screening-tools.com/hifld-next ; https://www.datarescueproject.org/hifld-next/ ; https://www.napsgfoundation.org/navigating-the-hifld-transition/
- https://www.nga.mil/news/NGA_transfers_Homeland_Security_Infrastructure_Pro.html
- https://developers.cloudflare.com/pages/functions/pricing/ (Pages Functions bill as Workers requests)

Accessibility
- https://www.levelaccess.com/vpats-and-acrs/ ; https://client.levelaccess.com/hc/en-us/articles/9204057428247-Which-VPAT-edition-should-I-use (Unverified secondary)

Part B
- https://www.eia.gov/electricity/data/eia861/ (Verified: `f8612025.zip`, 2025 final, released 2026-10-07; Net Metering and Non-Net Metering Distributed files)
- https://data.catalyst.coop/pudl/core_eia861__yearly_net_metering_customer_fuel_class (sector/technology breakdown post-2009)
- https://data.nrel.gov/submissions/244 ; https://catalog.data.gov/dataset/sharing-the-sun-community-solar-project-data-d86b6 (CC BY 4.0) ; https://zenodo.org/records/15166127
- https://www.ferc.gov/docs-filing/forms/form-556/form-556.pdf ; https://omb.report/icr/202608-1902-007/doc/172294600.pdf (Docket IC26-39-000)
- https://www.energy.gov/eere/us-atlas-electric-distribution-system-hosting-capacity-maps ; https://codes.ohio.gov/ohio-revised-code/section-4928.83 ; https://atlasevhub.com/wp-content/uploads/2024/12/Final-Report-Hosting-Capacity-Maps-for-EV-Charging.pdf
- https://catalog.data.gov/dataset/electric-power-transmission-lines ; https://portal.datarescueproject.org/datasets/hifld-open-transmission-lines/ ; https://catalog.data.gov/dataset/a-harmonized-geospatial-dataset-of-u-s-transmission-lines-linking-ferc-form-1-an-1994-2024
- https://www.energy.ca.gov/programs-and-topics/programs/power-source-disclosure ; https://www.energy.ca.gov/programs-and-topics/programs/power-source-disclosure/psd-frequently-asked-questions ; https://regulations.justia.com/states/massachusetts/220-cmr/title-220-cmr-11-00/section-11-06 ; https://www.mass.gov/info-details/information-disclosure-label
- https://www.epa.gov/airmarkets/power-sector-emissions-data ; https://www.epa.gov/air-emissions-inventories/where-can-i-download-hourly-emissions-data-continuous-monitoring ; https://github.com/USEPA/cam-api-examples
- https://ferc.gov/download-database ; https://docs.catalyst.coop/pudl/en/stable/data_sources/ferceqr.html ; https://www.xbrl.org/news/ferc-adopts-xbrl-csv-for-filings/
- https://emp.lbl.gov/index.php/tracking-sun-2024-edition

### Open verification items

1. Re-read the NLR Sharing the Sun landing page for the license statement in its own words (CC BY 4.0 is from catalog records) and confirm whether v3.0.0 (2026-06-07) exists.
2. Confirm the DOE harmonized transmission dataset's license and vintage on data.gov before building anything on it.
3. Confirm Cloudflare's current Pages build quota and Workers free-tier request limit on Cloudflare's own docs.
4. Confirm whether a 2025/2026 Tracking the Sun edition exists and under what license.
5. Confirm EPA's stated terms of use for CAMPD data (page gives a citation, not a license).
6. Check CISA's current directive status for `security.txt` if we ever want to mirror federal practice exactly.
