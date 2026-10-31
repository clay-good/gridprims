## Context

A make-ready designer starts from field data (pole height and length, each attachment's height and owner, span lengths, photos) and the utility's GIS records. They write instructions such as "attach at 22'4"", tell other companies to move, or design a replacement pole. The rules they check against are usually the utility client's own construction standards, which are proprietary. Where a client has none, the rules come from the state's adopted code.

What the sources allow. Researched 2026-10-31; [V] means checked on the primary page, [U] means not yet checked. Details go in `docs/research/18`.

| Source | What it gives | Can we ship its values? |
|---|---|---|
| NESC, IEEE C2-2023; C2-2028 due August 1, 2027 [V] | Clearance tables 232-1, 235-5, 238-1; load rules 250 and 253. Most states adopt it [V as reported by ATIS] | No. IEEE owns the copyright and sells it [V]. *ASTM v. Public.Resource.Org* (D.C. Cir. 2023) found noncommercial posting of incorporated standards fair use, but IEEE was not a party. Cite by rule number; values come from the user |
| CPUC General Order 95 ([ia.cpuc.ca.gov/gos/go95](https://ia.cpuc.ca.gov/gos/go95/go_95_startup_page.html)) | Table 1 (Rule 37, ground clearances, last revised by D.17-12-024 [V]): for communication conductors, Column B gives 18 ft along or crossing urban thoroughfares (Case 3), 15 ft for rural thoroughfares (Case 4), and 10 ft where only pedestrians can reach (Case 5); Column E gives 25 ft for supply at 750 V to 22.5 kV [V, footnote letters to re-check against the page]. Table 2 (Rule 38, wire-to-wire clearances, last revised by D.09-08-029) [V]: cases 8 to 10 give 48 in. between communication and supply up to 7.5 kV, and 12 in. between communication lines, on the same pole and in adjoining midspans, with footnotes such as (k), (n), and (rr) allowing exceptions | Yes. Law written by the CPUC (*Georgia v. Public.Resource.Org*, 2020) [U, legal judgment]. The PDF is official and the HTML may lag [V]. R.24-10-005 may revise it [U] |
| USDA RUS Bulletin 1724E-152 (July 30, 2003, RD-GD-2003-48) [V, full text read] | Formulas only: the parabolic sag equation `D = WS²/8Th`, the ruling-span ratio `D = Dr(S/Sr)²`, and the offset sag `Dx = D(1 − (2x/S)²)`. **It contains no worked numerical examples and no sag tables**, so it cannot supply test fixtures [V: no occurrence of "example", "solution" or a sag table in the document] | Method yes, as a federal work (17 U.S.C. 105). It reprints no IEEE or ASCE material [V: no copyright or permission notice] and tells readers to buy the NESC. Its NESC references are to the 2002 edition, and it says to use the current edition's rules [V] |
| RUS 1724E-150, 1724E-153 | Pole strength; guys and anchors | Handoffs now; the method source for the pole loading change |
| Utility joint-use specs (for example, Chelan PUD's pole attachment standards) | Common practice such as 40 in. from supply to communication | Only as cited example values in the sample file |
| 47 CFR 1.1411 [V] and 1.1402(p)–(q) [V] | Make-ready timelines and one-touch make-ready (1.1411); the definitions of simple and complex make-ready (1.1402(q) and (p)), which turn on the risk of an outage or damage and set no limit on how many attachments may move | Context and handoff. The FCC sets no clearances |

Commercial tools (O-Calc Pro, SPIDAcalc from $2,627 a year [V], PLS-POLE, Katapult, IKE) do full analysis per seat, quote-gated except SPIDAcalc. A search found no free browser tool for attachment placement, and one incomplete open-source pole-stress script [V]. Pole owners often require a PE-sealed pole loading report from the attacher [V in Texas utility application forms], which is one more reason loading stays out of scope.

Setting depth: the common "10% of the pole's length plus 2 ft" appears only in utility standards, not in any federal or state source we could find [V, searched], so it is industry custom and must come from the user's rules. RUS Bulletin 1728F-700, incorporated by reference in 7 CFR parts 1728 and 1755, is the strongest public candidate for pole length and class dimensions, but we could not retrieve a readable copy; it needs a manual download before we rely on it.

## Goals / Non-Goals

**Goals:** answer the most common make-ready question (where the new line goes, and what has to move) against the rules the designer actually works to, with every required value traced to its source and client standards kept on the device.

**Non-Goals:** pole loading, linked spans, more than one new line per pole, structural sign-off, reading PDFs or GIS, and any shipped NESC values.

## Decisions

### D1. Standards come in as a template, not a document
The template is CSV, with an Excel version from the same source: `rule_id, applies_to, value, unit, source_document, source_locator, note`, one row per rule. Rule ids are a fixed list:

| Rule id | Meaning |
|---|---|
| `sep.<supply-kind>.comm` | Separation on the pole between a supply attachment and the communication line below it. `applies_to` may give a voltage range for `primary`, such as `0-8.7kV` |
| `sep.comm.comm` | Separation between communication lines |
| `sep.midspan.<supply-kind>.comm` | Separation at midspan, when it differs from the pole value |
| `ground.pole.comm` | Lowest allowed communication attachment at the pole |
| `ground.<surface>.<kind>` | Clearance over `road`, `driveway`, `pedestrian`, `rail`, or a surface the file names |
| `pole.length-step`, `pole.setting-depth.fraction`, `pole.setting-depth.add` | Replacement pole sizing |
| `place.preference` | `highest`, `lowest`, or `nearest-existing` |

Attachment kinds are fixed too. Supply kinds: `primary` (with kV), `neutral`, `secondary` (0 to 750 V, including triplex and service drops), `streetlight` (bracket or drip loop), and `transformer` (lowest point of the tank). Communication kinds: `catv`, `telephone`, `fiber`, and `communication-other`. Heights are measured above the ground line to the attachment point (the bolt or clamp). The receipt states this convention, and a file may override it with a `note` on the `ground.pole.comm` row, which is shown.

The reader is the existing delimited-text and `.xlsx` code (Excel: the first sheet whose header row matches; cached values only, never formulas). It writes a parse receipt like the meter-file receipt.

| Alternative | Why not |
|---|---|
| Read PDF standards or Bluebeam files | PDF tables don't parse reliably without a model or a server, and a wrong clearance is a safety problem. |
| A form only | Fine for one value, but orgs keep dozens and reuse them. A file they can version is better. A form that edits the same record is offered too. |

### D2. Four rule sources, one record
Every check reads one rule record, filled from: (1) your standards file; (2) California GO 95, built in; (3) NESC values you enter from your own copy (the template with NESC rule and table numbers filled in and values blank, plus the edition you pick); or (4) no rules, which gives geometry only. Sources can be layered in an order the user sets, and the receipt shows which source filled each value. This follows the manual tariff record design (`add-load-and-bill-analyzer` D2): one record, nothing dropped silently.

| Alternative | Why not |
|---|---|
| Ship NESC values as defaults | IEEE's copyright and `openspec/config.yaml` ("never buy prose we may not quote"). It would also hide that the answer depends on the client's rules. |
| Ship RUS bulletin clearance tables | They are marked as reprinted from IEEE C2-2007, all rights reserved. |

### D3. GO 95 as a curated dataset with a change watch
`go95-clearances` is a registered dataset like `add-large-load-screen`'s tariff terms. gridprims is the publisher, the license basis is "edict of government", and the cadence is "on CPUC decision". Each value (Table 1 cases used by the tools; Table 2 cases 8 to 10, columns C to E) is a curated fact with two sources: the GO 95 table page and the CPUC decision that last revised it (type `order`). Fields are `disputable: false`, because a single legal issuer sets them. Each fact lists the footnote letters on its cell, which are shown on every result that uses it, as "Exceptions not checked: (k), (n), (rr)".

A new scheduled workflow, `go95-watch`, runs weekly. It compares the table text extracted from the official HTML pages and the CPUC's GO 95 change list with the stored captures. Any difference marks the affected facts "needs review", and checks that use them show a yellow chip. The chip clears on its own when a curated update with a new capture lands; there is no sign-off. It has an entry in `pipeline/workflows.mjs` with a staleness threshold and a health record. Comparing extracted text, not the whole PDF's SHA-256, avoids false alarms when the PDF is regenerated.

### D4. Placement as a search over whole inches
The communication space runs from the lowest supply attachment minus its required separation, down to the lowest allowed height. The finder lists every whole-inch height that keeps every required separation, picks one by placement preference (default `highest`, which keeps the most ground clearance), and stops.

If none fits, it searches moves of existing communication lines within the space, at most two at a time. Two is our own limit, to keep plans small enough to read and to carry out; it is not the FCC's test for simple make-ready, which turns on outage and damage risk (47 CFR 1.1402(q)) and sets no count. A moved line must itself keep every separation, and a move may fix an existing shortfall but may not create one. Plans are ranked by fewest moves, then least total distance, then the new line's height by placement preference, then moving up before moving down. Supply attachments never move; moving them is the owner's design work.

If no plan works, it reports the extra height needed above ground. With the pole's length and the rules' setting depth (`length × fraction + add`), it gives the shortest replacement length on the length step whose added height above ground covers that. It assumes supply attachments move up by the same added height, and says so.

Alternative: optimize over every attacher, including supply. Rejected: it needs crossarm and framing data we don't have.

### D5. Midspan by the parabolic method, sag supplied or computed
Sag is `D = wS²/(8H)`, and sag at a point `x` from midspan is `Dx = D(1 − (2x/S)²)` (RUS 1724E-152, which gives both). For unequal supports, the lowest point sits `x = S/2 − H·h/(wS)` from the lower pole and `w·x²/(2H)` below it; when `x < 0`, the lower support is the lowest point. The user enters sag at the design condition from their sag chart, or weight per foot and horizontal tension. Converting sag from field temperature to design temperature (change of state) is out of scope in v1, and every result says so. The catenary sag is shown when it differs by more than 1 in.

Separation from power lines above is checked at the point where the gap is smallest, from both lines' heights and sags, against `sep.midspan.*` or, where the file has no midspan value, the pole value.

### D6. Rounding toward more clearance
Inputs keep the precision they were entered with (`platform/tool-contract` "Precision never exceeds the inputs"). Displayed heights are whole inches. Attachment answers are whole inches by construction. Sag rounds up, lowest points and margins round down, and shortfalls round up. Each tool's sentence says so in plain words.

### D7. Words that never claim approval
Result sentences say "fits the separations in [rule source, edition]" or "is 4 in. short of …". The screening strip reads: "Screening check against the rules you loaded. The pole owner and a qualified engineer have the final word." The honest-claims gate gains a term list scoped by tool id prefix. For `lines.*` it bans "meets code", "code compliant", "compliant", "approved", and the word "safe", even in a negated sentence, because "does not meet code" implies that the opposite would.

### D8. Files: two kinds, one intake
The pole list has one row per attachment: `pole_id, owner, kind, height, note`, with optional `pole_length`. Heights accept `22'4"` (straight or curly quotes), `22-4`, `22 ft 4 in`, `22.33 ft`, and meters. Intake recognizes the standards template and the pole list by their header rows and routes them to the lines workbench, not the load workbench. It is a file workbench with the same worker, progress, cancel, and consent rules as meter files. Per-pole views are in-page; a share link from one carries no file rows and asks for the file.

Over MCP, `gridprims_analyze_file` returns a handle tagged `lines-standards` or `lines-pole-list`. `gridprims_run` accepts handles for manifest inputs of the new `handle` type, or inline `rules[]` and `attachments[]`. Owners, pole ids, notes, and source text from files come back only in `source_text`, cut to 80 characters; results refer to rows by number.

### D9. Evidence and validation level
`lines.midspan-clearance.check` cites RUS 1724E-152 for its formulas, which is the reference source. Because that bulletin publishes no worked examples, its test vectors come from an independent source instead: an exact catenary (`cosh`) evaluated for 50 stored cases by a separate script, which is `reference-output` evidence at level 2, as `add-grid-calculators` does with the open line-rating implementations. Agreement is expected within 1% of sag where sag is under 5% of the span, and each case records both values.

`lines.attachment-height.find` ships experimental at level 1 (`own-examples`), labeled Preview. To raise it to level 2, it must reproduce at least 10 worked placements from captured public utility joint-use standards (`published-example`). Clark Public Utilities' Section 1910 "Joint Use" (Rev. 3, 2023-03-07) is one such document, with dimensioned figures giving a 23 ft to 27 ft communication space on a 45 ft pole, a 40 in. separation, and 12 in. between attachments [V]. Tacoma Power C-OH-1060, Chelan County PUD's attachment standards, and RG&E and NYSEG's joint pole space assignments are the next to capture. Most attachment documents carry rules without worked figures, so the 10 may not exist. Finding them is research, not a review, so nothing waits on a person. If fewer than 10 exist, it stays Preview, and its limits entry says what would raise it. Field cases (level 3) come only from problem reports users choose to send.

## Risks / Trade-offs

- **A wrong value in an org's file gives a wrong answer.** Mitigation: every required value is shown with its row, the receipt flags values outside each rule's plausible range, and the strip names the file.
- **GO 95 changes or footnotes matter.** Mitigation: D3's watch and chip; footnote letters on every result.
- **Read as engineering approval.** Mitigation: D7, the engineering sign-off cannot-do entry, and "pole loading not checked" on every result.
- **Field measurement error.** Mitigation: D6 rounding, and a sentence saying the answer is only as good as the measured heights.
- **A new audience strains the simplicity budget.** Mitigation: no home cell, at most five first-screen inputs per tool, one chart each.
