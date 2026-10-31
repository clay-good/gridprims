# Green Button field map

The Green Button (ESPI) reader in `core/intake/espi.mjs` reads only the elements below. Each is defined in the NAESB ESPI 4.0 schema, `espi.xsd`, which NAESB licenses under Apache-2.0. A copy is kept at `verify/reference/espi/espi-4.0.xsd`, from the Green Button Alliance's OpenESPI repository. Nothing here depends on buying the NAESB business-practice text: the schema's element and type definitions are enough.

CI checks this table against the schema in `verify/tests/intake/green-button-map.test.mjs`. Every element must be in the named parent type with the named type, and every listed code must be in that type's enumeration.

| Element | In | Schema type | Codes read | What the reader does |
|---|---|---|---|---|
| `uom` | `ReadingType` | `UnitSymbolKind` | 72, 38 | 72 (Wh) is energy and 38 (W) is demand. Other codes (gas, therms, money, reactive and apparent power) are skipped and named on the receipt |
| `powerOfTenMultiplier` | `ReadingType` | `UnitMultiplierKind` | | Scales every value by 10 to that power; values are never assumed to be watt-hours |
| `flowDirection` | `ReadingType` | `FlowDirectionKind` | 1, 19, 4 | 1 is delivered, 19 is received, and 4 is net. Each stays its own channel, never netted |
| `accumulationBehaviour` | `ReadingType` | `AccumulationKind` | 4 | Only 4 (delta data, interval readings) is read; cumulative register readings are skipped and named |
| `intervalLength` | `ReadingType` | `UInt32` | | The interval in seconds, checked against the readings' own durations |
| `tzOffset` | `TimeConfiguration` | `TimeType` | | Seconds east of UTC, which gives the file's zone |
| `dstOffset` | `TimeConfiguration` | `TimeType` | | Seconds added during daylight saving |
| `dstStartRule` | `TimeConfiguration` | `DstRuleType` | | A hex bitfield; the US rules (360E2000 and B40E2000) select a US zone |
| `dstEndRule` | `TimeConfiguration` | `DstRuleType` | | As above |
| `interval` | `IntervalBlock` | `DateTimeInterval` | | The block's span |
| `timePeriod` | `IntervalReading` | `DateTimeInterval` | | Each reading's start and duration |
| `value` | `IntervalReading` | `Int48` | | The reading, before the multiplier |
| `start` | `DateTimeInterval` | `TimeType` | | Seconds since 1970 in UTC |
| `duration` | `DateTimeInterval` | `UInt32` | | Seconds |

`LocalTimeParameters` is the feed element of type `TimeConfiguration`; the reader finds it by that name.
