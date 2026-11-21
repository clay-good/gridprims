# 18. Overhead line design: what the sources allow

Researched 2026-10-31 for `add-overhead-line-checks`; R.24-10-005 rechecked 2026-11-21. **[V]** means checked on the primary page; **[U]** means not yet checked. A [U] fact the site relies on is in the unverified-claim register (`data/curated/claims.mjs`) and in the claims of the manifests that use it.

## Codes and their values

| Fact | Status | Where it is used |
|---|---|---|
| The NESC is IEEE C2-2023; C2-2028 is due August 1, 2027 | [V] | Limits text; rule ids cite it by number |
| IEEE owns the NESC's copyright and sells it, so we ship none of its values; users supply them | [V] | Template design: NESC values come from the user's file |
| Most states adopt the NESC | [V as reported by ATIS] | Background only |
| *ASTM v. Public.Resource.Org* (D.C. Cir. 2023) found noncommercial posting of incorporated standards fair use; IEEE was not a party | [V] | Background only; no NESC values ship |
| CPUC General Order 95 is law the CPUC wrote, so its values may be republished (*Georgia v. Public.Resource.Org*, 2020) | **[U, legal judgment]** | The `go95-clearances` dataset and `lines.midspan-clearance.check`; claim `go95-law-republishable` |
| GO 95 Table 1 (Rule 37) was last revised by D.17-12-024; Table 2 (Rule 38) by D.09-08-029 | [V] | `data/curated/go95/clearances.mjs` |
| Table 1 Column B gives 18 ft (Case 3, urban thoroughfares), 15 ft (Case 4, rural), 10 ft (Case 5, pedestrians only) for communication conductors; Column E gives 25 ft for supply at 750 V to 22.5 kV | [V]; footnote letters rechecked against the page in `data/curated/go95` | Midspan clearance check |
| Table 2 Cases 8 to 10 give 48 in. between communication and supply up to 7.5 kV, and 12 in. between communication lines, on the same pole and in adjoining midspans, with footnotes such as (k), (n), and (rr) allowing exceptions | [V] | Midspan clearance check |
| The GO 95 PDF is official, and the HTML may lag it | [V] | We read the PDF |
| R.24-10-005 is the CPUC's "Order Instituting Rulemaking to Consider Proposed Changes to General Order 95 to Modernize the Rules and Regulations Governing the Design and Construction of Overhead Electric and Communications Facilities in California" (ALJ Joanna Perez-Green; Commissioner Matthew Baker) | [V, CPUC docket card read 2026-11-21] | The GO 95 change watch; listed in `docs/research/06` for the weekly recheck |

## Methods

| Fact | Status | Where it is used |
|---|---|---|
| USDA RUS Bulletin 1724E-152 (July 30, 2003, RD-GD-2003-48) gives the parabolic sag `D = WS²/8Th`, the ruling-span ratio `D = Dr(S/Sr)²`, and the offset sag `Dx = D(1 − (2x/S)²)` | [V, full text read] | Midspan clearance method |
| It contains no worked numerical examples and no sag tables, so it cannot supply test fixtures | [V: no "example", "solution", or sag table in the document] | Why the tool's evidence is own-examples |
| It is a federal work (17 U.S.C. 105), reprints no IEEE or ASCE material, tells readers to buy the NESC, and cites the 2002 edition while saying to use the current one | [V] | Citation |
| RUS 1724E-150 and 1724E-153 cover pole strength and guys and anchors | [V] | Handoffs; pole loading stays out of scope |
| RUS Bulletin 1728F-700, incorporated by reference in 7 CFR parts 1728 and 1755, is the strongest public candidate for pole length and class dimensions, but no readable copy could be retrieved | [V, unretrieved] | Task 3.3a: a manual download decides whether pole sizes can ship |
| The setting depth "10% of the pole's length plus 2 ft" appears only in utility standards, not in any federal or state source found | [V, searched] | Setting depth comes from the user's rules |
| Utility joint-use specifications (for example Chelan PUD's) give common practice such as 40 in. from supply to communication | [V on the documents captured for the sample file] | Only as cited example values in the sample standards file |

## Make-ready and the market

| Fact | Status | Where it is used |
|---|---|---|
| 47 CFR 1.1411 sets make-ready timelines and one-touch make-ready; 1.1402(p) and (q) define complex and simple make-ready by the risk of an outage or damage, with no limit on how many attachments may move | [V] | Context and handoffs; the FCC sets no clearances |
| BEAD make-ready is reported at up to $4.63 billion, with some owners quoting 18-month timelines | [U, reported figures] | Proposal only; not stated on the site |
| SPIDAcalc starts at $2,627 a year; O-Calc Pro, PLS-POLE, Katapult, and IKE are per seat and quote-gated | [V for SPIDAcalc] | Proposal only |
| No free browser tool for attachment placement was found, and one incomplete open-source pole-stress script | [V, searched] | Proposal only |
| Pole owners often require a PE-sealed pole loading report from the attacher | [V in Texas utility application forms] | The cannot-do entry for pole loading |
