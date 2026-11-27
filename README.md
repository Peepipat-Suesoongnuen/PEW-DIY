# PEW-DIY

**D.I.Y. Room Equipment Borrowing System**

A university equipment-borrowing system for the D.I.Y. Room, which supports students working on projects involving Arduino and related electronics.

## Project Documentation

- [Software Requirements Specification (SRS)](docs/srs.md)
- [System-Level Design Specification (SDS)](docs/system-sds.md)
- [Sprint 1 Engineering Contracts (Part E)](docs/sprints/sprint-1/README.md) — feature specifications, AC/STS mapping and Product DoD
- [Sprint 2 Engineering Contracts](docs/sprints/sprint-2/README.md) — `F-06` Return, `F-07` Overdue/Notifications, `F-08` Catalog CRUD/Search/Sort & Loans, `A-11` Approval & Bundles, and Sprint 3 `F-09` Inventory Reporting contract
- [Sprint 2 Verification Matrix](docs/sprints/sprint-2/verification-matrix.md) & [Sprint 2 TDD Evidence](docs/sprints/sprint-2/tdd-evidence-s2.md)
- [Lab 5 Deployment & Release Guide](docs/labs/lab-05/deployment.md)
- [Lab 6 Sprint 1 UAT handoff](docs/labs/lab-06/README.md) — executable Product Team cases, safe handoff requirements and evidence templates (Issue [#80](https://github.com/Peepipat-Suesoongnuen/PEW-DIY/issues/80))
- [Lab 7 Maintenance & Release Readiness](docs/labs/lab-07/README.md) — post-release maintenance metrics and equipment-limit change (`#115` / `#117`)

## Project Structure

```text
PEW-DIY/
├── client/            # React/Vite/Tailwind frontend
├── server/
│   ├── src/           # Backend application: config, db, routes, services
│   └── tests/         # Unit + API/integration tests (outside build output)
├── docs/              # SRS, SDS, feature inventory, traceability, sprint plans and contracts
├── package.json       # Backend/verification configuration; client has its own lockfile
└── AGENT.md           # Repository agent instructions
```

Deployment remains a modular monolith: one application container serves UI and API (SDS §2.2/§8.2).

## Development Setup (Sprint 1)

Prerequisites: **Node.js24.15+ in the selected Node24 line**, npm, PostgreSQL17 (selected target; local PG18 verification is reported separately), and a PostgreSQL role able to create the local databases. Windows PowerShell examples follow; `psql` must be on PATH. Git is needed for verification/version identification. No Docker or GCP is required for Deliverable1.

```powershell
npm ci --no-audit
npm --prefix client ci --no-audit
npx playwright install chromium

# Use your local PostgreSQL admin/owner; configure PGHOST/PGPORT if needed.
psql -U <admin> -c "CREATE DATABASE pewdiy_dev;"
psql -U <admin> -c "CREATE DATABASE pewdiy_test;"
Copy-Item .env.example .env
# Edit .env: DATABASE_URL -> pewdiy_dev, TEST_DATABASE_URL -> pewdiy_test.
# Set APP_ORIGIN=http://localhost:3000 and APP_TIMEZONE=Asia/Bangkok.
# Supply SEED_PASSWORD_BA, SEED_PASSWORD_BB and SEED_PASSWORD_CA privately
# in .env or the current process. Never put passwords in Git or screenshots.
npm run migrate
npm run seed
npm run build
npm run build:client
npm run dev
```

Open `/login`, sign in as B-A (Borrower), B-B (second Borrower) or C-A (Custodian), using the privately supplied seed password. The server serves the React application. Seed reruns preserve existing credentials/data; changing SEED_PASSWORD_* does **not** reset an existing account. Use a fresh demo database when supplying new seed passwords.

### Docker Compose (Episode 3)

Docker Compose starts PostgreSQL, applies migrations, seeds the local demo accounts/fixtures, then starts the API and React client. Set `POSTGRES_PASSWORD` and the three `SEED_PASSWORD_*` values privately in the ignored `.env` file before starting; there is **no committed default password**, so Compose fails closed if `POSTGRES_PASSWORD` is missing, and the migration container fails closed if a seed password is missing.

The production seed guard stays enabled for deployed services, and production seeding is a **two-step opt-in**: it needs both a `SEED_MODE` value **and** the matching command-line flag, so an environment variable alone can never seed. Only the one-shot migration service passes `SEED_MODE=local-compose-demo` together with `--local-compose-demo`; the long-running API container receives neither the seed mode nor the seed passwords. `SEED_MODE` must never be set on a deployed production service. A later one-off deployment job for Lab 6 UAT accounts will follow the same rule (`SEED_MODE=cloud-demo` plus `--cloud-demo`). See [episode-3-docker-evidence.md](docs/labs/lab-05/episode-3-docker-evidence.md).

```powershell
if (-not (Test-Path .env)) { Copy-Item .env.example .env }
# Set POSTGRES_PASSWORD, SEED_PASSWORD_BA, SEED_PASSWORD_BB and SEED_PASSWORD_CA in .env.
$dockerBin = Join-Path $env:LOCALAPPDATA 'Programs\DockerDesktop\resources\bin'
$env:PATH = "$dockerBin;$env:PATH"
docker compose config --quiet
docker compose up --build -d
docker compose ps -a
```

Open `http://localhost:5173/login`; the API readiness endpoint is `http://localhost:3000/api/ready`. PostgreSQL is published only on `127.0.0.1:15432` (container port 5432), and its data persists in the `postgres_data` volume. Do not use `docker compose down -v` unless intentionally deleting that database volume.

The setup timing target is a running seeded login/catalog within15 minutes from the documented installed-tool prerequisites, including dependency installation, DB creation, configuration, migration, seed, build and startup. A local timed rehearsal is [recorded here](docs/verification/sprint-1/run/setup.json); caches and the pending other-student repetition are disclosed. This does not claim a clean OS install in15 minutes.

### Tests and integrated verification

Use the test database exclusively for tests. The direct server suite clears test fixtures and must never target a shared/production database. Migrate the test DB **before test discovery**, so relation-gated tests see the Loan schema:

```powershell
npm run migrate:test
npm test
npm --prefix client test
npm --prefix client run typecheck
```

The complete F-10 runner uses fresh, isolated server/browser schemas inside TEST_DATABASE_URL, generates private seed passwords, builds, migrates, runs server/client/browser suites, records source fingerprints and audits all57 contract AC mappings. The test role needs CREATE SCHEMA privilege. Output is `docs/verification/sprint-1/run/`; no dev-data reset, Git write or release occurs.

```powershell
npm run rehearse:sprint1
npm run verify:sprint1
npm run audit:sprint1
```
Commit application/test/verification source first, then run **rehearse:sprint1 -> verify:sprint1 -> audit:sprint1** on that same clean source commit. Verification rejects setup evidence unless it is CLEAN_SOURCE_COMMIT, names the exact verification tested_commit, and passed the 15-minute target. This preflight runs before any DB connection or suite. Rehearse again after every new source commit, including a source-preserving evidence commit when starting a new verification run.

The complete manifest includes product/test/tooling trees (HTML, CSS, configs and binary assets) plus root configuration, excluding Markdown and generated documentation/evidence. Text fingerprints normalize CRLF to LF; binary assets are byte-exact. Audit requires the exact complete key set and checks tested Git blobs, current files and dirty source relative to HEAD. A later source-preserving evidence commit can retain a previous valid run without a self-referential SHA.

**Full Git history is required** for sampled workflow and historical TDD ancestry checks. Use a full clone, or run `git fetch --unshallow` for an existing shallow clone before reproduction. The scripts report this prerequisite explicitly. Verification and audit require clean committed source; candidate mode has been removed. Verification accepts no CLI options; audit accepts only `--require-release`. Unsupported options fail explicitly before suites or audit checks. After any source change, commit it and rerun rehearsal before verification.

For standalone E2E, point DATABASE_URL and TEST_DATABASE_URL at a separately migrated and freshly seeded disposable browser DB with matching private seed passwords, set APP_ORIGIN/E2E_BASE_URL to its app origin, then run `npm run test:e2e`. The F-05 browser scenarios create their own temporary schemas; the F-10 runner handles isolation/credentials automatically.

The required local README setup rehearsal runs npm ci in a new source directory, creates two fresh databases and checks actual seeded login/catalog plus the built React shell. It requires `tar` (bundled on current Windows) and CREATE DATABASE privilege on the dedicated test DB owner, and removes only its own generated databases/directory afterward:

```powershell
npm run rehearse:sprint1
```

Environment loading: app/scripts load optional `.env`; exported process variables take precedence. Missing required product configuration fails closed. Never include `.env`, password values, session cookies or private data in evidence.

## Continuous integration

[GitHub Actions CI](.github/workflows/ci-docker.yml) (`CI & Docker Build`) runs on PRs into `main` or `sprint/**`, pushes to those branches, and manual dispatch. It installs both lockfiles with `npm ci`, uses Node24.15.0 and a disposable PostgreSQL17 service, checks server/client/E2E TypeScript, builds both applications, and runs verification-tooling, server/API, client and Chromium E2E tests at desktop/tablet/mobile sizes. Empty, skipped, failing or flaky product suites fail the check; focused E2E tests are rejected. Reports are retained as sanitized workflow artifacts for 14 days, without database contents, seed passwords or browser traces. The same job (`test-and-docker`) also checks the `deploy/` scripts offline — every `gcloud`/`openssl` call is a local stub, so no Google Cloud access or cost is involved — and verifies the production Dockerfile builds.

A second job, **Docker image readiness (C-03)**, builds the root `Dockerfile` from a clean checkout, runs the image against a disposable PostgreSQL service, waits for `/api/ready`, checks the SPA shell, and fails if a `.env` file was baked into the image. This is the repeatable C-03 evidence for R-01/R-02. The workflow also exposes `workflow_call`, so the release workflow reuses the same required checks (`test-and-docker`) before deploying.

To run the same checks locally with installed dependencies/Chromium and Node24.15+:

```powershell
# Dedicated disposable DB only; the role needs CREATE SCHEMA privilege.
$env:CI_TEST_DATABASE_URL = 'postgresql://<test-role>@127.0.0.1:5432/<disposable-test-db>'
npm run test:ci
```

The runner creates separate server/browser schemas, migrates before server test discovery, generates private synthetic seed passwords and drops only its own schemas afterward. Reports in ignored `ci-results/` identify HEAD, dirty-source state, source fingerprints, workflow fingerprint, environment and actual outcomes. The runner never falls back to `.env` database configuration. A local working-tree run is labelled as such; it is not a GitHub Actions result.

For the normal release path in group specification §5.3, a repository administrator must require the **Build, tests and Docker build** job (id `test-and-docker`) on `main` and sprint staging via branch protection/rulesets after its first successful run, alongside independent teammate review. This change does not configure repository settings. CI checks the PR merge result by default and cannot replace teammate approval, the F-10 setup/evidence audit or a release decision. Existing `rehearse:sprint1 -> verify:sprint1 -> audit:sprint1` clean-source gates remain in place. Docker image delivery and accepted-release deployment from `main` are separate Lab5 work; this workflow establishes CI only.

## Sprint 1 Verification and Historical Baseline

F-01 through F-05 and F-10 were integrated into `sprint/1-staging` together with PR #41 UI fixes and PR #43 CI, and historical Sprint 1 release [PR #42](https://github.com/Peepipat-Suesoongnuen/PEW-DIY/pull/42) merged candidate `d291873c10c2021d4eb5ebe733aa68012f813678` into `main` at `d8e3cc6a5cb19c2b8d034fb845a2aae0b99219e4` (2026-11-09 UTC). [Part F evidence](docs/verification/sprint-1/README.md) records the candidate `d291873` results (164 server/74 client/57 browser passes, 49/49 application AC). Following Lab 5 deployment PR #79 (`b03c904`, Cloud Run `pewdiy-00008-mfk` and isolated UAT `pewdiy-uat-00003-8c5`) and Lab 6 (`PR #96` `d079bc6`), Sprint 2 and initial Sprint 3 (`F-09`) were promoted to `main`.

## Implemented Release on `main` (Sprint 1 + Sprint 2 + Sprint 3 `F-09` Summary)

> **Current `main` release:** `5f82a8e0bdd52fa85b3e488c96bdafbdc9a6f3cc` ([PR #119](https://github.com/Peepipat-Suesoongnuen/PEW-DIY/pull/119), merged `2026-11-26T17:49:44Z`) · Deployed Cloud Run service `pewdiy` revision `pewdiy-00010-fd6` (`https://pewdiy-qtz73ahnlq-as.a.run.app`) · `CI & Docker Build` run `45870992387` & `Deploy demo` run `45870992457` (both `success`).
>
> **Automated test suites in repository:** `20` server test files (`server/tests/*.test.ts`), `9` client test files (`client/src/test/*.test.ts*`), and `8` Playwright E2E spec files (`e2e/specs/*.spec.ts`).
>
> **Remaining Sprint 3 scope (scheduled by 13 Dec 2026):** `AC-F09-04` (category/date filter + CSV export), `AC-F09-05` / `NFR-07` formal 100-item performance benchmark, and Lab 6 Partner UAT Part B ([Issue #82](https://github.com/Peepipat-Suesoongnuen/PEW-DIY/issues/82)).

- **Sprint 1 Core (`F-01`–`F-05`, `F-10`, migrations `001`–`003`):** Cookie-session auth, server-side `BORROWER`/`CUSTODIAN` RBAC, read-only catalog & availability, single-item borrowing requests, and atomic checkout.
- **Catalog CRUD, Limits & Search/Filter/Sort (`F-08`, Slices `#102`, `#115`):** `POST /api/equipment`, `PATCH /api/equipment/:id` (`409 HELD_QUANTITY_CONFLICT`), `image_url`, `catalog_status` (`ACTIVE`/`RETIRED`), field length bounds (`name` ≤ 120, `category` ≤ 60, `description` ≤ 1,000 chars), and `q`/`category`/`availability`/`status`/`sort` query filters.
- **Create Request, Bundles, Expiration & Limits (`F-04`, `A-11`, `BR-07`, Slices `#103`, `#113`):** `/requests/new`, `POST /api/request-bundles` (max `10` items), `1,000`-char `purpose_detail`, `1–14` calendar day duration (`Asia/Bangkok`), max `5` active non-expired `PENDING` requests/bundles (`409 REQUEST_LIMIT_EXCEEDED`), and `7d`/`3d` expiration (`EXPIRED`, `409 REQUEST_EXPIRED`).
- **Approval Workflow (`A-11`, Slice `#103`):** Custodian `approve`/`reject` and Borrower `cancel` before checkout (`PENDING → APPROVED → CHECKED_OUT`, `PENDING → REJECTED`, `PENDING/APPROVED → CANCELLED`).
- **Two-Step Return & Print Slip (`F-06`, `FR-15`, Slices `#104`, `#113`):** Borrower single/bundle `request-return` notice (`RETURN_PENDING`), Custodian `return` / bundle `return` (`RETURNED`), and printable Loan Slip.
- **Overdue, Notifications & Reports (`F-07`, `F-09`, Slices `#105`, `#106`, `PR #120`):** Derived overdue status (`scope=overdue|history|all`), persistent notifications (`GET/DELETE /api/notifications`, `POST /api/notifications/:id/read`), Custodian `GET /api/reports/summary` (`/reports`, including `expired_count`), Migration `004`, and `ARCH-01 Phase P4` legacy `.html` retirement.

Tests require a dedicated `TEST_DATABASE_URL`. Apply checked-in migrations before test discovery (`npm run migrate:test`). See [Sprint 2 Engineering Contracts](docs/sprints/sprint-2/README.md) and [Sprint 2 Verification Matrix](docs/sprints/sprint-2/verification-matrix.md).
