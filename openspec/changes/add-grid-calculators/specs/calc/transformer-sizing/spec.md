## Purpose

Sizes a distribution transformer for a known load and shows how heavily an existing one is loaded, as a screening step before a utility or engineer sizes it for real.

## ADDED Requirements

### Requirement: Size from load
Given load as kVA, or as kW with a power factor, or as amps at a voltage, and the phase configuration, the tool SHALL compute required apparent power in kVA (three-phase: √3 × V line-to-line × A ÷ 1,000; single-phase: V × A ÷ 1,000) and SHALL name the next larger standard rating from a public-domain list of standard distribution transformer ratings (a government engineering bulletin, cited with its edition and date), or ask the user for a rating when no public list covers the case.

#### Scenario: Three-phase from amps
- **WHEN** load is 600 A at 480 V three-phase
- **THEN** required apparent power is 498.8 kVA and the next standard rating named is 500 kVA

### Requirement: Loading of an existing transformer
Given a transformer rating and a load (entered, or the peak from a loaded interval file), the tool SHALL show loading as a percent of rating to 0.1, the headroom in kVA, and the load's power factor assumption.

#### Scenario: Peak loading
- **WHEN** a 500 kVA transformer serves a 412 kW peak at 0.95 power factor
- **THEN** loading is 86.7% (433.7 kVA) with 66.3 kVA of headroom

#### Scenario: Over rating
- **WHEN** computed loading exceeds 100%
- **THEN** the result says the load exceeds the nameplate rating and that sustained overloading is the owner's and the utility's decision under their loading guide

### Requirement: No loading-guide math
The tool SHALL NOT compute permissible overload duration, hot-spot or top-oil temperature, or loss of life, and SHALL say that those come from the applicable transformer loading guide and the owner's practice.

#### Scenario: Overload question
- **WHEN** a user asks how long an overload is acceptable
- **THEN** the page states that the tool does not answer it and names the loading guide by number without reproducing it

### Requirement: Verification
Conversions SHALL match hand computations exactly to 0.1 kVA for at least three cases spanning single-phase, three-phase, and amps-from-kVA, stored as fixtures, and SHALL reproduce at least one worked transformer-sizing example published by a government engineering bulletin or a utility guide (cited) within 0.1 kVA.

#### Scenario: Round trip
- **WHEN** CI converts 498.8 kVA back to amps at 480 V three-phase
- **THEN** the result is 600 A within 0.1 A
