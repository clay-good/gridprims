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

Every field cites its source with a `locator` (section, sheet, or screen number) and the `vintage` read (the version or effective date), because superseded copies of these rules circulate and differ. The ten federal Fast Track screens are in `federal/`, each cited to FERC's pro forma SGIP (as updated through 2018-08-27) and to NYISO's FERC-accepted OATT Attachment Z (effective 2014-12-05), whose stored captures agree on every threshold. Texas's three tests from 16 TAC § 25.211 are in `tx/`, labeled single-source because the Secretary of State's copy of the rule could not be reached. California's Rule 21 Screens D, G, J, M, and N are in `ca/`, each cited to PG&E's and SCE's tariffs. Ohio's Level 2 load-ratio and interrupting screens are in `oh/`, from the rule's own text. Hawaii's Rule 14H Screens 5, 9, and 11 are in `hi/`, cited to Hawaiian Electric's and Maui Electric's books. Other states come next (task 1.2).
