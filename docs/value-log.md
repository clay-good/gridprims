# Value log

One generated entry a month (plan-launch-and-value-proof D3). Newest first. Nothing here is estimated: a measure the pipeline cannot read says so.

## 2026-11

Generated 2026-11-01 by `node pipeline/value-log.mjs`.

| Measure | Value | Read from |
|---|---|---|
| Tools by validation level | unvalidated 0, self-checked 13, cross-checked 9, field-verified 0 | tool manifests |
| Datasets tracked, and late | 25 tracked, 1 late | the continuity ledger |
| Published pages | 18,043 | data/curated/published-urls.json |
| Agent evaluation | 31 of 31 requests reproduce their recorded values | mcp/eval/requests.mjs, replayed |
| Spec tasks done | 320 of 463 | openspec/changes/*/tasks.md |
| Search-console impressions and clicks | not yet measured | needs a search-console export the pipeline does not receive |
| Tool-page and download requests | not yet measured | needs Cloudflare's aggregate logs, which the pipeline does not read yet |
| GitHub clones, stars, and MCP issues | not yet measured | needs the repository to be public |
| Problem reports and median time to fix | not yet measured | counted once reports arrive as issues |
| Citations and practitioner endorsements | not yet measured | recorded by hand as they are found; none recorded yet |

**Phase 0 exit:** not met: Foundation, MCP, and shell tasks verified.

- Not met: Foundation, MCP, and shell tasks verified (openspec tasks of establish-platform-foundation, add-local-mcp-server, and add-site-experience)
- Met: Egress and no-network tests present (verify/tests/browser/privacy.test.mjs and verify/tests/mcp/security.test.mjs)
- Met: A fresh clone runs everything with only Node.js (package.json declares no dependencies)
- Met: The contribution rules exist (CONTRIBUTING.md)
- Met: The limits page ships (data/curated/published-urls.json)

**Launch-ready checklist by tool**

| Tool | Items met | Not met |
|---|---|---|
| `calc.energy-units.convert` | 5 of 5 | — |
| `calc.energy-units.emissions` | 4 of 5 | Stable manifest (stability is experimental) |
| `calc.power-factor.correct` | 4 of 5 | Stable manifest (stability is experimental) |
| `calc.transformer.size` | 3 of 5 | Stable manifest (stability is experimental); An independent worked example passes (own examples only) |
| `calc.storage.basics` | 3 of 5 | Stable manifest (stability is experimental); An independent worked example passes (own examples only) |
| `calc.cost.lcoe` | 4 of 5 | Stable manifest (stability is experimental) |
| `calc.line-rating.ampacity` | 4 of 5 | Stable manifest (stability is experimental) |
| `ratepayer.revenue-requirement.explain` | 3 of 5 | Stable manifest (stability is experimental); An independent worked example passes (own examples only) |
| `electrify.service-headroom.check` | 4 of 5 | Stable manifest (stability is experimental) |
| `electrify.backup-power.size` | 3 of 5 | Stable manifest (stability is experimental); An independent worked example passes (own examples only) |
| `reliability.outage-log.indices` | 3 of 5 | Stable manifest (stability is experimental); An independent worked example passes (own examples only) |
| `household.bill-totals.check` | 3 of 5 | Stable manifest (stability is experimental); An independent worked example passes (own examples only) |
| `household.usage-benchmark.compare` | 4 of 5 | Stable manifest (stability is experimental) |
| `carbon.load-shift.estimate` | 3 of 5 | Stable manifest (stability is experimental); An independent worked example passes (own examples only) |
| `weather.change.explain` | 4 of 5 | Stable manifest (stability is experimental) |
| `grid.large-load.take-or-pay` | 3 of 5 | Stable manifest (stability is experimental); An independent worked example passes (own examples only) |
| `grid.large-load.context` | 3 of 5 | Stable manifest (stability is experimental); An independent worked example passes (own examples only) |
| `lines.midspan-clearance.check` | 4 of 5 | Stable manifest (stability is experimental) |
| `lines.attachment-height.find` | 3 of 5 | Stable manifest (stability is experimental); An independent worked example passes (own examples only) |
| `interconnect.minimum-load.screen` | 3 of 5 | Stable manifest (stability is experimental); An independent worked example passes (own examples only) |
| `interconnect.process.route` | 3 of 5 | Stable manifest (stability is experimental); An independent worked example passes (own examples only) |
| `interconnect.fast-track.screens` | 3 of 5 | Stable manifest (stability is experimental); An independent worked example passes (own examples only) |
