# Own implementations

Each module here replaces what would usually be a package. Each has its own tests in `verify/tests/` and is listed with its scope and known limits. The own-implementations gate (`verify/gates/own-implementations.mjs`) fails when a general-purpose module under `parsers/`, `core/lib/`, `verify/lib/`, `site/lib/`, or `pipeline/lib/` has no entry.

| Module | Replaces | Scope | Known limits |
|---|---|---|---|
| `core/lib/precision.mjs` | number-formatting libraries | Significant figures from typed text, rounding, US-style display through `Intl.NumberFormat` | Whole numbers with trailing zeros are read as not significant ("400" carries 1) |
| `verify/lib/walk.mjs` | glob libraries | Recursive file listing and Markdown table reading for the gates | Reads only tables whose first cell is backticked |
| `verify/lib/examples.mjs` | test-vector runners | Runs every manifest's worked examples within their tolerances | Numeric outputs only |
| `parsers/delimited.mjs` | CSV libraries | BOM, UTF-8, UTF-16, and Windows-1252 decoding; comma, tab, semicolon, and pipe detection past preamble lines; RFC 4180 quoting with line breaks in quotes; incremental chunks | No decimal-comma numbers (US exports only); delimiter detection samples the first 50 non-blank lines |
| `parsers/xml.mjs` | XML parsers | Well-formed XML to events or a tree; refuses any DTD, entity declaration, or entity beyond the five predefines; depth limit 256 | Not validating; namespaces are kept as prefixes plus local names, not resolved to URIs; a DTD inside a comment is refused too |
| `parsers/time.mjs` | date and time-zone libraries | IANA zones through `Intl`; wall time to UTC reporting the spring gap and the fall repeat; transition finding to the minute | Results follow the engine's zone data; the cross-engine fixture run waits on the browser driver (task 4.8) |
| `parsers/xlsx.mjs` | spreadsheet and ZIP libraries | ZIP central directory, stored and deflated parts through `DecompressionStream`, shared strings with rich text, inline strings, cached formula values, booleans, errors, date detection from built-in and custom number formats, both date systems, first sheet by workbook order | No ZIP64 (workbooks over 4 GiB), no encryption, no formula evaluation, no external links; serials before 1900-03-01 are off by Excel's phantom leap day |
| `verify/lib/zip-writer.mjs` | ZIP writers | Builds `.xlsx` test fixtures: stored or deflated entries, optional data descriptors | Test-only; no ZIP64 |
| `verify/lib/browser.mjs` | Playwright, Puppeteer, Selenium | Headless Chrome over the DevTools Protocol and Firefox over WebDriver BiDi through Node's `WebSocket`: load a page, evaluate script, record requests, set the viewport, take full-page screenshots; Safari through `safaridriver` for script runs only | No input events or multiple tabs yet; Safari cannot record requests |
| `verify/lib/static-server.mjs` | static file servers | Serves a folder on 127.0.0.1 with content types, plus in-memory routes | Test-only; no range requests or compression |
| `site/lib/html.mjs` | template engines | Tagged-template HTML that escapes every interpolated value unless it is already markup; arrays join; `raw()` for markup this repository wrote | No partials or layouts beyond plain functions |
| `site/lib/i18n.mjs` | message-format libraries | Message lookup by id, `{name}` placeholders, plural forms through `Intl.PluralRules`, dates through `Intl.DateTimeFormat` | No nested select forms yet |
| `verify/lib/contrast.mjs` | color-contrast libraries | WCAG 2.2 relative luminance and contrast ratio for opaque `#rrggbb` colors | No alpha blending; translucent colors must be resolved first |
