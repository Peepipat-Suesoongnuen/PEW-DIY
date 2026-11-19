# PEW-DIY Lab 5 Deployment & Release Guide

> **Scope:** Repeatable build, configuration, GCP deployment, verification, and rollback documentation for **PEW-DIY** (D.I.Y. Room Equipment Borrowing System) in accordance with `01_SE_Lab_5_updated.pdf` §4.3, R-02, and R-08.
> **Security notice:** No passwords, connection strings, tokens, cookies, or private keys appear in this document. All secrets are supplied privately via `.env` (local, git-ignored), Google Cloud Secret Manager, or GitHub Environment secrets.

---

## 1. Architecture Stack and Differences from the Reference Kit

PEW-DIY is packaged as a **modular monolith** (`Dockerfile`): a single container serves both the built React/Vite/Tailwind SPA (`client/dist`) and the Express 5 + TypeScript REST API (`dist/index.js`) on the platform-assigned `PORT` (bound to `0.0.0.0`).

| Area | Course Reference (`TokTickIT`) | PEW-DIY Implementation | Reason / Notes |
|---|---|---|---|
| **Backend & ORM** | Node.js + Prisma | Node.js 24 (`node:24-alpine`), Express 5, TypeScript, `pg` | Project uses parameterized SQL directly with `pg` (`server/src/db/pool.ts`). |
| **Migrations** | `npx prisma migrate deploy` | Idempotent SQL migrations in `server/src/db/migrations.ts` (`node dist/db/migrate.js`) | Runs in a dedicated one-shot Cloud Run job (`pewdiy-migrate`) before updating the service; aborts deployment if migration fails. |
| **Seeding Guard** | `SEED_DEMO_DATA` flag | Two-step opt-in (`SEED_MODE` env var **and** matching CLI flag in `server/src/db/seed-safety.ts`) | Prevents accidental seeding in production even if an env var leaks to the API container. |
| **Seed Isolation** | Single runtime SA | Dedicated `pewdiy-seeder` SA for `--demo` job; `pewdiy-runner` cannot read seed-password secrets | Least privilege: `deploy/deploy.sh` step 7c revokes any legacy runtime grant on seed secrets on every run. |
| **Sessions & Data** | DB-backed sessions & uploads | PostgreSQL `users`, `sessions`, `equipment`, `borrowing_requests`, `loans` | No file uploads in Sprint 1; server sessions are stored in `sessions` (SHA-256 hashed session key + `HttpOnly` cookie). |
| **Anti-CSRF** | CORS origin check | Trusted `Origin` / `Referer` validation against `APP_ORIGIN` (`server/src/routes/auth-routes.ts`) | Rejects state-changing requests missing or mismatching `APP_ORIGIN` with HTTP 403. |
| **Local Compose** | Root + `server/` + `client/` | Multi-service `docker-compose.yml` (`db`, `migrate`, `server`, `client` nginx) with fail-closed `POSTGRES_PASSWORD` | Root `Dockerfile` is used by CI and Cloud Run; `server/Dockerfile` and `client/Dockerfile` + `client/nginx.conf` support local Compose. |
| **Smoke Test** | `/api/health`, `/api/ready`, `/`, `/api/categories` | `deploy/smoke_test.py`: `/api/ready`, `/`, `/login`, unauthenticated `GET /api/equipment` (`401`), plus optional `SMOKE_USERNAME` / `SMOKE_PASSWORD` login check | Verifies database connectivity, SPA shell, and RBAC enforcement without mutating data. |

---

## 2. Environment Variables

All runtime configuration is validated fail-closed by `server/src/config/config.ts`, `server/src/db/seed.ts`, and `server/src/db/seed-safety.ts`. Template placeholders live in `.env.example`.

| Variable | Purpose | Secret? | Source (Local) | Source (GCP / CI) |
|---|---|---|---|---|
| `DATABASE_URL` | PostgreSQL connection string for API, migrations, and seed | **Yes** | `.env` (git-ignored) | Secret Manager (`pewdiy-database-url:latest`) via Cloud SQL Unix socket (`/cloudsql/...`) |
| `TEST_DATABASE_URL` | Dedicated PostgreSQL DB for `npm test` / `npm run migrate:test` | **Yes** (if credentialed) | `.env` / shell env | Not set in Cloud Run |
| `CI_TEST_DATABASE_URL` | Disposable PostgreSQL DB used by GitHub Actions CI | No (runner-only) | Shell env when running `npm run test:ci` | `.github/workflows/ci-docker.yml` (`postgres:17` service) |
| `MIGRATION_TEST_DATABASE_URL` | Isolated DB for migration-repair test in CI | No (runner-only) | Shell env when running `npm run test:ci` | `.github/workflows/ci-docker.yml` (`pewdiy_migration_repair_test`) |
| `POSTGRES_USER` | Local Docker Compose PostgreSQL user | No | `.env` / default `pewdiy` in `docker-compose.yml` | Not used (Cloud SQL uses `DB_USER="pewdiy"`) |
| `POSTGRES_PASSWORD` | Local Docker Compose PostgreSQL password (fails closed if empty) | **Yes** | `.env` (git-ignored) | Not used (generated into Secret Manager by `deploy/deploy.sh`) |
| `POSTGRES_DB` | Local Docker Compose database name | No | `.env` / default `pewdiy` in `docker-compose.yml` | Not used (Cloud SQL database `pewdiy`) |
| `NODE_ENV` | Runtime mode (`development`, `test`, `production`) | No | `.env` (`development`) | Cloud Run env var (`production`) |
| `PORT` | HTTP listen port (`0.0.0.0:$PORT`) | No | `.env` (`3000`) | Reserved & injected automatically by Cloud Run (`--port 3000` routes traffic; never set in `--set-env-vars`) |
| `APP_ORIGIN` | Exact browser origin allowed by anti-CSRF `Origin`/`Referer` check | No | `.env` (`http://localhost:3000` or `http://localhost:5173` in Compose) | Cloud Run env var (`https://pewdiy-qtz73ahnlq-as.a.run.app`) |
| `APP_TIMEZONE` | IANA calendar timezone for due-date calculation (`+7` days) | No | `.env` (`Asia/Bangkok`) | Cloud Run env var (`Asia/Bangkok`) |
| `SESSION_IDLE_MINUTES` | Sliding session idle timeout in minutes | No | `.env` (`60`) | Cloud Run env var (`60`) |
| `SESSION_ABSOLUTE_MINUTES` | Hard maximum session lifetime in minutes | No | `.env` (`480`) | Cloud Run env var (`480`) |
| `SESSION_COOKIE_NAME` | Name of the `HttpOnly` session cookie | No | `.env` (`pew_session`) | Cloud Run env var (`pew_session`) |
| `SESSION_COOKIE_SECURE` | Enables `Secure` cookie attribute (`true` over HTTPS, `false` on HTTP localhost) | No | `.env` (`false`) | Cloud Run env var (`true`) |
| `SEED_PASSWORD_BA` | Initial password for demo Borrower `B-A` (seed job only) | **Yes** | `.env` / shell env (never committed) | Secret Manager (`pewdiy-seed-password-ba:latest`), accessible only by `pewdiy-seeder` |
| `SEED_PASSWORD_BB` | Initial password for demo Borrower `B-B` (seed job only) | **Yes** | `.env` / shell env (never committed) | Secret Manager (`pewdiy-seed-password-bb:latest`), accessible only by `pewdiy-seeder` |
| `SEED_PASSWORD_CA` | Initial password for demo Custodian `C-A` (seed job only) | **Yes** | `.env` / shell env (never committed) | Secret Manager (`pewdiy-seed-password-ca:latest`), accessible only by `pewdiy-seeder` |
| `SEED_MODE` | Explicit seed guard (`local-compose-demo` or `cloud-demo`); must never be set on API service | No | Compose `migrate` service only | One-off `pewdiy-seed` job only (`cloud-demo`) |
| `TZ` | Container OS timezone | No | `Dockerfile` (`Asia/Bangkok`) | Inherited from `Dockerfile` (`Asia/Bangkok`) |
| `VITE_API_URL` | Optional build-time API base URL in `client/Dockerfile` (defaults to `""` for same-origin `/api`) | No | `docker-compose.yml` build arg (`""`) | Root `Dockerfile` serves SPA + API from same origin |
| `SMOKE_USERNAME` | Optional non-admin username for `deploy/smoke_test.py` login check | No | Optional shell env | GitHub Environment `demo` variable (optional) |
| `SMOKE_PASSWORD` | Optional password paired with `SMOKE_USERNAME` for `deploy/smoke_test.py` | **Yes** | Optional shell env | GitHub Environment `demo` secret (optional) |

---

## 3. Build, Test, Run, Migrate, and Seed Commands

### 3.1 Local Application (Without Docker)

```bash
# Install dependencies
npm ci --no-audit
npm --prefix client ci --no-audit

# Configure ignored .env from template and supply local DB + seed passwords
cp .env.example .env

# Migrate, seed, build, and start
npm run migrate
npm run seed
npm run build
npm run build:client
npm run dev
```

### 3.2 Automated Tests & Offline Deployment Checks

```bash
# Server unit & API integration tests (requires TEST_DATABASE_URL)
npm run migrate:test
npm test

# Client unit tests & TypeScript check
npm --prefix client test
npm --prefix client run typecheck

# Full CI suite (requires CI_TEST_DATABASE_URL and MIGRATION_TEST_DATABASE_URL)
npm run test:ci

# Offline deployment script validation (no GCP access)
bash -n deploy/deploy.sh deploy/teardown.sh deploy/release.sh
bash deploy/tests/test_deploy_stub.sh
bash deploy/tests/test_release_stub.sh
bash deploy/tests/test_deploy_workflow.sh
python3 -m unittest discover -s deploy/tests -p "test_smoke.py"
```

### 3.3 Local Docker & Docker Compose (Clean Clone Reproduction)

```bash
cp .env.example .env
# Populate POSTGRES_PASSWORD, SEED_PASSWORD_BA, SEED_PASSWORD_BB, SEED_PASSWORD_CA in .env

docker compose config --quiet
docker compose up --build -d
docker compose ps -a

# Verify readiness and SPA
curl --fail http://127.0.0.1:3000/api/ready
curl --fail http://127.0.0.1:5173/login

# Production root Dockerfile build check
docker build --tag pewdiy:local .
```

---

## 4. GCP Project, Region, and Resource Inventory

| Resource | Value / Name |
|---|---|
| **GCP Project ID** | `cpe334-2026-pew-diy` |
| **Region** | `asia-southeast1` |
| **Artifact Registry Repository** | `pewdiy` (`asia-southeast1-docker.pkg.dev/cpe334-2026-pew-diy/pewdiy/pewdiy`) |
| **Cloud SQL Instance** | `pewdiy-pg` (`POSTGRES_16`, `--edition=enterprise`, `db-f1-micro`, 10 GB SSD, `storageAutoResize: false`) |
| **Cloud SQL Database** | `pewdiy` (DB user: `pewdiy`) |
| **Cloud Run Service** | `pewdiy` (`--min-instances 0`, `--max-instances 3`, `--memory 512Mi`, `--cpu 1`, `--port 3000`) |
| **Public Service URL** | `https://pewdiy-qtz73ahnlq-as.a.run.app` |
| **Cloud Run Jobs** | `pewdiy-migrate` (schema migration), `pewdiy-seed` (one-off `--demo` seed job) |
| **Runtime Service Account** | `pewdiy-runner@cpe334-2026-pew-diy.iam.gserviceaccount.com` (`roles/cloudsql.client`, `roles/secretmanager.secretAccessor` on `pewdiy-database-url` only) |
| **Seed Job Service Account** | `pewdiy-seeder@cpe334-2026-pew-diy.iam.gserviceaccount.com` (`roles/cloudsql.client`, `roles/secretmanager.secretAccessor` on DB URL + seed secrets) |
| **CI/CD Deployer Service Account** | `pew-diy-deployer@cpe334-2026-pew-diy.iam.gserviceaccount.com` (`roles/run.developer`, `roles/artifactregistry.writer` on `pewdiy` repo, `roles/iam.serviceAccountUser` on `pewdiy-runner`, keyless via WIF) |
| **Workload Identity Federation** | Pool: `github-actions` · Provider: `github-main` · GitHub Environment: `demo` |
| **Secret Manager Secret Names** | `pewdiy-database-url`, `pewdiy-seed-password-ba`, `pewdiy-seed-password-bb`, `pewdiy-seed-password-ca` |

---

## 5. Repeatable Release Procedure (R-07, R-08)

1. **Issue & Branching:** Create a GitHub Issue labelled `lab5` and branch from `sprint/1-staging` (e.g., `feature/<issue>-<slug>` or `docs/<slug>`).
2. **Pull Request to `sprint/1-staging`:** Open a PR targeting `sprint/1-staging` with label `lab5`. Wait for `CI & Docker Build` (`test-and-docker` + `docker-image`) to pass and obtain an independent teammate review/approval (authors never approve their own PRs). Merge into `sprint/1-staging`.
3. **Release Pull Request to `main`:** Ensure `sprint/1-staging` is up to date with `main`, then open a release PR (`base: main`, `compare: sprint/1-staging`, label `lab5`). The `protect-main` ruleset enforces at least 1 approving teammate review, up-to-date branch status, and passing required check `test-and-docker`.
4. **Automated Pipeline (`Deploy demo`):** Merging into `main` triggers `.github/workflows/deploy.yml`:
   - Re-runs `.github/workflows/ci-docker.yml` (`test` job).
   - Authenticates to GCP via Workload Identity Federation (no JSON key).
   - Builds the root `Dockerfile` and pushes `asia-southeast1-docker.pkg.dev/cpe334-2026-pew-diy/pewdiy/pewdiy:<40-char-commit-sha>`.
   - Runs `deploy/release.sh`: resolves the immutable `@sha256:...` digest, updates and executes `pewdiy-migrate`, updates Cloud Run service `pewdiy` to that digest, and routes 100% traffic via `--to-latest`.
   - Runs `python3 deploy/smoke_test.py "$SERVICE_URL"` against the live public URL.
   - Writes the image tag (commit SHA), digest, and URL to the workflow run summary (`Record deployment`).

---

## 6. Identifying the Running Commit & Rollback Procedure

### How to Verify Which Commit Is Running
1. **GitHub Actions Summary:** Open **Actions → Deploy demo → \<run\>** and read `Record deployment` for `Image tag` (full 40-char commit SHA) and `Digest` (`@sha256:...`).
2. **Artifact Registry:** Match the `sha256:...` digest in `asia-southeast1-docker.pkg.dev/cpe334-2026-pew-diy/pewdiy/pewdiy` to its commit-SHA tag.
3. **Cloud Run Revision:** Run in Cloud Shell (or inspect **Cloud Run → `pewdiy` → Revisions**):
   ```bash
   gcloud run services describe pewdiy \
     --region asia-southeast1 \
     --project cpe334-2026-pew-diy \
     --format="yaml(status.traffic,spec.template.spec.containers[0].image)"
   ```
   Confirm the active revision receiving 100% traffic uses the exact `@sha256:...` digest of the intended `main` commit SHA.

### Rollback / Roll-Forward Procedure
- **Via GitHub Actions (`workflow_dispatch`, Episode 8):**
  1. Open **Actions → Deploy demo → Run workflow** on branch `main`.
  2. Enter the full 40-character commit SHA of an existing Artifact Registry image into `image_tag`.
  3. The workflow skips `test`, `build`, `pewdiy-migrate`, and `seed`, resolves the existing image digest, updates Cloud Run `pewdiy` to that digest with 100% traffic (`--to-latest`), and runs `deploy/smoke_test.py`.
- **Database safety:** Application rollback only changes the container image; Cloud SQL (`pewdiy-pg`) data and sessions remain untouched.
