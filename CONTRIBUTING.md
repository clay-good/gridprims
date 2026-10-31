# Contributing to gridprims

Thank you for helping. The rules below are checked by the build, not by a reviewer, so a contribution that passes them publishes on the next build.

## Facts we keep by hand

Data-download guides, tariff terms, glossary entries, and regulator links live in `data/curated/facts/`. Every field needs:

- **A primary source**: the commission order, the filed tariff sheet, the regulator's or publisher's own page. News articles, vendor pages, and compilations we may not reuse are refused.
- **A stored capture**: the page's text or PDF committed under `data/curated/captures/`, with its SHA-256 recorded beside the source, so the citation survives the page moving.
- **Two independent sources for anything disputable**, such as a threshold or a percentage. A field with only one is left out until the second arrives; the rest of the record still publishes.

`pipeline/lib/curated.mjs` holds the rules; `npm run check` runs them.

## Say if you have a conflict of interest

Every record asks: *Are you employed by, paid by, or representing any party this record concerns?* Answer `none` or name the affiliation. A disclosed affiliation does not block anything; the sources still decide.

## No personal data

Never include meter files, account numbers, meter identifiers such as an ESIID, addresses, or screenshots of an account. Type the values you need by hand. The check refuses what looks like personal data.

## Large changes

A change touching more than 20 records or 500 lines must be one batch, labeled bulk in `data/curated/facts/_batch.json`, saying how you verified it. It must not mix a data refresh with an edit to a published number.

## Code

There are no packages to install. `npm test` and `npm run check` must pass, and every new general-purpose module needs an entry in `docs/own-implementations.md`. Commit messages follow Conventional Commits.

## First pull request from a fork

GitHub holds workflows from a first-time contributor's fork until a maintainer approves them. That is the host's behavior. It affects only that contributor's checks, never the scheduled pipeline or anything that publishes, and fork pull requests never receive a secret.
