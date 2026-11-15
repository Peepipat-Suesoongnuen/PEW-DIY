# Lab 5 Episode 3 — Docker evidence (Issue #46 / PR #47)

Executed on the `build/3-docker` working tree that contains this document.

| Item | Value |
|---|---|
| Date | 2026-11-15 |
| Host | Windows 11, Docker Engine 29.9.3, Docker Compose v5.7.0 |
| Branch | `build/3-docker` |
| Runtime | Node 24 image (`node:24-alpine`), PostgreSQL 17 |
| Authoritative repeatable run | `Docker image build and readiness` job in `.github/workflows/ci.yml`, on every PR head |
| Secrets | No password value appears in this document; seed passwords are read from the ignored `.env` |

## 1. Reproduce

```powershell
if (-not (Test-Path .env)) { Copy-Item .env.example .env }
# Set POSTGRES_PASSWORD, SEED_PASSWORD_BA, SEED_PASSWORD_BB, SEED_PASSWORD_CA in .env (never commit).
docker compose config --quiet
docker compose up --build -d
docker compose ps -a
```

## 2. Results

### 2.1 Configuration validates, and fails closed without credentials (AC-2)

`docker compose config --quiet` with a populated `.env` exits 0.

With no `.env` present (compose file copied to an empty directory):

```text
error while interpolating services.db.environment.POSTGRES_PASSWORD: required variable
POSTGRES_PASSWORD is missing a value: POSTGRES_PASSWORD must be set in the ignored .env file
EXIT=1
```

No default password exists in the tracked Compose file.

### 2.2 Build and startup (AC-3, AC-4, AC-6, AC-7)

```text
$ docker compose up --build -d
 Image pew-diy-migrate Built
 Image pew-diy-server Built
 Image pew-diy-client Built
 Container pew-diy-db-1 Healthy
 Container pew-diy-migrate-1 Exited (0)
 Container pew-diy-server-1 Started
 Container pew-diy-client-1 Started
```

`docker compose ps -a`:

```text
NAME                STATE     STATUS                     PORTS
pew-diy-client-1    running   Up                         127.0.0.1:5173->80/tcp
pew-diy-db-1        running   Up (healthy)               127.0.0.1:15432->5432/tcp
pew-diy-migrate-1   exited    Exited (0)
pew-diy-server-1    running   Up                         127.0.0.1:3000->3000/tcp
```

All published host ports are loopback-only. The one-shot migration container exits 0 and the API waits for it.

### 2.3 Readiness, SPA delivery and seeded login (AC-8, AC-9)

```text
$ curl http://127.0.0.1:3000/api/ready
{"status":"ready","db":"connected"}                                    HTTP 200
$ curl http://127.0.0.1:5173/login                                     HTTP 200
$ POST /api/auth/login  {"username":"B-A","password":"<from .env>"}
{"data":{"user":{"id":"seed-b-a","username":"B-A","role":"BORROWER"}}} HTTP 200
$ GET /api/auth/me (session cookie)
{"data":{"user":{"id":"seed-b-a","username":"B-A","role":"BORROWER"}}} HTTP 200
```

### 2.4 Domain write, rule rejection and restart persistence (AC-10)

Created a borrowing request as borrower `B-A` through the running container:

```text
$ POST /api/requests {"equipment_id":"fixture-e-many","quantity_requested":2}
{"data":{"id":"84cbbe11-...","borrower_id":"seed-b-a","equipment_id":"fixture-e-many",
"quantity_requested":2,"status":"SUBMITTED"}}                          HTTP 201
```

Rule rejection (negative/boundary case):

```text
$ POST /api/requests {"equipment_id":"fixture-e-many","quantity_requested":999}
{"error":{"code":"INSUFFICIENT_AVAILABILITY","message":"Requested quantity exceeds current availability."}}
                                                                       HTTP 409
```

Then the API container was replaced (`docker compose up -d --force-recreate server`, no volume deletion):

```text
requests before restart: 2
requests after restart:  2
84cbbe11-... still present with the same created_at and status
GET /api/ready after restart                                          HTTP 200
```

Data lives in the `postgres_data` volume, not in the API container.

### 2.5 Seed rerun is non-destructive (AC-10)

The migration container reruns `migrate` then `seed` on every `up`. Observed output after the database already existed:

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

### 2.6 Tests and builds (AC-11)

```text
npx vitest run server/tests/seed-safety.test.ts   -> 9 passed
npm run build                                     -> passed
npm --prefix client run typecheck                 -> passed
```

The complete suite, the client build and the root-image container check run in CI
(`Build and regression tests` and `Docker image build and readiness`).

## 3. Acceptance-criteria mapping

| AC | Evidence in this document | Result |
|---|---|---|
| AC-1 Seven Docker files (+ justified `client/.dockerignore`) | `Dockerfile`, `.dockerignore`, `docker-compose.yml`, `server/Dockerfile`, `server/docker-entrypoint.sh`, `client/Dockerfile`, `client/nginx.conf`; §2.2 build | Met |
| AC-2 No real secret committed or baked into the image | §2.1 fail-closed, `.env.example` placeholders only, CI step `Prove no environment secret was baked into the image` | Met |
| AC-3 Compose topology with persistent volume | §2.2 service list; `postgres_data` volume | Met |
| AC-4 Migration/seed waits for DB, applies, exits 0 | §2.2, §2.5 | Met |
| AC-5 Seed credentials local-only, never in the API container | `docker-compose.yml` `migrate` service only; README boundary note | Met |
| AC-6 API reads `PORT`, listens on `0.0.0.0`; client via nginx | `server/src/http-server.ts`, §2.2/§2.3 | Met |
| AC-7 Compose config/build/startup verified | §2.1, §2.2 | Met |
| AC-8 `/api/ready` confirms DB connectivity | §2.3 | Met |
| AC-9 React login page + seeded authentication | §2.3 | Met |
| AC-10 Data and identities survive container replacement; seed rerun preserves | §2.4, §2.5 | Met |
| AC-11 Server/client tests, typechecks, builds | §2.6 + CI | Met |
| AC-12 README documents local Docker setup without secrets | [README](../../../README.md) Docker Compose section | Met |
| AC-13 Reviewed through the normal PR process | PR #47 review and approval | Pending review |

## 4. Test-level mapping

| Level | Test / check | Input | Expected | Actual |
|---|---|---|---|---|
| Unit | `server/tests/seed-safety.test.ts` (9 tests) | env combinations incl. `SEED_MODE=cloud-demo` | Only explicit modes allow production seeding; `cloud-demo` also needs `--cloud-demo` | Passed |
| Container/image | CI `Docker image build and readiness` | clean checkout, disposable PostgreSQL | Image builds, `/api/ready` 200, SPA 200, no `.env` in image | Passed / running per PR head |
| Compose integration | §2.2–§2.5 manual reproduction | `.env` values only | Services healthy, login and domain write work, data survives container replacement | Passed |
| Regression | CI `Build and regression tests` | full server/client/E2E suites | All suites pass | Running per PR head |
