# Episode 4 — CI on pull requests (R-05, C-01)

Lab 5 Student Guide v1.1, **Episode 4: CI on pull requests** (Criterion: *CI and quality
gate*, first half). Tracking issue: **#53**. Pull Request: **#54** (`ci/4-pr-checks` →
`sprint/1-staging`).

## 1. What C-01 requires

> **C-01** — A normal Pull Request runs the build and all automated tests, and they pass.
> Covers **R-05**. Evidence: CI run link and test summary, with the tested commit.

## 2. Evidence summary

| Item | Value |
|---|---|
| Workflow | `.github/workflows/ci-docker.yml` — name `CI & Docker Build` |
| Job under test | **`test-and-docker`** (kept for the Episode 6 required check) |
| Event | `pull_request` into `sprint/1-staging` (normal PR, not the release PR) |
| CI run | https://github.com/Peepipat-Suesoongnuen/PEW-DIY/actions/runs/43718883059 — **success** |
| `test-and-docker` job | https://github.com/Peepipat-Suesoongnuen/PEW-DIY/actions/runs/43718883059/job/132826305933 — 2m03s |
| `docker-image` job | https://github.com/Peepipat-Suesoongnuen/PEW-DIY/actions/runs/43718883059/job/132826306309 — 0m34s |
| PR head commit | `23526ff24e95a07f0c9101365ca99c5efdb5a348` |
| Tested commit | `1c7b4457e0ad7fe74d2feabaab7d561837f143b8` (GitHub's PR merge result of head `23526ff` into `bc1a7a1`) |
| Run started | 2026-11-15T13:24:58Z |
| Artifact | `ci-reports-43718883059-1` (`summary.json`, sanitized) |

GitHub Actions checks the PR **merge result** by default, so `1c7b4457` is the commit the
tests actually ran against. It contains no change beyond merging `23526ff` into staging.

## 3. Test summary (from the run above)

### 3.1 Application suites — `npm run test:ci`

| Suite | Passed | Failed | Skipped | Notes |
|---|---|---|---|---|
| Server / API (`server-tests`) | 182 | 0 | 0 | Vitest against a disposable PostgreSQL 17 service |
| Client (`client-tests`) | 74 | 0 | 0 | Vitest |
| Browser E2E (`browser-tests`) | 57 | 0 | 0 | Chromium at desktop/tablet/mobile; 0 flaky |
| **Total** | **313** | **0** | **0** | `summary.json.status = PASS` |

The same step also ran `server-build`, `client-typecheck`, `e2e-typecheck`, `client-build`,
`tooling-tests`, `server-migration`, `browser-migration` and `browser-seed`; every step
exited 0. Empty, skipped, failing or flaky suites fail the job, so a zero total cannot pass.

### 3.2 Deployment-script checks — step `Check deployment scripts without accessing GCP`

Every `gcloud`/`openssl` call is a local stub; no Google Cloud project is contacted.

| Command | Actual result |
|---|---|
| `bash -n deploy/deploy.sh deploy/teardown.sh deploy/release.sh` | exit 0 |
| `bash deploy/tests/test_deploy_stub.sh` | `PASS: first_run`, `rerun`, `partial`, `job-fail`, `demo`, `dry run makes no gcloud calls` |
| `bash deploy/tests/test_release_stub.sh` | `PASS normal release…`, `PASS rollback…`, `PASS image failure…`, `PASS migration failure…`, `PASS invalid tag…` |
| `python3 -m unittest discover -s deploy/tests -p 'test_smoke.py'` | `Ran 5 tests` — `OK` |

### 3.3 Docker — job `docker-image` (C-03)

| Step | Actual result |
|---|---|
| `docker build --tag pewdiy:ci .` | success |
| Container against the disposable database | `{"status":"ready","db":"connected"}`, `/login` served, `PASS container readiness and SPA shell` |
| `test -e /app/.env` inside the image | `PASS no .env inside the image` |

## 4. Acceptance criteria traceability

| AC | Requirement | Evidence | Kind |
|---|---|---|---|
| AC-1 | `ci-docker.yml` with name `CI & Docker Build`, job id `test-and-docker` | File in PR #54; job appears in the run | Automated configuration + hosted run |
| AC-2 | `pull_request.branches` covers `main` and `sprint/1-staging`; `workflow_call` + `workflow_dispatch` | `ci-docker.yml` `on:` block | Manual inspection (static) |
| AC-3 | `permissions: contents: read`, concurrency, no GCP auth | `ci-docker.yml`; run log shows `GITHUB_TOKEN Permissions: Contents: read`; no `google-github-actions/auth` step | Manual inspection + run metadata |
| AC-4 | `deploy/` scripts + offline tests; CI runs `bash -n` and the tests | §3.2 | Automated (hosted run) |
| AC-5 | A normal PR into staging starts `test-and-docker` and it passes (C-01) | Run 43718883059 on PR #54, conclusions `success` | Automated (hosted run) |
| AC-6 | Release PR `sprint/1-staging` → `main` runs the same check and passes | Follow-up release PR (linked in Issue #53 when opened) | Automated (hosted run, later) |
| AC-7 | `ci-docker.yml` + `deploy/` present on `main` | `git ls-tree origin/main …` after the release merge | Manual verification (later) |
| AC-8 | C-01 records run link, tested commit and test summary | This document, §2–§3 | Manual evidence record |
| AC-9 | No secret/password/key in workflow, scripts, logs or screenshots | CI DB values are disposable runner-only (`pewdiy_ci`, trust auth); scripts generate passwords only into Secret Manager and the tests assert no leak | Automated assertions + manual inspection |
| AC-10 | Labelled `lab5`, reviewed and merged by the teammate | PR #54 label `lab5`; reviewer `L0u1sss` | GitHub record |

## 5. Explicitly not automated / deferred

- This episode does **not** create any Google Cloud resource, workload identity pool or
  GitHub environment — that is Episodes 5–7. The deploy scripts are only syntax-checked
  and run against stubs.
- Enforcing `test-and-docker` as a required check is **Episode 6** (repository settings,
  not a code change).
- The release PR into `main` (AC-6/AC-7) is a separate PR and is recorded in Issue #53.

## 6. Reproduce locally

```bash
# from the repository root, with bash and python3 available
bash -n deploy/deploy.sh deploy/teardown.sh deploy/release.sh
bash deploy/tests/test_deploy_stub.sh
bash deploy/tests/test_release_stub.sh
python -m unittest discover -s deploy/tests -p 'test_smoke.py'
# full application suite needs a disposable PostgreSQL (see README Continuous integration):
#   CI_TEST_DATABASE_URL=... npm run test:ci
```

Nothing here writes to the real database, prints a password or calls GCP.
