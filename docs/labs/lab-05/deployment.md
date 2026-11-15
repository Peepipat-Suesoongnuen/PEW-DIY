# Lab 5 — Deployment (PEW-DIY)

Lab 5 (CPE 334) deployment of the Sprint 1 release to Google Cloud Platform.
The application is a modular monolith: one container serves the React SPA and
the Express API, backed by a managed PostgreSQL database.

| Item | Value |
|---|---|
| GCP project | `cpe334-2026-pew-diy` |
| Region | `asia-southeast1` |
| Cloud Run service | `pewdiy` (min 0, max 3 instances) |
| Cloud Run migration job | `pewdiy-migrate` |
| Artifact Registry repository | `pewdiy` |
| Image | `asia-southeast1-docker.pkg.dev/cpe334-2026-pew-diy/pewdiy/pewdiy:<commit-sha>` |
| Cloud SQL instance | `pewdiy-pg` (PostgreSQL 16, `db-f1-micro`, 10 GB, storage auto-increase **off**) |
| Database / user | `pewdiy` / `pewdiy` (password only in Secret Manager) |
| Runtime service account | `pewdiy-runner@cpe334-2026-pew-diy.iam.gserviceaccount.com` |
| Deployer service account | `pewdiy-deployer@cpe334-2026-pew-diy.iam.gserviceaccount.com` |
| Secret | `pewdiy-database-url` |
| GitHub environment | `demo` (restricted to `main`) |

## Stack and deviations from the reference

The reference stack in the Student Guide is Artifact Registry, Cloud Run, Cloud SQL
for PostgreSQL, Secret Manager and GitHub Actions. PEW-DIY uses exactly those
services with these project-specific choices:

- The root `Dockerfile` builds the UI and the API into one image; Cloud Run serves
  both from one service. `server/Dockerfile` and `client/Dockerfile` exist only for
  the local Docker Compose topology.
- Migrations are SQL files executed by `node dist/db/migrate.js` through a separate
  Cloud Run job, not by the service at startup.
- The database is reached through the Cloud SQL Unix socket
  (`?host=/cloudsql/cpe334-2026-pew-diy:asia-southeast1:pewdiy-pg`), so no public
  database IP is required.
- The CI check that gates merges is `Build and regression tests`
  (`.github/workflows/ci.yml`), and `Docker image build and readiness` proves the
  image itself.

## Environment variables

| Variable | Purpose | Secret? | Where the value comes from |
|---|---|---|---|
| `DATABASE_URL` | PostgreSQL connection string | **Yes** | Secret Manager `pewdiy-database-url` (Cloud Run `--set-secrets`) |
| `NODE_ENV` | Runtime mode (`production` in the deployed service) | No | Cloud Run env vars |
| `PORT` | HTTP port | No | Injected by Cloud Run (`8080`) |
| `APP_ORIGIN` | Trusted browser origin for anti-CSRF checks | No | The service URL, set by `deploy/bootstrap.sh` / `deploy/release.sh` |
| `APP_TIMEZONE` | Calendar policy for +7-day checkout | No | `Asia/Bangkok` |
| `SESSION_IDLE_MINUTES` | Sliding session expiry | No | `60` |
| `SESSION_ABSOLUTE_MINUTES` | Hard session cap | No | `480` |
| `SESSION_COOKIE_NAME` | Session cookie name | No | `pew_session` |
| `SESSION_COOKIE_SECURE` | HTTPS-only cookie | No | `true` |
| `POSTGRES_USER` / `POSTGRES_PASSWORD` / `POSTGRES_DB` | Local Docker Compose database only | Yes (local) | Ignored local `.env`; no committed default |
| `SEED_PASSWORD_BA` / `_BB` / `_CA` | Demo account passwords for seeding | **Yes** | Supplied privately; never committed or shown in evidence |
| `SEED_MODE` | Explicit seeding opt-in (`local-compose-demo`, `cloud-demo`) | No | Compose migration container or the one-off seed job only — **never** the API service |
| `TEST_DATABASE_URL`, `CI_TEST_DATABASE_URL`, `MIGRATION_TEST_DATABASE_URL` | Disposable test databases | No | Local shell / CI job environment |
| `SMOKE_EMAIL`, `SMOKE_PASSWORD` | Optional smoke-test login | **Yes** (password) | GitHub environment `demo` (variable + secret) |

No real value is committed. `.env` stays in `.gitignore`; the repository contains
`.env.example` with placeholders only.

## Commands

```bash
# Build and push the image (CI does this on every release)
gcloud builds submit --tag "$REGION-docker.pkg.dev/$PROJECT_ID/pewdiy/pewdiy:$(git rev-parse HEAD)" .

# Local container with a database
docker compose config --quiet
docker compose up --build -d
docker compose ps -a

# Tests and builds
npm run build
npm test
npm --prefix client test
npm --prefix client run typecheck
npm run test:e2e

# Migrate and seed (local)
npm run migrate
SEED_PASSWORD_BA=... SEED_PASSWORD_BB=... SEED_PASSWORD_CA=... npm run seed

# Migrate (deployed)
gcloud run jobs execute pewdiy-migrate --region asia-southeast1 --wait
```

## First deployment (Episode 5)

```bash
PROJECT_ID=cpe334-2026-pew-diy DRY_RUN=1 bash deploy/bootstrap.sh   # read the plan first
PROJECT_ID=cpe334-2026-pew-diy bash deploy/bootstrap.sh
```

`deploy/bootstrap.sh` is idempotent: it skips resources that already exist, creates
the database password once and stores it only in Secret Manager.

## Release procedure (Episodes 7–8)

`main` deploys automatically. Every merge into `main` is a release.

1. Open a feature/fix PR into `sprint/1-staging`; CI must pass and the teammate reviews it.
2. Open a release PR from `sprint/1-staging` into `main`, labelled `lab5`; the required check must pass.
3. Merging starts `Deploy demo`, which runs the CI checks, builds the image tagged with
   the full commit SHA, runs the migration job, updates the Cloud Run service and
   smoke-tests the public URL.
4. The run summary records the image tag (commit SHA), the digest and the service URL.

### Which commit is running?

```bash
gcloud run services describe pewdiy --region asia-southeast1 \
  --format='value(spec.template.spec.containers[0].image)'
```

The image tag is the full commit SHA of the release. Compare it with
`git rev-parse HEAD` on `main`, and confirm the digest in the Cloud Run revision
history matches the digest in the `Deploy demo` run summary.

### Rollback and roll-forward

```bash
gh workflow run "Deploy demo" -f image_tag=<previous-full-commit-sha>
```

The workflow skips tests, build and migration and points the service at the earlier
image. Roll forward by running the workflow again with an empty `image_tag` (or by
merging the next release).

## Persistence

The database lives in Cloud SQL, not in the container. Data written before a restart
or a redeploy is still there afterwards; see the Episode 8 evidence.

## Cost controls

- Budget alert created before any resource (Episode 1).
- Cloud Run minimum instances `0`, maximum instances `3`.
- Cloud SQL `db-f1-micro`, 10 GB disk, storage auto-increase off.
- Pause the Cloud SQL instance when idle, and tear down at the end of the course:

```bash
gcloud sql instances patch pewdiy-pg --activation-policy NEVER   # pause
gcloud sql instances patch pewdiy-pg --activation-policy ALWAYS  # resume
```

## Demo accounts for Lab 6

Demo accounts are seeded only through a one-off Cloud Run job, never by the API
service. Production seeding requires both `SEED_MODE=cloud-demo` and the explicit
`--cloud-demo` flag, and the passwords are supplied as secrets. No password is
printed, committed or shown in the PDF.
