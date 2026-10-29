---
name: gridprims
description: The US power grid's math, files, and public data in one free tab. Answers posted like road signs.
colors:
  # Light theme (default when the OS states no preference). Dark values in "## Colors".
  pavement: "#f3f5f2"
  panel: "#ffffff"
  raise: "#e9eee9"
  ink: "#121a15"
  muted: "#4b5850"
  line: "#c5cec7"
  field-border: "#76837b"
  guide-green: "#00704a"
  guide-text: "#005c3d"
  service-blue: "#1d4f91"
  learn-brown: "#6b4226"
  work-zone-orange: "#f07b21"
  work-zone-text: "#9a3d00"
  warning-yellow: "#ffcd00"
  warning-text: "#7a5b00"
  stop-red: "#b3261e"
  ok-green: "#17693c"
  legend-white: "#ffffff"
  legend-black: "#111111"
  focus: "#1d4f91"
  series-measured: "#00704a"
  series-whatif: "#eb6834"
  fuel-nuclear: "#6250d6"
  fuel-coal: "#9a4f16"
  fuel-gas: "#eb6834"
  fuel-hydro: "#2a78d6"
  fuel-wind: "#1baf7a"
  fuel-solar: "#eda100"
  fuel-storage: "#d55181"
  fuel-other: "#8a8f8b"
typography:
  display:
    fontFamily: "Overpass, system-ui, sans-serif"
    fontSize: "2.5rem"
    fontWeight: 800
    lineHeight: 1.05
    letterSpacing: "-0.01em"
  headline:
    fontFamily: "Overpass, system-ui, sans-serif"
    fontSize: "1.75rem"
    fontWeight: 700
    lineHeight: 1.15
  title:
    fontFamily: "Overpass, system-ui, sans-serif"
    fontSize: "1.25rem"
    fontWeight: 700
    lineHeight: 1.25
  body:
    fontFamily: "Overpass, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "Overpass, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 600
    lineHeight: 1.3
    letterSpacing: "0.01em"
  data:
    fontFamily: "Overpass Mono, ui-monospace, monospace"
    fontSize: "0.875rem"
    fontWeight: 500
    lineHeight: 1.4
    fontFeature: "\"tnum\" 1, \"zero\" 1"
  answer-xl:
    fontFamily: "Overpass, system-ui, sans-serif"
    fontSize: "4rem"
    fontWeight: 800
    lineHeight: 1
    fontFeature: "\"tnum\" 1"
  answer-l:
    fontFamily: "Overpass, system-ui, sans-serif"
    fontSize: "3rem"
    fontWeight: 800
    lineHeight: 1
  answer-m:
    fontFamily: "Overpass, system-ui, sans-serif"
    fontSize: "2.25rem"
    fontWeight: 800
    lineHeight: 1
  answer-s:
    fontFamily: "Overpass, system-ui, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 800
    lineHeight: 1.1
  answer-xs:
    fontFamily: "Overpass, system-ui, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 800
    lineHeight: 1.2
rounded:
  field: "6px"
  sign: "10px"
  pill: "999px"
spacing:
  s1: "4px"
  s2: "8px"
  s3: "12px"
  s4: "16px"
  s5: "24px"
  s6: "32px"
  s7: "48px"
  s8: "64px"
components:
  answer-sign:
    backgroundColor: "{colors.guide-green}"
    textColor: "{colors.legend-white}"
    typography: "{typography.answer-xl}"
    rounded: "{rounded.sign}"
    padding: "24px 28px"
  screening-strip:
    backgroundColor: "{colors.work-zone-orange}"
    textColor: "{colors.legend-black}"
    typography: "{typography.label}"
    padding: "8px 16px"
  handoff-sign:
    backgroundColor: "{colors.service-blue}"
    textColor: "{colors.legend-white}"
    typography: "{typography.label}"
    rounded: "{rounded.field}"
    padding: "10px 14px"
  warning-chip:
    backgroundColor: "{colors.warning-yellow}"
    textColor: "{colors.legend-black}"
    typography: "{typography.label}"
    padding: "4px 10px"
  source-tab:
    backgroundColor: "{colors.legend-white}"
    textColor: "{colors.ink}"
    typography: "{typography.data}"
    rounded: "{rounded.field}"
    padding: "4px 8px"
  button-primary:
    backgroundColor: "{colors.guide-green}"
    textColor: "{colors.legend-white}"
    typography: "{typography.label}"
    rounded: "{rounded.field}"
    padding: "12px 18px"
    height: "44px"
  button-secondary:
    backgroundColor: "{colors.panel}"
    textColor: "{colors.ink}"
    typography: "{typography.label}"
    rounded: "{rounded.field}"
    padding: "12px 18px"
    height: "44px"
  input:
    backgroundColor: "{colors.panel}"
    textColor: "{colors.ink}"
    typography: "{typography.data}"
    rounded: "{rounded.field}"
    padding: "10px 12px"
    height: "44px"
  top-rail:
    backgroundColor: "{colors.guide-green}"
    textColor: "{colors.legend-white}"
    typography: "{typography.label}"
    height: "56px"
---

# Design system: gridprims.com

The visual and interaction contract for every page. When a page disagrees with this file, the page is wrong. When a new pattern is needed, add it here first, then build it. Product truth lives in [PRODUCT.md](PRODUCT.md); the direction contract lives in `.impeccable/surfaces/site-index-html.md`. Specs that depend on this file: `openspec/changes/establish-platform-foundation/specs/platform/app-shell` and `openspec/changes/add-site-experience/specs/site/*`.

This file was written as a template before any build, at the owner's request (2026-10-29). After the first build, regenerate it from the shipped CSS (`/impeccable document`) and reconcile any drift.

## Overview

**North star: public road signs for the public grid.** A highway guide sign is the most trusted piece of public information design in the country: one plain fact, huge and legible, in a color code everyone already knows, maintained by the public for the public. gridprims posts its answers the same way.

The world lends four things and only these: **type** (Overpass, descended from the highway-sign alphabet), **palette** (the federal sign color code), **density** (signs say one thing; tables beneath them say everything), and **one signature move**: the answer is posted as a guide sign, and every caveat and status uses the sign color-and-shape code. Layout, navigation, and controls stay the standard web ones. A page must read as a working tool first; the sign is never a costume.

Principles (unchanged in spirit from the first concept):

- **Answer first.** Every tool opens in a worked state with example values, answer on top as a sign: a big number with its unit and one plain sentence. Inputs next. Proof (method, sources, as-of dates) one tap away.
- **Feels like a toy, answers like an engineer.** Sliders move results live, files land with a satisfying receipt, numbers settle into place. Underneath, every result is cited, dated, and reproducible.
- **Ask, don't browse.** One command bar on every page. Plain words with numbers open the right tool with the numbers filled in.
- **Drop anything, anywhere.** Any page accepts a meter file and says, at the moment of the drop, that nothing is uploaded.
- **No submit buttons.** Inputs recompute on change. Over 100 ms, show progress and keep the old answer visible, marked as updating.
- **Never scroll sideways.** At 320 px nothing in the page scrolls horizontally. Wide tables and charts pan inside their own box.
- **Honest by construction.** Examples, samples, estimates, and stale data are labeled where they appear, using the work-zone orange strip.

Anti-references: dark dashboards with glowing neon accents; trading-terminal density on a household page; road-sign kitsch (shields as decoration, fake reflective gradients, arrows that point nowhere).

## Colors

The color strategy is **Committed**: guide-sign green owns the top rail and the answer sign on every page; everything else is a quiet pavement-and-white work surface. Every other hue is a sign color with one fixed meaning, used only for that meaning.

### The sign code

| Sign color | Token | Meaning on gridprims | Shape and pairing | Never used for |
|---|---|---|---|---|
| Guide green | `--guide` | The answer; the site shell; primary action | Rectangle sign, white legend | Decoration, chart series other than measured data |
| Work-zone orange | `--work-zone` | Screening estimate, example values, sample file, approximate, preview of a draft method, and never-yet-reviewed ("Review pending", "Unverified") | Full-width strip under the answer, black legend, diamond glyph | Errors, warnings, expired reviews |
| Warning yellow | `--warning` | Something once good that needs re-checking: stale data, an expired review ("Needs review"), a tariff out of date, a gap excluded, an ineligible rate | Chip with diamond glyph, black legend | Estimates or never-reviewed items (those are orange) |
| Service blue | `--service` | Handoffs to other tools and sites, links, focus ring | Rectangle sign with arrow, white legend | Body emphasis |
| Learn brown | `--learn` | Glossary terms, guides, "how to get your data" | Rectangle sign, white legend; dotted underline on glossary terms | Data |
| Regulatory white | `--panel` with `--ink` rules | Sources, citations, method, the parse receipt, facts tables | White panel, black 1px rules, mono text | — |
| Stop red | `--stop` | Errors: file refused, input invalid, data missing for a required field | Octagon glyph plus text | Negative numbers, cost increases |
| OK green | `--ok` | Checks passed: worked example verified, checksum matched | Check glyph plus text | The answer (that is guide green) |

Color never carries meaning alone: every chip and strip has a glyph and a text label, and each glyph shape is unique (rectangle, diamond, octagon, check).

### Light and night themes

The theme follows the OS setting (`prefers-color-scheme`); with no OS preference it is light, because most use happens in daylight at desks, on phones, and on paper. A saved user choice wins over the OS before first paint. Night is modeled on retroreflective signs at night: dark asphalt ground, the same sign fields, legends crisp but never glowing or blurred.

| Token | Light | Night (dark) |
|---|---|---|
| `--bg` (pavement) | `#f3f5f2` | `#111613` |
| `--panel` | `#ffffff` | `#1a201d` |
| `--raise` | `#e9eee9` | `#232b27` |
| `--ink` | `#121a15` | `#edf2ee` |
| `--muted` | `#4b5850` | `#a5b1aa` |
| `--line` (decorative rules) | `#c5cec7` | `#36423c` |
| `--field-border` (inputs, 3:1) | `#76837b` | `#7d8b83` |
| `--guide` (field) | `#00704a` | `#00704a` |
| `--guide-text` (green as text) | `#005c3d` | `#5fd39a` |
| `--service` (link text, focus) | `#1d4f91` | `#8db4ff` |
| `--service-field` | `#1d4f91` | `#1d4f91` |
| `--learn-text` | `#6b4226` | `#d9a77c` |
| `--learn-field` | `#6b4226` | `#6b4226` |
| `--work-zone` (field, black legend) | `#f07b21` | `#f07b21` |
| `--work-zone-text` | `#9a3d00` | `#ffa45c` |
| `--warning` (field, black legend) | `#ffcd00` | `#ffcd00` |
| `--warning-text` | `#7a5b00` | `#ffd84d` |
| `--stop` (text) | `#b3261e` | `#ff8a80` |
| `--ok` (text) | `#17693c` | `#5fd394` |
| `--focus` | `#1d4f91` | `#ffcd00` |

Contrast, computed 2026-10-29 (WCAG 2.2): every text token clears 4.5:1 on `--bg`, `--panel`, and `--raise` in its theme. Legends on sign fields: white on guide green 6.15:1, white on service blue 8.14:1, white on learn brown 8.63:1, black on work-zone orange 6.80:1, black on warning yellow 12.57:1, white on stop red 6.54:1. Input borders clear 3:1 against every surface (light 3.37–3.96, night 3.66–5.13). The focus ring clears 7:1 against `--bg` in both themes. The style lint recomputes these and fails below the thresholds.

### Chart colors

Validated with the dataviz palette validator (2026-10-29; adjacent pairs, OKLab ΔE×100).

| Role | Light | Night | Rule |
|---|---|---|---|
| Measured data (your load, published values) | `#00704a` | `#22a06b` | 2 px line, faint area fill at 12% |
| What-if (battery, shifted load, proposed rate) | `#eb6834` | `#e0612a` | 2 px line; the work-zone hue because a what-if is an estimate |
| Reference lines (tariff windows, grid peaks, thresholds) | `--muted`, dashed | `--muted`, dashed | 1 px, labeled directly |
| Sequential (heatmaps, carbon intensity) | one-hue blue ramp `#cde2fb` → `#0d366b` | same ramp, `#184f95` floor | lightest step means "near zero" |
| Diverging (above or below average) | blue ↔ red, gray midpoint `#f0efec` / `#383835` | | equal steps per arm; this red is a scale step, not the `--stop` token, and both arms are labeled with what they mean ("above average", "below average"), never with good or bad |

**Fuel palette** (fixed order, used for generation mix everywhere; color follows the fuel, never its rank):

| Slot | Fuel | Light | Night |
|---|---|---|---|
| 1 | Nuclear | `#6250d6` | `#9085e9` |
| 2 | Coal | `#9a4f16` | `#93512a` |
| 3 | Natural gas | `#eb6834` | `#e0612a` |
| 4 | Hydro | `#2a78d6` | `#3987e5` |
| 5 | Wind | `#1baf7a` | `#199e70` |
| 6 | Solar | `#eda100` | `#c98500` |
| 7 | Battery storage | `#d55181` | `#d55181` |
| — | Other (oil, geothermal, biomass, unknown) | `#8a8f8b` with 45° hatch | `#6f7671` with 45° hatch |

Natural gas shares its hex with the what-if series on purpose: the two never appear in one chart, because a generation-mix chart shows fuels and a what-if chart shows measured against what-if load. A chart that would need both uses the fuel palette and labels the what-if series directly.

Validator results: light passes every gate (worst adjacent CVD ΔE 9.1, normal-vision 17.2); night passes every gate. Wind and solar sit below 3:1 on the light panel, so generation charts always ship direct labels and the table view. "Other" is a textured neutral, always direct-labeled, and never a hue slot. Fuels beyond these fold into Other; no generated ninth hue.

## Typography

One family carries the product, as working tools should: **Overpass** (dual-licensed SIL Open Font License 1.1 and LGPL 2.1, from `RedHatOfficial/Overpass`; designed by Delve Withrington and others, descended from the Highway Gothic sign alphabet) for display, UI, and body; **Overpass Mono** for data. Both ship under the OFL option, recorded with their license text and SHA-256 per `platform/zero-dependency`. Two families, self-hosted, subset to Latin plus the symbols used (°, ², ³, ₂, →, ×, ÷, −, ±, ≤, ≥), `woff2` only, `font-display: swap`. Font budget: at most 4 files (Overpass 400 and 800 variable or static, Overpass Mono 500, Overpass Italic 400 only if needed) and at most 120 KB total. Fallback stack metrics are matched with `size-adjust` so swaps do not shift layout.

Fixed rem scale, not fluid, ratio about 1.2 for UI:

| Role | Size | Weight | Use |
|---|---|---|---|
| display | 2.5 rem | 800 | page titles on entity pages and the home page |
| headline | 1.75 rem | 700 | section heads |
| title | 1.25 rem | 700 | card and panel titles |
| body | 1 rem (16 px) | 400 | sentences; 1.5 line height; measure 60–72 characters |
| label | 0.875 rem | 600 | controls, chips, the top rail |
| data | 0.875 rem mono | 500 | units, timestamps, file names, citations, tables, the command bar |

**Answer ladder.** The answer number exists at exactly five sizes, never in between: 4, 3, 2.25, 1.5, 1.125 rem (answer-xl to answer-xs). xl is the primary answer at ≥ 768 px; l is the primary answer on phones; m is a secondary answer; s is a fact-strip value; xs is an inline result in tables and cards.

Rules: digits that line up use tabular numerals (`tnum`) and slashed zero in mono. Units sit beside the number at the label size, never inside it ("412" big, "kW" small, baseline aligned). Headings use `text-wrap: balance`. All-caps only for the two-letter-to-four-letter sign codes (CT, ERCOT, MWh is never uppercased beyond its standard form).

## Layout

- **Shell.** Green top rail (56 px): wordmark, section nav (Home, Bills, Data, Carbon, Grid, Learn), grid pulse (from phase 1; a small white sparkline with its as-of date, hidden below 768 px), theme toggle. Directly under it, the full-width command bar. Then the page. Footer: the ten trust pages (About, Methods, Privacy, Accessibility, Corrections, Changelog, License and how to cite, Sources and credits, Review status, Developers), the license line (gridprims text and data CC BY 4.0 unless a table says otherwise, code MIT), and the sister sites.
- **Grid.** 12 columns at ≥ 1024 px with 24 px gutters; 8 columns at 768–1023 px; 4 columns below 768 px with 16 px gutters. Max content width 1200 px; prose max 72 characters.
- **Breakpoints.** 360, 768, 1024, 1280. Must work from 320 px. Responsive changes are structural (columns collapse, side panels stack, tables pan), never fluid type.
- **Workbench split.** ≥ 1024 px: chart stage 8 columns, controls and results 4. Below: answer sign, then chart, then controls, then results, in that order. Sliders stick to the bottom of the viewport on phones while the chart is in view.
- **Entity route strip.** Under an entity page title, a one-line route shows where the entity sits: Utility → balancing authority → state (or Plant → operator → county → state). Each step is a link. The current entity is never shrunk into a miniature map.
- **Rhythm.** Spacing only from `--s1`…`--s8` (4, 8, 12, 16, 24, 32, 48, 64 px). More space above a heading than below it. Dense passages (tables, receipts) are followed by a quiet one.
- **Print.** A print stylesheet for reports and entity pages: light theme forced, top rail becomes a 1-line header with the URL and print date, answer sign keeps its green field (prints well in grayscale at 6.15:1), charts render as SVG, every link prints its URL, one page for tool reports.

## Elevation & Depth

Flat and tonal, like signs on posts: no drop shadows on content. Depth comes from surface steps (`--bg` → `--panel` → `--raise`) and 1 px rules. Two exceptions, both functional: overlays (command-bar results, menus, dialogs) carry one shadow `0 8px 24px rgba(0,0,0,.18)` (night `rgba(0,0,0,.5)`), and the sticky phone slider tray carries a 1 px top rule. No glass, no blur, no glow.

## Shapes

- Sign fields (answer sign, handoff sign, learn sign): 10 px radius, like a sign panel's rounded corners, with a 2 px inset border in the legend color at 30% opacity (the sign's border stripe).
- Fields and buttons: 6 px radius. Chips: pill.
- Glyphs (inline SVG, 16 and 20 px, 2 px stroke, drawn in-house): rectangle (info/guide), diamond (estimate, warning), octagon (error), check (passed), arrow (handoff), up and down arrows (change). No icon font, no third-party icon set.
- Proportional time bars: any time window (tariff periods, dwell windows, peak hours) is drawn on a true 24-hour strip, exact to the interval; no rounded or stylized widths.

## Components

| Component | Role | Spec |
|---|---|---|
| **Answer sign** | the payoff | Green field, white legend. Label line (title size), the number on the answer ladder with its unit, one plain sentence (body size, max 2 lines), and a **source tab** at the lower right: white tab, mono, "EIA-861 · 2025 · as of Oct 7, 2026". `aria-live="polite"`, announced once 500 ms after inputs settle. States: example (orange strip reads "Example values"), live, updating (number at 60% opacity with a thin progress rule on the sign's bottom edge), error (field stays green, legend replaced by what is missing and how to fix it). |
| **Screening strip** | the honesty line | Orange full-width strip directly under the answer sign, black legend, diamond glyph: "Screening estimate. Your utility's study is the final word." Also used for: Example values, Sample file, Review pending, Approximate (hourly data), Draft method. One strip per answer; several reasons stack in one strip separated by " · ". |
| **Handoff sign** | go deeper elsewhere | Blue field, white legend, arrow glyph: "Full storage design → REopt". Plain link, carries no user data. |
| **Command bar** | ask in plain words | Full-width under the rail; `⌘K`, `Ctrl+K`, `/` focus. Mono input. Results list groups Tools, Places (utilities, plants, regions), Data, Learn; each result previews the answer when inputs parsed ("12 MWh = 40.95 MMBtu"). Home page shows typed examples until focused. |
| **Parse receipt** | trust after a drop | White regulatory panel, mono, one row per fact (rows read, interval, quantity, unit, time zone, date range, gaps, duplicates, DST, parse ms). Every detected choice is a select or segmented control inline. Repairs show counts. Privacy line at top: "Read on this device. Nothing was uploaded." |
| **Dropzone** | empty state | Dashed 2 px `--field-border` box, guide-green on drag. Copy: "Drop a meter file or choose one" + "Green Button XML or CSV, utility CSV, Excel" + "Don't have one? How to download your data" (learn link). While dragging anywhere: full-page overlay "Drop it. Nothing leaves this tab." Enter opens the picker. |
| **Source stamp** | trust for data | Mono line or tab: publisher · dataset · data period · as of (published) · retrieved · license. Stale variant carries a warning chip. |
| **Warning chip** | check this | Yellow pill, diamond glyph, black legend, links to the detail. |
| **Glossary term** | define on first use | Dotted brown underline; on hover/focus/tap, a popover with a one-line definition and "More in Learn". First use per page only. The popover stays while hovered, closes on Escape without moving focus, and persists until dismissed (WCAG 1.4.13). |
| **Slider** | live what-if | Track in `--line`, fill and thumb in what-if orange, value and unit shown in mono beside it, 44 px hit area. Arrow keys step; Shift+arrow ×10; PageUp/PageDown ×10; Home/End limits. |
| **Segmented control** | 2–4 exclusive options | Radiogroup semantics; selected segment is guide green with white legend. |
| **Tool cell** | catalog entry | Same fixed furniture every time: section label (label size, `--muted`), tool name (title), the question it answers (body), "You need:" (none / a ZIP / bill totals / a meter file), and data as-of. 4 px left edge in `--guide` for every cell; sections are named in text, never coded by hue, so the sign colors keep their single meanings. |
| **Flag** | a finding | White panel, 4 px left edge in the meaning color (guide for insight, yellow for check), one sentence, link to the evidence on the chart. |
| **Fact strip** | entity summary | 4–6 values on answer-s with unit and label; each value links to its source stamp. Wraps 2-up on phones. |
| **Table** | the full record | Mono numerals, right-aligned numbers, no zebra stripes, no color in cells; 1 px rules every row; sortable headers are buttons with `aria-sort`; sticky header; first column sticky on phones; pans inside its own box. |
| **Toast** | confirm an action | Bottom center, `--ink` field with `--bg` legend, says what happened ("Copied", "Read 35,040 rows in 84 ms"), 4 s, never the only place information appears. |
| **Dialog** | report a problem, settings | Native `<dialog>`; payload preview in mono; focus trapped and returned. |

**State vocabulary (every interactive component):** default, hover (surface steps up one level), focus (3 px `--focus` outline, 2 px offset), active (pressed, surface steps down), selected (guide green), disabled (40% opacity plus `aria-disabled`, with the reason in a tooltip or adjacent text), loading (skeleton bars in `--raise`, never a spinner over content), error (stop-red text plus octagon glyph under the field, saying what to type instead), empty (teaches the next step; never "No data").

**Empty, loading, and error states by archetype:**

| Archetype | Empty | Loading | Error |
|---|---|---|---|
| Calculator | never empty: opens on the worked example | n/a (sub-100 ms) | field-level message; answer sign shows what is missing |
| File workbench | sample file loaded, orange "Sample file" strip, dropzone visible | parse progress bar with rows read and Cancel | refused file: what we saw, what we expected, link to "How to download your data" |
| Entity page | n/a (prerendered) | n/a | 404 lists close matches from the command index |
| Explorer | filters show the national view | skeleton table, size warning above 5 MB before fetching | shard failed: retry button and the direct CSV download link |

## Do's and Don'ts

**Do**
- Post one answer per sign. If a tool has two answers, the second goes on answer-m below the sign.
- Put every caveat in the orange strip or a yellow chip, in plain words, in the place it applies.
- Use the sign code consistently on every page. A color means the same thing everywhere.
- Label units at the label size beside the number; name the time zone once per chart ("Times in CT").
- Test both themes, 320 px, keyboard only, and print for every page.

**Don't**
- Don't use sign shapes or highway shields as decoration, or draw fake reflective gradients, glows, or road textures.
- Don't put more than one answer sign in a viewport.
- Don't use orange for errors or yellow for estimates.
- Don't color numbers by good or bad (red cost increases); say the direction in words and with an up or down arrow.
- Don't hard-code a color, radius, or spacing value in a component rule; use tokens.
- Don't use a dual-axis chart, a rainbow ramp, or a ninth fuel hue.
- No marketing superlatives, no emoji, no sound.

## Charts

- One scale per axis; every tick label is a value the chart reaches. Units in the axis title. Never two y-axes.
- Measured data is guide green with a faint fill; what-ifs are orange; references are dashed muted, labeled directly. Legends are present for two or more series; four or fewer are also direct-labeled.
- The most important point (the peak that set the bill, the record day) is emphasized and labeled directly.
- Every chart has a one-sentence summary and a "View as table" toggle. Time axes show local time with the zone named once.
- Charts of a year or more draw from a downsampled series that keeps every peak (min and max per pixel bucket).
- Hover and focus: crosshair with tooltip on lines and areas; per-mark tooltip on bars and cells; keyboard arrows move between points. Hit targets larger than marks.
- Heatmaps (day × hour) use the sequential blue ramp with a labeled scale; Canvas only above 10,000 cells, with the table view still available.

## Motion and delight

Motion explains change; it never decorates. Durations: `--fast` 150 ms, `--med` 220 ms, `--slow` 400 ms; easing `cubic-bezier(.2,.7,.2,1)`.

| Moment | Motion | Budget |
|---|---|---|
| Answer changes | the number settles digit by digit (tabular, no layout shift) | `--med` |
| File parsed | receipt rows appear in order; chart line draws left to right once | `--slow`, once |
| Slider moves | threshold line and shaded area follow the thumb at input rate; the savings number settles | `--med` |
| A flag is tapped | chart scrolls to and outlines the interval that set the charge | `--med` |
| Command bar on home | typed examples cycle until the bar is focused | stops on focus |
| Theme switch | instant; no animated crossfade | — |

Delight comes from speed and precision: the receipt that says "35,040 rows in 84 ms", the flag that jumps to the exact 15 minutes that cost $1,980, the sign that answers before you finish typing. `prefers-reduced-motion: reduce` makes every change instant.

## Copy voice

- Plain words from the user's side ("your peak", "what this battery saves"), not system words ("billing determinant set").
- Result sentences at reading grade 8 or below. Terms of art (4CP, load factor, ratchet) get a glossary term on first use per page.
- US number style: `$1,500`, `35,040 rows`, `12.5 MW`, `3:30 pm`, `May 26, 2026`.
- Disclaimers are one short line in the orange strip, not a wall at the bottom.
- All copy lives in manifests and string files, never inline in templates, so pages can be translated (Spanish is planned for phase 2).
- No marketing superlatives. No emoji.

## Accessibility and mobile gates

A page ships only if it passes all of these:
- WCAG 2.2 AA in both themes, including 3:1 for input borders and focus; visible focus on every control; full keyboard use including sliders, charts, and the dropzone.
- Targets at least 44 × 44 px for primary controls and 24 × 24 px minimum for any target.
- No horizontal page scroll at 320, 360, 768, 1024, and 1280 px; text zoom to 200% without loss.
- Every chart has a text summary and a table view; color never carries meaning alone.
- Entity pages work with JavaScript off; tools say plainly that they need JavaScript.
- `forced-colors: active` keeps sign fields legible (fields become system Canvas with a border; glyphs and labels carry meaning).
- First meaningful answer under 1.5 s on the reference mid-range phone over throttled 4G; fonts within the 120 KB budget.
