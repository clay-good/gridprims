---
name: gridprims
description: The US power grid's math, files, and public data in one free tab. Every number engraved on a plate with its rating basis.
colors:
  # Light theme, the default. These are the normative values; the night column
  # lives in "## Colors" because it is a second set of values for the same tokens.
  bg: "#e9ebe8"
  panel: "#ffffff"
  raise: "#f2f4f1"
  panel-hover: "#f0f2ee"
  panel-active: "#e4e7e2"
  ink: "#17191a"
  muted: "#565b57"
  line: "#d2d6d1"
  field-border: "#6c726d"
  guide: "#222624"
  guide-hover: "#2e3330"
  guide-active: "#151816"
  guide-text: "#2b302d"
  signal: "#c0380f"
  signal-field: "#b8350e"
  signal-text: "#a93009"
  service: "#1f5496"
  service-field: "#1f5496"
  learn-text: "#6a4322"
  learn-field: "#6a4322"
  work-zone: "#f08a1c"
  work-zone-text: "#8c4000"
  warning: "#ffcd00"
  warning-text: "#75570a"
  stop: "#ad2318"
  ok: "#196b3c"
  focus: "#18406f"
  legend-white: "#ffffff"
  legend-black: "#131313"
  series-measured: "#222624"
  series-whatif: "#c0380f"
  heat-0: "#dfe3e6"
  heat-1: "#b9c3cc"
  heat-2: "#90a2b1"
  heat-3: "#688296"
  heat-4: "#41637c"
  heat-5: "#1c4461"
  shadow: "rgba(12,14,13,.16)"
typography:
  plate-number:
    fontFamily: "Archivo, system-ui, -apple-system, \"Segoe UI\", sans-serif"
    fontSize: "3.25rem"
    fontWeight: 700
    lineHeight: 0.95
    letterSpacing: "-0.035em"
    fontFeature: "tabular-nums slashed-zero"
  plate-number-wide:
    fontFamily: "Archivo, system-ui, -apple-system, \"Segoe UI\", sans-serif"
    fontSize: "4.25rem"
    fontWeight: 700
    lineHeight: 0.95
    letterSpacing: "-0.035em"
    fontFeature: "tabular-nums slashed-zero"
  plate-number-inline:
    fontFamily: "Archivo, system-ui, -apple-system, \"Segoe UI\", sans-serif"
    fontSize: "1.5rem"
    fontWeight: 700
    lineHeight: 0.95
    letterSpacing: "-0.035em"
    fontFeature: "tabular-nums slashed-zero"
  plate-unit:
    fontFamily: "Archivo, system-ui, -apple-system, \"Segoe UI\", sans-serif"
    fontSize: "0.9375rem"
    fontWeight: 500
    letterSpacing: "0"
  display:
    fontFamily: "Archivo, system-ui, -apple-system, \"Segoe UI\", sans-serif"
    fontSize: "1.875rem"
    fontWeight: 700
    lineHeight: 1.12
    letterSpacing: "-0.015em"
  tagline:
    fontFamily: "Archivo, system-ui, -apple-system, \"Segoe UI\", sans-serif"
    fontSize: "1.5rem"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "-0.02em"
  headline:
    fontFamily: "Archivo, system-ui, -apple-system, \"Segoe UI\", sans-serif"
    fontSize: "1.1875rem"
    fontWeight: 700
    lineHeight: 1.12
    letterSpacing: "-0.015em"
  title:
    fontFamily: "Archivo, system-ui, -apple-system, \"Segoe UI\", sans-serif"
    fontSize: "1.0625rem"
    fontWeight: 700
    lineHeight: 1.12
    letterSpacing: "-0.01em"
  subhead:
    fontFamily: "Archivo, system-ui, -apple-system, \"Segoe UI\", sans-serif"
    fontSize: "1rem"
    fontWeight: 700
    lineHeight: 1.12
  body:
    fontFamily: "Archivo, system-ui, -apple-system, \"Segoe UI\", sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.55
  body-small:
    fontFamily: "Archivo, system-ui, -apple-system, \"Segoe UI\", sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.55
  note:
    fontFamily: "Archivo, system-ui, -apple-system, \"Segoe UI\", sans-serif"
    fontSize: "0.8125rem"
    fontWeight: 500
    lineHeight: 1.5
  control:
    fontFamily: "Archivo, system-ui, -apple-system, \"Segoe UI\", sans-serif"
    fontSize: "0.8125rem"
    fontWeight: 600
    lineHeight: 1
  data:
    fontFamily: "\"Roboto Mono\", ui-monospace, Menlo, Consolas, monospace"
    fontSize: "0.875rem"
    fontWeight: 500
    fontFeature: "tabular-nums slashed-zero"
  legend:
    fontFamily: "Archivo, system-ui, -apple-system, \"Segoe UI\", sans-serif"
    fontSize: "0.6875rem"
    fontWeight: 600
    letterSpacing: "0.085em"
  band:
    fontFamily: "Archivo, system-ui, -apple-system, \"Segoe UI\", sans-serif"
    fontSize: "0.6875rem"
    fontWeight: 500
    letterSpacing: "0.06em"
  stamp:
    fontFamily: "Archivo, system-ui, -apple-system, \"Segoe UI\", sans-serif"
    fontSize: "0.625rem"
    fontWeight: 600
    letterSpacing: "0.08em"
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
  plate:
    backgroundColor: "{colors.guide}"
    textColor: "{colors.legend-white}"
    typography: "{typography.plate-number}"
    rounded: "{rounded.sign}"
    padding: "24px 24px 0"
  plate-label:
    textColor: "{colors.legend-white}"
    typography: "{typography.legend}"
  plate-number:
    textColor: "{colors.signal}"
    typography: "{typography.plate-number}"
  basis-band:
    backgroundColor: "{colors.guide-active}"
    textColor: "{colors.legend-white}"
    typography: "{typography.band}"
    padding: "12px 24px"
  top-rail:
    backgroundColor: "{colors.guide}"
    textColor: "{colors.legend-white}"
    typography: "{typography.note}"
    height: "56px"
  button-primary:
    backgroundColor: "{colors.signal-field}"
    textColor: "{colors.legend-white}"
    typography: "{typography.control}"
    rounded: "{rounded.field}"
    padding: "12px 18px"
    height: "44px"
  button-primary-hover:
    backgroundColor: "{colors.signal}"
    textColor: "{colors.legend-white}"
  button-secondary:
    backgroundColor: "{colors.panel}"
    textColor: "{colors.ink}"
    typography: "{typography.control}"
    rounded: "{rounded.field}"
    padding: "12px 18px"
    height: "44px"
  button-secondary-hover:
    backgroundColor: "{colors.panel-hover}"
    textColor: "{colors.ink}"
  button-secondary-active:
    backgroundColor: "{colors.panel-active}"
    textColor: "{colors.ink}"
  screening-strip:
    backgroundColor: "{colors.panel}"
    textColor: "{colors.ink}"
    typography: "{typography.note}"
    rounded: "{rounded.field}"
    padding: "12px 16px"
  validation-stamp:
    textColor: "{colors.muted}"
    typography: "{typography.note}"
  handoff:
    backgroundColor: "{colors.panel}"
    textColor: "{colors.ink}"
    typography: "{typography.control}"
    rounded: "{rounded.field}"
    padding: "10px 14px"
    height: "44px"
  input:
    backgroundColor: "{colors.panel}"
    textColor: "{colors.ink}"
    typography: "{typography.data}"
    rounded: "{rounded.field}"
    padding: "10px 12px"
    height: "44px"
  panel:
    backgroundColor: "{colors.panel}"
    textColor: "{colors.ink}"
    rounded: "{rounded.field}"
    padding: "16px"
  tool-cell:
    backgroundColor: "{colors.panel}"
    textColor: "{colors.ink}"
    typography: "{typography.title}"
    rounded: "{rounded.field}"
    padding: "16px"
  tool-cell-hover:
    backgroundColor: "{colors.panel-hover}"
    textColor: "{colors.ink}"
  chip:
    backgroundColor: "{colors.raise}"
    textColor: "{colors.muted}"
    typography: "{typography.legend}"
    rounded: "{rounded.field}"
    padding: "3px 8px"
  preview-stamp:
    backgroundColor: "{colors.raise}"
    textColor: "{colors.work-zone-text}"
    typography: "{typography.stamp}"
    rounded: "{rounded.field}"
    padding: "2px 6px"
  warning-chip:
    backgroundColor: "{colors.warning}"
    textColor: "{colors.legend-black}"
    typography: "{typography.control}"
    rounded: "{rounded.pill}"
    padding: "4px 10px"
---

# Design system: gridprims.com

The visual contract for every page, recorded from the shipped build (`site/styles/tokens.mjs`, `site/styles/site.css`, `site/templates/`, `site/ui/`). When a page disagrees with this file, the page is wrong. Product truth lives in [PRODUCT.md](PRODUCT.md); the direction contract lives in `.impeccable/surfaces/site-index-html.md`.

This file replaces the pre-build highway-guide-sign document (green fields, Overpass, the federal sign colour code). None of that ships. The tokens below were read out of the build on 2026-10-31, and `verify/gates/style.mjs` passes against them with zero errors.

## Overview

**Creative North Star: "Nameplate."** Every number arrives the way an equipment rating does: engraved on a machined plate, with its rating basis stamped along the lower edge of that same plate, permanent and checkable. The plate is not a decoration applied to a result; it is the only form a measured number is allowed to take here.

The world is a machined dark shell carrying light work surfaces. The rail and the plates are cut from the same near-black field (`guide`); the page body and its panels are the pale metal the dense numbers actually live on. One orange (`signal`) owns the measured value, the live section in the rail, and the primary action, and owns nothing else: on a full home page it is three marks. Type is self-hosted: Archivo for display and UI, Roboto Mono for data and measurement, with tabular lining figures and a slashed zero wherever digits have to line up. Small labels are engraved legends, uppercase at wide tracking in sizes well under the body size.

Depth is machining, not lighting. A plate is a 1px light edge on top, a 1px dark edge underneath, and a 1px/2px shadow; nothing else is raised. There are no bevels, no gradients, no glass, no glow, and no tinted greys anywhere in the shipped CSS. Status has four reserved colours with fixed meanings, and each one is carried by a glyph *and* a word, never by hue alone.

**Key Characteristics:**
- A measured number is always orange, always tabular, always on a dark plate, always above its basis band.
- One signal orange; everything else is machined neutral.
- Engraved legends: uppercase, 0.6875rem, 0.085em tracking, in `muted`.
- Flat by construction: hairline edges, one 1px/2px plate shadow, one overlay shadow, nothing else.
- Status reads without colour: glyph plus word, every time.
- Both themes are first-class; night is the same machining in a dark room, never a glowing dashboard.

## Colors

Machined neutrals in two themes, one saturated signal orange, and four reserved status colours that never do a second job.

The token names are inherited role names and some read oddly against this world. What they mean now:

### Primary
- **Plate Field** (`guide`): the machined field the whole shell is cut from. The top rail, the answer plate, the drag overlay. It is no longer a "guide sign green" of any kind; it is near-black graphite. `guide-hover` is its lit top edge and its hover state, `guide-active` its shadowed bottom edge and the basis band, `guide-text` the same graphite used as text on a light surface.
- **Signal Orange** (`signal`): the one accent. It paints the measured value on a plate, the underline of the live section in the rail, the link-hover and the caret, the selection highlight, and the hover border of a handoff. `signal-field` is the same orange as a filled field under a white legend (the primary button); `signal-text` is the darkened text-safe variant for orange words on a light surface. Nothing decorative is ever orange.

### Neutral
- **Work Surface** (`bg`, `panel`, `raise`): the three steps dense numbers live on — the page ground, the white panel, and the raised step used for chips and report previews. `panel-hover` and `panel-active` are the hover and pressed steps of the same metal.
- **Ink and Muted** (`ink`, `muted`): body text and secondary text. `muted` carries every engraved legend, caption, table head, and validation stamp.
- **Rules** (`line`, `field-border`): `line` is the decorative hairline between ruled rows, panels, and table cells; `field-border` is the stronger stroke an input or dropzone needs to clear 3:1 against every surface.
- **Legend White / Legend Black** (`legend-white`, `legend-black`): theme-invariant legends for text sitting on a field. White on `guide`, on `signal-field`, on `service-field`, on `learn-field`, on `stop`; black on `work-zone` and `warning`.

### Status (reserved meanings)
| Token | Meaning | Glyph + word |
|---|---|---|
| `work-zone` / `work-zone-text` | Screening estimate, example values, sample file, draft method, review pending, validation level 0 or 1 | Diamond + the reason, stamped in the single screening strip |
| `warning` / `warning-text` | Something once good that needs re-checking: stale data, an expired review, an out-of-date tariff | Diamond + word, on a pill chip |
| `stop` | Refusal or error: file refused, input invalid, required data missing | Octagon + what is missing and what to do |
| `ok` | Checked: cross-checked or field-verified evidence passed, checksum matched, nothing uploaded | Check + the evidence line |
| `service` / `service-field` | Handoffs and comparison series | Arrow + destination |
| `learn-text` / `learn-field` | Glossary and guides | Rectangle + term |

### Chart roles
`series-measured` is graphite (the measured truth is not accented); `series-whatif` is the signal orange, because a what-if is an estimate; `series-compare` is `service`, dashed. `heat-0` … `heat-5` is the one sequential ramp, lightest meaning near zero in light theme and the ramp inverting in night so the deep floor stays the low end. There is no fuel palette in this build; the previous eight fuel hues are gone and must not be reinvented without new tokens.

### Night theme
The theme follows `prefers-color-scheme`, light by default, and a saved choice wins before first paint (`THEME_SCRIPT` in `site/templates/layout.mjs`). Night is the same machining under less light: the fields stay theme-invariant so a white or black legend is valid in both themes, and only the surfaces, text, and text-safe variants move.

| Token | Night value |
|---|---|
| `bg` | `#141615` |
| `panel` | `#1f2221` |
| `raise` | `#282c2a` |
| `panel-hover` | `#262a28` |
| `panel-active` | `#313633` |
| `ink` | `#e9ebe8` |
| `muted` | `#a0a6a1` |
| `line` | `#343836` |
| `field-border` | `#767d78` |
| `guide-text` | `#c3cac5` |
| `signal` | `#ff7043` |
| `signal-text` | `#ff8255` |
| `service` | `#8fb6f2` |
| `learn-text` | `#d8a87c` |
| `work-zone-text` | `#ffa552` |
| `warning-text` | `#ffd84d` |
| `stop` | `#ff8d80` |
| `ok` | `#5fd394` |
| `focus` | `#ff8f63` |
| `series-measured` | `#c3cac5` |
| `series-whatif` | `#ff7043` |
| `heat-0` … `heat-5` | `#1c4461`, `#41637c`, `#688296`, `#90a2b1`, `#b9c3cc`, `#dfe3e6` |
| `shadow` | `rgba(0,0,0,.55)` |

`guide`, `guide-hover`, `guide-active`, `signal-field`, `service-field`, `learn-field`, `work-zone`, `warning`, `legend-white`, and `legend-black` are identical in both themes by design: a field keeps its legend.

### Named Rules

**The One Signal Rule.** `signal` paints the measured value, the live section in the rail, and the primary action. Nothing else. If a third orange mark appears in a viewport, one of them is wrong.

**The Full-Strength Rule.** A colour commits at full strength or not at all. The rail is a saturated field, never a tinted grey; data is never tinted for decoration; there are no alpha-blended brand washes. The only opacity in the system is the legible dimming of secondary legends on a plate (0.72–0.92).

**The Glyph-and-Word Rule.** Colour never carries meaning alone. Every status mark pairs a reserved colour with one of the five in-house glyphs *and* a word: diamond for estimate or stale, octagon for error, check for passed, arrow for handoff, rectangle for info.

**The Token-Only Rule.** No component rule contains a literal colour. `verify/gates/style.mjs` fails the build on any hex or colour function in a hand-written stylesheet, and recomputes every contrast pairing in both themes.

## Typography

**Display and UI Font:** Archivo, self-hosted variable 400–700 (`site/fonts/archivo-latin.woff2`, `font-display: swap`), declared as `Archivo` with `system-ui, -apple-system, "Segoe UI", sans-serif` behind it.
**Data Font:** Roboto Mono, self-hosted variable 400–500 (`site/fonts/roboto-mono-latin.woff2`), declared as `"Roboto Mono"` with `ui-monospace, Menlo, Consolas, monospace` behind it.

Neither family is loaded from Google or any CDN; the build ships both woff2 files itself, and `font-synthesis-weight: none` means no weight outside 400–700 exists. Archivo is a grotesque with flat terminals and tight negative tracking at display sizes — it behaves like stamped metal lettering. Roboto Mono carries every quantity, timestamp, file name, citation, and command-bar entry, with `tabular-nums slashed-zero` always on.

### Hierarchy

The ramp is fixed rem steps, not fluid type. It is denser than a conventional scale on purpose: a working page stacks many small engraved labels around a few very large numbers, and the middle of the ramp is deliberately narrow.

- **Plate number** (700, 3.25rem → 4.25rem at ≥768px, line-height 0.95, −0.035em, tabular + slashed zero): the measured value on a plate, in `signal`. The only type in the system above 2rem.
- **Plate number, inline** (700, 1.5rem): the same value when a plate collapses to one line below 720px.
- **Plate unit** (500, 0.9375rem): the unit beside the number, baseline-aligned, never inside it.
- **Display** (700, 1.875rem, 1.12, −0.015em): `h1`, the page title.
- **Tagline** (700, 1.5rem, 1.2, −0.02em; 1rem below 720px): the home page's one heading.
- **Headline** (700, 1.1875rem): `h2`, section heads.
- **Title** (700, 1.0625rem, −0.01em; 1rem on phones): a tool cell's name and the rail wordmark (−0.02em).
- **Subhead** (700, 1rem): `h3` and a panel's inline summary heading.
- **Body** (400, 1rem/1.55): sentences; prose caps at 72ch, a plate's sentence at 62ch, a validation stamp at 88ch.
- **Body small** (400, 0.875rem): a tool cell's question, field hints, field errors, captions, chart captions.
- **Note** (500, 0.8125rem): validation stamp, screening strip, footer, rail navigation (0.01em).
- **Control** (600, 0.8125rem/1): buttons and handoffs. The menu button and the plain-link button run 0.875rem.
- **Data** (500, 0.875rem mono, tabular + slashed zero): every number outside a plate, plus inputs, the command bar, receipts, and citation lists. Chart axes use 11px mono 500; a chart's highlight label 12px Archivo 600.
- **Legend** (600, 0.6875rem, 0.085em, uppercase, `muted`): the engraved legend. Every small label on a plate, a table head, a field label, a caption, a section marker, the command-bar label. The plate's own label is the same metrics in `legend-white` at 0.72 opacity.
- **Band** (500, 0.6875rem, 0.06em, uppercase; 0.625rem on phones): the basis band stamped along the plate's lower edge.
- **Stamp** (600, 0.625rem, 0.08em, uppercase; 0.75rem on phones): the PREVIEW mark on a tool cell. The chip runs 0.6875rem at 0.07em; the theme toggle 0.75rem at 0.06em.

### Named Rules

**The Engraved Legend Rule.** Small labels are uppercase at wide tracking in a size below the body size, in `muted` (or white at 0.72 on a plate). This is the world's native label form, and it is the *only* thing that may be set in it: a sentence, a value, or a navigation item never takes legend styling.

**The Tabular Rule.** Any digit that might line up with another digit is set with `tabular-nums slashed-zero` — plate numbers, table cells, receipts, inputs, axes. A number that shifts when it updates is a bug.

**The Unit-Beside Rule.** The unit sits beside the number at plate-unit or label size, baseline aligned, never inside the number and never the same size as it. Currency is the one inversion: `$` leads at unit size.

## Layout

- **Shell.** Dark top rail (min 52px, 56px of content): wordmark, six sections (Home, Bills, Data, Carbon, Grid, Learn), the optional grid pulse, theme toggle pinned right. Directly beneath it the command bar on `bg` with a 1px bottom rule, then `main`, then a hairline-topped footer.
- **Container.** `.wrap` is max 1200px centred with `--s4` side padding; `main` carries `--s7` of bottom padding.
- **Rhythm.** Spacing comes only from `--s1`…`--s8` (4, 8, 12, 16, 24, 32, 48, 64px). Headings take `--s6` above and `--s3` below; a panel's first heading loses its top margin.
- **Breakpoints, as the stylesheet actually sets them.** 480px (receipt rows collapse to one column), 719/720px (the phone first-screen block and the three-column ruled lane), 767/768px (the rail folds into a menu, the grid pulse appears, the plate number steps to 4.25rem, home lanes go two-up), 900px (the home proof becomes a plate-plus-figures grid). Must hold at 320px with no sideways scroll; wide tables pan inside `.table-wrap`.
- **Density.** Tool lanes are ruled index rows, not a grid of boxes: `border-top` on the list, `border-bottom` per row, no card chrome. At ≥720px a row is name / question / what-you-need in three columns; below 768px it becomes a two-column list of names and needs so both lanes start on a 360×640 first screen.
- **Phone first screen.** Below 720px the home proof plate collapses to one line — label, number, unit — and drops its sentence, its figures, and its own button. **It keeps the basis band.** The band moves to 0.625rem and stays stamped under the number.
- **Motion.** Tokens `--fast` 150ms, `--med` 220ms, `--slow` 400ms with `--ease` `cubic-bezier(.2,.7,.2,1)` are defined in `tokens.mjs`; the shipped component rules transition `background-color`, `border-color`, and `color` at 120ms `ease-out`. Theme switching is instant. `prefers-reduced-motion: reduce` kills every transition and animation.
- **Print.** Rail, command bar, theme toggle, and action rows are dropped; with a report open only the report prints; external links print their URL.

### Named Rules

**The Basis Band Rule.** A plate never ships without the band stamped along its lower edge: source, interval count, date range, as-of, validation. At every width, in every rendition, including the one-line phone plate. A measured number without its basis is the one thing this world refuses.

**The Ruled Index Rule.** Repeating navigational rows are ruled, not boxed. A card border around every item in a list is wrong here; one hairline between items is right.

## Elevation & Depth

Flat by construction. Depth is machining: surfaces step tonally (`bg` → `panel` → `raise`), everything is separated by 1px rules, and a plate reads as raised only because it carries a lit top edge and a shadowed bottom edge in its own family (`border-top: 1px guide-hover`, `border-bottom: 1px guide-active`) over a 1px/2px shadow. There are no bevels, gradients, glass, backdrop blur, or glow in the shipped stylesheet, and no second elevation level for content.

### Shadow Vocabulary
- **Plate** (`box-shadow: 0 1px 2px var(--shadow)`): the answer plate only. The whole of content elevation.
- **Overlay** (`box-shadow: 0 8px 24px var(--shadow)`): the two genuinely detached layers — the command-bar results list and the report dialog. These float above the page, so they are allowed to read as floating.
- **Focus ring** (`outline: 3px solid var(--focus); outline-offset: 2px`): on a plate or the rail the ring switches to `legend-white`. The ring clears 7:1 against `bg` in both themes and the gate enforces it.

### Named Rules

**The Two-Hairline Rule.** A raised surface is a light 1px top edge and a dark 1px bottom edge in its own colour family, and at most a 1px/2px shadow. If a surface needs more than that to read as raised, it is not raised; it is a different surface.

**The Detached-Only Rule.** The 0 8px 24px shadow is reserved for layers that actually leave the page — the command results and the dialog. Nothing anchored in the document flow gets it.

## Shapes

Three radii and nothing between them: **plate** (10px, `--r-sign`) for the answer plate; **field** (6px, `--r-field`) for everything a hand touches or a rule encloses — buttons, inputs, panels, chips, handoffs, the dropzone, the chart frame, the dialog; **pill** (999px, `--r-pill`) for the warning chip alone. A collapsed phone plate drops to field radius, because at that size it is a line, not a plate. The basis band squares its own corners (`border-radius: 0`) and bleeds to the plate's full width, so the plate reads as one machined piece rather than a card with a footer.

Borders are 1px (`line` for decorative rules, `field-border` for interactive strokes), 2px only for the dropzone's dashed edge and `forced-colors` outlines. Glyphs are in-house inline SVG on a 16px grid, 2px stroke, `currentColor`, five shapes with one meaning each: diamond, check, octagon, arrow, rectangle. No icon font and no third-party icon set.

## Components

### The Answer Plate (signature)
The payoff and the form the whole world is named for. Graphite field, plate radius, `--s5` padding with none at the bottom, hairline top and bottom edges, 1px/2px shadow, `overflow: hidden` so the band can bleed. Inside, in order: an engraved white label at 0.72 opacity; the measured number in `signal` at plate scale with its unit beside it; one plain sentence at 62ch and 0.92 opacity; then the basis band — `guide-active`, full-bleed, hairline-topped, uppercase at band metrics. States live on `data-state`: `example`, `live`, `refused` (label becomes the refusal, sentence carries the reason, a handoff goes to the limits page), `invalid` (octagon plus what is missing). `.sign.updating` drops the number to 0.55 opacity and keeps it visible.

### Validation Stamp
A `muted` note line directly beneath the plate, max 88ch: a check glyph in `ok` at validation level 2 or 3, a diamond in `work-zone-text` at level 0 or 1, then the level, its evidence, and a link to the limits page. Never absent, never collapsed.

### Screening Strip
The honesty line beneath the stamp, and deliberately *not* a hazard bar: a white panel with a 1px `work-zone` border at field radius, note type, a `work-zone-text` diamond, reasons joined with " · " strongest-first (screening label, unvalidated/self-checked, example values, review pending), and a report link. One strip per answer.

### Buttons
- **Shape:** field radius (6px), 44px minimum height, 12px/18px padding, control type.
- **Primary:** `signal-field` with a white legend and a matching border; hover lifts to `signal`. One per view.
- **Secondary (default):** white panel, `ink` legend, `field-border` stroke; hover steps to `panel-hover` with an `ink` border; active steps to `panel-active`.
- **Link button:** no border or background, underlined, still 44px tall.
- **Transitions:** background and border at 120ms `ease-out`.

### Handoff
An outlined pill-free rectangle at field radius, white panel, `field-border` stroke, arrow glyph plus destination, 44px tall. Hover turns the border and the label to `signal`/`signal-text` — the one place orange is borrowed for a non-primary control, and only on hover.

### Inputs and Fields
Mono text at data size, white panel, 1px `field-border`, field radius, 10px/12px padding, 44px minimum. The label above is an engraved legend. `aria-invalid="true"` turns the stroke `stop` and prints the error beneath in `stop` at body-small. The caret is `signal`. Focus is the system ring, never a glow.

### Panels
White, 1px `line`, field radius, `--s4` padding, `--s4` vertical margin; a `details.panel` uses a 700-weight summary. Panels are the regulatory surface: sources, method, receipts, citation lists, filter forms.

### Tool Cell
Two renditions of one component. Standalone (catalog, states index): white card, `line` border, field radius, `--s4` padding, border turns `field-border` on hover. In a home lane: no card at all — a ruled row with a bottom hairline, name at title size, question in `muted` body-small, what-you-need and as-of right-aligned at 0.75rem, hover tints the row `panel-hover`. The PREVIEW mark is a stamp on the cell (raise field, `work-zone-text`, `line` border, stamp metrics), not a line of body text above the name.

### Top Rail and Command Bar
The rail is a `guide` field with a `guide-active` bottom rule and white legends; navigation items sit at note size and 0.82 opacity, full opacity on hover, and the current section is the rail's only orange: full opacity, 600 weight, and a 2px `signal` bottom border. Below 768px with script, the list folds behind a bordered Menu button; without script the list simply stays open. The theme toggle is a bordered ghost button pinned right, uppercase at 0.75rem. The command bar sits on `bg` with a hairline under it: an engraved label (visually hidden below 720px), a mono combobox input, and a results listbox on a white panel with the overlay shadow, selected and hovered rows on `panel-hover`.

### Charts
SVG on a white panel with a `line` border and field radius. Grid lines in `line` at 1px; axis text 11px mono in `muted`; series at 2px with `vector-effect: non-scaling-stroke`; measured in graphite, what-if in signal, comparison in `service` dashed 6/4; heat cells from the six-step ramp; the highlighted point is a `series-measured` dot ringed in `panel`. Every chart carries a caption in `muted` body-small.

### Warning Chip
The only pill in the system: `warning` field, `legend-black` legend, diamond glyph, 4px/10px.

### Dropzone and Receipt
The dropzone is a 2px dashed `field-border` box on white at field radius. The full-page drag overlay is `guide` at 92% via `color-mix`, with a large white legend. The parse receipt is a label/value grid ruled with `line` hairlines, collapsing to one column below 480px, with the privacy line in `ok` at 600.

## Do's and Don'ts

### Do:
- **Do** put every measured number on a plate, in `signal`, with its unit beside it and its basis band stamped along the lower edge — at every width.
- **Do** keep orange to three marks: the measured value, the live section, the primary action.
- **Do** pair every status colour with its glyph and its word, using the five in-house glyph shapes.
- **Do** set small labels as engraved legends (uppercase, 0.6875rem, 0.085em, `muted`) and nothing else in that style.
- **Do** take every colour, space, and radius from `site/styles/tokens.mjs`; the style gate fails on a literal colour.
- **Do** build raised surfaces from a light top hairline, a dark bottom hairline, and at most a 1px/2px shadow.
- **Do** rule repeating rows instead of boxing them.
- **Do** check both themes, 320px, keyboard-only, and `forced-colors` before shipping a surface.

### Don't:
- **Don't** use a bevel, gradient, glass, backdrop blur, glow, or a second content elevation. The 0 8px 24px shadow belongs to detached overlays only.
- **Don't** tint a grey to suggest a brand, or tint data for decoration. Colour commits at full strength or not at all.
- **Don't** spend `signal` on a heading, a border, an icon, or a chart series that is measured truth; measured series are graphite.
- **Don't** use `work-zone` for errors or `warning` for estimates; the four status meanings are fixed.
- **Don't** ship a plate, a rendition of a plate, or a copied result without its basis and its validation level.
- **Don't** introduce a type size outside the ramp above, a radius between 6px and 10px, or a spacing value off the `--s1`…`--s8` scale.
- **Don't** request a font weight outside Archivo's 400–700 or Roboto Mono's 400–500; `font-synthesis-weight: none` means it will silently render at the nearest shipped weight.
- **Don't** load a font, icon set, or stylesheet from a CDN. Everything is self-hosted.
- **Don't** reintroduce the retired highway-sign world: green fields, Overpass, federal sign colours, shields, or reflective-gradient effects.
- **Don't** put more than one answer plate in a viewport.

## Accessibility gates (binding)

A surface ships only if it passes all of these, in both themes:
- WCAG 2.2 AA: 4.5:1 for every text token on `bg`, `panel`, and `raise`; 3:1 for `field-border` on every surface; 4.5:1 for every legend on its field. `verify/gates/style.mjs` recomputes each pairing from `tokens.mjs` and fails the build below threshold.
- The focus ring clears **7:1** against `bg` in both themes, is 3px with a 2px offset, and is visible on every interactive element.
- 320px with no sideways scroll; wide tables and charts pan inside their own box.
- Targets at least 44×44px for primary controls.
- Colour never carries meaning alone; every chart has a caption and a table view.
- `forced-colors: active` keeps the plate, strip, and handoff legible with a 2px `CanvasText` border.
- `prefers-reduced-motion: reduce` makes every state change instant.
