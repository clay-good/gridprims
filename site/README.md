# site

The website, rendered by our own static site generator (`node site/build.mjs` → `dist/`).

| Path | What |
|---|---|
| `build.mjs` | Renders every page from manifests and string files, copies the modules pages import, writes `_manifest.json` and `_csp-hashes.json` |
| `lib/` | Own implementations: escaped HTML templates, message formatting |
| `ui/` | Result rendering shared by the build and the browser, share state, glyphs |
| `templates/` | The shell layout and page templates |
| `pages/` | Browser modules: calculator hydration, shell behavior |
| `strings/` | Per-locale string files; every visitor-facing sentence lives here or in a manifest |
| `styles/` | `tokens.mjs` (DESIGN.md tokens, generates `tokens.css`) and `site.css` |
