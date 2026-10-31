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

## Bill check (`household.bill-totals.check`)

Price your bills from the kWh printed on them, line by line, and see how they compare with what you paid.

Version 0.1.0 · experimental · validation level 1, self-checked

| Input | Name | Unit | Range | Example |
|---|---|---|---|---|
| Billing periods | `periods` |  |  | 2026-03-01 to 2026-03-30, 800 kWh, paid $131.40 |
| Tariff | `tariff` |  |  | {"fixedMonthly":10,"seasons":[{"name":"all year","from":"01-01","tiers":[{"upTo":500,"rate":0.12},{"rate":0.15}]}]} |
| Split a period that crosses a season by days | `prorate` | choice | `yes`, `no` | yes |

| Output | Name | Unit | Rounding |
|---|---|---|---|
| Computed bill | `total` | $ | 2 decimals |
| Effective price | `effectivePrice` | ¢/kWh | 2 decimals |
| Paid minus computed | `difference` | $ | 2 decimals |
| Paid minus computed, percent | `differencePct` | % | 1 decimals |

**Method.** Check the periods first (overlaps, duplicates, periods over 45 days, a month that reads like an extra digit, negative kWh). Then price each period on the tariff: the fixed charge, each tier's kWh at its rate, and the minimum bill, in exact micro-dollars rounded to the cent line by line. A period that crosses a season splits its kWh and tier allowances by days. Time-of-use bills are priced from the kWh in each period as the bill prints them.

**Sources.**

- OpenEI Utility Rate Database (URDB), snapshot 2026-10, Energy rate structure, weekday and weekend schedules, fixed and minimum charges (https://openei.org/wiki/Utility_Rate_Database)
- OpenEI, Utility Rates API documentation, version 7, Field definitions: energyratestructure (rate, adj, max, unit), fixedchargefirstmeter, mincharge (https://openei.org/services/doc/rest/util_rates/?version=7)

**Known limits.**

- Taxes, local fees, and riders that the tariff data leaves out are not included, so a real bill is usually higher.
- Time-of-use energy is priced only from the kWh in each period as the bill prints them; a tiered time-of-use rate cannot be priced from totals.
- Demand charges need meter data and are not priced here.
- Export credits for net-metered months are not modeled; such a month prices only the charges that do not depend on kWh.
