# PEW-DIY

**D.I.Y. Room Equipment Borrowing System**

A university equipment-borrowing system for the D.I.Y. Room, which supports students working on projects involving Arduino and related electronics.

## Project Documentation

- [Software Requirements Specification (SRS)](docs/srs.md)
- [System-Level Design Specification (SDS)](docs/system-sds.md)
- [Sprint 1 Engineering Contracts (Part E)](docs/sprints/sprint-1/README.md) — feature specifications, AC/STS mapping and Product DoD

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

Open `/login`, sign in as B-A (Borrower), B-B (second Borrower) or C-A (Custodian), using the privately supplied seed password. The server serves the React app and legacy `.html` pages. Seed reruns preserve existing credentials/data; changing SEED_PASSWORD_* does **not** reset an existing account. Use a fresh demo database when supplying new seed passwords.

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

[GitHub Actions CI](.github/workflows/ci.yml) runs on PRs into `main` or `sprint/**`, pushes to those branches and `ci/**`, `feature/**`, `fix/**`, and manual dispatch. It installs both lockfiles with `npm ci`, uses Node24.15.0 and a disposable PostgreSQL17 service, checks server/client/E2E TypeScript, builds both applications, and runs verification-tooling, server/API, client and Chromium E2E tests at desktop/tablet/mobile sizes. Empty, skipped, failing or flaky product suites fail the check; focused E2E tests are rejected. Reports are retained as sanitized workflow artifacts for14 days, without database contents, seed passwords or browser traces.

To run the same checks locally with installed dependencies/Chromium and Node24.15+:

```powershell
# Dedicated disposable DB only; the role needs CREATE SCHEMA privilege.
$env:CI_TEST_DATABASE_URL = 'postgresql://<test-role>@127.0.0.1:5432/<disposable-test-db>'
npm run test:ci
```

The runner creates separate server/browser schemas, migrates before server test discovery, generates private synthetic seed passwords and drops only its own schemas afterward. Reports in ignored `ci-results/` identify HEAD, dirty-source state, source fingerprints, workflow fingerprint, environment and actual outcomes. The runner never falls back to `.env` database configuration. A local working-tree run is labelled as such; it is not a GitHub Actions result.

For the normal release path in group specification §5.3, a repository administrator must require **Build and regression tests** on `main` and sprint staging via branch protection/rulesets after its first successful run, alongside independent teammate review. This change does not configure repository settings. CI checks the PR merge result by default and cannot replace teammate approval, the F-10 setup/evidence audit or a release decision. Existing `rehearse:sprint1 -> verify:sprint1 -> audit:sprint1` clean-source gates remain in place. Docker image delivery and accepted-release deployment from `main` are separate Lab5 work; this workflow establishes CI only.

## Sprint 1 verification and handoff

F-01 through F-05 are merged into sprint staging. [Part F evidence](docs/verification/sprint-1/README.md) contains scenarios, screenshots, actual AC/test results, TDD references, sampled workflow/review history, contributions/AI-use disclosure and known gaps. A verified local staging candidate is distinct from a reviewed main release. Human review, A-12 shared-team ratification, independent README repetition and the reviewed release remain explicit gates.

## Borrowing Requests (F-04 / Issue #11)

After `npm run migrate` and the existing synthetic seed, open the React app (`/login`), sign in as Borrower, open an available item, and submit a positive quantity up to its current availability. Success opens **My requests**, where list/detail reads survive reload. Custodian sees the **Submitted requests** queue but cannot create requests. Requests do not reserve stock; repeated requests have no additional per-borrower cap (SRS A-12).

Migration 002 creates `borrowing_requests`; migration003 now supplies the Loan relation owned by Issue #12. Historical F-04 results remain in [F-04 execution/TDD evidence](docs/sprints/sprint-1/tdd-evidence-f04.md); fresh F-05 runs verify the fulfilled-request transition and previously Loan-gated cases. No `.env` secret or demo password belongs in Git.

## Checkout and Active Loans (F-05 / Issue #12)

Set `APP_TIMEZONE=Asia/Bangkok` and run `npm run migrate` on the development database. Migration003 creates `loans` with unique request linkage and FK/positive-quantity constraints. As Custodian, open **Submitted requests**, inspect a request and choose **Check out**. The committed result shows the active loan, full requested quantity and due date. As Borrower, open **My loans** to read/reload only your own active loans.

Checkout rechecks stock inside a PostgreSQL transaction, serializing on Equipment then Request row locks across app processes. Requests reserve no stock. Unavailable/repeated checkout returns409 without another loan; failures roll back. Due date is the Asia/Bangkok checkout calendar date +7 days, while the checkout instant is UTC. Missing timezone disables checkout safely; invalid timezone prevents startup. Return/overdue/general staff loan history remain later-sprint work.

Tests require a dedicated `TEST_DATABASE_URL`. Apply the checked-in migrations to that test database **before test discovery**, so existing relation-gated F-03/F-04 tests execute. `npm test` includes two actual API processes racing 50 independent requests, rollback/dirty-read checks and restart of the production application entrypoint. `npm run test:e2e` includes F-05 scenarios using temporary schemas in the test database; its test DB role needs CREATE SCHEMA privilege. These tests never expose their fault/barrier hooks through the production application. See [F-05 execution/TDD evidence](docs/sprints/sprint-1/tdd-evidence-f05.md) for commands, actual environments and pending review/release gates.
