## Why

**Value up front:** a line designer types in what they measured on a pole and gets a cited instruction back, such as "Attach at 26 ft 10 in.", "Move the telephone line up 3 in. first", or "This pole needs to be 5 ft longer". The check runs against their client's own construction standards, which never leave their device, or against public rules when they have none. It's free and runs in the browser and over the local MCP server.

Why now: broadband buildout has made make-ready (clearing room on a pole for a new line) a bottleneck. The FCC's attachment rules (47 CFR 1.1411) put survey and make-ready on clocks of 30 to 180 days, and 1.1402(q) decides what counts as simple work. Reported figures put BEAD make-ready at up to $4.63B, with some owners quoting 18-month timelines (sources and verification status in `docs/research/18`). Much of this work is done by contractors. They work to their utility client's proprietary standards and can't paste those into an outside tool or an AI model. The commercial pole tools (O-Calc Pro, SPIDAcalc from $2,627 a year, Katapult, PLS-POLE) are licensed per seat. We found no free, browser-based tool that answers the everyday question "where does the new line go on this pole, and what has to move?" against the rules the designer actually works to; the only free code found is an incomplete open-source pole-stress script.

Who it serves: co-op and municipal utility line engineers, and the contractors and joint-use staff who design attachments for them. These are the PRODUCT.md "co-op and municipal utility engineers", plus telecom make-ready designers working on utility poles.

We hand off to the pole owner's process for approval, to the free RUS bulletins for method detail, and to the commercial tools for full structural analysis.

## What Changes

- **Design standards, kept on the device:** load your organization's standards as a filled-in template (CSV or Excel). It holds the required separations by line type and voltage, ground clearances by surface, pole setting depth and length step, and placement preference. The file stays in the tab's memory unless you choose to keep it, and every value is shown with the row it came from. With no file, pick California GO 95 (public law, built in with citations), type in values from your own licensed NESC copy, or choose no rules and get measurements only.
- **Attachment height finder:** from a pole's existing attachments, find the height for one new communication line. If nothing fits, give the fewest moves of other communication lines that make room. If moves can't make room, give the replacement pole length needed. It works one pole at a time or for a field file listing many poles.
- **Midspan clearance check:** sag and the lowest point of a span between two poles of different heights, by the parabolic formulas in USDA RUS Bulletin 1724E-152, checked against the ground clearance for what the span crosses and the separation from power lines above. The bulletin gives formulas but no worked examples, so the test vectors come from an independent exact catenary.
- **Platform:** the tool contract gains list, length, and file-handle input types. Intake recognizes the two new templates by their header rows. The MCP server can run a tool on two file handles. All of this is needed because, until now, every file was a meter file.

## Capabilities

### New Capabilities

- `lines/design-standards`: The standards template and its reader and receipt, the built-in GO 95 rules, entered NESC values, and where each required value came from.
- `lines/attachment-height`: The new attachment height on an existing pole, the moves that make room, or the replacement length needed, for one pole or a list.
- `lines/midspan-clearance`: Sag and the lowest point of a span, checked against the ground clearance and the separation from power lines above.

### Modified Capabilities

- `platform/tool-contract`: "One file, one set of numbers" covers each file kind's own record, not only the interval series. Adds list, length, and handle input types.
- `platform/file-intake`: Routing recognizes the lines standards template and the pole list.
- `agent/mcp-server`: `gridprims_run` accepts file handles and inline lists for tools that read them, with no change to the six-tool surface.

## Non-goals

- Pole loading and strength (wind, ice, bending, guying), which decides most replacements. It is the planned next change, built on the same standards file and RUS Bulletins 1724E-150 and 1724E-153.
- Linking spans between poles in a pole list, and placing more than one new line per pole. Both come later; v1 checks one new line per pole, and spans one at a time.
- Reproducing NESC (IEEE C2) text or tables, ANSI O5.1 pole tables, or the IEEE and ASCE figures that RUS bulletins reprint with permission.
- Evaluating GO 95 footnotes or utility exceptions. They are named on each result, not applied.
- Reading PDF standards, Bluebeam markups, photos, or utility GIS exports.
- Saying a design "meets code" or replacing a Professional Engineer's review (the existing cannot-do entry for engineering sign-off).
- Transmission structures, underground lines, wireless equipment on poles, and NJUNS or permit filing.

## Impact

- Phase 3, alongside `add-grid-calculators`; added to the phase plan in `plan-launch-and-value-proof`. Tools sit in the Grid section and the catalog, with no home-page cell.
- Adds the `lines` tool domain; a standards template, sample standards file, and sample pole list; the `go95-clearances` curated dataset with a scheduled change watch; the research brief `docs/research/18`; one cannot-do entry; and changes to the tool contract, file intake, and MCP server.
- Archive after `establish-platform-foundation` and `add-local-mcp-server`, whose capabilities this change modifies; it is the first change in the repository with MODIFIED deltas.
- No network request carries user data. Standards and field files are read on the device like meter files.
