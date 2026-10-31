# verify

Gates, tests, golden vectors, and stored reference outputs.

| Path | What |
|---|---|
| `check.mjs` | Runs every repository gate (`npm run check`) |
| `gates/` | Dependency, platform-API, own-implementations, deployable file-count, and manifests gates |
| `lib/` | Own implementations the gates use (file walk, worked-example runner) |
| `tests/` | `node:test` suites (`npm test`), mirroring the folders they test |
| `reference/` | Stored third-party reference outputs and schemas, each listed in docs/reference-artifacts.md |
| `fixtures/` | Committed fixture data so tests run offline |
