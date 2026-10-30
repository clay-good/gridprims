## Purpose

Tells a commercial or industrial customer how much capacitor correction would raise their power factor to a target, and what the current low power factor is costing them on their own tariff.

## ADDED Requirements

### Requirement: Correction sizing
Given real power (kW) and either a measured power factor or measured reactive power (kVAR) or apparent power (kVA), and a target power factor, the tool SHALL compute the reactive correction needed in kVAR as kW × (tan(arccos(PF now)) − tan(arccos(PF target))), and SHALL show apparent power before and after in kVA and the current reduction in amps at an entered voltage.

#### Scenario: Correcting 0.78 to 0.95
- **WHEN** load is 500 kW at 0.78 power factor and the target is 0.95
- **THEN** the correction needed is 236.8 kVAR, apparent power falls from 641.0 kVA to 526.3 kVA, and the formula is shown

#### Scenario: Target below current
- **WHEN** the target power factor is lower than the measured one
- **THEN** the tool says no correction is needed and does not return a negative kVAR

### Requirement: What the low power factor costs
When a tariff is selected, the tool SHALL compute the power-factor charge under that tariff's rule (billing demand scaled by target ÷ actual, kVA billing, or a per-kVAR charge, as supported by `load/bill-explainer`), the charge after correction, and the monthly and annual difference. It SHALL state that the saving is the tariff's power-factor effect only and excludes equipment, installation, and any loss reduction.

#### Scenario: Billing-demand adjustment removed
- **WHEN** a tariff adjusts billing demand to a 0.90 power factor, metered demand is 500 kW at 0.78 power factor, and the demand charge is $18.00 per kW
- **THEN** billing demand is 576.9 kW, the power-factor penalty is 76.9 kW or $1,385 a month, and correcting to 0.95 removes it

### Requirement: Measured power factor where the file has it
When the loaded file carries kVAR or kVA channels, the tool SHALL compute power factor per interval and SHALL offer the billing month's demand-setting interval and its load-weighted average as the basis, naming which one each result uses. Otherwise power factor SHALL be a user input, and the result SHALL say so.

#### Scenario: No reactive data
- **WHEN** the file has only kW or kWh
- **THEN** the tool asks for a power factor, suggests reading it from a bill or a meter, and labels the result as based on an entered value

### Requirement: Screening label and standard sizes
Results SHALL carry the screening label and SHALL state that a capacitor bank's size, stages, and placement, and any harmonic or resonance risk, are an electrical engineer's decision. Where a bank size is suggested, it SHALL be the next size up from a public-domain list of standard ratings, cited, or left to the user when no public list covers it.

#### Scenario: Next standard size
- **WHEN** the computed need is 236.8 kVAR
- **THEN** the tool names the next larger standard bank rating from its cited list and says the final design is the engineer's call

### Requirement: Verification
The tool SHALL reproduce at least two published power-factor correction worked examples (utility or state energy-office guidance, cited) within 1 kVAR, and the tariff effect SHALL reuse the verified bill engine.

#### Scenario: Published example
- **WHEN** CI runs the stored published examples
- **THEN** every kVAR figure matches within 1 kVAR
