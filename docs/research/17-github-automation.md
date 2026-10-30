# 17. GitHub Actions automation for gridprims (verified 2026-10-30)

Scope: can all recurring work (fetch ~15 datasets, validate, normalize, build ~20k pages, deploy to Cloudflare Workers, deposit archives, regenerate the continuity ledger, link-check, test) run on GitHub Actions in a public repo, untended, for years?

Every fact is tagged **[V]** = read today on the vendor's own current doc page, or **[U]** = unverified (doc silent, blocked, or third-party only).

## Bottom line

1. **Compute is free and uncapped.** Standard GitHub-hosted runners in public repos are free and do not draw down any included allowance **[V]**. The real ceilings are 6 h/job, 20 concurrent jobs (Free plan), and 1,000 REST calls/hour for `GITHUB_TOKEN` **[V]**.
2. **The one thing that will silently stop us is the 60-day scheduled-workflow disable.** Public-repo `schedule` triggers are auto-disabled after 60 days of no repository activity, GitHub does not document a notification, and it does not re-enable itself **[V]**. Mitigation is cheap and reliable: a workflow that polls `GET /actions/workflows/{id}` and checks `state == "disabled_inactivity"`, then `PUT .../enable` **[V]**.
3. **Zero marketplace actions is fully viable.** `ubuntu-latest` = Ubuntu 24.04, image 20261026, ships Node.js 22.23.4 (plus 24.22.1 cached), Git 2.56.0, curl 8.5.0, jq 1.7.1, GitHub CLI 2.103.2 **[V]**. Clone with `git`, deploy with `fetch`, no `actions/checkout`, no `setup-node`.
4. **Committing normalized data to git is sane at our scale, with a ceiling.** Hard file block at 100 MiB, warning at 50 MiB, repo "ideally under 1 GB, strongly recommended under 5 GB" **[V]**. Weekly-to-monthly commits of 15 datasets will cross 1 GB in a few years; put raw snapshots in **Releases** (2 GiB/asset, 1,000 assets/release, no total-size or bandwidth limit) **[V]** and keep only normalized outputs + checksums in git.
5. **Cloudflare has no native GitHub OIDC federation for Workers deploys.** Not documented anywhere on developers.cloudflare.com **[V, by absence]**; GitHub's own OIDC page names only AWS/Azure/GCP/Vault **[V]**. We use a long-lived API token with the **Workers > Editor** role scoped to one Worker (the legacy "Workers Scripts: Edit" permission is superseded but still works, with no deprecation date) **[V]**. Direct upload works with plain `fetch` over three documented REST endpoints **[V]**.
6. **Zenodo versioning automates cleanly; DataLumos does not.** `POST /api/deposit/depositions/:id/actions/newversion` with `deposit:actions`, 50 GB per file and per record, 100 files per record, sandbox at sandbox.zenodo.org **[V]**. DataLumos/ICPSR has no public deposit API **[V, by absence]** — that deposit stays manual.

---

## 1. Cost and quotas (public repo)

| Item | Value | Tag |
|---|---|---|
| Standard GitHub-hosted runners, public repo | Free; "remains free independently and does not reduce the included compute usage" | V |
| Larger runners, public repo | Billed | V |
| Usage cap / minute cap for public repos | None documented | V |
| Job execution time (GitHub-hosted) | 6 hours | V |
| Workflow run time | 35 days | V |
| Concurrent jobs (Free / Pro / Team / Enterprise) | 20 / 40 / 60 / 500 | V |
| Job matrix | 256 jobs per run | V |
| Re-runs | 50 per workflow run | V |
| Workflow file size | 500 KB | V |
| Trigger events | 1,500 per 10 s per repo | V |
| Workflow runs queued | 500 per 10 s | V |
| `GITHUB_TOKEN` REST rate limit | **1,000 requests/hour per repository** | V |
| Unauthenticated REST | 60/hour | V |
| Artifact storage included (Free) | 500 MB | V |
| Artifact + log retention | default 90 days; public repos max **90 days**, private max 400, min 1 | V |
| Cache per repo | 10 GB default (raisable to 10 TB, billed above 10 GB) | V |
| Cache eviction | entries not accessed in **over 7 days** are removed; at capacity, oldest-by-last-access first | V |
| Cache ops per repo per minute | 200 uploads / 1,500 downloads / 400 deletes | V |
| Cache branch scope | current branch + default branch only; no sibling/child branches | V |

Implications: a 20k-page build must finish inside 6 h (split by matrix if not); artifacts are **not** archival storage (90-day hard ceiling on public repos); the cache is **not** a data store (7-day eviction) — dataset snapshots must live in git or Releases.

## 2. Scheduled workflows and continuity

| Question | Answer | Tag |
|---|---|---|
| Auto-disabled on inactivity? | Yes: "In a public repository, scheduled workflows are automatically disabled when no repository activity has occurred in 60 days." | V |
| Public repos only? | The sentence is scoped to public repositories; forks also have schedules disabled by default | V |
| What counts as "repository activity"? | **Not defined in the docs** | V (absence) |
| Does a `GITHUB_TOKEN` commit by the workflow count? | **Not documented either way** | U |
| Notification when disabled? | **Not documented** | V (absence) |
| Re-enable | UI (Actions tab > Enable workflow), `gh workflow enable`, or `PUT /repos/{o}/{r}/actions/workflows/{id}/enable` | V |
| Detection | `GET /repos/{o}/{r}/actions/workflows/{id}` returns `state` ∈ `active`, `deleted`, `disabled_fork`, `disabled_inactivity`, `disabled_manually` | V |
| Cron reliability | "The `schedule` event can be delayed during periods of high loads"; "High load times include the start of every hour"; "If the load is sufficiently high enough, some queued jobs may be dropped" | V |
| Guidance | "schedule your workflow to run at a different time of the hour" | V |
| Shortest interval | once every 5 minutes | V |
| Branch | runs only on the latest commit of the **default branch**; the file must exist there | V |
| Timezone | UTC by default; IANA zone supported; DST-skipped hours advance to next valid time | V |
| Notification recipient | "the user who last modified the cron syntax in the workflow file"; editing the cron also makes that user the `actor` | V |
| `GITHUB_TOKEN` pushes trigger other workflows? | No: "events triggered by the `GITHUB_TOKEN` will not create a new workflow run," except `workflow_dispatch` / `repository_dispatch`, and fork `pull_request` opened/synchronize/reopened (approval-required state) | V |

**Design consequence.** Because `GITHUB_TOKEN` pushes do not trigger workflows, the data-commit loop cannot runaway — but it also means we cannot rely on "our own commit retriggers the build." Chain with `workflow_run` instead, or do fetch+build+deploy in one run. And because it is **undocumented** whether a bot commit resets the 60-day clock, do not depend on it: run a weekly `schedule`-triggered *and* `workflow_dispatch`-able "self-heal" job that reads `state` for every workflow and re-enables anything `disabled_inactivity`. That job is itself a scheduled workflow, so also pin a second guard outside GitHub (e.g. a Cloudflare Cron Trigger or an uptime check on the ledger's `generated_at` field).

Never schedule on the hour. Use minutes like `:17`, `:43`.

## 3. Zero-dependency CI

| Question | Answer | Tag |
|---|---|---|
| Workflow with no marketplace actions? | Yes. Nothing requires `uses:`; `run:` steps with preinstalled tools are sufficient | V |
| `ubuntu-latest` maps to | Ubuntu 24.04 x64 (image 20261026.354.1, OS 24.04.5 LTS) | V |
| Node preinstalled | **Node.js 22.23.4** default; cached toolcache has 22.23.4 and 24.22.1 | V |
| Git available | **Git 2.56.0**, Git LFS 3.8.1 | V |
| Other useful preinstalls | curl 8.5.0, jq 1.7.1, zstd 1.5.7, Python 3.12.3, GitHub CLI 2.103.2 | V |
| Newer runner labels available | `ubuntu-26.04` and `ubuntu-26.04-arm` are published | V |
| Image policy | At most 2 GA images + 1 beta at a time; oldest label starts deprecation when a new GA lands; tools removed ~6 months after EOL | V |
| If using `actions/checkout`: pinning | "Pin references to actions to a commit SHA in your workflow files"; verify the SHA is from the action's repo, not a fork | V |
| Does GitHub publish SHAs? | Yes — resolvable via `GET /repos/actions/checkout/git/refs/tags/v6`; e.g. `v6` = `d23441a48e516b6c34aea4fa41551a30e30af803`. Latest release is **v7.0.1** (2026-07-20) | V |
| Stronger than SHA pinning | **Workflow dependency lockfile** at `.github/workflows/actions.lock`, generated by the `gh actions-lock` CLI extension; GA as of 2026-10-28 on Free/Team/Enterprise Cloud. "For repositories that adopt a lockfile, SHA pinning within workflow files is no longer necessary." | V |
| First-party-only / allowlist policy | Repo Settings > Actions > General: disable entirely; limit to actions in the repo/org (this blocks `actions/checkout`); or "Allow OWNER, and select non-OWNER, actions" with a list of up to **1,000** entries supporting `*` and `!`. Separate checkbox: **"Require actions to be pinned to a full-length commit SHA."** A **Require lockfile** policy also exists | V |

**Recommendation for gridprims.** Use zero `uses:` entries. Clone with `git clone --depth 1` (or `git init` + `fetch` using `${{ github.sha }}`), build with the preinstalled Node, and set the repo policy to *local actions only* plus *require SHA pinning*. That policy makes the zero-third-party-runtime-code rule machine-enforced rather than aspirational, and it removes the entire action-supply-chain class of silent failure. Pin the runner label to `ubuntu-24.04` (not `ubuntu-latest`) so a 2027 image rotation is a deliberate commit, not a surprise.

## 4. Committing data back to the repo

| Item | Value | Tag |
|---|---|---|
| Token permission needed | `permissions: { contents: write }` (`GITHUB_TOKEN`, limited to the containing repo) | V |
| Default `GITHUB_TOKEN` permissions | Repo setting; **Restricted** (read-only on `contents` and `packages`) is default for new personal-account repos. Unspecified scopes become `none` when any is specified | V |
| "Allow GitHub Actions to create and approve pull requests" | Disallowed by default for personal-account repos | V |
| Infinite-loop risk | Structurally prevented: `GITHUB_TOKEN` events "will not create a new workflow run" — "this behavior prevents you from accidentally creating recursive workflow runs" | V |
| Branch protection | `GITHUB_TOKEN` is subject to protection rules like any actor; required reviews/status checks will block a direct push. Default branch must either exclude bot pushes from protection or the job must open a PR (which needs the setting above enabled) | U (inferred; docs read today do not state the bot-bypass mechanics) |
| File size warning / hard block | 50 MiB warning / **100 MiB hard block** | V |
| Browser upload max | 25 MiB | V |
| Repo size guidance | "ideally under 1 GB," "under 5 GB is strongly recommended"; hard limits exist but are not published | V |
| Total push size limit | Not documented | V (absence) |
| Release asset max size | **2 GiB per file** | V |
| Release asset count | **1,000 per release** | V |
| Release total size / bandwidth | "There is no limit on the total size of a release, nor bandwidth usage" | V |

**Verdict.** Commit to git: normalized outputs, manifests, checksums, the continuity ledger — small, diffable, and the thing we want history for. Do **not** commit raw upstream snapshots; git stores every version forever and 15 datasets refreshed weekly will outgrow the 1 GB guidance. Put raw snapshots in a GitHub Release per period (append assets, never rewrite), and keep the checksum + release asset URL in git. Artifacts are unusable for this (90-day cap on public repos); the Actions cache is unusable (7-day eviction).

## 5. Deploying to Cloudflare without long-lived secrets

| Item | Answer | Tag |
|---|---|---|
| Native GitHub OIDC federation for Workers | **Not offered.** No Cloudflare doc describes it; Cloudflare's own GitHub Actions guide says store an API token + account ID as secrets | V (absence) |
| GitHub's OIDC provider list | AWS, Azure, GCP, HashiCorp Vault "and others" — Cloudflare not named | V |
| Workaround | Third-party OIDC->token brokers (a Worker you host that mints a short-lived token). Shifts, not removes, the long-lived credential | U |
| Cloudflare's documented token for CI | Custom token with **Edit Cloudflare Workers**, scoped to the one account | V |
| Current role model | Workers product roles: Metadata Read-Only, Content Read-Only, **Editor** (update + deploy + rename existing Workers; cannot create or delete), Admin. Legacy "Workers Scripts: Edit" is superseded by Editor, still works, **no deprecation date** | V |
| Minimum scope for us | **Editor, scoped to the single gridprims Worker.** Add Zone > Workers Routes > Write only if a deploy changes routes or custom domains | V |
| Per-Worker token scoping | Supported | V |
| Automatic rotation | Not documented on the roles page | V (absence) |
| Direct upload with plain `fetch` (no Wrangler) | **Yes**, three calls: `POST /client/v4/accounts/{a}/workers/scripts/{s}/assets-upload-session` (manifest of path -> {hash(32 hex), size}) -> `POST /client/v4/accounts/{a}/workers/assets/upload?base64=true` (multipart per returned bucket, auth with the returned JWT) -> `PUT /client/v4/accounts/{a}/workers/scripts/{s}` (metadata with `main_module`, `compatibility_date`, `assets:{jwt}` or `keep_assets:true`) | V |
| Upload JWT lifetime | 1 hour (both the upload token and the completion token) | V |
| Unchanged files | Omitted from `buckets` by the manifest response — incremental uploads come free | V |
| Static asset file count | 20,000 (Free) / **100,000 (Paid)** per Worker version | V |
| Individual asset size | 25 MiB | V |
| Worker bundle size | 64 MiB uncompressed (both plans) | V |
| `_headers` / `_redirects` | 100 header rules; 2,100 redirects (2,000 static + 100 dynamic) | V |
| Deploys per day / per minute | **Not documented** | V (absence) |
| Cloudflare API global rate limit | **1,200 requests per 5 minutes per user**, cumulative across dashboard + keys + tokens; 429 blocks all calls for 5 minutes. Per-IP 200/s. 500 account API tokens max | V |
| Version/deployment retention | Not documented; Wrangler lists only the 100 most recent | V (absence) |

**Two hard numbers to design against.** 20k pages is comfortably under 100,000 files, but the 1,200-call/5-min API limit is shared with everything else in the account — a naive one-request-per-file uploader would blow it. The bucketed manifest flow is the only safe path, and the deploy job must honor the `Ratelimit` / `retry-after` headers.

## 6. Archive deposits

**Zenodo** (developers.zenodo.org, read today)

| Item | Value | Tag |
|---|---|---|
| Base URL | `https://zenodo.org/api/` | V |
| Sandbox | `https://sandbox.zenodo.org` — separate registration and token; "can be cleaned at anytime" | V |
| Token scopes | `deposit:write` (write, cannot publish), `deposit:actions` (publish, edit, discard) | V |
| New version | `POST /api/deposit/depositions/:id/actions/newversion`, scope `deposit:actions`, returns 201; the **new draft is at `links.latest_draft`**, not in the body. Use the latest version's `id`, not the concept id. Repeat calls are no-ops while a draft exists | V |
| File limits (current files API) | **50 GB per file and per record, 100 files per record** | V |
| Legacy files API | 100 MB per file | V |
| Rate limits | authenticated 100/min, 5,000/hour; guest 60/min, 2,000/hour; search endpoints 30/min. Headers `X-RateLimit-*`, 429 on excess | V |
| DOI versioning | Supported as a deposit action since 2017-06-15; prod prefix 10.5281, sandbox 10.5072. Fully automatable | V |
| Caveat | developers.zenodo.org documents the legacy deposit API; Zenodo now runs InvenioRDM and an alternative records API exists. Confirm before building | U |

**Software Heritage** — the Save Code Now API endpoint, auth, and rate limits could **not** be verified: both `archive.softwareheritage.org/api/1/origin/save/doc/` and `docs.softwareheritage.org` returned Anubis bot-protection "Access Denied" pages today **[U]**. Practical note: that bot filter is itself a risk for an untended CI job. Treat SH as best-effort; a public GitHub repo is crawled by SH anyway.

**DataLumos / ICPSR** — **no public deposit API** found; official pages describe only web upload and, above 50 GB, "contact us for another method of transfer" **[V, by absence]**. A third-party catalog lists an open API as "in progress" **[U]**. This deposit stays manual.

## 7. Failure handling and observability without a person

| Capability | What GitHub offers | Tag |
|---|---|---|
| Failure notification | Notification settings > System > Actions: opt into "On GitHub" (web) and/or "Email", plus **"Only notify for failed workflows"** | V |
| Who gets it for a `schedule` run | The user who last modified the cron syntax | V |
| Non-email destinations | Web (GitHub inbox) natively; Slack/Teams via the official GitHub integrations' customizable notifications | V |
| Failure-triggered workflow | `workflow_run` with types `completed` (also `requested`, `in_progress`); gate on `github.event.workflow_run.conclusion == 'failure'`. The file must be on the default branch. **Cannot chain more than three levels** | V |
| Auto-open an issue on failure | Yes — `POST /repos/{o}/{r}/issues` with `GITHUB_TOKEN` and `permissions: { issues: write }`, within the 1,000 req/hour budget | V |
| Re-runs | 50 per workflow run | V |
| Timeouts | 6 h job ceiling; set `timeout-minutes` per job/step explicitly | V |
| Detect "a scheduled workflow stopped running" | `GET /actions/workflows/{id}` -> `state == "disabled_inactivity"`; and compare `GET /actions/workflows/{id}/runs` newest `created_at` against the expected cadence | V |

Pattern: every scheduled workflow writes a heartbeat (timestamp + dataset versions) into the continuity ledger it already regenerates. A `workflow_run` watchdog opens a GitHub issue on failure, and the weekly self-heal job both re-enables `disabled_inactivity` workflows and opens an issue if any heartbeat is older than its cadence. Email alone is insufficient — it goes to one address and depends on who last touched the cron.

## What we can automate fully / what still needs a person

| Fully automatable | Needs a person |
|---|---|
| Fetching ~15 datasets on independent crons | DataLumos/ICPSR deposits (no API) |
| Checksum + schema validation, normalization | Re-enabling a workflow if the self-heal job *itself* is disabled |
| Building ~20k pages (matrix up to 256 jobs, 6 h each) | Rotating the Cloudflare API token (no documented auto-rotation) |
| Deploying via the three direct-upload REST calls | Triaging an upstream schema change the validator rejects |
| Zenodo new-version deposits with DOI versioning | Deciding whether a changed upstream license still permits republication |
| Regenerating the continuity ledger and heartbeats | Accepting/merging untrusted fork PRs |
| Link checking and tests | Acting on auto-opened failure issues |
| Re-enabling `disabled_inactivity` workflows | Runner-label and Node-major migrations (deliberate commits) |

## Failure modes and how CI detects them

| Failure mode | Silent? | Detection |
|---|---|---|
| Scheduled workflow auto-disabled at 60 days | **Yes** — no documented notification | Self-heal job polls `state`; external cron watches ledger `generated_at` |
| The self-heal job is itself disabled | **Yes** | Off-platform check (Cloudflare Cron Trigger / uptime monitor on the ledger timestamp) |
| Cron run dropped under high load | Yes | Heartbeat staleness vs. expected cadence |
| Upstream URL dead / 404 | No | Fetch step non-zero exit -> `workflow_run` watchdog -> issue |
| Upstream schema changed but still 200 | Easily | Schema + row-count + checksum-delta assertions; fail on drift beyond tolerance |
| Upstream silently stale (same file for months) | **Yes** | Ledger records upstream `last_modified`; assert freshness per dataset |
| Repo crosses size guidance | Yes | Assert repo/working-tree size in CI; fail above a chosen budget |
| 100 MiB file push rejected | No | Push fails; pre-push size assertion catches it earlier |
| Cloudflare token revoked/expired | No | Deploy returns 4xx -> issue |
| Cloudflare 1,200/5-min rate limit hit | No | 429 + `retry-after`; backoff, then fail loudly |
| Asset file count > 100,000 | No | Count files before upload and assert |
| Zenodo token expired or scope lost | No | Non-201 from `newversion` -> issue |
| Zenodo rate limit (100/min) | No | `X-RateLimit-Remaining`, 429 |
| Runner image rotation breaks the build | Partly | Pin `ubuntu-24.04`; a scheduled canary job on `ubuntu-latest` fails first and warns |
| Node major removed from the image | Yes, slowly | Same canary; assert `process.version` against an expected floor |
| Build exceeds 6 h | No | Job cancelled; set `timeout-minutes` below 360 to fail early |
| Artifacts expired (90 days) | **Yes** | Do not depend on artifacts; use Releases |
| Cache evicted (7 days unused) | **Yes** | Treat cache as optional; builds must succeed cold |

## 9. What could make this plan fail silently in three years

- **Runner image rotation.** `ubuntu-26.04` already exists; GitHub keeps at most 2 GA + 1 beta image, begins deprecating the oldest label when a new GA lands, and removes EOL tools ~6 months after deprecation **[V]**. Pin `ubuntu-24.04`, and accept that the pin will eventually stop resolving — a canary job on `ubuntu-latest` turns that from a sudden outage into an early warning.
- **Node major drift.** Image is on Node 22.23.4 default with 24.22.1 cached **[V]**. Our code must not depend on a specific major beyond a documented floor; assert the floor in CI.
- **Policy drift on the SHA/lockfile side.** Workflow lockfiles went GA on 2026-10-28 and GitHub now calls them stronger than SHA pinning **[V]**. If we use zero actions, this is moot — which is another argument for zero actions. If a "Require lockfile" policy is ever enforced above us, a workflow with no `uses:` cannot be caught by it.
- **Legacy API deprecations without dates.** Cloudflare's "Workers Scripts: Edit" permission is explicitly legacy with "no deprecation date" **[V]**, and Zenodo's documented deposit API is the legacy one in front of InvenioRDM **[U]**. Both are live tripwires. Pin a quarterly scheduled job that exercises each credential and each endpoint against a no-op (Zenodo sandbox, a dry-run Cloudflare manifest with no buckets) so breakage surfaces as an issue, not as a missed deposit.
- **Repo growth.** The 1 GB guidance is advisory and the hard limit is unpublished **[V]** — the failure arrives as a rejected push years from now. Assert a size budget in CI from day one.
- **Artifact and cache horizons.** 90-day artifacts, 7-day cache eviction **[V]** — anything treated as durable there quietly disappears.
- **Bot-commit activity semantics.** Undocumented **[U]**. Any plan that assumes "our own commits keep the schedule alive" is betting on undocumented behavior. Poll `state` instead.

## Sources

All read 2026-10-30.

- https://docs.github.com/en/billing/concepts/product-billing/github-actions
- https://docs.github.com/en/actions/reference/limits
- https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows
- https://docs.github.com/en/actions/reference/dependency-caching-reference
- https://docs.github.com/en/actions/concepts/security/github_token
- https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax
- https://docs.github.com/en/actions/reference/security/secure-use
- https://docs.github.com/en/actions/concepts/security/openid-connect
- https://docs.github.com/en/actions/concepts/security/workflow-dependency-lockfiles
- https://github.blog/changelog/2026-10-28-github-actions-workflow-lockfiles-are-generally-available/
- https://docs.github.com/en/actions/how-tos/manage-workflow-runs/disable-and-enable-workflows
- https://docs.github.com/en/actions/how-tos/manage-workflow-runs/remove-workflow-artifacts
- https://docs.github.com/en/organizations/managing-organization-settings/configuring-the-retention-period-for-github-actions-artifacts-and-logs-in-your-organization
- https://docs.github.com/en/rest/actions/workflows
- https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/enabling-features-for-your-repository/managing-github-actions-settings-for-a-repository
- https://docs.github.com/en/repositories/working-with-files/managing-large-files/about-large-files-on-github
- https://docs.github.com/en/repositories/releasing-projects-on-github/about-releases
- https://docs.github.com/en/actions/concepts/workflows-and-actions/notifications-for-workflow-runs
- https://docs.github.com/en/subscriptions-and-notifications/how-tos/managing-github-actions-notifications
- https://github.com/actions/runner-images/blob/main/README.md
- https://github.com/actions/runner-images/blob/main/images/ubuntu/Ubuntu2404-Readme.md (image 20261026.354.1)
- https://api.github.com/repos/actions/checkout/releases/latest (v7.0.1)
- https://developers.cloudflare.com/workers/platform/limits/
- https://developers.cloudflare.com/workers/ci-cd/external-cicd/github-actions/
- https://developers.cloudflare.com/workers/static-assets/direct-upload/
- https://developers.cloudflare.com/workers/authorization/workers/
- https://developers.cloudflare.com/workers/configuration/versions-and-deployments/
- https://developers.cloudflare.com/fundamentals/api/reference/limits/
- https://developers.zenodo.org/
- https://www.icpsr.umich.edu/sites/datalumos/faqs
- Software Heritage API docs: **not reachable** (Anubis bot protection, 2026-10-30) — https://docs.softwareheritage.org/devel/swh-web/uri-scheme-api-origin-save.html
