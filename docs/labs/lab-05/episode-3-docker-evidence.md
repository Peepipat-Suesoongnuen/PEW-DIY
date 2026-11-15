# Lab 5 Episode 3 — Docker evidence (Issue #46 / PR #47)

| Item | Value |
|---|---|
| Verified code commit | `e17295c8b0799bf11b7a9635dea020ff1343a0b3` (`e17295c`) |
| Branch | `build/3-docker` (PR #47 head) |
| Date | 2026-11-15 |
| Host | Windows 11, Docker Engine 29.9.3, Docker Compose v5.7.0 |
| Images | `node:24-alpine` for migrate/server, `nginx` for the client, PostgreSQL 17 |
| CI run for the code commit | https://github.com/Peepipat-Suesoongnuen/PEW-DIY/actions/runs/43715264311 |
| Secrets | No password value appears in this document. Seed passwords are read from the ignored `.env` only |

Every check below names its identifier, preconditions, inputs, expected result, level,
automatic or manual execution, actual result and the AC it covers (§4). Automated checks
are reproduced by CI; manual checks are reproduced by §1 on the stated commit.

## 1. Reproduce

```powershell
if (-not (Test-Path .env)) { Copy-Item .env.example .env }
# Set POSTGRES_PASSWORD, SEED_PASSWORD_BA, SEED_PASSWORD_BB, SEED_PASSWORD_CA in .env (never commit).
docker compose config --quiet
docker compose up --build -d
docker compose ps -a
```

## 2. Results

### 2.1 Configuration validates and fails closed (MC-01, MC-02)

`docker compose config --quiet` with a populated `.env` exits 0 (MC-01).

With no `.env` present (the Compose file copied into an empty directory), MC-02:

```text
error while interpolating services.db.environment.POSTGRES_PASSWORD: required variable
POSTGRES_PASSWORD is missing a value: POSTGRES_PASSWORD must be set in the ignored .env file
EXIT=1
```

No default password exists in the tracked Compose file.

### 2.2 Build and startup (MC-03, MC-04)

```text
$ docker compose up --build -d
 Container pew-diy-db-1        Healthy
 Container pew-diy-migrate-1   Exited (0)
 Container pew-diy-server-1    Started
 Container pew-diy-client-1    Started
```

`docker compose ps -a` (MC-04):

```text
NAME                STATE     STATUS                     PORTS
pew-diy-client-1    running   Up                         127.0.0.1:5173->80/tcp
pew-diy-db-1        running   Up (healthy)               127.0.0.1:15432->5432/tcp
pew-diy-migrate-1   exited    Exited (0)
pew-diy-server-1    running   Up                         127.0.0.1:3000->3000/tcp
```

All published host ports are loopback-only. The one-shot migration container exits 0 and
the API waits for it (`depends_on: service_completed_successfully`).

### 2.3 Readiness, SPA delivery and seeded login (MC-05, MC-06, MC-07)

```text
$ curl http://127.0.0.1:3000/api/ready
{"status":"ready","db":"connected"}                                      HTTP 200
$ curl http://127.0.0.1:5173/login                                       HTTP 200
$ POST /api/auth/login {"username":"B-A","password":"<from .env>"}
{"data":{"user":{"id":"seed-b-a","username":"B-A","role":"BORROWER"}}}   HTTP 200
$ GET /api/auth/me (session cookie)
{"data":{"user":{"id":"seed-b-a","username":"B-A","role":"BORROWER"}}}   HTTP 200
```

### 2.4 Domain write, rule rejection, restart persistence (MC-08, MC-09, MC-10)

```text
$ POST /api/requests {"equipment_id":"fixture-e-many","quantity_requested":1}
{"data":{"id":"a32a0bc2-...","borrower_id":"seed-b-a","quantity_requested":1,
"status":"SUBMITTED"}}                                                   HTTP 201
```

Negative/boundary case:

```text
$ POST /api/requests {"equipment_id":"fixture-e-many","quantity_requested":999}
{"error":{"code":"INSUFFICIENT_AVAILABILITY",...}}                       HTTP 409
```

After `docker compose up -d --force-recreate server` (no volume deletion):

```text
rows in borrowing_requests: 3
a32a0bc2-8447-48ac-83fd-a4190d26c546 still present
GET /api/ready                                                           HTTP 200
```

The record was created before a full image rebuild and a container replacement, and it
survived both; it lives in the `postgres_data` volume, not in the API container.

### 2.5 Seed rerun is non-destructive (MC-11)

The migration container runs `migrate` then `seed` on every `up`. Output after the
database already existed:

```text
Migration complete.
Skipped B-A — already exists (preserved)
Skipped B-B — already exists (preserved)
Skipped C-A — already exists (preserved)
Skipped equipment fixture-e-one (Synthetic single-unit fixture)
Skipped equipment fixture-e-many (Synthetic pooled fixture)
Skipped equipment fixture-e-zero (Synthetic zero-stock fixture)
Seed complete.
```

### 2.6 Production seed guard needs both the mode and the flag (MC-12, MC-13)

The `migrate` service passes `SEED_MODE=local-compose-demo` **and**
`--local-compose-demo`. Removing either one is rejected inside the same image:

```text
$ docker compose run --rm --no-deps migrate sh -c "node dist/db/seed.js"
Seed failed: Seed mode local-compose-demo requires the explicit --local-compose-demo flag
exit 1

$ docker compose run --rm --no-deps -e SEED_MODE= migrate sh -c "node dist/db/seed.js --local-compose-demo"
Seed failed: Seed is disabled when NODE_ENV=production
exit 1
```

The long-running `server` service receives neither `SEED_MODE` nor the seed passwords, so
an accidentally configured production service cannot seed a deployed database.

### 2.7 Tests and builds (CI-01, CI-02)

```text
npx vitest run server/tests/seed-safety.test.ts   -> 12 passed
npm run build                                     -> passed
npm --prefix client run typecheck                 -> passed
```

The complete suite, the client build and the container readiness check are automated by
CI: `Build and regression tests` (CI-01) and `Docker image build and readiness` (CI-02) at
https://github.com/Peepipat-Suesoongnuen/PEW-DIY/actions/runs/43715264311.

## 3. Acceptance-criteria coverage

| AC | Primary checks | Result |
|---|---|---|
| AC-1 Seven Docker files (+ justified `client/.dockerignore`) | ST-01 | Met |
| AC-2 No real secret committed or baked into the image | MC-01, MC-02, ST-03, CI-02 | Met |
| AC-3 Compose topology with a persistent volume | ST-01, MC-03, MC-04, MC-10 | Met |
| AC-4 Migration/seed waits for the DB, applies, exits 0 | MC-03, MC-11 | Met |
| AC-5 Seed credentials local-only, never in the API container | ST-04, MC-12, MC-13 | Met |
| AC-6 API reads `PORT`, listens on `0.0.0.0`; client served by nginx | ST-02, MC-03, MC-06 | Met |
| AC-7 Compose config/build/startup verified | MC-01, MC-02, MC-03, MC-04 | Met |
| AC-8 `/api/ready` confirms DB connectivity | MC-05, MC-10 | Met |
| AC-9 React login page + seeded authentication | MC-06, MC-07 | Met |
| AC-10 Data and identities survive container replacement; seed rerun preserves | MC-08, MC-09, MC-10, MC-11 | Met |
| AC-11 Server/client tests, typechecks, builds | UT-SEED-01…12, CI-01 | Met |
| AC-12 README documents local Docker setup without secrets | ST-05 | Met |
| AC-13 Reviewed through the normal PR process | PR #47 review and approval | **Pending** — open until the reviewer approves |

## 4. Traceability matrix

### 4.1 Automated — unit tests (`server/tests/seed-safety.test.ts`)

Preconditions for every row: repository checkout at the verified code commit, dependencies
installed with `npm ci`. Command: `npx vitest run server/tests/seed-safety.test.ts`.

| ID | Test identifier | Inputs | Expected | Actual | AC |
|---|---|---|---|---|---|
| UT-SEED-01 | `rejects seed execution when NODE_ENV is production` | `NODE_ENV=production`, no mode, no flag | throws `Seed is disabled when NODE_ENV=production` | Pass | AC-5 |
| UT-SEED-02 | `allows seed execution in development` | `NODE_ENV=development` | no throw | Pass | AC-5 |
| UT-SEED-03 | `rejects seed execution when NODE_ENV is unset` | `{}` | throws `Seed requires NODE_ENV=development or NODE_ENV=test` | Pass | AC-5 |
| UT-SEED-04 | `rejects seed execution in an unrecognized environment` | `NODE_ENV=staging` | same rejection as UT-SEED-03 | Pass | AC-5 |
| UT-SEED-05 | `rejects production case-insensitively` | `NODE_ENV=Production` | throws production rejection | Pass | AC-5 |
| UT-SEED-06 | `allows local Compose seeding only with the explicit --local-compose-demo flag` | `SEED_MODE=local-compose-demo`, `--local-compose-demo` | no throw | Pass | AC-5 |
| UT-SEED-07 | `rejects local Compose seeding when its flag is missing` | `SEED_MODE=local-compose-demo`, no flag | throws `… requires the explicit --local-compose-demo flag` | Pass | AC-5, AC-2 |
| UT-SEED-08 | `allows cloud demo seeding only with the explicit --cloud-demo flag` | `SEED_MODE=cloud-demo`, `--cloud-demo` | no throw | Pass | AC-5 |
| UT-SEED-09 | `rejects cloud demo seeding when its flag is missing` | `SEED_MODE=cloud-demo`, no flag | throws `… requires the explicit --cloud-demo flag` | Pass | AC-5, AC-2 |
| UT-SEED-10 | `does not accept one mode's flag for the other mode` | local mode + `--cloud-demo`; cloud mode + `--local-compose-demo` | each rejects with its own required flag | Pass | AC-5 |
| UT-SEED-11 | `rejects production seeding for any other or missing seed mode` | `SEED_MODE=development` + both flags; no mode + `--local-compose-demo` | throws production rejection | Pass | AC-5 |
| UT-SEED-12 | `does not require a flag outside production` | `development`/`test` with a mode but no flag | no throw (local dev workflow unchanged) | Pass | AC-5 |

Result: **12 passed / 12**.

### 4.2 Automated — CI jobs (`.github/workflows/ci.yml`)

Preconditions for every row: a clean checkout of the verified commit on a GitHub-hosted
`ubuntu-24.04` runner; no repository secret is required.

| ID | Check identifier | Inputs | Expected | Actual | AC |
|---|---|---|---|---|---|
| CI-01 | Job `Build and regression tests` | `npm ci` for root and client, disposable PostgreSQL 17 service, Chromium | Server/API, client, E2E and verification-tooling suites pass; both builds succeed | Success at `e17295c` (run 43715264311) | AC-11, AC-13 (evidence only) |
| CI-02 | Job `Docker image build and readiness` → step `Build the root application image` | `docker build --tag pewdiy:ci .` | Image builds from a clean checkout with no `.env` in context | Success | AC-1, AC-3 |
| CI-03 | Same job → step `Run the image against the database and prove readiness` | Container against the disposable PostgreSQL service | `/api/ready` 200 within 30 attempts, `/login` 200 with the SPA root element | Success | AC-6, AC-8, AC-9 |
| CI-04 | Same job → step `Prove no environment secret was baked into the image` | `test -e /app/.env` inside the image | Fails if a `.env` exists in the image | Success (no `.env`) | AC-2 |

### 4.3 Manual — static inspection

Preconditions: checkout of the verified commit. These are structural facts, not runtime
behaviour, so they are recorded as manual inspection rather than passing them off as tests.

| ID | Check | Preconditions | Inputs | Expected | Actual | AC |
|---|---|---|---|---|---|---|
| ST-01 | Docker file inventory | clean checkout | `Dockerfile`, `.dockerignore`, `docker-compose.yml`, `server/Dockerfile`, `server/docker-entrypoint.sh`, `client/Dockerfile`, `client/nginx.conf`, plus the justified `client/.dockerignore` | All files present and referenced by the Compose build contexts | Present | AC-1, AC-3 |
| ST-02 | API binds all interfaces and honours `PORT` | clean checkout | `server/src/http-server.ts` | Listens on `0.0.0.0` using `PORT` (default 3000) | Confirmed | AC-6 |
| ST-03 | No secret literal in tracked configuration | clean checkout | `docker-compose.yml`, `.env.example` | Only `${…:?…}` interpolation and empty placeholders; no password value | Confirmed | AC-2 |
| ST-04 | Seed variables scoped to the one-shot service | clean checkout | `docker-compose.yml` services `migrate`, `server` | `SEED_MODE`/`SEED_PASSWORD_*` only on `migrate`; `server` uses `*app_environment` only | Confirmed | AC-5 |
| ST-05 | README documents the local Compose setup without secrets | clean checkout | `README.md` §Docker Compose (Episode 3) | Setup steps, no-default-password rule, two-step seed opt-in, no secret values | Confirmed | AC-12 |

### 4.4 Manual — Docker Compose integration

Preconditions for every row: Docker Engine 29.9.3 + Docker Compose v5.7.0, the ignored
`.env` populated with `POSTGRES_PASSWORD` and the three `SEED_PASSWORD_*` values, checkout
of `e17295c`, and the service started with `docker compose up --build -d`.

| ID | Check | Inputs | Expected | Actual | AC |
|---|---|---|---|---|---|
| MC-01 | `docker compose config --quiet` | `.env` populated | exit 0 | exit 0 | AC-7, AC-2 |
| MC-02 | `docker compose config --quiet` without credentials | Compose file in an empty directory | exit non-zero, `POSTGRES_PASSWORD must be set` | exit 1 with that message | AC-2, AC-7 |
| MC-03 | `docker compose up --build -d` | as above | migrate exits 0, db healthy, server and client started | migrate `Exited (0)`, db healthy, both running | AC-3, AC-4, AC-7 |
| MC-04 | `docker compose ps -a` | running stack | expected states and loopback-only published ports | `127.0.0.1:15432`, `:3000`, `:5173` only | AC-3, AC-7 |
| MC-05 | `GET /api/ready` | running API | HTTP 200 and `db: connected` | `{"status":"ready","db":"connected"}`, 200 | AC-8 |
| MC-06 | `GET /login` on the client origin | running client | HTTP 200 and the SPA shell | 200 | AC-6, AC-9 |
| MC-07 | `POST /api/auth/login` then `GET /api/auth/me` | seeded borrower `B-A`, password from `.env`, session cookie | 200 with `seed-b-a` / `BORROWER` for both | 200 / 200, role `BORROWER` | AC-9 |
| MC-08 | `POST /api/requests` | `fixture-e-many`, quantity 1 | HTTP 201 with `SUBMITTED` | 201, `a32a0bc2-…`, `SUBMITTED` | AC-10 |
| MC-09 | `POST /api/requests` over availability | `fixture-e-many`, quantity 999 | HTTP 409 `INSUFFICIENT_AVAILABILITY` | 409 with that code | AC-10 |
| MC-10 | Persistence across container replacement | `docker compose up -d --force-recreate server`, no volume deletion | the created request is still present; `/api/ready` 200 | 3 rows, `a32a0bc2-…` present, readiness 200 | AC-3, AC-8, AC-10 |
| MC-11 | Seed rerun preserves data and identities | `docker compose up --build -d` again | `migrate` logs “already exists (preserved)” for accounts and fixtures, exits 0 | all three accounts and three fixtures skipped as preserved, exit 0 | AC-4, AC-10 |
| MC-12 | Seed without its flag is rejected | `docker compose run --rm --no-deps migrate sh -c "node dist/db/seed.js"` | non-zero exit, explicit-flag error | exit 1, `… requires the explicit --local-compose-demo flag` | AC-2, AC-5 |
| MC-13 | Seed with the flag but without the mode is rejected | same with `-e SEED_MODE=` | non-zero exit, production rejection | exit 1, `Seed is disabled when NODE_ENV=production` | AC-2, AC-5 |
| MC-14 | Data survives a full image rebuild | `docker compose up --build -d` after MC-10 | the earlier record is still listed | record present, readiness 200 | AC-10 |

## 5. Scope of the automatic evidence

CI-01 and CI-02 prove the application suite, the image build, container readiness, SPA
delivery and the absence of a baked `.env`. They do **not** run the Compose topology, so
MC-01, MC-04, MC-10, MC-11, MC-12 and MC-13 remain manual checks, reproduced by §1–§2.
AC-13 stays open until the reviewer approves and merges PR #47.
