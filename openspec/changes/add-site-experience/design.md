## Context

Visual contract: `DESIGN.md` (road-sign direction, chosen 2026-10-29). Product record: `PRODUCT.md`. Audience evidence: `docs/research/09`. Hosting: static assets on Cloudflare Workers (foundation design D4), which serve a `_redirects` file and custom headers without server code.

## Goals / Non-Goals

**Goals:** the right tool within one screen from the home page on a 360 px phone; every page findable and citable; trust shown, not claimed.

**Non-Goals:** marketing pages, accounts, or personalization.

## Decisions

### D1. Command-first home with two doors
The home page leads with the command bar and two lanes of tool cells: For your home (check my bill, is my use high, cheapest plan on my data, find my utility, cleanest hours) and For your work (load and bill workbench, utility and plant data, hourly emissions, data library, agent server).

| Alternative | Why not |
|---|---|
| Marketing hero with a headline and a call to action | Delays the answer; the product is the tools. |
| One grid of every tool | Households must sort through engineering tools first. |
| Audience picker that hides the other door | Many people are both (a facility manager at work, a customer at home). |

### D2. URL scheme keyed by stable ids
`/tools/<domain>/<group>/<operation>/`, `/utility/<eia-id>-<slug>/`, `/plant/<eia-plant-code>-<slug>/`, `/region/ba/<code>/`, `/region/state/<xx>/`, `/region/egrid/<code>/`, `/data/<dataset-id>/`, `/learn/<slug>/`, `/learn/get-your-data/<eia-id>-<slug>/`. The id makes the URL survive renames; the slug is for readers.

Alternative: slug only. Rejected: utilities rename and merge, and EIA ids are the join key everywhere else.

### D3. Redirects as a generated static file
When a slug changes or an entity merges, the build adds a permanent redirect to the generated `_redirects` file. Alternative: a Worker route that looks up old URLs. Rejected: server code for a static job.

### D4. Sitemap dates come from data
`lastmod` is the newest as-of date of the data a page shows, or the tool version date, never the build date. Alternative: build date. Rejected: tells search engines every page changed weekly when it did not.

### D5. One static social card per section
Six hand-made 1200 × 630 PNG cards (home, Bills, Data, Carbon, Grid, Learn), committed with their source. Alternative: per-page images rendered at build. Rejected: rendering text to PNG needs a font rasterizer we would have to write and maintain.

### D6. Translation-ready now, Spanish in phase 2
All copy lives in per-locale string files (JSON keyed by message id, with ICU-style plural and select forms evaluated by our own small formatter). Chosen by the owner on 2026-10-29. `docs/research/09` recommends Spanish at launch (2.7% of households are Spanish-speaking with limited English; Texas regulators require Spanish customer materials), so the plan revisits this at the phase 1 review with the value log.

| Alternative | Why not now |
|---|---|
| Spanish at launch | Doubles copy review before launch; deferred by the owner. |
| gettext `.po` files | Needs a parser for a second format; JSON is native. |
| Machine translation at runtime | Third-party service and unreviewed text. |

### D7. A simplicity budget, enforced by the build
The visitor surface has fixed limits (6 nav sections, 5 cells a lane, 5 visible inputs and one chart on a first screen, nothing interrupting arrival), and a new tool reaches the home page only by replacing one. The limits are in the build, not in anyone's judgment, because 22 changes of planned capability will otherwise arrive as 22 things on a page.

| Alternative | Why not |
|---|---|
| Trust taste to keep it simple | Every individual addition looks reasonable; the sum is the clutter that makes free tools unusable. |
| Add a navigation layer as the tool count grows | Depth hides things from the people who need them most; the command bar and the catalog already serve finding. |
| No limit, just good defaults | A limit that fails a build is the only kind that survives a backlog. |

### D8. The limits page is generated, and it ships before the tools
Methods, changelog, sources, review status, the corrections log, and the limits page are rendered from manifests, the dataset registry, CI results, `docs/review-signoffs.md`, `docs/corrections.md`, and a curated cannot-do list. The limits page lands in phase 0, before any tool ships, because a tool that ships before the page describing its limits has already overstated itself.

| Alternative | Why not |
|---|---|
| A hand-written disclaimer page | Goes stale the first week, and the staleness is invisible to the reader. |
| A disclaimer in the footer only | Nobody reads it, and it cannot carry per-tool validation status. |
| Wait for validation before publishing limits | Backwards: the page is most needed exactly when least is validated. |

## Risks / Trade-offs

- **Two doors split attention.** Mitigation: one command bar serves both; measure clicks per lane in aggregate logs only.
- **Feeds and sitemaps add build surface.** Mitigation: generated from the same registry, covered by snapshot tests.
