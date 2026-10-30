## Why

**Value up front:** someone planning a solar or storage project learns which interconnection process their size and voltage fall under, what every fast-track screen actually tests, which screens they can answer themselves and which need feeder data only the utility holds, how the thresholds differ in their state, and exactly how to buy the feeder data that would settle it. What they do not get is a confident "you will pass", because nobody can honestly give that from public data.

Why this shape (`docs/research/12`):
- **The federal fast-track screens are public tariff text**, not a copyrighted standard, so we can state every threshold verbatim with a citation.
- **Only about a third of the screens can be evaluated from data a developer can get.** The decisive ones (aggregate generation against 15% of the line section's annual peak, proposed generation against 100% of minimum load, fault current, interrupting capability) need feeder data that, for most of the country, is published nowhere in machine-readable form, though a few utilities do publish per-feeder minimum load openly.
- **Minimum daytime load, the input the most important screen turns on, is unavailable for an estimated 70% to 80% of feeders, and the utilities themselves fall back to assuming it is 15% to 40% of peak** — a spread of nearly three times that differs by utility. At least two states appear to write a percentage-of-peak fallback into their rules, one of them splitting the value by technology; `docs/research/12` tags both as needing reverification, so the specs carry them as unconfirmed until a maintainer reads the rule text. Teaching that spread, and outputting a range rather than a number, is the most useful thing a free tool can do here.
- **States diverge enough that a national pass/fail is meaningless, and the divergence is the content.** One state's level-two review uses 100% of minimum load and a 90% interrupting-capability limit where the federal screens use 15% of peak and 87.5%. A free side-by-side of state screen thresholds does not exist today.

We link rather than rebuild: the federal hosting-capacity atlas and each utility's own map, the sibling site for premises wiring, and each utility's interconnection portal for the actual application.

## What Changes

- **Process router:** from project size, voltage, technology, and state, which interconnection process applies, with the eligibility conditions quoted from the tariff, plus published deadlines and fees so expectations are set from rule text rather than rumor.
- **Screen explainer:** every fast-track screen in order, what it tests, its exact threshold, and a label saying who can answer it: you, your installer, or only the utility. The screens whose inputs are entirely user-owned are evaluated; the rest are explained and left open.
- **State threshold comparison:** the same screen family across the federal rules and several states, side by side, with each threshold cited.
- **Minimum-load range:** the two load-ratio screens computed as a band across the 15%-to-40% minimum-load assumption, showing when the answer flips inside the band and naming the states that codify a fallback.
- **Feeder data paths:** a walkthrough of the tariff's pre-application report (its fee, its deadline, and the items it returns), and a directory of hosting-capacity maps describing each utility's data availability and terms, linking only.
- **Equipment reference:** inverter certification generations explained, the common inverter settings as published by government sources, and a direct-current to alternating-current sizing calculator.

## Capabilities

### New Capabilities

- `interconnect/process-router`: Which process applies, with deadlines and fees from tariff text.
- `interconnect/screen-explainer`: Every screen, its threshold, who can answer it, and how states differ.
- `interconnect/minimum-load-range`: The load-ratio screens as an honest band, not a number.
- `interconnect/feeder-data-paths`: How to obtain feeder data, and where maps exist.
- `interconnect/equipment-reference`: Inverter certifications, published settings, and sizing.

### Modified Capabilities

None.

## Non-goals

- Any pass or fail verdict on fault current, interrupting capability, transient stability, voltage or power quality, or the safety and reliability review. Each needs a circuit model, which is the study we cannot and must not do.
- Publishing our own hosting-capacity numbers, feeder topology, device ratings, substation locations, or a mirror of any utility's hosting-capacity dataset.
- Reproducing a copyrighted standard's tables or its structure.
- Premises wiring, busbar, or conductor rules (the sibling trades site covers those).
- Filling in, submitting, or tracking an interconnection application.

## Impact

- Phase 3, per `plan-launch-and-value-proof`, because its audience is narrower than the metered-data tools and its value is explanation rather than computation.
- Adds one curated dataset: screen thresholds by jurisdiction, each field cited to tariff or rule text, maintained under the contribution rules in `trust/curated-contributions`.
- Adds no infrastructure data of any kind; the CEII screen in `platform/data-snapshots` applies and this change ships nothing that would reach it.
