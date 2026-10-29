## Purpose

Computes what a tariff charges for the user's actual intervals, one line at a time, so a facility manager can see what drives the bill and spot charges they could avoid or dispute.

## ADDED Requirements

### Requirement: Tariff sources
The user SHALL be able to pick a tariff from the shipped URDB snapshot (searched by utility, then rate name) or enter one by hand. Every URDB tariff SHALL show its URDB id, effective dates, last-updated date, and a link to the source document. The tool SHALL warn when a tariff's effective date range does not cover the data period.

#### Scenario: Out-of-date rate
- **WHEN** the selected URDB rate ended before the start of the loaded data
- **THEN** a warning names the end date and suggests checking the utility's current tariff

### Requirement: Energy and fixed charges
The bill engine SHALL support fixed monthly charges, minimum charges, and flat, tiered, and time-of-use energy charges using URDB's 12 × 24 weekday and weekend period schedules.

#### Scenario: Weekend schedule
- **WHEN** a TOU tariff has an on-peak period on weekdays only
- **THEN** Saturday and Sunday energy is priced at the weekend schedule's period rates

### Requirement: Demand charges and ratchets
The bill engine SHALL support flat monthly and time-of-use demand charges, demand windows of 15, 30, or 60 minutes, contract or minimum demand floors (kW), and demand ratchets defined as a percent of the highest billing demand over a lookback period of months, including lookbacks limited to named months (URDB `lookbackmonths`).

#### Scenario: Ratchet sets billing demand
- **WHEN** a tariff has an 80% ratchet over the prior 11 months and this month's peak is 300 kW while the highest prior peak was 500 kW
- **THEN** billing demand is 400 kW and the line item says "ratchet applied: 80% of 500 kW billing demand (July)"

#### Scenario: Lookback not covered by the file
- **WHEN** a 12-month file starts in January and the tariff looks back 11 months
- **THEN** January through November show "lookback incomplete" on the demand line, and the user may enter prior months' billing demand to complete it

### Requirement: Power-factor adjustments
The bill engine SHALL support the power-factor forms found in `docs/research/03`: billing demand scaled by target PF ÷ actual PF, kVA billing demand, and per-kVAR charges. Power factor SHALL come from the file when it has kVAR or kVA data, or from a user-entered monthly value.

#### Scenario: Power-factor adjustment
- **WHEN** the tariff adjusts billing demand to a 0.90 power factor, measured PF is 0.80, and metered demand is 200 kW
- **THEN** billing demand is 225 kW, and the line item shows the formula and the 25 kW added by low power factor

### Requirement: Holidays
URDB has no holiday calendars, so the engine SHALL treat holidays as their weekday by default and show "Holidays priced as weekdays" on TOU bills, and SHALL let the user apply a holiday list (default: the six NERC off-peak holidays) that prices those days on the weekend schedule.

#### Scenario: July 4 on-peak
- **WHEN** a weekday July 4 falls in an on-peak window and the user turns on the NERC holiday list
- **THEN** July 4 energy and demand use the weekend schedule and the bill names the holiday

### Requirement: Export channel excluded in v1
When the series has a received (export) channel, the bill SHALL price delivered energy only and SHALL show "Export credits not modeled" with the exported kWh, never netting the channels.

#### Scenario: Solar export
- **WHEN** a month has 2,400 kWh delivered and 900 kWh received
- **THEN** the bill prices 2,400 kWh and lists 900 kWh exported as not credited

### Requirement: URDB units converted explicitly
The tariff normalizer SHALL convert every URDB charge unit it supports to a per-billing-period amount with the conversion shown: fixed charges in $/day, $/month, and $/year; energy in $/kWh with tiers in kWh, kWh per kW, or kWh per day; demand in $/kW and $/kVA, including daily demand. A unit it does not support SHALL make that charge an unmodeled line.

#### Scenario: Daily fixed charge
- **WHEN** a tariff has a fixed charge of $0.50 per day and the billing period has 31 days
- **THEN** the fixed line is $15.50 with "31 days × $0.50/day" shown

### Requirement: Unmodeled charges are named
Charge types the engine cannot model SHALL be listed by name on the result and excluded from the total, never estimated.

#### Scenario: Unsupported coincident demand charge
- **WHEN** a URDB tariff includes a coincident demand charge the engine does not model
- **THEN** the bill shows "Not modeled: coincident demand charge" and excludes it from the total, rather than guessing

### Requirement: Line-by-line bill with the setting interval
For each billing month the tool SHALL show each charge line with quantity, unit, rate, and subtotal, and for each demand line the exact interval that set it, linked to the chart.

#### Scenario: Which 15 minutes cost the most
- **WHEN** a user opens March on the bill
- **THEN** the on-peak demand line names the date and time of the setting interval and its kW, and tapping it highlights that interval

### Requirement: Compare with an actual bill
The user SHALL be able to enter the amounts from their actual bill for a month. The tool SHALL show the difference by line and overall and SHALL list likely causes in plain words (missing taxes or riders, different billing period dates, unmodeled charges, meter multiplier).

#### Scenario: Riders missing
- **WHEN** the computed total is 6% below the user's actual bill and the tariff has unmodeled riders
- **THEN** the comparison names the riders as the likely cause and does not claim a billing error

### Requirement: Bill engine verification
The bill engine SHALL match stored outputs from an independent bill calculator (PySAM Utilityrate5 or REopt.jl, run once by a maintainer and committed as fixtures) within 0.5% of the monthly total on at least 10 URDB tariffs covering every supported charge type, using the same interval data. Known differences in how those engines treat a charge SHALL be documented, not hidden.

#### Scenario: Cross-engine test
- **WHEN** CI runs the 10-tariff cross-check
- **THEN** every monthly total is within 0.5% or the documented-difference list explains the gap

### Requirement: Charges the reference engines cannot check
Charge types neither reference engine models (power-factor adjustments, demand windows other than 15 minutes, and coincident demand, per `docs/research/07`) SHALL be verified against hand computations and published tariff examples, at least two per type, to the cent.

#### Scenario: Power factor checked by hand
- **WHEN** CI runs the stored Austin Energy power-factor example (13.5 kW at 0.87 PF billed at 0.90)
- **THEN** billing demand is 14.0 kW to 0.1 kW, matching the utility's published example
