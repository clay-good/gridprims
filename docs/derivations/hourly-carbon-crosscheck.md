# Hourly carbon against Open Grid Emissions

Used by `verify/tests/pipeline/oge-cross-check.test.mjs` (add-hourly-carbon 3.1) and the hourly carbon tools in `core/lib/hourly-carbon.mjs`.

**What it gives you:** how far our hourly CO₂, from EIA's own hourly intensity, sits from an independent build of the same quantity, region by region, and why the big gaps exist.

## The two sources

| | EIA-930 (ours) | Open Grid Emissions (the check) |
|---|---|---|
| Publisher | U.S. Energy Information Administration, public domain | Singularity Energy, v0.8.0, [doi:10.5281/zenodo.22052851](https://doi.org/10.5281/zenodo.22052851), CC BY 4.0 |
| Emissions | Hourly generation by fuel × annual factors for coal, gas, and oil | Plant-level hourly data, measured (EPA CEMS) where it exists |
| Consumption-based | EIA's input-output model of interchange (de Chalendar et al., 2019) | OGE's own consumption model of the same interchange |
| Column compared | `CO2 Emissions Intensity for Consumed Electricity` | `consumed_co2_rate_lb_per_mwh_for_electricity` (not adjusted) |

Fixtures: `verify/reference/oge/{BA}-{year}.csv.gz`, written by `verify/tools/oge-fixtures.py`, which reads only each region's file out of the Zenodo zips with HTTP range requests. OGE's 2025 early release has no hourly carbon accounting files, so the typical-day check uses 2022 to 2024.

## Flat 1 MW load over 2024

One MWh in every hour both sources publish, priced on each.

| Region | Ours against OGE | Against OGE's adjusted rate |
|---|---|---|
| CISO | −2.5% | +9.6% |
| ERCO | +1.9% | +2.1% |
| PJM | −4.2% | −1.7% |
| MISO | +1.2% | +3.3% |
| ISNE | −15.5% | +0.3% |
| NYIS | +0.7% | +5.6% |
| BPAT | −33.9% | −29.8% |
| SOCO | −4.2% | +2.5% |

Six of eight regions are within 5%.

## Documented gaps over 10%

| Gap | Size | Why |
|---|---|---|
| `ISNE-2024` | −15.5% | New England burns a lot of wood and municipal waste for power. OGE's unadjusted rate counts that CO₂; EIA's method has factors for coal, gas, and oil only. Against OGE's adjusted rate, which takes biomass out, the gap is +0.3%. |
| `BPAT-2024` | −33.9% | Bonneville is mostly hydro, so almost all of the CO₂ in what it consumes comes in with imports. Its consumption-based figure is then set by how each model splits interchange among neighbors, and the two models split it differently: our production-based figure for BPAT is 63% below our own consumption-based one. Treat BPAT's hourly figures as uncertain to about a third. |
| `CISO-July` | up to 17.6% in one hour of the day | July evenings in California swing between solar, imports, and gas within the hour, and CAISO has geothermal and biomass that the two methods count differently (OGE's adjusted rate is 9.6% below its unadjusted one over 2024). The typical-day shape matches; individual evening hours differ most. |

ERCO and PJM July medians are within 4.0% and 8.9% in every hour of the day.

## What this means for a result

Our hourly figures follow EIA's published method exactly (every 2024 hour for five regions matches EIA's own value; `verify/tests/pipeline/eia-930-reference.test.mjs`). Where a region burns biomass or lives on imports, that method itself differs from a plant-level build, and the hourly emissions result says so in its method caveat.
