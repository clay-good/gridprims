# Reference artifacts

Third-party files we read or compare against but never execute (`platform/zero-dependency`): self-hosted fonts, published schemas, and stored reference outputs from other engines. The dependency gate fails on any font file, or any file under `verify/reference/` or `site/fonts/`, that is not listed here with a matching SHA-256.

| Path | Source | License | Version | SHA-256 |
|---|---|---|---|---|

None yet. Overpass and Overpass Mono (SIL OFL 1.1 or LGPL 2.1, `RedHatOfficial/Overpass`) are added with the shell (task 8.3); until then pages use the system font stack DESIGN.md names as fallback.
