# Tools reference

Generated from the tool manifests by `node site/docs.mjs`. Do not edit by hand.

## Energy unit converter (`calc.energy-units.convert`)

Convert energy between kWh, MWh, Btu, therms, joules, and common fuels, with every constant and its source shown.

Version 0.2.0 · stable · validation level 2, cross-checked

| Input | Name | Unit | Range | Example |
|---|---|---|---|---|
| Amount | `value` | unit chosen in from | -1000000000000000 to 1000000000000000 | 12 |
| From | `from` | choice | `Wh`, `kWh`, `MWh`, `GWh`, `J`, `MJ`, `GJ`, `Btu`, `MMBtu`, `therm`, `ft3-natural-gas`, `short-ton-coal`, `bbl-distillate`, `bbl-residual`, `bbl-propane` | MWh |
| To | `to` | choice | `Wh`, `kWh`, `MWh`, `GWh`, `J`, `MJ`, `GJ`, `Btu`, `MMBtu`, `therm`, `ft3-natural-gas`, `short-ton-coal`, `bbl-distillate`, `bbl-residual`, `bbl-propane` | MMBtu |

| Output | Name | Unit | Rounding |
|---|---|---|---|
| Converted amount | `value` | unit chosen in to | 4 significant figures |

**Method.** Convert the amount to joules with its unit's definition, then from joules to the target unit. Fuels use EIA's published average heat content in Btu.

**Sources.**

- NIST Special Publication 811, Guide for the Use of the International System of Units, 2008, Appendix B.8, British thermal unit (IT) and kilowatt hour to joule (https://www.nist.gov/pml/special-publication-811)
- EIA, Heat Content of Natural Gas Consumed, Annual, 2025, US, delivered to consumers, Btu per cubic foot (https://www.eia.gov/dnav/ng/ng_cons_heat_a_EPG0_VGTH_btucf_a.htm)
- EIA, Monthly Energy Review, Appendix A, Table A1, approximate heat content of petroleum products (https://www.eia.gov/totalenergy/data/monthly/pdf/mer_A_FULL.pdf)
- EIA, Energy conversion calculators, 2026 estimates, Coal, electric power sector, Btu per short ton (https://www.eia.gov/energyexplained/units-and-calculators/energy-conversion-calculators.php)
- EIA, British thermal units (Btu), Energy Explained, Therm and MMBtu definitions (https://www.eia.gov/energyexplained/units-and-calculators/british-thermal-units.php)

**Known limits.**

- Fuel results use national averages; the gas or oil you buy can differ by a few percent.
- The coal figure is EIA's estimate for coal burned in power plants, not for home or industrial coal.
- Volumes and weights of fuels are not converted to each other except through their energy.
