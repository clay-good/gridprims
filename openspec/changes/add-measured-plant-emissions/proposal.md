## Why

**Value up front:** for the large fossil plants that carry continuous emission monitors, gridprims shows what they actually measured, hour by hour, instead of only what an annual average implies. And it answers a question we owe our own users: how close is the estimated hourly carbon intensity our carbon tools use to what the monitored plants actually emitted? We publish that error rather than hoping nobody asks.

Why now (`docs/research/13`, `01`):
- The federal clean-air markets program publishes hourly, unit-level measured carbon dioxide, sulfur dioxide, nitrogen oxides, and heat input in bulk files. Our research called it the single highest-value free dataset still missing from our list.
- Our hourly carbon tools rest on an estimate: hourly generation by fuel multiplied by **annual average** emission factors. That is the right public-domain choice, and it is also a known weakness we state on every result. Measured monitor data lets us put a number on it per region and year.
- Plant pages currently show annual estimated emissions from the emissions-factor database, which lags the generation data by years. Measured monthly totals are current and are the plant's own reported figures.

We are not rebuilding the agency's own query tools; we ship dated snapshots and the one comparison nobody else publishes.

## What Changes

- **Measured plant emissions:** monthly and annual measured carbon dioxide, sulfur dioxide, nitrogen oxides, and heat input per unit and per plant, on plant pages beside the estimated figures, with coverage stated plainly (monitors cover large fossil units in the trading programs, not every plant).
- **Estimated against measured:** for each region and year, the difference between the estimated hourly carbon intensity our tools use and the measured emissions of the monitored units in that region, published as a figure with its method, and linked from every hourly carbon result.
- **Peak-hour generation detail:** for a region's highest-demand hours, which monitored units were running and what they emitted, for reporters and researchers.

## Capabilities

### New Capabilities

- `emissions/measured-plant-emissions`: Monitored unit and plant emissions, their coverage, and downloads.
- `emissions/estimated-vs-measured`: The published difference between our estimated hourly intensity and measured emissions.

### Modified Capabilities

- `data/plant-pages`: gains the measured-emissions section this change's data feeds.
- `carbon/hourly-emissions`: its method caveat gains a link to the published difference.

Both are rendered by their owning capability from what this change provides; the requirements here describe what it must supply, and the owning changes are applied first.

## Non-goals

- Replacing the estimated hourly intensity in the carbon tools. The measured data covers only part of the fleet, so it is a cross-check and a plant-level fact, not the primary factor.
- Compliance, allowance, or trading analysis.
- Reproducing the agency's own interactive query tool.
- Attributing a region's emissions to a customer from monitored data; that stays with the consumption-based intensity in `carbon/hourly-emissions`.
- Air-quality, health, or dispersion modelling of any kind.

## Impact

- Phase 3, per `plan-launch-and-value-proof`, after the phase 1 carbon tools it checks.
- Adds the monitored-emissions dataset to the registry, aggregated at build time to monthly per unit and hourly per region, because the raw hourly national files are far too large to ship whole.
- The site build uses a free agency key for incremental refreshes; the key never reaches the browser or the local agent server. The keyless bulk download is the source for `build-data` in `add-local-mcp-server`, so anyone can rebuild the same files without a key, and the two paths are checked against each other.
