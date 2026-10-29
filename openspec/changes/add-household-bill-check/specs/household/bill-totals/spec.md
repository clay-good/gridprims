## Purpose

Lets a household check its bills from the totals printed on them, with no meter file, and see exactly how its tariff turns kWh into dollars.

## ADDED Requirements

### Requirement: Billing period entry
The user SHALL be able to enter 1 to 24 billing periods, each with start and end dates (or a month), kWh (optionally by TOU period as printed on the bill), and optionally the amount paid, and SHALL be able to pick a utility by ZIP code (via `data/utility-lookup`) or by name, then a residential tariff from the URDB snapshot, the manual form, or a supply-plus-delivery entry per `household/plan-finder`.

#### Scenario: Tariff from ZIP
- **WHEN** a user enters ZIP 78701 and picks Austin Energy
- **THEN** the residential tariffs for Austin Energy are listed with their URDB dates

### Requirement: No residential tariff on file
When URDB has no residential tariff for the utility, the tool SHALL open the manual tariff form with a link to the utility's tariff page.

#### Scenario: Co-op without URDB rates
- **WHEN** the chosen co-op has no residential tariff in URDB
- **THEN** the manual form opens with the co-op's tariff link

### Requirement: Entry checks
Input SHALL accept thousands separators, and SHALL flag overlapping periods, duplicate periods, periods longer than 45 days, monthly entries above 5,000 kWh as a possible typing error, and negative kWh (net metering, named as not modeled). Separate meters (for example an EV meter) SHALL be entered as separate accounts.

#### Scenario: Overlapping periods
- **WHEN** two entered periods overlap by 5 days
- **THEN** the tool flags both and asks which is correct before pricing

#### Scenario: Duplicate and long periods
- **WHEN** the same March period is entered twice and one period spans 62 days
- **THEN** the tool asks the user to remove the duplicate and confirm the 62-day period before pricing

#### Scenario: Possible typing error
- **WHEN** a month is entered as 9,400 kWh while the other months average 940 kWh
- **THEN** the tool asks whether 940 was meant, and prices nothing until the user confirms

#### Scenario: Net-metered month
- **WHEN** a period has −120 kWh
- **THEN** the tool says export credits are not modeled for this tariff and prices only the delivered energy it can, naming what is excluded

### Requirement: Price what totals can price
The bill engine SHALL price fixed, minimum, flat, tiered, and seasonal energy charges from totals to the cent. Time-of-use energy SHALL be priced only as an estimate per `household/plan-finder`, and demand charges SHALL be marked "needs meter data" with a link to the user's get-your-data guide. Nothing SHALL be estimated without a label.

#### Scenario: Tiered bill
- **WHEN** a tariff has a $10.00 monthly fixed charge, $0.12/kWh for the first 500 kWh, and $0.15/kWh above, and the period has 800 kWh in one season
- **THEN** the bill is $115.00 ($10.00 + $60.00 + $45.00), with each line shown

### Requirement: Season proration by day
When a billing period crosses a season or rate change, the engine SHALL split kWh and tier allowances in proportion to days in each part, name the method, and let the user turn proration off.

#### Scenario: Period crosses summer start
- **WHEN** a 30-day period of 900 kWh runs from June 15 to July 14 and summer rates start July 1
- **THEN** 480 kWh (16 days) are priced at the non-summer rate and 420 kWh (14 days) at the summer rate, and the method is named

### Requirement: Compare with what you paid
When the user enters the amount paid, the tool SHALL show the difference in dollars and percent and list likely causes in plain words (taxes and fees, riders and fuel adjustments missing from URDB, different period dates, estimated reads), and SHALL NOT call any difference a billing error.

#### Scenario: Paid more than computed
- **WHEN** the computed bill is $115.00 and the user paid $131.40
- **THEN** the tool shows +$16.40 (14.3%) and lists taxes, riders, and fuel adjustments as likely causes, with the tariff's unmodeled items named

### Requirement: Effective price
For each period and the year, the tool SHALL show the effective price in cents per kWh (amount ÷ kWh, from paid amounts when entered, otherwise computed), computed in exact decimal and rounded half-up to 0.01 cents, beside the utility's bundled average residential price from EIA-861 with its data year; for delivery-only utilities it SHALL show no average price and say why (`data/utility-pages`).

#### Scenario: Effective price
- **WHEN** a $115.00 bill covers 800 kWh
- **THEN** the effective price is 14.38 cents per kWh and the utility average is shown with "EIA-861, 2025"

### Requirement: Verification
The totals path SHALL reproduce, to the cent for modeled components, at least five published residential bill examples: typical-bill tables at stated kWh levels from utility tariff filings or regulator bill comparisons, and Texas EFL average prices at 500, 1,000, and 2,000 kWh, each priced with the TDU rates in force on the EFL's date. Sources SHALL be cited in the fixtures.

#### Scenario: EFL average price
- **WHEN** CI prices a stored EFL at 1,000 kWh
- **THEN** the average price matches the EFL's printed value to 0.1 cent per kWh
