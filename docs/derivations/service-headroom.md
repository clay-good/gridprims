# Service headroom by the measured-demand method

Used by `electrify.service-headroom.check` and `core/lib/service-headroom.mjs`.

**What it gives you:** how many amps are left on an existing service, from the demand your meter already recorded. It's a starting point for your electrician, not a permit calculation.

## The rule, by clause

We cite and paraphrase the code; we never quote it. Read the section yourself through [NFPA's free access](https://www.nfpa.org/freeaccess) (a free account is needed).

| What the tool does | Clause | Source of our reading |
|---|---|---|
| Existing load = the maximum demand from 1 year of data | 2023 NEC 220.87 | Mark C. Ode, *Electrical Contractor*, May 14, 2024, quoting the 2023 text |
| Or: at least 30 days of continuous recording of the highest 15-minute average kW, on the highest-loaded phase, while the building is occupied, including the larger of heating or cooling | 220.87, exception | Same |
| No 30-day option when the service has solar, wind, or any peak load shaving | 220.87, exception | Same; the TrueLoad guide and New York City's code read it the same way |
| 125% of the maximum demand plus the new load must not exceed the service rating | 220.87 | Same |
| 2026 edition: the section becomes 120.87 | 2026 NEC 120.87 | Mike Holt's 2026 table of contents; Minnesota's 2026 adoption review minutes. **Unverified** until read through NFPA, so it's on the limits page's unverified-claim register |

Two things are still open. The exact wording of the solar and peak-shaving bar differs between secondary sources: one quote could be read as barring both options. And no source says which edition first added the bar. Until the 2023 text is read directly, the tool withholds only the 30-day figure for such sites, and puts an inspector note on the 12-month figure.

## How the tool applies it

| Step | Rule |
|---|---|
| Resolution | Data must be 15-minute or finer. Hourly data is refused, because an hourly average hides the 15-minute peak. 1-, 3-, and 5-minute data is re-averaged into fixed 15-minute blocks; a block missing a reading is dropped |
| 12-month period | 12 consecutive calendar months, each with at least 95% of its intervals |
| 30-day period | At least 30 days in a row with no gap over 1 hour |
| kVA | kW ÷ power factor (a measured value, or the one you enter; the result at 0.90 is shown for comparison) |
| Amps | Single-phase: kVA × 1,000 ÷ V. Three-phase: kVA × 1,000 ÷ (√3 × V) |
| Headroom | Rating − 125% of demand in amps |

Utility meter data is the total for the service and assumes balanced phases. The 30-day option is based on the highest-loaded phase, so per-phase recordings replace the meter total when you have them.

## Checked against

- The spec's 480 V example: 120 kW at 0.95 on 400 A three-phase leaves 210.1 A (174.7 kVA).
- Two published examples, in `verify/reference/nec-existing-load-examples.json`: Mike Holt in EC&M (2014), and Charles R. Miller in *Electrical Contractor* (2011). Both print whole amps after rounding along the way: the EC&M example rounds 98.58 A up to 99 A, then prints 99 × 125% as 123 A. So the spec's 0.1 A tolerance can't be applied to their printed figures. We match every printed figure to the whole amp, and keep the exact values beside them.
