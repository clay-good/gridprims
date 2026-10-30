## Purpose

Gives a fast, transparent first answer to "would a battery or solar pay off here?" on the user's own intervals and tariff, with every assumption visible, before they invest time in a full REopt study.

## ADDED Requirements

### Requirement: Monthly threshold peak shaving
For a battery of power P (kW) and energy E (kWh), the screen SHALL find, per billing month, the lowest demand threshold the battery can hold with perfect foresight: discharging above the threshold (up to P) and recharging below it without exceeding it, within the usable state-of-charge window and round-trip efficiency. It SHALL report new monthly peaks, demand-charge savings, energy-charge change including losses, and equivalent full cycles.

#### Scenario: Battery too small for a long peak
- **WHEN** a month's peak is a flat six-hour plateau 150 kW above the next-highest level, and a 500 kW battery holds 200 kWh with a 10–90% usable window (160 kWh usable)
- **THEN** the threshold falls by 26.7 kW ± 0.1 kW (160 kWh delivered ÷ 6 h, with round-trip losses taken on charging), and the result explains that energy, not power, limited savings

### Requirement: Disclosed assumptions
The screen SHALL show and let the user change: round-trip efficiency (default 85% AC-to-AC, taken from the registered NLR Annual Technology Baseline dataset that `calc/storage-and-cost` owns, with losses taken on charging), usable state-of-charge window (default 10–90%), perfect foresight (always on, labeled as an upper bound), and degradation (reported as equivalent full cycles per year; no capacity fade in v1).

#### Scenario: Upper-bound label
- **WHEN** savings are displayed
- **THEN** the text says real-world savings are typically lower because dispatch cannot see the future

### Requirement: Solar profile
The user SHALL be able to add solar by dropping an hourly production export from the PVWatts web calculator, (which the user runs; no API key ships with gridprims), scaled by system size (kW DC) if the user changes it. Shipped typical production shapes are deferred until their source license is confirmed (`docs/research/01`). The screen SHALL show the net load and recompute every bill and peak result on it.

#### Scenario: Typical year aligned to the meter's year
- **WHEN** a PVWatts export (8,760 hours, local standard time, no DST, no leap day) is added to 2024 meter data
- **THEN** hours map by month, day, and standard-time hour, February 28 is repeated for February 29, summer hours shift to prevailing time, and the receipt says so

#### Scenario: Solar does not cut demand
- **WHEN** the site's monthly peaks fall after 6 pm
- **THEN** the result shows energy savings from solar but little or no demand-charge savings, and says why

### Requirement: Payback and handoff
The screen SHALL compute simple payback from a user-entered installed cost and the annual savings, and SHALL link to REopt with the exported clean load file (per `load/handoff-and-report`) for an optimized design.

#### Scenario: Payback
- **WHEN** installed cost is $200,000 and annual savings are $25,000
- **THEN** simple payback is 8.0 years

#### Scenario: No cost entered
- **WHEN** the user has not entered an installed cost
- **THEN** payback is not shown and the field asks for a cost, with a link to NLR ATB cost ranges as a reference

### Requirement: Screen limits stated
When a tariff has TOU demand periods, ratchets, or coincident charges, the screen SHALL say its result is a screen, not an upper bound.

#### Scenario: TOU demand tariff
- **WHEN** the tariff has separate on-peak and facility demand charges
- **THEN** the savings card says the result is a screen and recommends REopt for an optimized dispatch

### Requirement: Screen verification
Perfect-foresight threshold dispatch is optimal for a single flat monthly demand charge, so it is an upper bound there; On at least 5 redistributable load profiles and 3 flat-monthly-demand tariffs, the screen's demand savings SHALL be at least 98% of stored REopt results for the same battery run with only demand charges and matched efficiency and state-of-charge limits; any case below SHALL be investigated as a defect.

#### Scenario: Bound check
- **WHEN** CI compares the screen with the stored demand-only REopt results
- **THEN** every case's screen savings are at least 98% of REopt's

### Requirement: Excluded effects are listed on the result
The result SHALL list the effects the screen does not model: auxiliary load, forecast error, export rules, interconnection limits, and incentives.

#### Scenario: Exclusions travel with the answer
- **WHEN** a screen result is shown, copied, or exported
- **THEN** the excluded-effects list accompanies it

