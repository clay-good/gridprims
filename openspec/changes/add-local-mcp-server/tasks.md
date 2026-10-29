## 1. Protocol

- [ ] 1.1 Implement stdio framing, JSON-RPC dispatch, and stderr logging; verify a malformed line returns a parse error and the server keeps running
- [ ] 1.2 Implement `2026-07-28` (`server/discover`, `_meta` version, `resultType`, `ttlMs`, `cacheScope`) and legacy `initialize`; verify recorded conformance pairs for all three versions
- [ ] 1.3 Implement error `-32022` and `-32602` handling; verify the unknown-version scenario
- [ ] 1.4 Implement progress, cancellation, and output pagination; verify the cancel and 35,040-row scenarios

## 2. Tools

- [ ] 2.1 Generate the six meta-tool schemas and descriptions from manifests; verify the golden-surface file
- [ ] 2.2 Wire `search`, `describe`, `run` to the shared core and ranker; verify every worked example matches the website core byte for byte
- [ ] 2.3 Implement `analyze_file` with handles and receipts; verify the re-use scenario
- [ ] 2.4 Implement `query_data` over the shard format; verify lookups match entity pages
- [ ] 2.5 Implement `prepare_report`; verify no network request and a correct prefilled link

## 3. Security

- [ ] 3.1 Implement `--allow-dir` with realpath checks, size caps, and refusals; verify traversal, symlink, device-file, and 201 MB fixtures
- [ ] 3.2 Implement `source_text` quarantine; verify the injected-header scenario
- [ ] 3.3 Add the sandboxed no-network test; verify it fails on a fixture tool that opens a socket
- [ ] 3.4 Default logs without values or paths; verify stderr in a fixture run
- [ ] 3.5 Record Node permission-model behavior (file reads, workers, network) on Node 24 and 26 in `docs/platform-apis.md`; verify the documented launch command works on both

## 4. Data commands

- [ ] 4.1 Implement `get-data` with SHA-256 verification against the committed digest list; verify the tampered-file scenario and that a tampered remote digest list is ignored
- [ ] 4.2 Implement `build-data` with a checksum diff report; verify a rebuild of one dataset matches the published snapshot

## 5. Setup and evaluation

- [ ] 5.1 Write the client-snippet source, README section, developer page, and smoke test; verify each snippet launches the server
- [ ] 5.2 Build the 40-request evaluation set with fixtures and the manual release checklist; verify a baseline run is recorded in the first release notes
