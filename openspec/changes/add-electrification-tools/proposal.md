## Why

**Value up front:** before a school adds EV chargers, a shop adds a heat pump, or a homeowner adds a car charger, they can drop the meter file they already have and see how much room is left on their existing electric service under the measured-demand method the National Electrical Code allows, and what the new load would do to their peak and their bill under managed or unmanaged charging. The electrician and inspector still decide; gridprims brings them the numbers.

Why (`docs/research/05` §6 and §5; licenses confirmed in `docs/research/08`): the NEC's existing-load method (220.87 in the 2023 NEC, renumbered in 2026, reported as 120.87 and not yet verified) lets an electrician size added load from 12 months of maximum demand data, or, with conditions, 30 days of 15-minute readings, which is exactly what a Green Button file contains. Service upgrades are slow and expensive; avoiding an unnecessary one is a direct saving. EV fleets fail economically on demand charges when charging is unmanaged. No free tool connects a real meter file to either question.

## What Changes

- **Service headroom report:** peak 15-minute demand, converted to kVA and amps at the user's service voltage and power factor, the code's 125% factor applied, and remaining capacity against the service rating, with a printable report for the electrician.
- **EV fleet charging what-if:** add vehicles (count, kWh per day, charger kW, dwell window), compare unmanaged and managed charging against the building's load and tariff, and show peak and bill impact.
- **Added-load what-if:** add any hourly load shape the user supplies, or a typical heat-pump shape for their county (NLR End-Use Load Profiles, CC BY 4.0), and re-run peaks, bills, and headroom.
- **Backup power sizer:** critical load from a list or the meter file, the county's outage history from EAGLE-I data (ORNL, CC BY 4.0, 2014–2025), and the battery or generator size that would have covered 90% of past outages, with a handoff to REopt's resilience mode.

## Capabilities

### New Capabilities

- `electrify/service-headroom`: Existing-load headroom from interval data.
- `electrify/ev-fleet-charging`: Managed vs. unmanaged fleet charging on the user's load and tariff.
- `electrify/added-load`: Any user-supplied or typical load shape added to the meter data.
- `electrify/backup-power`: Battery and generator sizing from critical load and county outage history.

### Modified Capabilities

None.

## Non-goals

- Full NEC load calculations, conductor sizing, or permits (link to roughlogic.com).
- Reproducing NFPA text; sections are cited and paraphrased only.
- Detailed outage forecasting or address-level reliability (county data only).

## Impact

- Phase 2. Reuses the interval series, bill engine, and storage screen's dispatch helpers.
- Owns and registers two datasets: EAGLE-I county outage records (ORNL, CC BY 4.0, v4 covering 2014–2025) and county end-use load shapes from NLR End-Use Load Profiles (ResStock and ComStock, pinned release, CC BY 4.0), both packed in state shards. `add-household-bill-check` owns the separate whole-home residential shapes.
