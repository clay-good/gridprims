# data/curated/interconnect

Interconnection screen thresholds, one record per jurisdiction and screen (`add-interconnection-screens` design D4). Each record is checked by `pipeline/lib/curated.mjs` (primary sources, stored captures, checksums) and by `pipeline/lib/screen-records.mjs` (the schema below). A record that fails does not publish.

| Field | What it holds |
|---|---|
| `jurisdiction` | `federal` or a two-letter state code |
| `lastChecked` | The date the record was last checked against its source, `YYYY-MM-DD` |
| `fields.process` | The review process, such as Fast Track |
| `fields.screen` | The screen's number and name as the rule writes them |
| `fields.threshold` | The threshold, in the rule's words |
| `fields.testBasis` | What the threshold is measured against, such as the line section's annual peak load |
| `fields.whoAnswers` | `you`, `utility`, or `utility-model` |

Every field cites its source with a `locator` (section, sheet, or screen number) and the `vintage` read (the version or effective date), because superseded copies of these rules circulate and differ. None are entered yet: the federal procedures come first (task 1.2).
