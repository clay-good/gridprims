# Bill engine cross-check against PySAM

The interval bill engine (`core/lib/interval-bill.mjs`) is checked against NREL PySAM 7.1.1's Utilityrate5 on 12 URDB rates, one for each charge type both engines support. CI runs it in `verify/tests/core/bill-crosscheck.test.mjs`.

| What | Where |
|---|---|
| Load | `verify/fixtures/bill/office-2018-hourly.csv`: 8,760 hourly kW for 2018, a synthetic office from the formula in `verify/tools/office-load.mjs` (peak 150 kW, 529,218 kWh) |
| Rates | Picked by `verify/tools/pysam-utilityrate5.py` from the published URDB snapshot, the first rate (by URDB id) of each charge type |
| Independent result | `verify/reference/pysam-utilityrate5-office.json`, each rate's 12 monthly bills from PySAM, which converts URDB with its own `UtilityRateTools` |
| Rule | Every monthly total within 0.5%, or the gap explained below |

**Result:** all 144 monthly bills agree within 0.08%. Eleven of the 12 rates match to the cent.

## Documented differences

| Charge | PySAM | gridprims | Effect on the fixture |
|---|---|---|---|
| Fixed charge in $ a day | Billed as 365 ÷ 12 = 30.42 days every month | Billed for the days in each calendar month (28 to 31) | Up to 0.08% a month; the year agrees to the cent |

## What PySAM cannot check

Neither PySAM nor this check covers power-factor billing or demand windows other than one interval of the file. Those are checked against hand computations and published tariff examples in `verify/tests/core/interval-bill.test.mjs`:
- **Power factor:** two cases, including Austin Energy's published 13.5 kW at 0.87 PF example.
- **Demand windows:** a 30-minute and a 60-minute window over 15-minute data.

The bill engine names coincident demand charges as unmodeled.
