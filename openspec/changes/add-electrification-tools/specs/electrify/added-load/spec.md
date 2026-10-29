## Purpose

Lets users add any new load they can describe hour by hour, such as a heat pump estimate from their installer, to their meter data and see the effect on peaks, bills, emissions, and headroom.

## ADDED Requirements

### Requirement: User-supplied load shapes
The user SHALL be able to add an hourly or sub-hourly CSV of kW or kWh, a simple schedule (kW by hour of day, by month), or a typical heat-pump or appliance shape for their county from NLR End-Use Load Profiles (ResStock and ComStock, release pinned in the registry, CC BY 4.0, packed in state shards, scaled to a user-entered annual kWh and labeled as typical), and the tool SHALL align it to the meter data's period and resolution, stating how it aligned it.

#### Scenario: Messy shape file
- **WHEN** a shape CSV is in kWh, local standard time, from a different year, with a 3-hour gap
- **THEN** values convert to kW, map by month, weekday, and hour onto the meter's year, shift to prevailing time, the gap is reported and treated as zero added load, and the receipt lists each step

#### Scenario: Hourly shape on 15-minute data
- **WHEN** an hourly shape is added to a 15-minute file
- **THEN** each hour's kW is applied to its four intervals and the receipt says so

### Requirement: Verification
Alignment SHALL be checked with fixtures whose combined totals are known (energy preserved within 0.01%), including hourly-on-15-minute and 15-minute-on-hourly cases.

#### Scenario: Energy preserved
- **WHEN** CI adds a fixture shape to a fixture load
- **THEN** combined energy equals the sum of both within 0.01%

### Requirement: Combined results
The tool SHALL recompute monthly peaks, the bill under the selected tariff, hourly emissions (when the carbon tools are present), and service headroom for the combined load, and SHALL show before and after side by side.

#### Scenario: New winter peak
- **WHEN** a heat pump shape raises January's peak above the summer peak
- **THEN** the result says the annual peak moved to winter and shows the bill change
