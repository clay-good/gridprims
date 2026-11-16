# Bill test vector

One case any bill calculator can run: a tariff, a load, and the bill a source independent of gridprims says it produces. `pipeline/lib/bill-vectors.mjs` checks every vector; one that fails does not publish.

| Field | Holds |
|---|---|
| `id` | A stable name, such as `fl-commission-2026-03-1000kwh` |
| `tariff` | `{format: "URPX", version: "v0.5.1", document}`: the tariff as URPX JSON-LD (LF Energy), with the version it targets |
| `load` | `{kind: "monthly", periods: [{start, end, kwh}]}` or `{kind: "interval", intervalMinutes, zone, start, kwh: [...]}` |
| `expected` | `{total: {amount, unit: "USD"}, lines: [{label, type, amount, unit: "USD"}]}`; the lines sum to the total |
| `tolerance` | `{amount, unit}`, in `USD` or `%` |
| `chargeTypes` | Exactly the types the expected lines exercise, from: fixed, tiered-energy, seasonal-energy, tou-energy, flat-demand, tou-demand, ratchet, power-factor, minimum-bill, rider |
| `provenance` | Where the expected bill came from (below) |

## Provenance

| `kind` | Needs |
|---|---|
| `commission-publication` | `document`, `date`, `page`, `utility`, `consumptionLevel` |
| `utility-typical-bill` | `document`, `date`, `utility`, `url` |
| `user-bill` | `period`, `entered`; the amounts only, with no account number, address, meter identifier, or bill document |
| `tariff-arithmetic` | `tariffSheet`, and `arithmetic` written out in full |

A vector whose expected bill came from gridprims' own engine is refused: a vector exists to catch our mistakes.

Not yet: SHACL validation of the URPX document against the URPX shapes, and the first release of vectors (`add-tariff-conformance-suite` tasks 2.1 and 2.3).
