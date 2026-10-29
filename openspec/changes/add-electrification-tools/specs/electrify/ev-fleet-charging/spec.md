## Purpose

Shows fleet operators what adding EV charging does to their peak demand and bill, and how much managed charging saves, using their own building load and tariff.

## ADDED Requirements

### Requirement: Fleet inputs
The user SHALL enter vehicle groups (count, energy needed per day in kWh, charger power in kW, earliest plug-in and latest departure times, days of operation) and SHALL see the total daily charging energy and whether it fits the dwell window at full charger power.

#### Scenario: Not enough time to charge
- **WHEN** 10 buses each need 300 kWh with 60 kW chargers and a 4-hour dwell
- **THEN** the tool says each bus can receive at most 240 kWh and flags the 60 kWh shortfall per bus

### Requirement: Unmanaged vs. managed charging
The tool SHALL simulate unmanaged charging (every vehicle at full power from plug-in until full) and managed charging (spreading energy within each dwell window to minimize the site's monthly peak, using the same threshold method as the storage screen), add each to the building's intervals, and show new monthly peaks and bills under the selected tariff.

#### Scenario: Numbers
- **WHEN** 10 vehicles each need 120 kWh, chargers are 60 kW, and all plug in at 6 pm and leave at 6 am on a flat 200 kW building load
- **THEN** unmanaged charging adds 600 kW from 6 to 8 pm (peak 800 kW), and managed charging spreads 1,200 kWh over 12 hours at 100 kW (peak 300 kW)

#### Scenario: Dwell across midnight and DST
- **WHEN** a dwell window runs 10 pm to 5 am and includes the fall-back night
- **THEN** the window spans 7 clock hours but 8 elapsed hours that night, and charging energy is computed from the 8 elapsed hours

#### Scenario: Managed charging lowers the peak
- **WHEN** unmanaged charging adds 600 kW at 5 pm on top of the building peak
- **THEN** managed charging shows a lower monthly peak and the demand-charge difference in dollars

### Requirement: Verification
Unmanaged charging profiles SHALL match hand-computed fixtures exactly, and managed charging peaks SHALL be no higher than the unmanaged peak and SHALL equal the threshold method's result on the same constraints, checked on at least 3 fixture fleets.

#### Scenario: Managed never worse
- **WHEN** CI runs the fixture fleets
- **THEN** every managed monthly peak is at or below the unmanaged peak

### Requirement: Headroom check
The tool SHALL compare each scenario's added EV charging kW at the site's maximum-demand time, multiplied by 125% as a continuous load, with the service headroom from `electrify/service-headroom` when available, and SHALL flag scenarios that exceed it.

#### Scenario: Exceeds service
- **WHEN** unmanaged charging would exceed the estimated headroom
- **THEN** the scenario is flagged "likely needs a service upgrade; ask your electrician and utility"
