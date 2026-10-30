## Context

Methods, thresholds, data paths, and licenses are in `docs/research/10` (verified 2026-10-29). The open method documentation (CalTRACK 2.0) is CC0; the reference implementations (`eemeter`, `opendsm`) are Apache-2.0; ASHRAE Guideline 14 and IPMVP are paywalled and are cited only as context we have not read. NOAA publishes no explicit license, so redistribution rests on federal works not being under copyright, and we carry the dataset's own requested citation.

## Goals / Non-Goals

**Goals:** an honest split of a bill change into weather and not-weather, from data people already have; a model that refuses to answer when it should.

**Non-Goals:** program-grade savings settlement; diagnosis of the non-weather part.

## Decisions

### D1. The open change-point family, not a degree-day ratio
Fit four candidate models on use per day against heating and cooling degree days: flat (no weather term), heating-only, cooling-only, and heating-plus-cooling. Search balance points from 30 °F to 90 °F at no more than 3 °F spacing, reject any candidate with a negative degree-day coefficient, and pick the highest adjusted coefficient of determination. The flat model winning is a real answer: this use is not weather-driven.

| Alternative | Why not |
|---|---|
| Degree-day ratio (scale use by the ratio of degree days) | Assumes all use is weather-driven and a zero intercept; wrong for a home with a big baseload. Kept only as an illustration in Learn. |
| A single heating-plus-cooling model always | Fits a cooling slope to a gas-heated home's noise and then attributes change to it. |
| Hourly time-of-week-and-temperature model | Stronger for commercial buildings, but needs interval data, more compute, and more explaining; a later phase. |

### D2. Ship station history, compute degree days on the device
We ship trimmed daily maximum and minimum temperature per station as static files and compute degree days in the browser at the base the model picks, using the mean of the daily maximum and minimum, the convention NOAA and EIA state. Shipping precomputed degree days at one base would prevent the balance-point search.

Alternative: ship precomputed degree days per base. Rejected: the search needs about 20 bases, which multiplies the files for no gain.

### D3. Normals are published, not recomputed
The "normal year" comparison uses the published 1991–2020 daily normals. Those normals come from a smoothed fit of daily mean temperature rather than from averaging thirty years of actual degree days, so self-computed degree days will not match them exactly; the result says so wherever a normal-year figure appears.

Alternative: compute our own 30-year normals from station history. Rejected: it would disagree with the number every utility and news story quotes.

### D4. Station choice is explicit and on the device
The app ships a station index (identifier, name, coordinates, elevation, and period of record). A ZIP code picks candidate stations by distance on the device, from the state shard that already serves the utility lookup, and the user can change the station. The receipt names the station, its distance, and its data coverage.

| Alternative | Why not |
|---|---|
| Nearest station silently | A station 60 miles away across an elevation change quietly wrecks the fit. |
| Climate-division averages only | Loses the local signal that makes a single building's fit work. |
| A weather API at runtime | A third-party request with user location in it; forbidden by the privacy spec. |

### D5. Quality rules are the published ones, stated in plain words
Data sufficiency and fit rules come from the open method documentation and are shown to the user as sentences, not jargon: a baseline needs 365 days; at most 10% of days may be missing; daily coverage must be at least 90%; a monthly baseline needs at least 11 months; billing periods longer than 35 days (or 70 for bi-monthly) are dropped; a model needs at least 10 days with non-zero degree days and at least 20 degree days a year to claim a weather relationship. The coefficient of variation of the root mean squared error is reported, and a model above 1.0 is disqualified unless the published alternative criterion passes. The open documentation sets no minimum coefficient of determination, so we set none either, and we never present a poor fit as an answer.

Alternative: invent our own thresholds. Rejected: these are the numbers program evaluators already use, and they are citable.

### D6. Report a band, never a point
The weather-normalized change is shown as a range from the model's own error, with a plain statement that a well-fitted meter supports about 10% to 20% accuracy on the annual normalized change and that nothing below roughly 5% is meaningful. Published portfolio-median accuracy from the literature is never quoted as per-household accuracy.

Alternative: report a single normalized number, as utility portals do. Rejected: it implies a precision the model does not have, and the band is what makes "too small to call" sayable.

### D7. Solar, electrification, and occupancy are called out, not silently modeled
When the series has an export channel, or the user says solar was added, a heat pump was installed, or the building's occupancy changed mid-period, the tool splits the baseline at the stated date, or refuses and says why. A retrofit inside the baseline is the classic way this analysis lies.

| Alternative | Why not |
|---|---|
| Fit one model across the change and absorb it | The retrofit's effect lands in the weather term or the residual, which is exactly the lie. |
| Detect change points automatically and split without asking | A detected break can be a move, a tenant change, or a meter swap; guessing its cause silently mislabels the result. |

## Risks / Trade-offs

- **People will read the non-weather part as blame or as a utility error.** Mitigation: wording that names ordinary causes, a checklist, and no diagnosis.
- **A poor fit is the common case for small, low-use homes.** Mitigation: the flat model is a first-class answer, and the tool says plainly when weather does not explain the use.
- **Station data has gaps and moves.** Mitigation: coverage shown on the receipt, gap rules from D5, and the station changeable by hand.
- **NOAA's license is implicit.** Mitigation: registry entry records the federal-works basis and carries the dataset's requested citation.
