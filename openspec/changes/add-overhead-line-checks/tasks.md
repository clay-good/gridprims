## 1. Research and platform

- [ ] 1.1 Write `docs/research/18-overhead-line-design.md` from the 2026-10-31 research, tagging each fact verified or unverified; add unverified items the site states to the claim register and the manifests' `claims`; add R.24-10-005 to `docs/research/06`'s re-check list; verify the claims gate passes
- [x] 1.2 Add the `rows`, `length`, and `handle` input types to the manifest validator and the page and MCP renderers; verify the length round-trip and handle-kind scenarios
- [ ] 1.3 Generalize "one file, one set of numbers" to a record per file kind; verify the standards-choice-propagates scenario and that the existing peak scenarios still pass
- [ ] 1.4 Header-row routing for the standards template and pole list; verify the pole-list-on-home-page and PDF standards scenarios
- [x] 1.5 Shared core routines (field-format length parser, rule record, rounding toward more clearance), named in each manifest's `sharedRoutines` and listed in `docs/own-implementations.md`; verify 20 hand-written height strings and the metric height scenario (core/lib/field-length.mjs and core/lib/sag.mjs, both in docs/own-implementations.md; the rule record waits on the standards template)
- [x] 1.6 Map `lines` to Grid in `site/ui/sections.mjs`, and list both tools in the catalog with no home cell; verify the simplicity budget gate

## 2. Design standards

- [x] 2.1 Rule ids and attachment kinds (design D1), and CSV and Excel templates from one source; verify the "template rows match" and "template ships no NESC values" scenarios (core/lib/standards-template.mjs is the one list the reader, the CSV, and the workbook all read)
- [ ] 2.2 Standards reader and receipt; verify the missing rule, unknown rule id, conflicting rows, implausible value, unit-inside-value, and instructions-sheet scenarios (the reader, the receipt, and the typed-text scenarios ship; reading a workbook with an instructions sheet waits on the file workbench, 3.5)
- [ ] 2.3 Keep standards in memory only, with consent to keep; leave them out of URLs and problem reports; verify the egress sentinel, share link, and problem report scenarios
- [x] 2.4 Register `go95-clearances`; enter Table 1 Cases 3, 4, and 5 (Columns B and E) and Table 2 Cases 8 to 10 (Columns C to E) as curated facts, re-reading each footnote letter from the official page with both captures, footnote letters, and `disputable: false`; list the captures in `docs/reference-artifacts.md` and credit the CPUC on the sources page; verify the thoroughfare and footnotes scenarios and that the curated-facts gate passes (Table 1 Cases 1, 3, 4, and 5 in Columns B and E, and Table 2 Case 8 in Columns C to E, from captured table pages with every footnote letter; Table 2 Cases 9 and 10 describe supply above supply and are not used yet; the revising decisions are named, not captured; the midspan tool offers GO 95 as a rule source)
- [x] 2.5 `go95-watch` weekly workflow with an entry in `pipeline/workflows.mjs`, a staleness threshold, and a health record; verify the changed-text scenario against a doctored capture (one extractor serves the capture and the watch, so a difference means the CPUC's page changed; the chip reaches a result through the tool's go95Review input)
- [ ] 2.6 NESC entry (values blank, edition picked), "No rules", and layered sources in the receipt; verify the layered sources and no rules scenarios
- [ ] 2.7 Sample standards file and sample pole list, each value labeled an example value with one cited capture; verify the sample-is-labeled scenario

## 3. Attachment height

- [x] 3.1 Communication space by supply kind and voltage, whole-inch search, and placement preference; verify the fits-as-is, sources-shown, supply-above, and voltage-range scenarios (against rules entered as template rows; GO 95 and the standards file come with section 2)
- [x] 3.2 Move search with the full ranking and tie-breaks; verify the one-move and ranked-plans scenarios and 10 own fixtures, including two-move plans
- [x] 3.3 Extra height and replacement length from setting depth and length step, taken only from the user's rules and labeled industry custom with no public source; verify the pole-too-short and length-unknown scenarios
- [ ] 3.3a Download RUS Bulletin 1728F-700 by hand (it is incorporated by reference in 7 CFR parts 1728 and 1755) and record in `docs/research/18` whether it gives pole lengths and classes we may publish; if it does, add them as cited defaults, and if not, leave pole sizing to the user's rules
- [x] 3.4 Existing shortfalls and messy attachment lists; verify the existing-line, two-lines-at-one-height, and no-supply scenarios (on a typed attachment list; the pole-list file is 3.5)
- [ ] 3.5 Pole-list workbench (worker, progress, cancel, consent, in-page pole views, CSV export); verify the batch export and unreadable row scenarios and 10,000 rows in under 2 s on the reference profile
- [ ] 3.6 Pole elevation chart with text summary and table; verify the chart gates
- [ ] 3.7 Capture worked placements from public utility joint-use standards, starting with Clark Public Utilities Section 1910 and then Tacoma Power C-OH-1060, Chelan County PUD, and RG&E and NYSEG; when at least 10 reproduce, record them as `published-example` and raise to level 2; otherwise stay Preview with a `toRaise` sentence on the limits page; verify the manifest validator accepts the level and evidence

## 4. Midspan clearance

- [x] 4.1 Parabolic sag and the lowest point; verify the level, unequal, and at-a-pole scenarios
- [x] 4.2 Clearance by surface, with margin or shortfall and source, asked only after the crossing is chosen; verify the passes, short, and crossing-not-chosen scenarios (against the clearance you enter; the GO 95 and standards-file sources come with section 2)
- [x] 4.3 Separation from the line above; verify the gap-shrinks scenario
- [x] 4.4 Generate and commit 50 exact-catenary cases from a separate script, with the RUS 1724E-152 capture listed in `docs/reference-artifacts.md` and both the parabolic and catenary routines in `docs/own-implementations.md`; verify the independent-cases and deep-sag scenarios (the RUS 1724E-152 page itself refuses scripted requests, so its capture waits; the bulletin is cited by section and an archived copy was read)
- [ ] 4.5 "At the condition you entered" label, catenary note, and span profile chart; verify the measured-sag scenario and the chart gates (the label and the catenary note ship; the span profile chart remains)

## 5. Trust and surfaces

- [x] 5.1 Manifests for `lines.attachment-height.find` (experimental) and `lines.midspan-clearance.check` with `firstScreen`, citations (GO 95; RUS 1724E-152; NESC by rule number, `paywalled: true`), limitations, handoffs (CPUC GO 95, 47 CFR 1.1411, RUS 1724E-150 and 1724E-153), the screening label, and string-file sentences at grade 8 or below; verify the manifest, literal-copy, and readability gates (both manifests, with GO 95, RUS 1724E-152 by section, and the NESC by rule number marked paywalled; the readability and literal-copy gates pass)
- [x] 5.2 Scope the honest-claims gate's term list by tool id, with the `lines.*` terms that apply even in negated sentences; verify the banned wording scenario
- [x] 5.3 Refusal for pole strength, linked to the existing engineering sign-off entry; one new cannot-do entry for reading PDF standards, markups, photos, or GIS; verify the asked-if-the-pole-will-hold scenario and the limits page (both cannot-do entries are on the limits page; the in-tool refusal comes with the attachment finder)
- [x] 5.4 Glossary entries for make-ready, neutral, communication space, sag, NESC, and GO 95; verify definition on first use
- [ ] 5.5 MCP: kind-tagged handles, handle and inline inputs to `gridprims_run`, and `source_text` for file text; update `mcp/golden-surface.json`; add an agent-evaluation request for each lines tool; verify the two-handles, handle-plus-typed, and injection scenarios with networking disabled
- [x] 5.6 Add this change to phase 3 in `plan-launch-and-value-proof`; verify `openspec validate --strict` passes for both changes (phase 3 in plan-launch-and-value-proof design D1 lists it; both changes report valid under openspec validate --strict, 2026-11-14)
- [x] 5.7 Command-bar forms ("pole attachment height", "sag over a road") and unique page metadata (title at most 60 characters, description at most 155, canonical URL, breadcrumbs), with both URLs in the published-URL record; verify the metadata and URL-record gates
- [x] 5.8 Store result snapshots for both tools so a changed answer fails CI without a version bump and a changelog line; verify by altering a separation and seeing the snapshot fail (recorded by the result-versions gate, which fails a changed answer without a version bump and a changelog line)
- [ ] 5.9 DESIGN.md gates (both themes, 320 px sweep, keyboard, print, performance budget) for both tools and the batch table; verify CI green
