## Context

Protocol details, security guidance, client configuration, and the geoprims precedent are in `docs/research/04` §A (2026-10-27). Key facts: MCP `2026-07-28` is stateless (verify the spec version again at apply time; the protocol moves quickly) and requires `server/discover` and `resultType`; Roots, Sampling, and Logging are deprecated; legacy clients still need `initialize`. geoprims' server is 288 lines with zero dependencies and is the template, with four known gaps to fix (`resultType`, `_meta` server info, error `-32022`, and `-32602` for missing resources).

## Goals / Non-Goals

**Goals:**
- Clone, add one config line, and work, with only Node.js installed.
- Make the offline and file-access guarantees testable, not promises.

**Non-Goals:**
- Remote transports, registry packages, one-click bundles (revisit after launch).

## Decisions

### D1. Six meta-tools, not one tool per calculator
Exposing every tool would cost large amounts of context and hit client tool caps. Search, describe, and run cover the whole catalog; `analyze_file` and `query_data` cover the two jobs agents need most; `prepare_report` keeps humans in charge of reports.

Alternative: optional direct toolsets (geoprims offers them). Deferred until evaluation shows agents struggle with the meta-tools.

### D2. Launch allowlist instead of Roots
Roots is deprecated in `2026-07-28`. `--allow-dir` in the client config is explicit, visible to the developer, and works in every client. Paths are checked after `realpath` with a trailing-separator comparison. As defense in depth, documented launch commands add Node's permission model (`--permission --allow-fs-read=<clone>,<allowed dirs>`, plus `--allow-worker` because parsing runs in worker threads). The Node docs say the model is not a security boundary on its own. Whether it blocks network access on the Node 24 floor (the `--allow-net` flag's first version) is unverified; task 3.5 records the exact behavior per supported version in `docs/platform-apis.md`. The sandboxed no-network test, not the permission model, is the guarantee.

### D3. In-process handles
A parsed file is kept in memory under a random handle. No temp files, no disk cache. A 60-minute idle expiry bounds memory. Alternative: re-parse on every call. Rejected: a 7 MB Green Button year re-parsed per call wastes seconds and lets receipt choices drift.

### D4. Data delivery
A fresh clone carries the committed fixture subset (foundation D11), so every worked example runs immediately. Release archives include full `data/`. A clone can also get full data with one of two explicit commands: `get-data` downloads from our origin and verifies every file against a digest list committed in the tagged source (so a compromised website cannot substitute both files and digests), or `build-data` rebuilds from publishers' bulk files with no API keys. The server itself never downloads. Data is the same shard format the website uses (foundation design D5), so `query_data` filters in memory with the same code.

| Alternative | Why not |
|---|---|
| Commit data to git | Hundreds of MB of churn per release. |
| Server fetches on demand | Breaks the no-network guarantee. |
| `node:sqlite` store | Release candidate, not stable; not covered by the permission model. Revisit when stable. |

### D5. Tests
Alternative to the manual agent evaluation: an automated run against a hosted model. Rejected: it would add a third-party service and a key to CI.
- Conformance: recorded request/response pairs for all three protocol versions.
- No-network: every example under `sandbox-exec` (macOS) or `unshare -rn` (Linux).
- Path security: traversal, symlink, device-file, and size-cap fixtures.
- Golden surface and client-snippet smoke tests (copied pattern from geoprims).
- Agent evaluation: 40+ requests with fixtures, run by a maintainer with an agent of their choice before each release and recorded by hand. It needs a third-party model, so it is a release checklist item, not part of the automated test suite.

## Risks / Trade-offs

- **Client support for `2026-07-28` is uneven** (unverified per client). Mitigation: dual-era support and recorded handshakes from real clients.
- **Agents may over-trust screening results.** Mitigation: summaries and screening labels in every result; descriptions say what each tool is not.
- **Prompt injection through files.** Mitigation: numbers and fixed field names only, `source_text` quarantine, no tool that can act outside computation.
