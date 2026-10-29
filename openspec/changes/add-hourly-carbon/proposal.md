## Why

**Value up front:** drop the same meter file you used for your bill, and gridprims tells you your electricity emissions hour by hour, using the actual mix of your grid region in each hour you used power, compared side by side with the annual average most reports use today. It also shows how much of your use a solar array or clean-energy contract actually covers hour by hour, not just over the year. Free, private, and built on public-domain federal data, with two openly licensed (CC BY 4.0) datasets used for cross-checks and credited.

Why this matters now (`docs/research/05` §1):
- The GHG Protocol is revising Scope 2. In September 2026 its Independent Standards Board set a direction of two market-based methods: Method 1 with hourly matching, deliverability, and incrementality after a date still to be set, and Method 2 keeping the 2015 rules until then; a consolidated consultation follows in Q2 2027 and a final standard in Q4 2028 (`docs/research/06`). The consultation draft ranks location-based factors by the most detailed area, then the most frequent time interval, then consumption-based over production-based, among factors that are public, free, and from a credible source (verified against the draft, `docs/research/06`). EIA's hourly consumption-based intensity by balancing authority fits that ranking. Organizations want to see their hourly picture before rules arrive.
- EIA publishes hourly CO₂ by balancing authority, including a consumption-based intensity that accounts for imports, since July 2018. It is public domain. Almost nobody outside specialists knows it exists.
- Commercial hourly data costs around €6,000 a year per signal (Electricity Maps) and forbids resale; WattTime's free tier covers one region. No free tool applies hourly grid intensity to a user's own meter data.

## What Changes

- **Hourly location-based emissions** from an interval file: hourly CO₂ (lb and metric tons) using the user's balancing authority's consumption-based hourly intensity, the annual eGRID result beside it, and plain findings ("your evening peak hours were 18% dirtier than your average hour").
- **Hourly matching score:** add a solar profile, a contract profile, or a flat clean block and get the hourly matched share of load next to the annual matched share, labeled as a preview of a draft method, not a compliance claim.
- **Cleanest-hours guide:** for flexible loads (EV charging, pre-cooling, batch jobs), the typical cleanest and dirtiest hours by month in the user's region, from history, with shift estimates labeled as average-intensity (attributional) accounting.
- **Hourly emissions dataset:** EIA-930 hourly intensity by balancing authority, snapshotted and downloadable, with Singularity's Open Grid Emissions (CC BY 4.0) as a cross-check.

## Capabilities

### New Capabilities

- `carbon/hourly-emissions`: Hourly location-based emissions for a user's load with an eGRID comparison.
- `carbon/hourly-matching`: Hourly vs. annual matched share of load for clean supply profiles.
- `carbon/cleanest-hours`: Typical clean and dirty hours for shifting flexible load.
- `carbon/hourly-intensity-data`: The hourly intensity dataset, its method caveats, and downloads.

### Modified Capabilities

None.

## Non-goals

- Market-based Scope 2 accounting with certificates, contracts' legal terms, or registry data.
- Marginal emission rates (WattTime-style); we show average, consumption-based intensity and say so.
- Real-time or forecast intensity.
- Any claim of compliance with a GHG Protocol method that is not final.

## Impact

- Reuses the load workbench and interval series; adds a Carbon tab and MCP coverage through the existing meta-tools.
- Adds EIA-930 hourly data by balancing authority (about 66 regions × 8,760 hours per year since July 2018) to the data registry.
- Phase 1 (launch), per `plan-launch-and-value-proof`.
