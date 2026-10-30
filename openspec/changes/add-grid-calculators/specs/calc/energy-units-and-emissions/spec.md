## Purpose

Answers the most common energy questions, converting units and fuels and estimating emissions, with the exact constants and sources shown.

## ADDED Requirements

### Requirement: Tool ids
This capability SHALL publish two tools with three-segment ids per the project's id scheme: `calc.energy-units.convert` at `/tools/calc/energy-units/convert/` and `calc.energy-units.emissions` at `/tools/calc/energy-units/emissions/`. The capability's folder name SHALL NOT be used as a tool id.

#### Scenario: Ids are legal
- **WHEN** the build generates pages and MCP descriptions for this capability
- **THEN** it uses those two three-segment ids and those two URLs

### Requirement: Energy and fuel conversions
The converter SHALL convert among Wh, kWh, MWh, GWh, Btu, MMBtu, therms, joules, and fuel quantities (natural gas cubic feet, barrels of oil, short tons of coal) using EIA's published heat contents for fuels and NIST SI factors for pure unit conversions, naming each constant, its source, its year, and whether it is exact or an average. Results SHALL show 4 significant figures by default, and SI conversions SHALL match NIST SP 811 factors to 6 significant figures.

#### Scenario: MWh to MMBtu
- **WHEN** a user converts 12 MWh
- **THEN** the result is 40.95 MMBtu and the constant 3.41214 MMBtu per MWh is shown, attributed to the NIST SI derivation rather than to EIA

#### Scenario: Fuel heat content is an average
- **WHEN** a user converts 1,000 cubic feet of natural gas to Btu
- **THEN** the result is 1,036,000 Btu using EIA's 2025 average of 1,036 Btu per cubic foot, names the year, and says actual gas varies

### Requirement: Annual emissions from energy
Given MWh and a location (eGRID subregion or state), the tool SHALL compute CO₂, CH₄, N₂O, and CO₂-equivalent in metric tons using the eGRID total output rates (lb/MWh) and the global warming potentials eGRID's technical guide states for that edition, rounded to 0.01 metric ton, and SHALL point to the hourly carbon tools when the user has interval data. Results SHALL match eGRID's summary tables for the same subregion within 0.1%.

#### Scenario: Location-based estimate
- **WHEN** a user enters 1,000 MWh in an eGRID subregion
- **THEN** at a CO₂ rate of 800 lb/MWh the tool shows 362.87 metric tons of CO₂ (800,000 lb × 0.45359237 kg/lb), the eGRID edition, and a link to hourly analysis

### Requirement: The kWh-to-Btu constant is attributed to SI, not to EIA
1 kWh SHALL equal 3,412.14 Btu, shown as derived from the SI definitions (3.6 MJ ÷ 1,055.05585262 J/Btu, NIST). Where the page cites an EIA constant instead, it SHALL show EIA's own rounded 3,412 Btu/kWh.

#### Scenario: Constant attributed
- **WHEN** the converter shows the kWh-to-Btu constant
- **THEN** it reads 3,412.14 Btu attributed to the NIST SI derivation, and nothing on the page attributes that figure to EIA

