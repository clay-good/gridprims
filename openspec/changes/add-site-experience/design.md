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

### D7. Trust pages generated from the record
Methods, changelog, sources, review status, and the corrections log are rendered from manifests, the dataset registry, `docs/review-signoffs.md`, and `docs/corrections.md`, so they cannot drift from what ships. Alternative: hand-written pages. Rejected: they go stale.

## Risks / Trade-offs

- **Two doors split attention.** Mitigation: one command bar serves both; measure clicks per lane in aggregate logs only.
- **Feeds and sitemaps add build surface.** Mitigation: generated from the same registry, covered by snapshot tests.
