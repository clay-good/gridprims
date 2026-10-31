# verify

Gates, tests, golden vectors, and stored reference outputs.

| Path | What |
|---|---|
| `check.mjs` | Runs every repository gate (`npm run check`) |
| `gates/` | Dependency, platform-API, own-implementations, deployable file-count, manifests, style (tokens and contrast), literal-copy, result-version, claims, and sentence-grade gates |
| `lib/` | Own implementations: file walk, worked-example runner, browser driver, static server, contrast math, ZIP writer for fixtures |
| `browser/` | Suites that run inside a page in each engine |
| `serve.mjs` | Serve `dist/` locally (`npm run serve`) |
| `tests/` | `node:test` suites (`npm test`), mirroring the folders they test |
| `reference/` | Stored third-party reference outputs and schemas, each listed in docs/reference-artifacts.md |
| `fixtures/` | Committed fixture data so tests run offline |
